/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

import { 
  BaseResponseDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto,
  DayAvailabilityDto, 
  CreateServiceGrpcOfferingDto
} from '@pivota-api/dtos';
import { ContractorsPricingService } from './contractors-pricing.service';

/**
 * Internal interface matching the ServiceOffering Prisma Model
 */
interface ServiceOfferingWithReviews {
  id: string;
  externalId: string;
  creatorId: string;    
  accountId: string;    
  creatorName: string | null; // Keep as null if the DB column still exists
  accountName: string | null; // Changed to nullable
  contractorType: string;
  isVerified: boolean;
  title: string;
  description: string;
  verticals: string[];
  categoryId: string;
  basePrice: number;
  priceUnit: string;
  currency: string;
  locationCity: string;
  locationNeighborhood: string | null;
  yearsExperience: number | null;   
  availability: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviews: { rating: number }[];
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
  ) {}

  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON string`);
      return undefined;
    }
  }

  /**
   * Maps Prisma result to Response DTO
   */
  private mapToResponseDto(item: ServiceOfferingWithReviews): ServiceOfferingResponseDto {
    const reviews = item.reviews || [];
    const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    const average = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      id: item.id,
      externalId: item.externalId,
      
      // Mapped without requiring Names from the DB record
      creator: {
        id: item.creatorId,
        fullName: item.creatorName ?? undefined,
      },
      account: {
        id: item.accountId,
        name: item.accountName ?? 'Private Account', // Fallback for missing names
      },
      contractorType: item.contractorType,
      isVerified: item.isVerified,
      
      title: item.title,
      description: item.description,
      verticals: item.verticals,
      categoryId: item.categoryId,
      basePrice: item.basePrice,
      priceUnit: item.priceUnit,
      currency: item.currency,
      
      locationCity: item.locationCity,
      locationNeighborhood: item.locationNeighborhood ?? undefined,
      yearsExperience: item.yearsExperience ?? undefined,
      availability: this.parseAvailability(item.availability),
      
      averageRating: Number(average.toFixed(1)),
      reviewCount: reviews.length,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Persists a new service offering
   */
  async createServiceOffering(
    dto: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      await this.pricingService.validateOfferingPricing(dto);

      // Persist to Database - Ignoring Name fields as they are removed from Gateway
      const created = await this.prisma.serviceOffering.create({
        data: {
          creatorId: dto.creatorId, // Handled by Gateway fallback logic
          accountId: dto.accountId, // Handled by Gateway fallback logic
          
          // These are now ignored or set to null
          creatorName: null,
          accountName: 'Professional Provider', // Default placeholder if column is NOT NULL
          
          title: dto.title,
          description: dto.description,
          verticals: dto.verticals, 
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit,
          currency: dto.currency ?? 'KES',
          
          yearsExperience: dto.yearsExperience ?? null,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood ?? null,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
        },
        include: {
          reviews: { select: { rating: true } },
        },
      });

      return {
        success: true,
        message: 'Service offering created successfully',
        code: 'OFFERING_CREATED',
        data: this.mapToResponseDto(created as unknown as ServiceOfferingWithReviews), 
      };
      
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create offering: ${err.message}`);
      
      return {
        success: false,
        message: err.message || 'Creation failed',
        code: error instanceof BadRequestException ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        error: { message: err.message, details: null },
      };
    }
  }

  /**
   * Fetches offerings based on Vertical (JOBS, HOUSING, etc.)
   */
  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: {
          verticals: { has: dto.vertical }, 
          ...(dto.city && { locationCity: dto.city }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: { 
          reviews: { select: { rating: true } } 
        },
      });

      return {
        success: true,
        message: `Found ${offerings.length} ${dto.vertical} service offerings`,
        code: 'FETCH_SUCCESS',
        data: offerings.map(item => this.mapToResponseDto(item as unknown as ServiceOfferingWithReviews)),
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for vertical ${dto.vertical}: ${err.message}`);
      return { 
        success: false, 
        message: 'Fetch failed', 
        code: 'FETCH_ERROR', 
        error: { message: err.message, details: null } 
      };
    }
  }
}