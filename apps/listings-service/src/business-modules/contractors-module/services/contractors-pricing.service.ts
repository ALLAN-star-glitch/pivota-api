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

  // Unit labels for display
  private readonly UNIT_LABELS: Record<string, string> = {
    'PER_HOUR': 'per hour',
    'PER_DAY': 'per day',
    'PER_WEEK': 'per week',
    'PER_MONTH': 'per month',
    'PER_YEAR': 'per year',
    'FIXED': 'fixed price',
    'PER_VISIT': 'per visit',
    'PER_SESSION': 'per session',
    'PER_UNIT': 'per unit',
    'PER_SQUARE_FOOT': 'per square foot',
    'PER_SQUARE_METER': 'per square meter',
    'PER_TRIP': 'per trip',
    'PER_PAGE': 'per page',
    'PER_TEST': 'per test',
    'PER_COURSE': 'per course',
    'PER_BOOTH': 'per booth',
    'PER_EVENT': 'per event',
    'PER_WATT': 'per watt',
    'PER_KILOWATT': 'per kilowatt',
    'PER_ACRE': 'per acre',
    'PER_ANIMAL': 'per animal',
    'PER_BIRD': 'per bird',
    'PER_DEVICE': 'per device',
    'PER_POINT': 'per point',
    'PER_FIXTURE': 'per fixture',
    'PER_ITEM': 'per item',
    'PER_ROOM': 'per room',
    'PER_GUEST': 'per guest',
    'PER_PERSON': 'per person',
    'PER_DOCUMENT': 'per document',
    'PER_PLACEMENT': 'per placement',
    'PER_EMPLOYEE': 'per employee',
    'PER_RETURN': 'per return',
    'PER_PROJECT': 'per project',
    'PER_SERVICE': 'per service',
    'PER_CONSULTATION': 'per consultation',
    'PER_SAMPLE': 'per sample',
    'PER_SITE': 'per site',
    'PER_PROPERTY': 'per property',
    'PER_CAMERA': 'per camera',
    'PER_WINDOW': 'per window',
    'PER_BOX': 'per box',
    'PER_BIN': 'per bin',
    'PER_POST': 'per post',
    'PER_DESIGN': 'per design',
    'PER_ARTICLE': 'per article',
    'PER_MINUTE': 'per minute',
    'PER_SECOND': 'per second',
    'PER_WORD': 'per word',
    'PER_LEVEL': 'per level',
    'PER_SUBJECT': 'per subject',
    'PER_SHIRT': 'per shirt',
    'PER_BULK': 'per bulk order',
    'PER_HUNDRED': 'per hundred',
    'PER_COPY': 'per copy',
    'PERCENTAGE': 'percentage',
    'PACKAGE': 'package',
    'FREE': 'free'
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly queue: QueueService,
  ) {}

  // ===================================================
  // 1. VALIDATION LOGIC (No caching - needs fresh data)
  // ===================================================

  async validateOfferingPricing(dto: CreateServiceOfferingDto): Promise<void> {
    // 1. Get the category
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId }
    });
    
    if (!category) {
      throw new BadRequestException(`Category with ID ${dto.categoryId} not found`);
    }

    // 2. Find pricing rules - order by specificity (category-specific first, then global)
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
      orderBy: {
        categoryId: 'desc' // Non-null (specific) comes before null (global)
      }
    });

    // 3. Check if any rules exist for this unit
    if (rules.length === 0) {
      const allowedUnits = await this.getPermittedUnitsForCategory(category.id);
      const allowedUnitsList = allowedUnits.map(u => this.UNIT_LABELS[u] || u).join(', ');
      
      this.logger.warn(`Unauthorized pricing unit: ${dto.priceUnit} for category ${category.name} (${category.vertical})`);
      throw new BadRequestException(
        `'${this.UNIT_LABELS[dto.priceUnit] || dto.priceUnit}' is not allowed for "${category.name}". ` +
        `Allowed units: ${allowedUnitsList}`
      );
    }

    // 4. Use the most specific rule (first in array)
    const rule = rules[0];

    // 5. Validate base price range
    if (rule.minPrice !== null && dto.basePrice < Number(rule.minPrice)) {
      const unitLabel = this.UNIT_LABELS[dto.priceUnit] || dto.priceUnit;
      throw new BadRequestException(
        `"${category.name}" with ${unitLabel} pricing must cost at least ${rule.minPrice.toLocaleString()} ${rule.currency}. ` +
        `Your price: ${dto.basePrice.toLocaleString()} ${rule.currency}`
      );
    }

    if (rule.maxPrice !== null && dto.basePrice > Number(rule.maxPrice)) {
      const unitLabel = this.UNIT_LABELS[dto.priceUnit] || dto.priceUnit;
      throw new BadRequestException(
        `"${category.name}" with ${unitLabel} pricing cannot exceed ${rule.maxPrice.toLocaleString()} ${rule.currency}. ` +
        `Your price: ${dto.basePrice.toLocaleString()} ${rule.currency}`
      );
    }

    // 6. Validate negotiable range (min and max must be within platform range)
    await this.validateNegotiableRange(category, rule, dto);

    // 7. Validate experience requirement
    if (rule.isExperienceRequired && (dto.yearsExperience === undefined || dto.yearsExperience === null)) {
      throw new BadRequestException(
        `Years of professional experience is required for "${category.name}". ` +
        `Please specify how many years of experience you have in this field.`
      );
    }

    // 8. Validate notes requirement
    if (rule.isNotesRequired && (!dto.additionalNotes || dto.additionalNotes.trim() === '')) {
      throw new BadRequestException(
        `Additional details/notes are required for "${category.name}". ` +
        `Please provide more information about your service.`
      );
    }

    // 9. Additional validation: years experience cannot be negative
    if (dto.yearsExperience !== undefined && dto.yearsExperience !== null && dto.yearsExperience < 0) {
      throw new BadRequestException(`Years of experience cannot be negative.`);
    }

    // 10. Additional validation: base price cannot be negative
    if (dto.basePrice < 0) {
      throw new BadRequestException(`Price cannot be negative.`);
    }

    this.logger.debug(`Validation passed for ${category.name} - ${dto.priceUnit} at ${dto.basePrice} ${rule.currency}`);
  }

  // ========== NEW: Validate negotiable range ==========
  private async validateNegotiableRange(
    category: any,
    rule: any,
    dto: CreateServiceOfferingDto
  ): Promise<void> {
    // If not negotiable, no need to validate min/max
    if (dto.isNegotiable === false) {
      return;
    }

    // Check if minNegotiablePrice is provided and valid
    if (dto.minNegotiablePrice !== undefined && dto.minNegotiablePrice !== null) {
      if (rule.minPrice !== null && dto.minNegotiablePrice < Number(rule.minPrice)) {
        throw new BadRequestException(
          `Minimum negotiable price (${dto.minNegotiablePrice.toLocaleString()} ${rule.currency}) cannot be below ` +
          `platform minimum (${rule.minPrice.toLocaleString()} ${rule.currency}) for "${category.name}".`
        );
      }
      
      if (dto.minNegotiablePrice < 0) {
        throw new BadRequestException(`Minimum negotiable price cannot be negative.`);
      }
    }

    // Check if maxNegotiablePrice is provided and valid
    if (dto.maxNegotiablePrice !== undefined && dto.maxNegotiablePrice !== null) {
      if (rule.maxPrice !== null && dto.maxNegotiablePrice > Number(rule.maxPrice)) {
        throw new BadRequestException(
          `Maximum negotiable price (${dto.maxNegotiablePrice.toLocaleString()} ${rule.currency}) cannot exceed ` +
          `platform maximum (${rule.maxPrice.toLocaleString()} ${rule.currency}) for "${category.name}".`
        );
      }
    }

    // Check that min <= max (if both provided)
    if (dto.minNegotiablePrice !== undefined && dto.minNegotiablePrice !== null &&
        dto.maxNegotiablePrice !== undefined && dto.maxNegotiablePrice !== null &&
        dto.minNegotiablePrice > dto.maxNegotiablePrice) {
      throw new BadRequestException(
        `Minimum negotiable price (${dto.minNegotiablePrice.toLocaleString()} ${rule.currency}) cannot be ` +
        `greater than maximum negotiable price (${dto.maxNegotiablePrice.toLocaleString()} ${rule.currency}).`
      );
    }

    // Check that basePrice is within negotiable range (if range is defined)
    if (dto.minNegotiablePrice !== undefined && dto.minNegotiablePrice !== null &&
        dto.basePrice < dto.minNegotiablePrice) {
      throw new BadRequestException(
        `Base price (${dto.basePrice.toLocaleString()} ${rule.currency}) cannot be less than ` +
        `minimum negotiable price (${dto.minNegotiablePrice.toLocaleString()} ${rule.currency}).`
      );
    }

    if (dto.maxNegotiablePrice !== undefined && dto.maxNegotiablePrice !== null &&
        dto.basePrice > dto.maxNegotiablePrice) {
      throw new BadRequestException(
        `Base price (${dto.basePrice.toLocaleString()} ${rule.currency}) cannot exceed ` +
        `maximum negotiable price (${dto.maxNegotiablePrice.toLocaleString()} ${rule.currency}).`
      );
    }

    this.logger.debug(`Negotiable range validation passed for ${category.name}`);
  }

  // Helper method to get permitted units for a category
  private async getPermittedUnitsForCategory(categoryId: string): Promise<string[]> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { vertical: true }
    });

    if (!category) return [];

    const rules = await this.prisma.contractorPricingRule.findMany({
      where: {
        vertical: category.vertical,
        isActive: true,
        OR: [
          { categoryId: categoryId },
          { categoryId: null }
        ]
      },
      distinct: ['unit']
    });

    return rules.map(r => r.unit);
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
          category: { select: { slug: true, name: true } }
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
          categoryName: rule.category?.name ?? null,
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
        include: { category: { select: { slug: true, name: true } } },
        orderBy: { vertical: 'asc' }
      });

      const mappedRules = rules.map(r => ({
        ...r,
        categorySlug: r.category?.slug ?? null,
        categoryName: r.category?.name ?? null
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
      'PER_KILOWATT': 'Per Kilowatt',
      'PER_ACRE': 'Per Acre',
      'PER_ANIMAL': 'Per Animal',
      'PER_BIRD': 'Per Bird',
      'PER_DEVICE': 'Per Device',
      'PER_POINT': 'Per Point',
      'PER_FIXTURE': 'Per Fixture',
      'PER_ITEM': 'Per Item',
      'PER_ROOM': 'Per Room',
      'PER_GUEST': 'Per Guest',
      'PER_PERSON': 'Per Person',
      'PER_DOCUMENT': 'Per Document',
      'PER_PLACEMENT': 'Per Placement',
      'PER_EMPLOYEE': 'Per Employee',
      'PER_RETURN': 'Per Return',
      'PER_PROJECT': 'Per Project',
      'PER_SERVICE': 'Per Service',
      'PER_CONSULTATION': 'Per Consultation',
      'PER_SAMPLE': 'Per Sample',
      'PER_SITE': 'Per Site',
      'PER_PROPERTY': 'Per Property',
      'PER_CAMERA': 'Per Camera',
      'PER_WINDOW': 'Per Window',
      'PER_BOX': 'Per Box',
      'PER_BIN': 'Per Bin',
      'PER_POST': 'Per Post',
      'PER_DESIGN': 'Per Design',
      'PER_ARTICLE': 'Per Article',
      'PER_MINUTE': 'Per Minute',
      'PER_SECOND': 'Per Second',
      'PER_WORD': 'Per Word',
      'PER_LEVEL': 'Per Level',
      'PER_SUBJECT': 'Per Subject',
      'PER_SHIRT': 'Per Shirt',
      'PER_BULK': 'Per Bulk Order',
      'PER_HUNDRED': 'Per Hundred',
      'PER_COPY': 'Per Copy',
      'PERCENTAGE': 'Percentage',
      'PACKAGE': 'Package',
      'FREE': 'Free'
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
      'PER_KILOWATT': 'Charged per kilowatt (for solar installation)',
      'PER_ACRE': 'Charged per acre (for farming services)',
      'PER_ANIMAL': 'Charged per animal (for veterinary services)',
      'PER_PROJECT': 'Charged per project (for IT, design, development)',
      'PERCENTAGE': 'Percentage of total value (for real estate agents, recruiters)',
      'PACKAGE': 'Package price for bundled services',
      'FREE': 'Free service (for pro-bono / charitable work)'
    };
    return descriptions[unit] || unit;
  }
}