/* eslint-disable @typescript-eslint/no-unused-vars */
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
  GetOfferingByIdRequestDto,
  GetAllOfferingsRequestDto,
  GetOfferingsByCategoryRequestDto,
  GetOfferingsByProfessionalRequestDto,
  GetOfferingsByAccountRequestDto,
} from '@pivota-api/dtos';
import { ContractorsPricingService } from './contractors-pricing.service';
import { QueueService, RedisService, CacheKeys } from '@pivota-api/shared-redis';

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
  
  // ========== Booking Fee Override Fields ==========
  useCustomBookingFee: boolean;
  customBookingFeeEnabled: boolean | null;
  customBookingFeeAmount: number | null;
  customBookingFeeCurrency: string | null;
  customBookingFeeDescription: string | null;
  customBookingFeeRefundable: boolean | null;
  
  // ========== Negotiable Pricing Fields ==========
  isNegotiable: boolean;
  minNegotiablePrice: number | null;
  maxNegotiablePrice: number | null;
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);
  private profileGrpc: ProfileServiceGrpc;

  // Cache TTLs
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual offerings
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
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
      
      // ========== Negotiable Pricing Fields ==========
      isNegotiable: item.isNegotiable,
      minNegotiablePrice: item.minNegotiablePrice,
      maxNegotiablePrice: item.maxNegotiablePrice,
    };
  }

  /**
   * Calculate effective TTL with smart overrides
   */
  private getEffectiveTTL(requestedTTL: number | undefined, options: any): number {
    const ttl = requestedTTL || this.DEFAULT_CACHE_TTL;
    
    // If filter includes time-sensitive data
    if (options.vertical === 'HOT_DEALS' || options.minPrice !== undefined) {
      return Math.min(ttl, 60); // Max 1 minute for deals
    }
    
    // If verified only, cache longer
    if (options.verifiedOnly) {
      return Math.max(ttl, 600); // Min 10 minutes for verified
    }
    
    // Default TTL
    return ttl;
  }

  /**
   * Invalidate cache when offerings change
   */
  private async invalidateCache(data: {
    offeringId?: string;
    vertical?: string;
    categoryId?: string;
    accountId?: string;
    professionalId?: string;
    allListings?: boolean;
  }): Promise<void> {
    const jobs = [];

    // 1. Invalidate listings
    if (data.allListings || data.vertical || data.categoryId) {
      jobs.push(
        this.queue.addJob(
          'cache-service-offering-queue',
          'invalidate-service-listings',
          {
            vertical: data.vertical,
            categoryId: data.categoryId,
            accountId: data.accountId,
            professionalId: data.professionalId,
          },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    // 2. Invalidate single offering
    if (data.offeringId) {
      jobs.push(
        this.queue.addJob(
          'cache-service-offering-queue',
          'invalidate-single-service',
          { offeringId: data.offeringId },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    await Promise.all(jobs);
    this.logger.log(`📋 Cache invalidation queued: ${JSON.stringify(data)}`);
  }

  // ========================================================================
  // SERVICE OFFERING CRUD OPERATIONS (WITH CACHE INVALIDATION)
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

      // ========== INVALIDATE CACHE ==========
      await this.invalidateCache({
        vertical: category.vertical,
        categoryId: category.id,
        professionalId: dto.skilledProfessionalId,
        allListings: true,
      });

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

  async updateServiceOffering(
    offeringId: string,
    dto: Partial<CreateServiceGrpcOfferingDto>,
    userId: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const existing = await this.prisma.serviceOffering.findUnique({
        where: { id: offeringId },
        include: { category: true },
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

      // ========== INVALIDATE CACHE ==========
      await this.invalidateCache({
        offeringId,
        vertical: existing.category?.vertical,
        categoryId: existing.categoryId,
        professionalId: existing.skilledProfessionalId,
        allListings: true,
      });

      // ========== NOTIFICATION FOR UPDATE ==========
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
        include: { category: true },
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

      // ========== INVALIDATE CACHE ==========
      await this.invalidateCache({
        offeringId,
        vertical: existing.category?.vertical,
        categoryId: existing.categoryId,
        professionalId: existing.skilledProfessionalId,
        allListings: true,
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

  // ========================================================================
  // PUBLIC LISTING METHODS (WITH FULL CACHE CONTROL USING DTOS)
  // ========================================================================

  /**
   * Get all offerings with full cache control
   */
  async getAllOfferings(
    dto: GetAllOfferingsRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ✅ Explicitly convert booleans from gRPC
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const verifiedOnly = dto.verifiedOnly === true;
    
    const {
      limit,
      offset,
      city,
      minPrice,
      maxPrice,
      sortBy,
      minRating,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    // Prepare data for execution
    const data = {
      limit,
      offset,
      city,
      minPrice,
      maxPrice,
      sortBy,
      minRating,
      verifiedOnly,
    };

    // ✅ Log the actual values for debugging
    this.logger.log(
      `📊 getAllOfferings: bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    // If bypassCache is true, skip cache entirely
    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetAllOfferings(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    // Generate cache key
    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getListingKey({
      vertical: undefined,
      categoryId: undefined,
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      sortBy: data.sortBy,
      minRating: data.minRating,
      verifiedOnly: data.verifiedOnly,
      page: page,
      limit: data.limit || 20,
    });

    try {
      // Try to get from cache (unless skipCache is true)
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: ServiceOfferingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} service offerings`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      // Cache miss or refresh - fetch from database
      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetAllOfferings(data);

      // Write to cache (unless readOnly is true)
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getAllOfferings: ${error.message}`);
      return this.executeGetAllOfferings(data);
    }
  }

  /**
   * Private method that actually executes the query for getAllOfferings
   */
  private async executeGetAllOfferings(data: {
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
      const where: any = {
        status: 'ACTIVE',
      };

      if (data.minPrice !== undefined || data.maxPrice !== undefined) {
        where.basePrice = {};
        if (data.minPrice !== undefined) where.basePrice.gte = data.minPrice;
        if (data.maxPrice !== undefined) where.basePrice.lte = data.maxPrice;
      }

      if (data.verifiedOnly === true) {
        where.isVerified = true;
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'price_asc':
          orderBy = { basePrice: 'asc' };
          break;
        case 'price_desc':
          orderBy = { basePrice: 'desc' };
          break;
        case 'rating':
          orderBy = { createdAt: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.serviceOffering.count({ where });

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

      let mappedOfferings = offerings.map(offering => 
        this.mapToResponseDto(offering as unknown as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
      );

      if (data.minRating !== undefined && data.minRating > 0) {
        mappedOfferings = mappedOfferings.filter(
          offering => (offering.averageRating || 0) >= (data.minRating || 0)
        );
      }

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

  /**
   * Get offerings by vertical with full cache control
   */
  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ✅ Explicitly convert booleans from gRPC
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const isVerified = dto.isVerified === true;
    
    const {
      vertical,
      categoryId,
      city,
      minPrice,
      maxPrice,
      minRating,
      sortBy,
      limit,
      offset,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    // Prepare data for execution
    const data = {
      vertical,
      categoryId,
      city,
      minPrice,
      maxPrice,
      minRating,
      sortBy,
      limit,
      offset,
      isVerified,
    };

    // ✅ Log the actual values for debugging
    this.logger.log(
      `📊 getOfferingsByVertical: vertical=${vertical}, bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    // If bypassCache is true, skip cache entirely
    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetOfferingsByVertical(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    // Generate cache key
    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getListingKey({
      vertical: data.vertical,
      categoryId: data.categoryId,
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      sortBy: data.sortBy as any,
      minRating: data.minRating,
      verifiedOnly: data.isVerified,
      page: page,
      limit: data.limit || 20,
    });

    try {
      // Try to get from cache (unless skipCache is true)
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: ServiceOfferingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} ${data.vertical} service offerings`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      // Cache miss or refresh - fetch from database
      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetOfferingsByVertical(data);

      // Write to cache (unless readOnly is true)
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getOfferingsByVertical: ${error.message}`);
      return this.executeGetOfferingsByVertical(data);
    }
  }

  /**
   * Private method that actually executes the query for getOfferingsByVertical
   */
  private async executeGetOfferingsByVertical(
    data: any
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const where: any = {
        status: 'ACTIVE',
      };
      
      if (data.vertical) {
        where.category = {
          vertical: data.vertical
        };
      }
      
      if (data.categoryId) where.categoryId = data.categoryId;
      if (data.minPrice !== undefined) where.basePrice = { gte: data.minPrice };
      if (data.maxPrice !== undefined) where.basePrice = { lte: data.maxPrice };
      if (data.isVerified !== undefined) where.isVerified = data.isVerified;

      let orderBy: any = {};
      if (data.sortBy === 'price_asc') {
        orderBy = { basePrice: 'asc' };
      } else if (data.sortBy === 'price_desc') {
        orderBy = { basePrice: 'desc' };
      } else if (data.sortBy === 'experience') {
        orderBy = { yearsExperience: 'desc' };
      } else if (data.sortBy === 'recent') {
        orderBy = { createdAt: 'desc' };
      } else {
        orderBy = { createdAt: 'desc' };
      }

      const offerings = await this.prisma.serviceOffering.findMany({
        where,
        orderBy,
        skip: data.offset || 0,
        take: data.limit || 20,
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
      if (data.minRating !== undefined) {
        filteredOfferings = mappedOfferings.filter(
          offering => (offering.averageRating || 0) >= (data.minRating || 0)
        );
      }

      const total = await this.prisma.serviceOffering.count({ where });

      const pagination: PaginationDto = {
        total,
        limit: data.limit || 20,
        offset: data.offset || 0,
        hasMore: (data.offset || 0) + (data.limit || 20) < total,
      };

      return BaseResponseDto.okWithPagination(
        filteredOfferings,
        pagination,
        `Found ${filteredOfferings.length} ${data.vertical} service offerings`,
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch error for vertical ${data.vertical}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get offerings by category with full cache control
   */
  async getOfferingsByCategory(
    dto: GetOfferingsByCategoryRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ✅ Explicitly convert booleans from gRPC
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      categoryId,
      limit,
      offset,
      city,
      minPrice,
      maxPrice,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    // Prepare data for execution
    const data = {
      categoryId,
      limit,
      offset,
      city,
      minPrice,
      maxPrice,
    };

    // ✅ Log the actual values for debugging
    this.logger.log(
      `📊 getOfferingsByCategory: categoryId=${categoryId}, bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    // If bypassCache is true, skip cache entirely
    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetOfferingsByCategory(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    // Generate cache key
    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getListingKey({
      vertical: undefined,
      categoryId: data.categoryId,
      city: data.city,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      sortBy: undefined,
      minRating: undefined,
      verifiedOnly: undefined,
      page: page,
      limit: data.limit || 20,
    });

    try {
      // Try to get from cache (unless skipCache is true)
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: ServiceOfferingResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} offerings for category`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      // Cache miss or refresh - fetch from database
      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetOfferingsByCategory(data);

      // Write to cache (unless readOnly is true)
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-service-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getOfferingsByCategory: ${error.message}`);
      return this.executeGetOfferingsByCategory(data);
    }
  }

  /**
   * Private method that actually executes the query for getOfferingsByCategory
   */
  private async executeGetOfferingsByCategory(
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

  /**
   * Get offerings by professional (No caching - user-specific data)
   */
  async getOfferingsByProfessional(
    dto: GetOfferingsByProfessionalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const { professionalUuid } = dto;
      
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
      this.logger.error(`Fetch error for professional: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get offerings by account (No caching - user-specific data)
   */
  async getOfferingsByAccount(
    dto: GetOfferingsByAccountRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const { accountId } = dto;
      
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
      this.logger.error(`Fetch error: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get single offering by ID with full cache control
   */
  async getOfferingById(
    dto: GetOfferingByIdRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    // ✅ Explicitly convert booleans from gRPC
    const bypassCache = dto.bypassCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      id: offeringId,
      cacheTTL = this.CACHE_TTL.SINGLE,
    } = dto;

    // ✅ Log the actual values for debugging
    this.logger.log(
      `📊 getOfferingById: offeringId=${offeringId}, bypassCache=${bypassCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      return this.executeGetOfferingById(offeringId);
    }

    const cacheKey = CacheKeys.getSingleKey(offeringId);

    try {
      // Try to get from cache
      if (!refreshCache) {
        const cached = await this.redis.getObject<{
          data: ServiceOfferingResponseDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.ok(
            cached.data,
            'Cached: Service offering retrieved',
            'OK'
          );
        }
      }

      // Cache miss or refresh - fetch from database
      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetOfferingById(offeringId);

      // Write to cache (unless readOnly is true)
      if (!readOnly && result.success && result.data) {
        await this.queue.addJob(
          'cache-service-offering-queue',
          'cache-single-service',
          {
            offeringId,
            result: result.data,
            ttl: cacheTTL,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        this.logger.debug(`📋 Queued single cache job for: ${offeringId}`);
        
        if (refreshCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              cachedAt: new Date().toISOString(),
            },
            cacheTTL
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getOfferingById: ${error.message}`);
      return this.executeGetOfferingById(offeringId);
    }
  }

  /**
   * Private method that actually executes the query for getOfferingById
   */
  private async executeGetOfferingById(
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
}