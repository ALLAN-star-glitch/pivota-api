"use strict";

import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { 
  BaseResponseDto, 
  CreateServiceOfferingDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto,
  DayAvailabilityDto 
} from '@pivota-api/dtos';
import { ProvidersPricingService } from './providers-pricing.service';

// Define a strict interface for the Prisma return type to avoid 'any'
interface ServiceOfferingWithReviews {
  id: string;
  externalId: string;
  providerId: string;
  title: string;
  description: string;
  verticals: string[];
  categoryId: string; // Changed from categoryLabel
  basePrice: number;
  priceUnit: string;
  locationCity: string;
  locationNeighborhood: string | null;
  yearsExperience: number | null;   
  availability: string | null;
  additionalNotes: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviews: { rating: number }[];
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ProvidersPricingService, // Inject the new service
    @Inject('PROFILE_GRPC') private readonly userService: ClientGrpc,
  ) {}

  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON`);
      return undefined;
    }
  }

  private mapToResponseDto(item: ServiceOfferingWithReviews): ServiceOfferingResponseDto {
    const reviews = item.reviews || [];
    const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
    const average = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      id: item.id,
      externalId: item.externalId,
      providerId: item.providerId,
      title: item.title,
      description: item.description,
      verticals: item.verticals,
      categoryId: item.categoryId, // Matching schema
      basePrice: item.basePrice,
      priceUnit: item.priceUnit,
      locationCity: item.locationCity,
      locationNeighborhood: item.locationNeighborhood ?? undefined,
      yearsExperience: item.yearsExperience ?? undefined,
      availability: this.parseAvailability(item.availability),
      isVerified: item.isVerified,
      additionalNotes: item.additionalNotes ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      averageRating: Number(average.toFixed(1)),
      reviewCount: reviews.length,
    };
  }

  async createServiceOffering(
    dto: CreateServiceOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      // 1. Dynamic Validation using the Pricing Service
      // This checks database rules for min/max price, experience, and notes.
      await this.pricingService.validateOfferingPricing(dto);

      // 2. Persist to Database
      const created = await this.prisma.serviceOffering.create({
        data: {
          providerId: dto.providerId ?? 'pending-auth', // Ensure you have a fallback or real ID
          title: dto.title,
          description: dto.description,
          verticals: dto.verticals, 
          categoryId: dto.categoryId, // MUST be included for your schema
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit,
          yearsExperience: dto.yearsExperience ?? null,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood ?? null,
          additionalNotes: dto.additionalNotes ?? null,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
          isVerified: false, 
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