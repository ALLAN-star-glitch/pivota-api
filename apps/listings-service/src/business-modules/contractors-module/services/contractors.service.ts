/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  BaseResponseDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto,
  DayAvailabilityDto, 
  CreateServiceGrpcOfferingDto,
  PaginationDto,
  SkilledProfessionalProfileResponseDto,
  SkilledProfessionalPublicProfileDto,
  UserProfileResponseDto,
  AccountResponseDto,
} from '@pivota-api/dtos';
import { ContractorsPricingService } from './contractors-pricing.service';
import { QueueService } from '@pivota-api/shared-redis';

// gRPC interface for Profile Service
interface ProfileServiceGrpc {
  getSkilledProfessionalByAccount(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  getSkilledProfessionalByUuid(
    data: { uuid: string }
  ): Observable<BaseResponseDto<SkilledProfessionalPublicProfileDto>>;
  
  GetUserProfileByUuid(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  GetAccountByUuid(
    data: { accountUuid: string }
  ): Observable<BaseResponseDto<AccountResponseDto>>; 
}

interface ServiceOfferingWithDetails {
  id: string;
  externalId: string;
  creatorId: string;
  accountId: string;
  skilledProfessionalId: string;
  professionalName: string | null;
  professionalAvatar: string | null;
  isVerified: boolean;
  yearsExperience: number | null;
  coverageAreas: any | null; 
  hourlyRate: number | null;
  title: string;
  description: string;
  categoryId: string;
  basePrice: number;
  priceUnit: string;
  currency: string;
  availability: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string; vertical: string };
  reviews: { rating: number }[];
  
  // ========== NEW: Booking Fee Override Fields ==========
  useCustomBookingFee: boolean;
  customBookingFeeEnabled: boolean | null;
  customBookingFeeAmount: number | null;
  customBookingFeeCurrency: string | null;
  customBookingFeeDescription: string | null;
  customBookingFeeRefundable: boolean | null;
  
  // ========== NEW: Negotiable Pricing Fields ==========
  isNegotiable: boolean;
  minNegotiablePrice: number | null;
  maxNegotiablePrice: number | null;
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);
  private profileGrpc: ProfileServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
    private readonly queue: QueueService,
  ) {
    this.profileGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON string`);
      return undefined;
    }
  }

  private parseCoverageAreas(coverageAreasJson: any | null): string[] | undefined {
    if (!coverageAreasJson) return undefined;
    try {
      if (typeof coverageAreasJson === 'string') {
        return JSON.parse(coverageAreasJson);
      }
      return coverageAreasJson as string[];
    } catch (e) {
      this.logger.error(`Failed to parse coverage areas JSON`);
      return undefined;
    }
  }

  private async getSkilledProfessionalDetails(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto | null> {
    try {
      const response = await firstValueFrom(
        this.profileGrpc.getSkilledProfessionalByUuid({ uuid: skilledProfessionalId })
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to fetch professional details for ${skilledProfessionalId}: ${error.message}`);
      return null;
    }
  }

  private async validateSkilledProfessionalProfile(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto> {
    const professional = await this.getSkilledProfessionalDetails(skilledProfessionalId);
    
    if (!professional) {
      throw new BadRequestException(
        'Skilled professional profile not found. Please create a professional profile first.'
      );
    }
    
    return professional;
  }

  private async validateCategory(categoryId: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }
    
    if (category.type !== 'COMPLIMENTARY') {
      throw new BadRequestException('Service offerings can only be posted under COMPLIMENTARY categories');
    }
    
    return category;
  }

 private mapToResponseDto(
  item: ServiceOfferingWithDetails,
  professionalDetails?: SkilledProfessionalPublicProfileDto | null
): ServiceOfferingResponseDto {
  const reviews = item.reviews || [];
  const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
  const average = reviews.length > 0 ? totalRating / reviews.length : 0;

  const professional = professionalDetails;
  const professionalName = professional?.displayName || professional?.title || item.professionalName;
  const professionalAvatar = professional?.profileImage || item.professionalAvatar;
  
  const vertical = item.category?.vertical || '';

  return {
    id: item.id,
    externalId: item.externalId,
    skilledProfessionalId: item.skilledProfessionalId,
    creator: {
      id: item.creatorId,
      fullName: professionalName || '',
    },
    account: {
      id: item.accountId,
      name: professionalName || 'Professional',
      isVerified: professional?.isVerified ?? item.isVerified,
    },
    contractorType: 'SKILLED_PROFESSIONAL',
    isVerified: professional?.isVerified ?? item.isVerified,
    professionalId: item.skilledProfessionalId,
    professionalName: professionalName || '',
    professionalAvatar: professionalAvatar,
    yearsExperience: professional?.yearsExperience ?? item.yearsExperience ?? undefined,
    coverageAreas: this.parseCoverageAreas(item.coverageAreas),
    hourlyRate: professional?.hourlyRate ?? item.hourlyRate ?? undefined,
    title: item.title,
    description: item.description,
    verticals: [vertical],
    categoryId: item.categoryId,
    categoryName: item.category?.name,
    basePrice: item.basePrice,
    priceUnit: item.priceUnit,
    currency: item.currency,
    availability: this.parseAvailability(item.availability),
    status: item.status,
    expiresAt: item.expiresAt,
    averageRating: Number(average.toFixed(1)),
    reviewCount: reviews.length,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    
    // ========== Booking Fee Override Fields ==========
    useCustomBookingFee: item.useCustomBookingFee,
    customBookingFeeEnabled: item.customBookingFeeEnabled,
    customBookingFeeAmount: item.customBookingFeeAmount,
    customBookingFeeCurrency: item.customBookingFeeCurrency,
    customBookingFeeDescription: item.customBookingFeeDescription,
    customBookingFeeRefundable: item.customBookingFeeRefundable,
    
    // ========== NEW: Negotiable Pricing Fields ==========
    isNegotiable: item.isNegotiable,
    minNegotiablePrice: item.minNegotiablePrice,
    maxNegotiablePrice: item.maxNegotiablePrice,
  };
}

  // ========================================================================
  // SERVICE OFFERING CRUD OPERATIONS
  // ========================================================================

  async createServiceOffering(
    dto: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const professional = await this.validateSkilledProfessionalProfile(dto.skilledProfessionalId);
      const category = await this.validateCategory(dto.categoryId);
      await this.pricingService.validateOfferingPricing(dto);

      const professionalName = professional.displayName || professional.title;
      const professionalAvatar = professional.profileImage;
      const coverageAreas = dto.coverageAreas;
      const hourlyRate = professional.hourlyRate;
      const yearsExperience = professional.yearsExperience;
      const isVerified = professional.isVerified || false;

      const created = await this.prisma.serviceOffering.create({
        data: {
          creatorId: dto.creatorId,
          accountId: dto.accountId,
          skilledProfessionalId: dto.skilledProfessionalId,
          professionalName,
          professionalAvatar,
          isVerified,
          yearsExperience,
          coverageAreas: coverageAreas ? JSON.stringify(coverageAreas) : null,
          hourlyRate,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit || 'PER_HOUR',
          currency: dto.currency || 'KES',
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
          status: 'ACTIVE',

          // ========== Booking Fee Override Fields ==========
          useCustomBookingFee: dto.useCustomBookingFee ?? false,
          customBookingFeeEnabled: dto.customBookingFeeEnabled ?? null,
          customBookingFeeAmount: dto.customBookingFeeAmount ?? null,
          customBookingFeeCurrency: dto.customBookingFeeCurrency ?? 'KES',
          customBookingFeeDescription: dto.customBookingFeeDescription ?? null,
          customBookingFeeRefundable: dto.customBookingFeeRefundable ?? null,

          // ========== Negotiable Pricing Fields ==========
          isNegotiable: dto.isNegotiable ?? true,
          minNegotiablePrice: dto.minNegotiablePrice ?? null,
          maxNegotiablePrice: dto.maxNegotiablePrice ?? null,
        },
        include: {
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } },
        },
      });

      const responseDto = this.mapToResponseDto(created as ServiceOfferingWithDetails, professional);

      // ========== ENHANCED EMAIL NOTIFICATION ==========
      await this.queue.addJob(
        'notification-queue',
        'service-offering.created',
        {
          // Professional contact info
          to: professional.email,
          professionalName: professionalName,
          professionalPhone: professional.phone,
          
          // Service details
          serviceId: created.id,
          serviceExternalId: created.externalId,
          serviceTitle: dto.title,
          serviceDescription: dto.description,
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
          vertical: category.vertical,
          
          // Pricing
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit || 'PER_HOUR',
          currency: dto.currency || 'KES',
          
          // Negotiable pricing
          isNegotiable: dto.isNegotiable ?? true,
          minNegotiablePrice: dto.minNegotiablePrice,
          maxNegotiablePrice: dto.maxNegotiablePrice,
          
          // Booking fee override
          useCustomBookingFee: dto.useCustomBookingFee ?? false,
          customBookingFeeEnabled: dto.customBookingFeeEnabled,
          customBookingFeeAmount: dto.customBookingFeeAmount,
          customBookingFeeCurrency: dto.customBookingFeeCurrency,
          customBookingFeeDescription: dto.customBookingFeeDescription,
          customBookingFeeRefundable: dto.customBookingFeeRefundable,
          
          // Coverage areas
          coverageAreas: dto.coverageAreas,
          
          // Availability
          availability: dto.availability,
          
          // Timestamps and URLs
          createdAt: new Date().toISOString(),
          serviceUrl: `https://pivota.com/services/${created.externalId}`,
          dashboardUrl: `https://pivota.com/professional/dashboard/services/${created.externalId}`,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );

      this.logger.log(`Service offering created: ${created.id} - ${dto.title} - Notification sent to ${professional.email}`);

      return BaseResponseDto.ok(
        responseDto,
        'Service offering posted successfully',
        'CREATED'
      );
      
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create offering: ${err.message}`);
      
      return BaseResponseDto.fail(
        err.message || 'Creation failed',
        error instanceof BadRequestException ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
      );
    }
  }

  // Add this to your ContractorsService class

async getAllOfferings(data: {
  limit?: number;
  offset?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'rating';
  minRating?: number;
  verifiedOnly?: boolean;
}): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
  try {
    // Build the where clause
    const where: any = {
      status: 'ACTIVE',
    };

    // Apply filters
    if (data.minPrice !== undefined || data.maxPrice !== undefined) {
      where.basePrice = {};
      if (data.minPrice !== undefined) where.basePrice.gte = data.minPrice;
      if (data.maxPrice !== undefined) where.basePrice.lte = data.maxPrice;
    }

    if (data.verifiedOnly === true) {
      where.isVerified = true;
    }

    // Build order by
    let orderBy: any = {};
    switch (data.sortBy) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'rating':
        // Rating sorting requires a more complex query with aggregation
        // For now, fallback to recent
        orderBy = { createdAt: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get total count for pagination
    const total = await this.prisma.serviceOffering.count({ where });

    // Fetch offerings with pagination
    const offerings = await this.prisma.serviceOffering.findMany({
      where,
      include: {
        category: { 
          select: { 
            id: true, 
            name: true, 
            slug: true, 
            vertical: true,
            type: true
          } 
        },
        reviews: { select: { rating: true } } 
      },
      orderBy,
      skip: data.offset || 0,
      take: data.limit || 20,
    });

    // Get professional details for all unique professional IDs
    const professionalIds = [...new Set(offerings.map(o => o.skilledProfessionalId).filter(Boolean))];
    const professionalDetails = new Map<string, SkilledProfessionalPublicProfileDto>();
    
    await Promise.all(
      professionalIds.map(async (id) => {
        const details = await this.getSkilledProfessionalDetails(id);
        if (details) {
          professionalDetails.set(id, details);
        }
      })
    );

    // Map to DTOs
    let mappedOfferings = offerings.map(offering => 
      this.mapToResponseDto(offering as unknown as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
    );

    // Apply rating filter after fetching (since rating is calculated)
    if (data.minRating !== undefined && data.minRating > 0) {
      mappedOfferings = mappedOfferings.filter(
        offering => (offering.averageRating || 0) >= (data.minRating || 0)
      );
    }

    // Apply rating sorting after filtering (if needed)
    if (data.sortBy === 'rating') {
      mappedOfferings = mappedOfferings.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    const pagination: PaginationDto = {
      total,
      limit: data.limit || 20,
      offset: data.offset || 0,
      hasMore: (data.offset || 0) + (data.limit || 20) < total,
    };

    return BaseResponseDto.okWithPagination(
      mappedOfferings,
      pagination,
      `Found ${mappedOfferings.length} service offerings across all categories`,
      'OK'
    );
  } catch (error) {
    this.logger.error(`Failed to get all offerings: ${error.message}`);
    return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
  }
}

  async getOfferingsByProfessional(
    professionalUuid: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: { 
          skilledProfessionalId: professionalUuid,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = offerings.length > 0 
        ? await this.getSkilledProfessionalDetails(professionalUuid)
        : null;

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional)
      );

      return BaseResponseDto.ok(
        mappedOfferings,
        `Found ${mappedOfferings.length} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for professional ${professionalUuid}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  async getOfferingsByAccount(
    accountId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const offerings = await this.prisma.serviceOffering.findMany({
        where: { 
          accountId,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = offerings.length > 0 && offerings[0].skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(offerings[0].skilledProfessionalId)
        : null;

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional)
      );

      return BaseResponseDto.ok(
        mappedOfferings,
        `Found ${mappedOfferings.length} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for account ${accountId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  async getOfferingById(
    offeringId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const offering = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      if (!offering) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      const professional = offering.skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(offering.skilledProfessionalId)
        : null;

      const mappedOffering = this.mapToResponseDto(offering as ServiceOfferingWithDetails, professional);

      return BaseResponseDto.ok(
        mappedOffering,
        'Service offering retrieved',
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for offering ${offeringId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

 async updateServiceOffering(
  offeringId: string,
  dto: Partial<CreateServiceGrpcOfferingDto>,
  userId: string
): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
  try {
    const existing = await this.prisma.serviceOffering.findUnique({
      where: { id: offeringId },
    });

    if (!existing) {
      return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
    }

    if (existing.creatorId !== userId) {
      return BaseResponseDto.fail('Unauthorized to update this offering', 'FORBIDDEN');
    }

    // Build update data dynamically
    const updateData: any = {
      title: dto.title,
      description: dto.description,
      basePrice: dto.basePrice,
      priceUnit: dto.priceUnit,
      coverageAreas: dto.coverageAreas ? JSON.stringify(dto.coverageAreas) : undefined,
      availability: dto.availability ? JSON.stringify(dto.availability) : null,
    };

    // ========== Booking Fee Override Fields ==========
    if (dto.useCustomBookingFee !== undefined) {
      updateData.useCustomBookingFee = dto.useCustomBookingFee;
    }
    if (dto.customBookingFeeEnabled !== undefined) {
      updateData.customBookingFeeEnabled = dto.customBookingFeeEnabled;
    }
    if (dto.customBookingFeeAmount !== undefined) {
      updateData.customBookingFeeAmount = dto.customBookingFeeAmount;
    }
    if (dto.customBookingFeeCurrency !== undefined) {
      updateData.customBookingFeeCurrency = dto.customBookingFeeCurrency;
    }
    if (dto.customBookingFeeDescription !== undefined) {
      updateData.customBookingFeeDescription = dto.customBookingFeeDescription;
    }
    if (dto.customBookingFeeRefundable !== undefined) {
      updateData.customBookingFeeRefundable = dto.customBookingFeeRefundable;
    }

    // ========== Negotiable Pricing Fields ==========
    if (dto.isNegotiable !== undefined) {
      updateData.isNegotiable = dto.isNegotiable;
    }
    if (dto.minNegotiablePrice !== undefined) {
      updateData.minNegotiablePrice = dto.minNegotiablePrice;
    }
    if (dto.maxNegotiablePrice !== undefined) {
      updateData.maxNegotiablePrice = dto.maxNegotiablePrice;
    }

    const updated = await this.prisma.serviceOffering.update({
      where: { id: offeringId },
      data: updateData,
      include: { 
        category: { select: { id: true, name: true, slug: true, vertical: true } },
        reviews: { select: { rating: true } } 
      },
    });

    const professional = updated.skilledProfessionalId
      ? await this.getSkilledProfessionalDetails(updated.skilledProfessionalId)
      : null;

    // ========== NOTIFICATION FOR UPDATE (if professional exists) ==========
    if (professional?.email) {
      await this.queue.addJob(
        'notification-queue',
        'service-offering.updated',
        {
          to: professional.email,
          professionalName: professional.displayName || professional.title,
          serviceId: updated.id,
          serviceExternalId: updated.externalId,
          serviceTitle: updated.title,
          updatedAt: new Date().toISOString(),
          dashboardUrl: `https://pivota.com/professional/dashboard/services/${updated.externalId}`,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        }
      );
    }

    return BaseResponseDto.ok(
      this.mapToResponseDto(updated as unknown as ServiceOfferingWithDetails, professional),
      'Service offering updated successfully',
      'OK'
    );
  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to update offering: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Update failed', 'INTERNAL_ERROR');
  }
}

  async deleteServiceOffering(
    offeringId: string,
    userId: string
  ): Promise<BaseResponseDto<null>> {
    try {
      const existing = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
      });

      if (!existing) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      if (existing.creatorId !== userId) {
        return BaseResponseDto.fail('Unauthorized to delete this offering', 'FORBIDDEN');
      }

      const professional = existing.skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(existing.skilledProfessionalId)
        : null;

      await this.prisma.serviceOffering.update({
        where: { id: offeringId },
        data: { status: 'ARCHIVED' },
      });

      // ========== NOTIFICATION FOR DELETION ==========
      if (professional?.email) {
        await this.queue.addJob(
          'notification-queue',
          'service-offering.deleted',
          {
            to: professional.email,
            professionalName: professional.displayName || professional.title,
            serviceId: existing.id,
            serviceExternalId: existing.externalId,
            serviceTitle: existing.title,
            deletedAt: new Date().toISOString(),
            dashboardUrl: 'https://pivota.com/professional/dashboard/services',
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
          }
        );
      }

      return BaseResponseDto.ok(null, 'Service offering archived successfully', 'OK');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete offering: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Delete failed', 'INTERNAL_ERROR');
    }
  }

  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const where: any = {
        status: 'ACTIVE',
      };
      
      if (dto.vertical) {
        where.category = {
          vertical: dto.vertical
        };
      }
      
      if (dto.categoryId) where.categoryId = dto.categoryId;
      if (dto.minPrice !== undefined) where.basePrice = { gte: dto.minPrice };
      if (dto.maxPrice !== undefined) where.basePrice = { lte: dto.maxPrice };
      if (dto.isVerified !== undefined) where.isVerified = dto.isVerified;

      let orderBy: any = {};
      if (dto.sortBy === 'price_asc') {
        orderBy = { basePrice: 'asc' };
      } else if (dto.sortBy === 'price_desc') {
        orderBy = { basePrice: 'desc' };
      } else if (dto.sortBy === 'experience') {
        orderBy = { yearsExperience: 'desc' };
      } else if (dto.sortBy === 'recent') {
        orderBy = { createdAt: 'desc' };
      } else {
        orderBy = { createdAt: 'desc' };
      }

      const offerings = await this.prisma.serviceOffering.findMany({
        where,
        orderBy,
        skip: dto.offset || 0,
        take: dto.limit || 20,
        include: { 
          category: { 
            select: { 
              id: true, 
              name: true, 
              slug: true, 
              vertical: true,
              type: true
            } 
          },
          reviews: { select: { rating: true } } 
        },
      });

      const professionalIds = [...new Set(offerings.map(o => o.skilledProfessionalId).filter(Boolean))];
      const professionalDetails = new Map<string, SkilledProfessionalPublicProfileDto>();
      
      await Promise.all(
        professionalIds.map(async (id) => {
          const details = await this.getSkilledProfessionalDetails(id);
          if (details) {
            professionalDetails.set(id, details);
          }
        })
      );

      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as unknown as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
      );

      let filteredOfferings = mappedOfferings;
      if (dto.minRating !== undefined) {
        filteredOfferings = mappedOfferings.filter(
          offering => (offering.averageRating || 0) >= (dto.minRating || 0)
        );
      }

      const total = await this.prisma.serviceOffering.count({ where });

      const pagination: PaginationDto = {
        total,
        limit: dto.limit || 20,
        offset: dto.offset || 0,
        hasMore: (dto.offset || 0) + (dto.limit || 20) < total,
      };

      return BaseResponseDto.okWithPagination(
        filteredOfferings,
        pagination,
        `Found ${filteredOfferings.length} ${dto.vertical} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for vertical ${dto.vertical}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  async getOfferingsByCategory(
    data: { 
      categoryId: string; 
      limit?: number; 
      offset?: number;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId }
      });
      
      if (!category) {
        return BaseResponseDto.fail('Category not found', 'CATEGORY_NOT_FOUND');
      }
      
      if (category.type !== 'COMPLIMENTARY') {
        return BaseResponseDto.fail(
          'Service offerings can only be retrieved for COMPLIMENTARY categories', 
          'INVALID_CATEGORY_TYPE'
        );
      }
      
      const where: any = {
        categoryId: data.categoryId,
        status: 'ACTIVE',
      };
      
      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.basePrice = {};
        if (data.minPrice !== undefined) where.basePrice.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.basePrice.lte = data.maxPrice;
      }
      
      const total = await this.prisma.serviceOffering.count({ where });
      
      const offerings = await this.prisma.serviceOffering.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: data.offset || 0,
        take: data.limit || 20,
      });
      
      const professionalIds = [...new Set(offerings.map(o => o.skilledProfessionalId).filter(Boolean))];
      const professionalDetails = new Map();
      
      await Promise.all(
        professionalIds.map(async (id) => {
          const details = await this.getSkilledProfessionalDetails(id);
          if (details) {
            professionalDetails.set(id, details);
          }
        })
      );
      
      const mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as unknown as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
      );
      
      const pagination: PaginationDto = {
        total,
        limit: data.limit || 20,
        offset: data.offset || 0,
        hasMore: (data.offset || 0) + (data.limit || 20) < total,
      };
      
      return BaseResponseDto.okWithPagination(
        mappedOfferings,
        pagination,
        `Found ${mappedOfferings.length} offerings for category ${category.name}`,
        'OK'
      );
      
    } catch (error) {
      this.logger.error(`Failed to get offerings by category: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }
}