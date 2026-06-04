/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";

import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
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

// Booking DTOs (you may want to move these to your shared dtos package)
export interface CreateBookingRequestDto {
  serviceId: string;           // Service offering ID
  contractorId: string;        // Professional's UUID from Profile Service
  clientId: string;            // Customer's UUID from Profile Service
  scheduledDate: Date;         // When the service should be performed
  locationCity?: string;       // Override location if different
  customerNotes?: string;      // Special instructions
  agreedPrice?: number;        // Can override the listed price
  currency?: string;           // Default KES
  durationHours?: number;
}

export interface UpdateBookingStatusRequestDto {
  bookingId: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
  reason?: string;              // For cancellation/decline reasons
  performedBy: string;         // UUID of user performing action (contractor or client)
}

export interface GetBookingsRequestDto {
  userId: string;               // Can be client or contractor
  userType: 'CLIENT' | 'CONTRACTOR';
  status?: string;              // Filter by status
  limit?: number;
  offset?: number;
}

// gRPC interface for Profile Service
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

/**
 * Internal interface for ServiceBooking with relations
 */
interface ServiceBookingWithDetails {
  id: string;
  externalId: string;
  contractorId: string;
  clientId: string;
  serviceId: string | null;
  service: ServiceOfferingWithDetails | null;
  contractorName: string | null;
  serviceTitle: string | null;
  status: string;
  scheduledDate: Date | null;
  locationCity: string | null;
  agreedPrice: number | null;
  currency: string;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  serviceAreas: any | null;
  hourlyRate: number | null;
  title: string;
  description: string;
  categoryId: string;
  basePrice: number;
  priceUnit: string;
  currency: string;
  locationCity: string;
  locationNeighborhood: string | null;
  availability: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string; vertical: string };
  reviews: { rating: number }[];
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);
  private profileGrpc: ProfileServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
  ) {
    this.profileGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  private parseAvailability(availabilityStr: string | null): DayAvailabilityDto[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr) as DayAvailabilityDto[];
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON string`);
      return undefined;
    }
  }

  private parseServiceAreas(serviceAreasJson: any | null): string[] | undefined {
    if (!serviceAreasJson) return undefined;
    try {
      if (typeof serviceAreasJson === 'string') {
        return JSON.parse(serviceAreasJson);
      }
      return serviceAreasJson as string[];
    } catch (e) {
      this.logger.error(`Failed to parse service areas JSON`);
      return undefined;
    }
  }

  /**
   * Fetch skilled professional details from Profile Service via gRPC
   */
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


/**
 * Fetch user details from Profile Service via gRPC
 */
private async getUserDetails(userUuid: string): Promise<{ 
  uuid: string; 
  displayName: string; 
  email: string; 
  phone: string;
  accountUuid: string;
} | null> {
  try {
    const response = await firstValueFrom(
      this.profileGrpc.GetUserProfileByUuid({ userUuid })
    );
    
    if (response.success && response.data) {
      // The response structure from GetUserProfileByUuid returns UserProfileResponseDto
      // which contains user and account objects
      const userData = response.data.user;
      const accountData = response.data.account;
      
      return {
        uuid: userData?.uuid || response.data.user?.uuid,
        displayName: userData?.firstName 
          ? `${userData.firstName} ${userData.lastName || ''}`.trim()
          : userData?.email || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        accountUuid: accountData?.uuid || '',
      };
    }
    return null;
  } catch (error) {
    this.logger.warn(`Failed to fetch user details for ${userUuid}: ${error.message}`);
    return null;
  }
}

  /**
   * Validate that the skilled professional profile exists and is active
   */
  private async validateSkilledProfessionalProfile(skilledProfessionalId: string): Promise<SkilledProfessionalPublicProfileDto> {
    const professional = await this.getSkilledProfessionalDetails(skilledProfessionalId);
    
    if (!professional) {
      throw new BadRequestException(
        'Skilled professional profile not found. Please create a professional profile first.'
      );
    }
    
    return professional;
  }

  /**
   * Validate category exists and is of type COMPLIMENTARY
   */
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

  /**
   * Maps Prisma result to Response DTO
   */
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
      serviceAreas: professional?.serviceAreas ?? this.parseServiceAreas(item.serviceAreas),
      hourlyRate: professional?.hourlyRate ?? item.hourlyRate ?? undefined,
      
      title: item.title,
      description: item.description,
      verticals: [vertical],
      categoryId: item.categoryId,
      categoryName: item.category?.name,
      
      basePrice: item.basePrice,
      priceUnit: item.priceUnit,
      currency: item.currency,
      
      locationCity: item.locationCity,
      locationNeighborhood: item.locationNeighborhood ?? undefined,
      
      availability: this.parseAvailability(item.availability),
      
      status: item.status,
      expiresAt: item.expiresAt,
      
      averageRating: Number(average.toFixed(1)),
      reviewCount: reviews.length,
      
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Maps booking to response DTO
   */
  private mapBookingToResponseDto(booking: ServiceBookingWithDetails): any {
    return {
      id: booking.id,
      externalId: booking.externalId,
      contractorId: booking.contractorId,
      clientId: booking.clientId,
      serviceId: booking.serviceId,
      service: booking.service ? {
        id: booking.service.id,
        title: booking.service.title,
        basePrice: booking.service.basePrice,
        priceUnit: booking.service.priceUnit,
        currency: booking.service.currency,
      } : null,
      contractorName: booking.contractorName,
      serviceTitle: booking.serviceTitle,
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      locationCity: booking.locationCity,
      agreedPrice: booking.agreedPrice,
      currency: booking.currency,
      customerNotes: booking.customerNotes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  // ========================================================================
  // SERVICE OFFERING CRUD OPERATIONS (Existing methods)
  // ========================================================================

  /**
   * Persists a new service offering
   */
  async createServiceOffering(
    dto: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const professional = await this.validateSkilledProfessionalProfile(dto.skilledProfessionalId);
      const category = await this.validateCategory(dto.categoryId);
      await this.pricingService.validateOfferingPricing(dto);

      const professionalName = professional.displayName || professional.title;
      const professionalAvatar = professional.profileImage;
      const serviceAreas = professional.serviceAreas;
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
          serviceAreas: serviceAreas ? JSON.stringify(serviceAreas) : null,
          hourlyRate,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit || 'PER_HOUR',
          currency: dto.currency || 'KES',
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
          status: 'ACTIVE',
        },
        include: {
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } },
        },
      });

      const responseDto = this.mapToResponseDto(created as ServiceOfferingWithDetails, professional);

      return BaseResponseDto.ok(
        responseDto,
        'Service offering created successfully',
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

  /**
   * Get offerings by professional UUID
   */
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

  /**
   * Get offerings by account ID
   */
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

  /**
   * Get single offering by ID
   */
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

  /**
   * Update a service offering
   */
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

      const updated = await this.prisma.serviceOffering.update({
        where: { id: offeringId },
        data: {
          title: dto.title,
          description: dto.description,
          basePrice: dto.basePrice,
          priceUnit: dto.priceUnit,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood,
          availability: dto.availability ? JSON.stringify(dto.availability) : null,
        },
        include: { 
          category: { select: { id: true, name: true, slug: true, vertical: true } },
          reviews: { select: { rating: true } } 
        },
      });

      const professional = updated.skilledProfessionalId
        ? await this.getSkilledProfessionalDetails(updated.skilledProfessionalId)
        : null;

      return BaseResponseDto.ok(
        this.mapToResponseDto(updated as ServiceOfferingWithDetails, professional),
        'Service offering updated successfully',
        'OK'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update offering: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Update failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Delete (soft delete) a service offering
   */
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

      await this.prisma.serviceOffering.update({
        where: { id: offeringId },
        data: { status: 'ARCHIVED' },
      });

      return BaseResponseDto.ok(null, 'Service offering archived successfully', 'OK');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete offering: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Delete failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Fetches offerings based on Vertical
   */
 /**
 * Fetches offerings based on Vertical
 */
async getOfferingsByVertical(
  dto: GetOfferingByVerticalRequestDto
): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
  try {
    // Build where clause - FIX: Use proper Prisma JSON filtering
    const where: any = {
      status: 'ACTIVE',
    };
    
    // Filter by category vertical (not directly on service offering)
    if (dto.vertical) {
      where.category = {
        vertical: dto.vertical
      };
    }
    
    if (dto.city) where.locationCity = dto.city;
    if (dto.categoryId) where.categoryId = dto.categoryId;
    if (dto.minPrice !== undefined) where.basePrice = { gte: dto.minPrice };
    if (dto.maxPrice !== undefined) where.basePrice = { lte: dto.maxPrice };
    if (dto.isVerified !== undefined) where.isVerified = dto.isVerified;

    // Build order by
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
      // Default: rating (but rating is calculated, not stored)
      orderBy = { createdAt: 'desc' };
    }

    // Get offerings with pagination
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

    // Get professional details for each offering
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

    // Map offerings to response DTO
    const mappedOfferings = offerings.map(offering => 
      this.mapToResponseDto(offering as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
    );

    // If filtering by minRating, filter after mapping (since rating is calculated)
    let filteredOfferings = mappedOfferings;
    if (dto.minRating !== undefined) {
      filteredOfferings = mappedOfferings.filter(
        offering => (offering.averageRating || 0) >= (dto.minRating || 0)
      );
    }

    // Get total count for pagination
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

  /**
   * Get offerings by category
   */
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
      
      if (data.city) {
        where.locationCity = data.city;
      }
      
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
        this.mapToResponseDto(offering as ServiceOfferingWithDetails, professionalDetails.get(offering.skilledProfessionalId))
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
 * Create a new booking
 * Customer books a service offering from a professional
 */
async createBooking(
  dto: CreateBookingRequestDto
): Promise<BaseResponseDto<any>> {
  try {
    // 1. Validate the service offering exists and is active
    const serviceOffering = await this.prisma.serviceOffering.findUnique({
      where: { externalId: dto.serviceId },
      include: {
        category: true,
      },
    });

    if (!serviceOffering) {
      return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
    }

    if (serviceOffering.status !== 'ACTIVE') {
      return BaseResponseDto.fail('Service offering is not available for booking', 'SERVICE_UNAVAILABLE');
    }

    // 2. Validate the client exists and get their account info
    const client = await this.getUserDetails(dto.clientId);
    if (!client) {
      return BaseResponseDto.fail('Client profile not found', 'CLIENT_NOT_FOUND');
    }

    // 3. Get the contractor's skilled professional profile
    const contractorProfile = await this.getSkilledProfessionalDetails(dto.contractorId);
    if (!contractorProfile) {
      return BaseResponseDto.fail('Contractor profile not found', 'CONTRACTOR_NOT_FOUND');
    }

    // 4. CRITICAL VALIDATION: Prevent self-booking
    if (client.accountUuid === contractorProfile.accountUuid) {
      return BaseResponseDto.fail(
        'You cannot book your own service offering',
        'SELF_BOOKING_NOT_ALLOWED'
      );
    }

    if (serviceOffering.creatorId === dto.clientId) {
      return BaseResponseDto.fail(
        'You cannot book a service that you created',
        'SELF_BOOKING_NOT_ALLOWED'
      );
    }

    // ========== SERVICE AREA VALIDATION ==========
    const serviceAreas = this.parseServiceAreas(serviceOffering.serviceAreas) || [];
    const bookingCity = dto.locationCity || serviceOffering.locationCity;
    
    if (serviceAreas.length > 0 && !serviceAreas.includes(bookingCity)) {
      return BaseResponseDto.fail(
        `This service is not available in ${bookingCity}. Available service areas: ${serviceAreas.join(', ')}`,
        'SERVICE_AREA_NOT_COVERED'
      );
    }

    // ========== PRICE VALIDATION ==========
    let totalPrice = dto.agreedPrice || serviceOffering.basePrice;
    const priceUnit = serviceOffering.priceUnit;
    
    // Calculate total price for hourly services
    if (priceUnit === 'PER_HOUR' && dto.durationHours && dto.durationHours > 0) {
      totalPrice = (dto.agreedPrice || serviceOffering.basePrice) * dto.durationHours;
      this.logger.log(`Hourly service: ${dto.durationHours} hours × ${dto.agreedPrice || serviceOffering.basePrice} = ${totalPrice}`);
    }
    
    // Validate price range (not more than 50% above base, not less than 50% below)
    const maxAllowedPrice = serviceOffering.basePrice * 1.5;
    const minAllowedPrice = serviceOffering.basePrice * 0.5;
    
    if (totalPrice > maxAllowedPrice) {
      return BaseResponseDto.fail(
        `The total price (${totalPrice} ${serviceOffering.currency}) exceeds the maximum allowed (${maxAllowedPrice} ${serviceOffering.currency}). Please contact the professional for custom pricing.`,
        'PRICE_TOO_HIGH'
      );
    }
    
    if (totalPrice < minAllowedPrice && totalPrice !== serviceOffering.basePrice) {
      return BaseResponseDto.fail(
        `The total price (${totalPrice} ${serviceOffering.currency}) seems too low. The base price is ${serviceOffering.basePrice} ${serviceOffering.currency}.`,
        'PRICE_TOO_LOW'
      );
    }

    // ========== AVAILABILITY VALIDATION ==========
    const scheduledDate = new Date(dto.scheduledDate);
    const dayOfWeek = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
    const scheduledTime = scheduledDate.toTimeString().slice(0, 5);
    
    const availability = this.parseAvailability(serviceOffering.availability);
    
    if (availability && availability.length > 0) {
      const dayAvailability = availability.find(a => a.day === dayOfWeek);
      
      if (!dayAvailability) {
        return BaseResponseDto.fail(
          `The professional is not available on ${dayOfWeek}s. Available days: ${availability.map(a => a.day).join(', ')}`,
          'DAY_NOT_AVAILABLE'
        );
      }
      
      if (dayAvailability.isClosed) {
        return BaseResponseDto.fail(
          `The professional is closed on ${dayOfWeek}s`,
          'DAY_CLOSED'
        );
      }
      
      const openTime = dayAvailability.open;
      const closeTime = dayAvailability.close;
      
      // Calculate end time for duration-based bookings
      let endTime = scheduledTime;
      if (dto.durationHours && dto.durationHours > 0) {
        const endDate = new Date(scheduledDate);
        endDate.setHours(endDate.getHours() + dto.durationHours);
        endTime = endDate.toTimeString().slice(0, 5);
      }
      
      if (scheduledTime < openTime || scheduledTime > closeTime) {
        return BaseResponseDto.fail(
          `The scheduled start time (${scheduledTime}) is outside working hours (${openTime} - ${closeTime}) on ${dayOfWeek}`,
          'TIME_OUTSIDE_HOURS'
        );
      }
      
      // Check if end time exceeds closing time
      if (dto.durationHours && dto.durationHours > 0 && endTime > closeTime) {
        return BaseResponseDto.fail(
          `The service would end at ${endTime}, which is after closing time (${closeTime}). Please adjust the start time or duration.`,
          'END_TIME_EXCEEDS_CLOSING'
        );
      }
    }

    // ========== CHECK FOR OVERLAPPING BOOKINGS ==========
    const existingBookings = await this.prisma.serviceBooking.findMany({
      where: {
        contractorId: dto.contractorId,
        scheduledDate: {
          gte: new Date(scheduledDate.setHours(0, 0, 0, 0)),
          lt: new Date(scheduledDate.setHours(23, 59, 59, 999)),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    // Check for time slot conflicts
    const requestedStart = new Date(dto.scheduledDate);
    const requestedEnd = new Date(requestedStart);
    if (dto.durationHours && dto.durationHours > 0) {
      requestedEnd.setHours(requestedEnd.getHours() + dto.durationHours);
    } else {
      requestedEnd.setHours(requestedEnd.getHours() + 1); // Default 1 hour duration
    }

    for (const existing of existingBookings) {
      const existingStart = new Date(existing.scheduledDate!);
      const existingEnd = new Date(existingStart);
      
      // Assuming default 1 hour for existing bookings without duration
      existingEnd.setHours(existingEnd.getHours() + 1);
      
      const hasConflict = (
        (requestedStart >= existingStart && requestedStart < existingEnd) ||
        (requestedEnd > existingStart && requestedEnd <= existingEnd) ||
        (requestedStart <= existingStart && requestedEnd >= existingEnd)
      );
      
      if (hasConflict) {
        return BaseResponseDto.fail(
          `Contractor is already booked during the requested time slot (${existingStart.toLocaleTimeString()} - ${existingEnd.toLocaleTimeString()})`,
          'CONFLICTING_BOOKING'
        );
      }
    }

    // ========== CREATE THE BOOKING ==========
    const booking = await this.prisma.serviceBooking.create({
      data: {
        contractorId: dto.contractorId,
        clientId: dto.clientId,
        serviceId: serviceOffering.id,
        contractorName: contractorProfile.displayName || contractorProfile.title,
        serviceTitle: serviceOffering.title,
        status: 'PENDING',
        clientName: client.displayName,      // Store client name
        clientPhone: client.phone,            // Store client phone for SMS
        clientEmail: client.email,            // Store client email for notifications
        scheduledDate: dto.scheduledDate,
        locationCity: bookingCity,
        agreedPrice: totalPrice,
        currency: dto.currency || serviceOffering.currency || 'KES',
        customerNotes: dto.customerNotes,
        
      },
      include: {  
        service: {
          include: {
            category: true,
          },
        },
      },
    });

    this.logger.log(
      `Booking created: ${booking.id} - Client: ${dto.clientId} - Contractor: ${dto.contractorId} - Price: ${totalPrice} ${booking.currency} - Duration: ${dto.durationHours || 1}h`
    );

    return BaseResponseDto.ok(
      this.mapBookingToResponseDto(booking as unknown as ServiceBookingWithDetails),
      'Booking created successfully. Waiting for contractor confirmation.',
      'CREATED'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to create booking: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Booking creation failed', 'INTERNAL_ERROR');
  }
}

  /**
   * Accept a booking (Contractor action)
   * Professional confirms they will perform the service
   */
  async acceptBooking(
    bookingExternalId: string,
    contractorId: string
  ): Promise<BaseResponseDto<any>> {
    try {
      // 1. Find the booking
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingExternalId },
        include: {
          service: true,
        },
      });

      if (!booking) {
        return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
      }

      // 2. Verify the contractor is the correct one
      if (booking.contractorId !== contractorId) {
        return BaseResponseDto.fail('Unauthorized: This booking belongs to another contractor', 'FORBIDDEN');
      }

      // 3. Validate booking is in PENDING state
      if (booking.status !== 'PENDING') {
        return BaseResponseDto.fail(
          `Cannot accept booking in ${booking.status} status. Only PENDING bookings can be accepted.`,
          'INVALID_STATUS'
        );
      }

      // 4. Update booking status to CONFIRMED
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { externalId: bookingExternalId },
        data: {
          status: 'CONFIRMED',
          updatedAt: new Date(),
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Booking ${bookingExternalId} accepted by contractor ${contractorId}`);

      // TODO: Emit event to Payment Service to release escrow or confirm hold
      // await this.eventBus.emit('booking.confirmed', { bookingId, contractorId });

      return BaseResponseDto.ok(
        this.mapBookingToResponseDto(updatedBooking as unknown as ServiceBookingWithDetails),
        'Booking accepted successfully. Service is now confirmed.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to accept booking ${bookingExternalId}: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Acceptance failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Decline a booking (Contractor action)
   * Professional rejects the booking request
   */
  async declineBooking(
    bookingExternalId: string,
    contractorId: string,
    reason?: string
  ): Promise<BaseResponseDto<any>> {
    try {
      // 1. Find the booking
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingExternalId },
      });

      if (!booking) {
        return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
      }

      // 2. Verify the contractor is the correct one
      if (booking.contractorId !== contractorId) {
        return BaseResponseDto.fail('Unauthorized: This booking belongs to another contractor', 'FORBIDDEN');
      }

      // 3. Validate booking is in PENDING state
      if (booking.status !== 'PENDING') {
        return BaseResponseDto.fail(
          `Cannot decline booking in ${booking.status} status. Only PENDING bookings can be declined.`,
          'INVALID_STATUS'
        );
      }

      // 4. Update booking status to CANCELLED (using CANCELLED for declined bookings)
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { externalId: bookingExternalId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
          customerNotes: reason 
            ? `${booking.customerNotes || ''}\n[Declined by contractor]: ${reason}`
            : booking.customerNotes,
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Booking ${bookingExternalId} declined by contractor ${contractorId}. Reason: ${reason || 'Not provided'}`);

      // TODO: Emit event to Payment Service to release any escrow holds
      // await this.eventBus.emit('booking.declined', { bookingId, contractorId, reason });

      return BaseResponseDto.ok(
        this.mapBookingToResponseDto(updatedBooking as unknown as ServiceBookingWithDetails),
        reason 
          ? `Booking declined: ${reason}`
          : 'Booking declined successfully.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to decline booking ${bookingExternalId}: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Decline failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Cancel a booking (Customer or Contractor action)
   * Either party can cancel a confirmed booking
   */
  async cancelBooking(
    bookingExternalId: string,
    userId: string,
    userType: 'CLIENT' | 'CONTRACTOR',
    reason?: string
  ): Promise<BaseResponseDto<any>> {
    try {
      // 1. Find the booking
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingExternalId },
        include: {
          service: true,
        },
      });

      if (!booking) {
        return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
      }

      // 2. Verify the user has permission to cancel
      const isClient = userType === 'CLIENT' && booking.clientId === userId;
      const isContractor = userType === 'CONTRACTOR' && booking.contractorId === userId;

      if (!isClient && !isContractor) {
        return BaseResponseDto.fail('Unauthorized: You cannot cancel this booking', 'FORBIDDEN');
      }

      // 3. Validate booking can be cancelled (PENDING or CONFIRMED)
      if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
        return BaseResponseDto.fail(
          `Cannot cancel booking in ${booking.status} status. Only PENDING or CONFIRMED bookings can be cancelled.`,
          'INVALID_STATUS'
        );
      }

      // 4. Calculate cancellation penalty if applicable (configurable business logic)
      // For MVP, we'll allow free cancellation
      const cancelledBy = isClient ? 'client' : 'contractor';
      const cancellationNote = `Cancelled by ${cancelledBy}${reason ? `: ${reason}` : ''}`;

      // 5. Update booking status to CANCELLED
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { externalId: bookingExternalId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
          customerNotes: `${booking.customerNotes || ''}\n[${cancellationNote}]`,
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Booking ${bookingExternalId} cancelled by ${userType}: ${userId}. Reason: ${reason || 'Not provided'}`);

      // TODO: Emit event to Payment Service for refund processing
      // await this.eventBus.emit('booking.cancelled', { 
      //   bookingId, 
      //   cancelledBy: userType, 
      //   userId, 
      //   reason,
      //   shouldRefund: true 
      // });

      return BaseResponseDto.ok(
        this.mapBookingToResponseDto(updatedBooking as unknown as ServiceBookingWithDetails),
        reason 
          ? `Booking cancelled: ${reason}`
          : 'Booking cancelled successfully.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to cancel booking ${bookingExternalId}: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Cancellation failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Complete a booking (Contractor action)
   * Marks the service as completed successfully
   */
  async completeBooking(
    bookingExternalId: string,
    contractorId: string
  ): Promise<BaseResponseDto<any>> {
    try {
      // 1. Find the booking
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingExternalId },
      });

      if (!booking) {
        return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
      }

      // 2. Verify the contractor is the correct one
      if (booking.contractorId !== contractorId) {
        return BaseResponseDto.fail('Unauthorized: You cannot complete this booking', 'FORBIDDEN');
      }

      // 3. Validate booking is in CONFIRMED state
      if (booking.status !== 'CONFIRMED') {
        return BaseResponseDto.fail(
          `Cannot complete booking in ${booking.status} status. Only CONFIRMED bookings can be completed.`,
          'INVALID_STATUS'
        );
      }

      // 4. Update booking status to COMPLETED
      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { externalId: bookingExternalId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
      });

      this.logger.log(`Booking ${bookingExternalId} completed by contractor ${contractorId}`);

      // TODO: Emit event to Payment Service to release payment to contractor
      // await this.eventBus.emit('booking.completed', { bookingId, contractorId });

      return BaseResponseDto.ok(
        this.mapBookingToResponseDto(updatedBooking as unknown as ServiceBookingWithDetails),
        'Service completed successfully. Payment will be released to you shortly.',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to complete booking ${bookingExternalId}: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Completion failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get my bookings (for customers/clients)
   * View all bookings made by the authenticated customer
   */
  async getMyBookingsAsCustomer(
    clientId: string,
    status?: string,
    limit= 20,
    offset = 0
  ): Promise<BaseResponseDto<any>> {
    try {
      // Build where clause
      const where: any = {
        clientId: clientId,
      };

      if (status) {
        where.status = status;
      }

      // Get total count
      const total = await this.prisma.serviceBooking.count({ where });

      // Get paginated bookings
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip: offset,
        take: limit,
      });

      const mappedBookings = bookings.map(booking => 
        this.mapBookingToResponseDto(booking as unknown as ServiceBookingWithDetails)
      );

      const pagination: PaginationDto = {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedBookings,
        pagination,
        `Found ${mappedBookings.length} bookings`,
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch customer bookings for ${clientId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get my bookings (for professionals/contractors)
   * View all booking requests received by the authenticated professional
   */
  async getMyBookingsAsProfessional(
    contractorId: string,
    status?: string,
    limit  = 20,
    offset = 0
  ): Promise<BaseResponseDto<any>> {
    try {
      // Build where clause
      const where: any = {
        contractorId: contractorId,
      };

      if (status) {
        where.status = status;
      }

      // Get total count
      const total = await this.prisma.serviceBooking.count({ where });

      // Get paginated bookings
      const bookings = await this.prisma.serviceBooking.findMany({
        where,
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      });

      // Fetch client details for each booking (optional - for UI display)
      const clientIds = [...new Set(bookings.map(b => b.clientId))];
      const clientDetails = new Map();
      
      await Promise.all(
        clientIds.map(async (id) => {
          const details = await this.getUserDetails(id);
          if (details) {
            clientDetails.set(id, details);
          }
        })
      );

      const mappedBookings = bookings.map(booking => {
        const mapped = this.mapBookingToResponseDto(booking as unknown as ServiceBookingWithDetails);
        const client = clientDetails.get(booking.clientId);
        if (client) {
          mapped.client = {
            uuid: client.uuid,
            name: client.displayName,
            email: client.email,
            phone: client.phone,
          };
        }
        return mapped;
      });

      const pagination: PaginationDto = {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedBookings,
        pagination,
        `Found ${mappedBookings.length} booking requests`,
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch contractor bookings for ${contractorId}: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

 
/**
 * Get booking details by ID
 * View detailed information about a specific booking
 */
async getBookingDetails(
  bookingId: string,  // This is now the externalId (UUID)
  userId: string,
  userType: 'CLIENT' | 'CONTRACTOR'
): Promise<BaseResponseDto<any>> {
  try {
    // Find the booking by externalId (UUID), not by internal id
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingId },  // Use externalId
      include: {
        service: {
          include: {
            category: true,
            reviews: true,
          },
        },
      },
    });

    if (!booking) {
      return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
    }

    // Verify user has access to this booking
    const isClient = userType === 'CLIENT' && booking.clientId === userId;
    const isContractor = userType === 'CONTRACTOR' && booking.contractorId === userId;

    if (!isClient && !isContractor) {
      return BaseResponseDto.fail('Unauthorized: You cannot view this booking', 'FORBIDDEN');
    }

    // Fetch additional details from Profile Service
    const [contractorDetails, clientDetails] = await Promise.all([
      this.getSkilledProfessionalDetails(booking.contractorId),
      this.getUserDetails(booking.clientId),
    ]);

    const mappedBooking = this.mapBookingToResponseDto(booking as ServiceBookingWithDetails);
    
    // Enrich with full profile details
    mappedBooking.contractor = contractorDetails ? {
      uuid: contractorDetails.uuid,
      name: contractorDetails.displayName || contractorDetails.title,
      profileImage: contractorDetails.profileImage,
      isVerified: contractorDetails.isVerified,
      rating: contractorDetails.averageRating,
      phone: contractorDetails.phone,
      email: contractorDetails.email,
    } : null;

    mappedBooking.client = clientDetails ? {
      uuid: clientDetails.uuid,
      name: clientDetails.displayName,
      email: clientDetails.email,
      phone: clientDetails.phone,
    } : null;

    // Add service offering details if available
    if (booking.service) {
      mappedBooking.serviceDetails = {
        id: booking.service.id,
        title: booking.service.title,
        description: booking.service.description,
        basePrice: booking.service.basePrice,
        priceUnit: booking.service.priceUnit,
        category: booking.service.category?.name,
        locationCity: booking.service.locationCity,
        locationNeighborhood: booking.service.locationNeighborhood,
      };
    }

    return BaseResponseDto.ok(
      mappedBooking,
      'Booking details retrieved successfully',
      'OK'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to fetch booking details for ${bookingId}: ${err.message}`);
    return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
  }
}

  /**
   * Get upcoming bookings for a professional (for dashboard)
   */
  async getUpcomingBookingsForProfessional(
    contractorId: string,
    limit = 10
  ): Promise<BaseResponseDto<any>> {
    try {
      const bookings = await this.prisma.serviceBooking.findMany({
        where: {
          contractorId: contractorId,
          status: { in: ['CONFIRMED'] },
          scheduledDate: { gte: new Date() },
        },
        include: {
          service: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        take: limit,
      });

      const mappedBookings = bookings.map(booking => 
        this.mapBookingToResponseDto(booking as unknown as ServiceBookingWithDetails)
      );

      return BaseResponseDto.ok(
        mappedBookings,
        `Found ${mappedBookings.length} upcoming bookings`,
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch upcoming bookings: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  /**
   * Get booking statistics for a professional
   */
  async getProfessionalBookingStats(
    contractorId: string
  ): Promise<BaseResponseDto<any>> {
    try {
      const stats = await this.prisma.serviceBooking.groupBy({
        by: ['status'],
        where: {
          contractorId: contractorId,
        },
        _count: {
          id: true,
        },
      });

      const totalBookings = stats.reduce((acc, curr) => acc + curr._count.id, 0);
      
      const statusMap: Record<string, number> = {};
      stats.forEach(stat => {
        statusMap[stat.status] = stat._count.id;
      });

      // Get upcoming confirmed bookings
      const upcomingCount = await this.prisma.serviceBooking.count({
        where: {
          contractorId: contractorId,
          status: 'CONFIRMED',
          scheduledDate: { gte: new Date() },
        },
      });

      // Get completed bookings this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const completedThisMonth = await this.prisma.serviceBooking.count({
        where: {
          contractorId: contractorId,
          status: 'COMPLETED',
          updatedAt: { gte: startOfMonth },
        },
      });

      return BaseResponseDto.ok(
        {
          total: totalBookings,
          pending: statusMap['PENDING'] || 0,
          confirmed: statusMap['CONFIRMED'] || 0,
          completed: statusMap['COMPLETED'] || 0,
          cancelled: statusMap['CANCELLED'] || 0,
          upcoming: upcomingCount,
          completedThisMonth: completedThisMonth,
        },
        'Booking statistics retrieved',
        'OK'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch booking stats: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }
}