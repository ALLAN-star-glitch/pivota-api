"use strict";

import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  CreateServiceOfferingDto, 
  BaseResponseDto,
  CreatePriceUnitRuleDto, 
  PricingMetadataResponseDto,
  PriceUnitRuleResponseDto,
  PricingMetadataItemDto,
  PricingUnitsByCategoryResponseDto,
  PricingUnitOptionDto
} from '@pivota-api/dtos';
import { RedisService, QueueService } from '@pivota-api/shared-redis';

@Injectable()
export class ContractorsPricingService {
  private readonly logger = new Logger(ContractorsPricingService.name);
  private readonly CACHE_TTL = 3600; // 1 hour cache
  private readonly PRICING_UNITS_CACHE_PREFIX = 'pricing_units:';
  private readonly PRICING_METADATA_CACHE_KEY = 'pricing_metadata';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly queue: QueueService,
  ) {}

  // ===================================================
  // 1. VALIDATION LOGIC (No caching - needs fresh data)
  // ===================================================

  async validateOfferingPricing(dto: CreateServiceOfferingDto): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId }
    });
    
    if (!category) {
      throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
    }
    
    const rules = await this.prisma.contractorPricingRule.findMany({
      where: {
        vertical: category.vertical,
        unit: dto.priceUnit,
        isActive: true,
        OR: [
          { categoryId: dto.categoryId },
          { categoryId: null }
        ]
      },
    });

    if (rules.length === 0) {
      this.logger.warn(`Unauthorized pricing unit: ${dto.priceUnit} for vertical ${category.vertical}`);
      throw new BadRequestException(
        `The pricing unit '${dto.priceUnit}' is not permitted for the selected category.`
      );
    }

    for (const rule of rules) {
      if (rule.minPrice && dto.basePrice < Number(rule.minPrice)) {
        throw new BadRequestException(`Price for ${rule.vertical} must be at least ${rule.minPrice}`);
      }

      if (rule.maxPrice && dto.basePrice > Number(rule.maxPrice)) {
        throw new BadRequestException(`Price for ${rule.vertical} cannot exceed ${rule.maxPrice}`);
      }

      if (rule.isExperienceRequired && (dto.yearsExperience === undefined || dto.yearsExperience === null)) {
        throw new BadRequestException(`Professional experience (years) is mandatory for ${rule.vertical} offerings.`);
      }

      if (rule.isNotesRequired && !dto.additionalNotes) {
        throw new BadRequestException(`Please provide additional details/notes for this ${rule.vertical} service.`);
      }
    }
  }

  // ===================================================
  // 2. GET PRICING UNITS BY CATEGORY (WITH CACHING)
  // ===================================================
  async getPricingUnitsByCategory(categoryId: string): Promise<BaseResponseDto<PricingUnitsByCategoryResponseDto>> {
    const cacheKey = `${this.PRICING_UNITS_CACHE_PREFIX}${categoryId}`;
    
    try {
      // 1. Try cache first
      const cached = await this.redisService.getObject<PricingUnitsByCategoryResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT for pricing units: ${categoryId}`);
        return BaseResponseDto.ok(cached, 'Pricing units retrieved successfully (cached)', 'OK');
      }
      
      this.logger.debug(`Cache MISS for pricing units: ${categoryId}, fetching from DB`);
      
      // 2. Get the category
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, vertical: true, type: true }
      });

      if (!category) {
        return BaseResponseDto.fail('Category not found', 'CATEGORY_NOT_FOUND');
      }

      if (category.type !== 'COMPLIMENTARY') {
        return BaseResponseDto.fail(
          'Pricing units are only available for COMPLIMENTARY categories',
          'INVALID_CATEGORY_TYPE'
        );
      }

      // 3. Get pricing rules
      const rules = await this.prisma.contractorPricingRule.findMany({
        where: {
          vertical: category.vertical,
          isActive: true,
          OR: [
            { categoryId: categoryId },
            { categoryId: null }
          ]
        },
        orderBy: { unit: 'asc' }
      });

      // 4. Deduplicate by unit - category-specific takes priority
      const unitMap = new Map<string, any>();
      for (const rule of rules) {
        const existing = unitMap.get(rule.unit);
        if (!existing || rule.categoryId === categoryId) {
          unitMap.set(rule.unit, {
            unit: rule.unit,
            minPrice: rule.minPrice ? Number(rule.minPrice) : 0,
            maxPrice: rule.maxPrice ? Number(rule.maxPrice) : null,
            experienceRequired: rule.isExperienceRequired,
            notesRequired: rule.isNotesRequired,
            currency: rule.currency
          });
        }
      }

      // 5. Build response
      const allowedUnits: PricingUnitOptionDto[] = Array.from(unitMap.values()).map(rule => ({
        unit: rule.unit,
        label: this.getPriceUnitLabel(rule.unit),
        description: this.getPriceUnitDescription(rule.unit),
        minPrice: rule.minPrice,
        maxPrice: rule.maxPrice,
        experienceRequired: rule.experienceRequired,
        notesRequired: rule.notesRequired,
        currency: rule.currency
      }));

      const responseData: PricingUnitsByCategoryResponseDto = {
        categoryId: category.id,
        categoryName: category.name,
        vertical: category.vertical,
        allowedUnits
      };

      // 6. Cache the result
      await this.redisService.setObject(cacheKey, responseData, this.CACHE_TTL);
      this.logger.debug(`Cached pricing units for category: ${categoryId} (TTL: ${this.CACHE_TTL}s)`);

      return BaseResponseDto.ok(responseData, 'Pricing units retrieved successfully', 'OK');

    } catch (error) {
      this.logger.error(`Failed to get pricing units: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

  // ===================================================
  // 3. METADATA (WITH CACHING)
  // ===================================================
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    try {
      // Try cache first
      const cached = await this.redisService.getObject<PricingMetadataResponseDto>(this.PRICING_METADATA_CACHE_KEY);
      if (cached) {
        this.logger.debug('Cache HIT for pricing metadata');
        return {
          success: true,
          message: 'Pricing metadata fetched successfully (cached)',
          code: 'METADATA_SUCCESS',
          data: cached,
        };
      }
      
      this.logger.debug('Cache MISS for pricing metadata, fetching from DB');
      
      const rules = await this.prisma.contractorPricingRule.findMany({
        where: { isActive: true },
        include: {
          category: { select: { slug: true } }
        }
      });

      const grouped = rules.reduce<Record<string, { rules: PricingMetadataItemDto[] }>>((acc, rule) => {
        const verticalKey = rule.vertical;
        
        if (!acc[verticalKey]) {
          acc[verticalKey] = { rules: [] };
        }

        const metadataItem: PricingMetadataItemDto = {
          unit: rule.unit,
          categorySlug: rule.category?.slug ?? null,
          min: rule.minPrice ? Number(rule.minPrice) : null,
          max: rule.maxPrice ? Number(rule.maxPrice) : null,
          experienceRequired: rule.isExperienceRequired,
          notesRequired: rule.isNotesRequired,
          currency: rule.currency,
        };

        acc[verticalKey].rules.push(metadataItem);
        return acc;
      }, {});

      const responseData = { verticals: grouped };
      
      // Cache for 1 hour
      await this.redisService.setObject(this.PRICING_METADATA_CACHE_KEY, responseData, this.CACHE_TTL);
      this.logger.debug(`Cached pricing metadata (TTL: ${this.CACHE_TTL}s)`);

      return {
        success: true,
        message: 'Pricing metadata fetched successfully',
        code: 'METADATA_SUCCESS',
        data: responseData, 
      };

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Metadata fetch failed: ${err.message}`);
      return { 
        success: false, 
        message: 'Failed to fetch pricing metadata', 
        code: 'INTERNAL_ERROR',
        error: { message: err.message, details: null }
      };
    }
  }

  // ===================================================
  // 4. INVALIDATE CACHE ON DATA CHANGES
  // ===================================================
  async invalidatePricingCache(categoryId?: string): Promise<void> {
    // Queue cache invalidation (fire and forget)
    this.queue.addJob(
      'cache-queue',
      'invalidate-pricing-cache',
      {
        categoryId,
        timestamp: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      }
    ).catch(err => this.logger.error(`Failed to queue cache invalidation: ${err.message}`));
    
    // Also invalidate immediately in Redis
    if (categoryId) {
      await this.redisService.delete(`${this.PRICING_UNITS_CACHE_PREFIX}${categoryId}`);
    }
    await this.redisService.delete(this.PRICING_METADATA_CACHE_KEY);
    
    this.logger.log(`Invalidated pricing cache${categoryId ? ` for category: ${categoryId}` : ' (all)'}`);
  }

  // ===================================================
  // 5. ADMIN MANAGEMENT (CRUD) - WITH CACHE INVALIDATION
  // ===================================================

  async upsertRule(dto: CreatePriceUnitRuleDto): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      let categoryId: string | null = null;

      if (dto.categorySlug) {
        const category = await this.prisma.category.findUnique({
          where: { 
            vertical_slug: {
              vertical: dto.vertical,
              slug: dto.categorySlug
            }
          }
        });
        if (!category) throw new BadRequestException(`Category slug '${dto.categorySlug}' not found.`);
        categoryId = category.id;
      }

      const rule = await this.prisma.contractorPricingRule.upsert({
        where: {
          vertical_unit_currency_categoryId: {
            vertical: dto.vertical,
            unit: dto.unit,
            currency: dto.currency,
            categoryId: categoryId,
          },
        },
        update: {
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          isExperienceRequired: dto.isExperienceRequired,
          isNotesRequired: dto.isNotesRequired,
          isActive: dto.isActive ?? true,
        },
        create: {
          vertical: dto.vertical,
          unit: dto.unit,
          categoryId: categoryId,
          minPrice: dto.minPrice,
          maxPrice: dto.maxPrice,
          isExperienceRequired: dto.isExperienceRequired,
          isNotesRequired: dto.isNotesRequired,
        },
      });

      // Invalidate cache on rule change
      await this.invalidatePricingCache(categoryId || undefined);

      return {
        success: true,
        message: 'Pricing rule updated',
        code: 'RULE_UPDATED',
        data: rule as unknown as PriceUnitRuleResponseDto,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Upsert rule failed: ${err.message}`);
      return {
        success: false,
        message: err.message || 'Rule update failed',
        code: 'UPDATE_ERROR',
        error: { message: err.message, details: null }
      };
    }
  }

  async toggleRule(id: string, active: boolean): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      const rule = await this.prisma.contractorPricingRule.findUnique({
        where: { id },
        select: { categoryId: true }
      });
      
      const updated = await this.prisma.contractorPricingRule.update({
        where: { id },
        data: { isActive: active },
      });
      
      // Invalidate cache on toggle
      await this.invalidatePricingCache(rule?.categoryId || undefined);
      
      return {
        success: true,
        message: `Rule ${active ? 'activated' : 'deactivated'}`,
        code: 'TOGGLE_SUCCESS',
        data: updated as unknown as PriceUnitRuleResponseDto
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: 'Rule not found or update failed',
        code: 'NOT_FOUND',
        error: { message: err.message, details: null }
      };
    }
  }

  async getAllRules(): Promise<BaseResponseDto<PriceUnitRuleResponseDto[]>> {
    try {
      const rules = await this.prisma.contractorPricingRule.findMany({
        include: { category: { select: { slug: true } } },
        orderBy: { vertical: 'asc' }
      });

      const mappedRules = rules.map(r => ({
        ...r,
        categorySlug: r.category?.slug ?? null
      }));

      return { 
        success: true, 
        message: 'All rules fetched',
        code: 'FETCH_SUCCESS',
        data: mappedRules as unknown as PriceUnitRuleResponseDto[] 
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        message: 'Fetch failed',
        code: 'FETCH_ERROR',
        error: { message: err.message, details: null }
      };
    }
  }

  // ===================================================
  // 6. HELPER METHODS
  // ===================================================

  private getPriceUnitLabel(unit: string): string {
    const labels: Record<string, string> = {
      'PER_HOUR': 'Per Hour',
      'PER_DAY': 'Per Day',
      'PER_WEEK': 'Per Week',
      'PER_MONTH': 'Per Month',
      'PER_YEAR': 'Per Year',
      'FIXED': 'Fixed Price',
      'PER_VISIT': 'Per Visit',
      'PER_SESSION': 'Per Session',
      'PER_UNIT': 'Per Unit',
      'PER_SQUARE_FOOT': 'Per Square Foot',
      'PER_SQUARE_METER': 'Per Square Meter',
      'PER_TRIP': 'Per Trip',
      'PER_PAGE': 'Per Page',
      'PER_TEST': 'Per Test',
      'PER_COURSE': 'Per Course',
      'PER_BOOTH': 'Per Booth',
      'PER_EVENT': 'Per Event',
      'PER_WATT': 'Per Watt',
      'PERCENTAGE': 'Percentage',
      'PACKAGE': 'Package'
    };
    return labels[unit] || unit;
  }

  private getPriceUnitDescription(unit: string): string {
    const descriptions: Record<string, string> = {
      'PER_HOUR': 'Charged per hour of work',
      'PER_DAY': 'Charged per full day of work',
      'PER_WEEK': 'Charged per week of service',
      'PER_MONTH': 'Charged per month (for ongoing services)',
      'PER_YEAR': 'Charged per year (for annual services)',
      'FIXED': 'Fixed price for the entire service',
      'PER_VISIT': 'Charged per visit (e.g., home visits, inspections)',
      'PER_SESSION': 'Charged per session (e.g., coaching, therapy)',
      'PER_UNIT': 'Charged per unit (e.g., per appliance, per item)',
      'PER_SQUARE_FOOT': 'Charged per square foot (for painting, flooring)',
      'PER_SQUARE_METER': 'Charged per square meter (for painting, flooring)',
      'PER_TRIP': 'Charged per trip (for moving, delivery services)',
      'PER_PAGE': 'Charged per page (for CV writing, document services)',
      'PER_TEST': 'Charged per test (for assessment services)',
      'PER_COURSE': 'Charged per course (for training services)',
      'PER_BOOTH': 'Charged per booth (for event services)',
      'PER_EVENT': 'Charged per event (for event services)',
      'PER_WATT': 'Charged per watt (for solar installation)',
      'PERCENTAGE': 'Percentage of total value (for real estate agents)',
      'PACKAGE': 'Package price for bundled services'
    };
    return descriptions[unit] || unit;
  }
}