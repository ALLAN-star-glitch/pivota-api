"use strict";

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreateServiceOfferingDto, 
  BaseResponseDto,
  CreatePriceUnitRuleDto, 
  PricingMetadataResponseDto,
  PriceUnitRuleResponseDto,
  PricingMetadataItemDto
} from '@pivota-api/dtos';

@Injectable()
export class ProvidersPricingService {
  private readonly logger = new Logger(ProvidersPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===================================================
  // 1. VALIDATION LOGIC
  // ===================================================

  async validateOfferingPricing(dto: CreateServiceOfferingDto): Promise<void> {
    // We look up rules based on the category relationship
    const rules = await this.prisma.providerPricingRule.findMany({
      where: {
        vertical: { in: dto.verticals },
        unit: dto.priceUnit,
        isActive: true,
        OR: [
          { category: { slug: dto.categorySlug } }, // Query via relation
          { categoryId: null }
        ]
      },
    });

    if (rules.length === 0) {
      this.logger.warn(`Unauthorized pricing unit: ${dto.priceUnit} for verticals ${dto.verticals}`);
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
  // 2. METADATA (Grouped for UI) - CORRECTED FOR GRPC
  // ===================================================
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    try {
      this.logger.log('Fetching active provider pricing rules...');

      const rules = await this.prisma.providerPricingRule.findMany({
        where: { isActive: true },
        include: {
          category: { select: { slug: true } } // Join to get slug without duplication
        }
      });

      const grouped = rules.reduce<Record<string, { rules: PricingMetadataItemDto[] }>>((acc, rule) => {
        const verticalKey = rule.vertical;
        
        if (!acc[verticalKey]) {
          acc[verticalKey] = { rules: [] };
        }

        const metadataItem: PricingMetadataItemDto = {
          unit: rule.unit,
          categorySlug: rule.category?.slug ?? null, // Map from relation
          min: rule.minPrice ? Number(rule.minPrice) : null,
          max: rule.maxPrice ? Number(rule.maxPrice) : null,
          experienceRequired: rule.isExperienceRequired,
          notesRequired: rule.isNotesRequired,
          currency: rule.currency,
        };

        acc[verticalKey].rules.push(metadataItem);
        return acc;
      }, {});

      return {
        success: true,
        message: 'Pricing metadata fetched successfully',
        code: 'METADATA_SUCCESS',
        data: { verticals: grouped }, 
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
  // 3. ADMIN MANAGEMENT (CRUD)
  // ===================================================

  async upsertRule(dto: CreatePriceUnitRuleDto): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      let categoryId: string | null = null;

      // Resolve slug to ID to maintain referential integrity
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

      const rule = await this.prisma.providerPricingRule.upsert({
        where: {
          vertical_unit_currency_categoryId: { // Matches the new @@unique constraint
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

  async getAllRules(): Promise<BaseResponseDto<PriceUnitRuleResponseDto[]>> {
    try {
      const rules = await this.prisma.providerPricingRule.findMany({
        include: { category: { select: { slug: true } } },
        orderBy: { vertical: 'asc' }
      });

      // Map back to include categorySlug in the response DTO
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

  async toggleRule(id: string, active: boolean): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      const updated = await this.prisma.providerPricingRule.update({
        where: { id },
        data: { isActive: active },
      });
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
}