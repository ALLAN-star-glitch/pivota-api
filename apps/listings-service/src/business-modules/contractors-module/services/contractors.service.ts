/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use strict";

import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus } from '../../../../generated/prisma/client'; 

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
  CreateBookingRequestDto,
  BookingActionResponseDto,
  BookingStatusListResponseDto,
  BookingStatusDto,
} from '@pivota-api/dtos';
import { ContractorsPricingService } from './contractors-pricing.service';
import { QueueService, RedisService } from '@pivota-api/shared-redis';

export interface UpdateBookingStatusRequestDto {
  bookingId: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
  reason?: string;
  performedBy: string;
  isPlatformAdmin?: boolean;
}

export interface GetBookingsRequestDto {
  userId: string;
  userType: 'CLIENT' | 'CONTRACTOR';
  status?: string;
  limit?: number;
  offset?: number;
  isPlatformAdmin?: boolean;
}

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

interface ServiceBookingWithDetails {
  id: string;
  externalId: string;
  contractorId: string;
  clientId: string;
  serviceId: string | null;
  service: ServiceOfferingWithDetails | null;
  contractorName: string | null;
  serviceTitle: string | null;
  status: BookingStatus;
  scheduledDate: Date | null;
  locationCity: string | null;
  agreedPrice: number | null;
  currency: string;
  customerNotes: string | null;
  confirmedAt: Date | null;
  declinedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
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
}

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);
  private profileGrpc: ProfileServiceGrpc;
  
  // Redis cache keys
  private readonly BOOKING_CACHE_PREFIX = 'booking:id:';
  private readonly BOOKING_EXTERNAL_PREFIX = 'booking:external:';
  private readonly USER_BOOKINGS_PREFIX = 'user:bookings:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: ContractorsPricingService,
    @Inject('PROFILE_GRPC') private readonly profileGrpcClient: ClientGrpc,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
  ) {
    this.profileGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
  }

  // ==================== REDIS CACHE HELPER METHODS ====================
  
  private async cacheBooking(bookingId: string, bookingData: any): Promise<void> {
    const key = `${this.BOOKING_CACHE_PREFIX}${bookingId}`;
    await this.redis.setObject(key, bookingData, this.CACHE_TTL);
    this.logger.debug(`Booking cached: ${bookingId}`);
  }

  private async getCachedBooking(bookingId: string): Promise<any | null> {
    const key = `${this.BOOKING_CACHE_PREFIX}${bookingId}`;
    return await this.redis.getObject(key);
  }

  private async cacheBookingByExternalId(externalId: string, bookingData: any): Promise<void> {
    const key = `${this.BOOKING_EXTERNAL_PREFIX}${externalId}`;
    await this.redis.setObject(key, bookingData, this.CACHE_TTL);
    this.logger.debug(`Booking cached by external ID: ${externalId}`);
  }

  private async getCachedBookingByExternalId(externalId: string): Promise<any | null> {
    const key = `${this.BOOKING_EXTERNAL_PREFIX}${externalId}`;
    return await this.redis.getObject(key);
  }

  private async invalidateBooking(bookingId: string, externalId: string): Promise<void> {
    const idKey = `${this.BOOKING_CACHE_PREFIX}${bookingId}`;
    const externalKey = `${this.BOOKING_EXTERNAL_PREFIX}${externalId}`;
    await this.redis.deleteMany([idKey, externalKey]);
    this.logger.debug(`Booking cache invalidated: ${bookingId} / ${externalId}`);
  }

  private async cacheUserBookings(userId: string, bookings: any[]): Promise<void> {
    const key = `${this.USER_BOOKINGS_PREFIX}${userId}`;
    await this.redis.setObject(key, bookings, 120); // 2 minutes for user bookings
    this.logger.debug(`User bookings cached: ${userId}`);
  }

  private async getCachedUserBookings(userId: string): Promise<any[] | null> {
    const key = `${this.USER_BOOKINGS_PREFIX}${userId}`;
    return await this.redis.getObject(key);
  }

  private async invalidateUserBookings(userId: string): Promise<void> {
    const key = `${this.USER_BOOKINGS_PREFIX}${userId}`;
    await this.redis.delete(key);
    this.logger.debug(`User bookings cache invalidated: ${userId}`);
  }

  private async invalidateBothUsersBookings(clientId: string, contractorId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserBookings(clientId),
      this.invalidateUserBookings(contractorId),
    ]);
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
    };
  }

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
      confirmedAt: booking.confirmedAt,
      declinedAt: booking.declinedAt,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  // ========================================================================
  // BOOKING STATUS ENDPOINT
  // ========================================================================

  async getBookingStatuses(): Promise<BaseResponseDto<BookingStatusListResponseDto>> {
    try {
      const result = await this.prisma.$queryRaw<{ enumlabel: string }[]>`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'BookingStatus'
        )
        ORDER BY enumsortorder
      `;
      
      const statuses: BookingStatusDto[] = result.map((row, index) => ({
        value: row.enumlabel,
        label: this.getStatusLabel(row.enumlabel),
        description: this.getStatusDescription(row.enumlabel),
        badgeVariant: this.getStatusBadgeVariant(row.enumlabel),
        order: index + 1,
      }));

      return BaseResponseDto.ok(
        { statuses },
        'Booking statuses retrieved successfully',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to fetch booking statuses: ${error.message}`);
      const fallbackStatuses: BookingStatusDto[] = [
        { value: 'PENDING', label: 'Pending', description: 'Booking created, waiting for contractor response', badgeVariant: 'warning', order: 1 },
        { value: 'CONFIRMED', label: 'Confirmed', description: 'Contractor accepted the booking', badgeVariant: 'success', order: 2 },
        { value: 'COMPLETED', label: 'Completed', description: 'Service completed successfully', badgeVariant: 'info', order: 3 },
        { value: 'CANCELLED', label: 'Cancelled', description: 'Booking was cancelled', badgeVariant: 'danger', order: 4 },
        { value: 'DECLINED', label: 'Declined', description: 'Contractor declined the booking', badgeVariant: 'danger', order: 5 },
      ];
      return BaseResponseDto.ok(
        { statuses: fallbackStatuses },
        'Booking statuses retrieved successfully (fallback)',
        'OK'
      );
    }
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      DECLINED: 'Declined',
    };
    return labels[status] || status;
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      PENDING: 'Booking created, waiting for contractor response',
      CONFIRMED: 'Contractor accepted the booking',
      COMPLETED: 'Service completed successfully',
      CANCELLED: 'Booking was cancelled',
      DECLINED: 'Contractor declined the booking',
    };
    return descriptions[status] || '';
  }

  private getStatusBadgeVariant(status: string): string {
    const variants: Record<string, string> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      COMPLETED: 'info',
      CANCELLED: 'danger',
      DECLINED: 'danger',
    };
    return variants[status] || 'secondary';
  }

  // ========================================================================
  // SERVICE OFFERING CRUD OPERATIONS (unchanged)
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
      },
      include: {
        category: { select: { id: true, name: true, slug: true, vertical: true } },
        reviews: { select: { rating: true } },
      },
    });

    const responseDto = this.mapToResponseDto(created as ServiceOfferingWithDetails, professional);

    // QUEUE NOTIFICATION - Send confirmation to professional
    await this.queue.addJob(
      'notification-queue',
      'service-offering.created',
      {
        to: professional.email,
        professionalName: professionalName,
        serviceTitle: dto.title,
        serviceExternalId: created.externalId,
        categoryName: category.name,
        basePrice: dto.basePrice,
        priceUnit: dto.priceUnit || 'PER_HOUR',
        currency: dto.currency || 'KES',
        createdAt: new Date().toISOString(),
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    this.logger.log(`✅ Service offering created: ${created.id} - ${dto.title}`);

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

  async getOfferingsByProfessional(
    professionalUuid: string
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ... existing code (unchanged) ...
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
    // ... existing code (unchanged) ...
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
    // ... existing code (unchanged) ...
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
    // ... existing code (unchanged) ...
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
          coverageAreas: dto.coverageAreas ? JSON.stringify(dto.coverageAreas) : undefined,  
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

  async deleteServiceOffering(
    offeringId: string,
    userId: string
  ): Promise<BaseResponseDto<null>> {
    // ... existing code (unchanged) ...
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

  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ... existing code (unchanged) ...
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
    // ... existing code (unchanged) ...
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

  // ========================================================================
  // BOOKING METHODS WITH PLATFORM ADMIN BYPASS, QUEUE NOTIFICATIONS & REDIS CACHE
  // ========================================================================

  async createBooking(
    dto: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean }
  ): Promise<BaseResponseDto<any>> {
    try {
      const serviceOffering = await this.prisma.serviceOffering.findUnique({
        where: { externalId: dto.serviceId },
        include: { category: true },
      });

      if (!serviceOffering) {
        return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
      }

      if (serviceOffering.status !== 'ACTIVE') {
        return BaseResponseDto.fail('Service offering is not available for booking', 'SERVICE_UNAVAILABLE');
      }

      const client = await this.getUserDetails(dto.clientId);
      if (!client) {
        return BaseResponseDto.fail('Client profile not found', 'CLIENT_NOT_FOUND');
      }

      const contractorProfile = await this.getSkilledProfessionalDetails(dto.contractorId);
      if (!contractorProfile) {
        return BaseResponseDto.fail('Contractor profile not found', 'CONTRACTOR_NOT_FOUND');
      }

      let scheduledDate: Date;
      try {
        scheduledDate = new Date(dto.scheduledDate);
        if (isNaN(scheduledDate.getTime())) {
          return BaseResponseDto.fail('Invalid scheduled date format', 'INVALID_DATE_FORMAT');
        }
        const now = new Date();
        if (scheduledDate <= now) {
          return BaseResponseDto.fail('Scheduled date must be in the future', 'DATE_IN_PAST');
        }
      } catch (error) {
        return BaseResponseDto.fail('Invalid scheduled date format', 'INVALID_DATE_FORMAT');
      }

      if (!dto.isPlatformAdmin) {
        if (client.accountUuid === contractorProfile.accountUuid) {
          return BaseResponseDto.fail('You cannot book your own service offering', 'SELF_BOOKING_NOT_ALLOWED');
        }
        if (serviceOffering.creatorId === dto.clientId) {
          return BaseResponseDto.fail('You cannot book a service that you created', 'SELF_BOOKING_NOT_ALLOWED');
        }
      }

      if (!dto.isPlatformAdmin) {
        const coverageAreas = this.parseCoverageAreas(serviceOffering.coverageAreas) || [];
        const bookingCity = dto.locationCity;
        
        if (!bookingCity) {
          return BaseResponseDto.fail('Location city is required for booking', 'LOCATION_CITY_REQUIRED');
        }
        
        if (coverageAreas.length > 0 && !coverageAreas.includes(bookingCity)) {
          return BaseResponseDto.fail(
            `This service is not available in ${bookingCity}. Available coverage areas: ${coverageAreas.join(', ')}`,
            'SERVICE_AREA_NOT_COVERED'
          );
        }
      }

      let totalPrice = serviceOffering.basePrice;
      const priceUnit = serviceOffering.priceUnit;
      const bookingCity = dto.locationCity;

      switch (priceUnit) {
        case 'PER_HOUR':
          if (dto.durationDays && dto.durationDays > 0) {
            return BaseResponseDto.fail('This service is priced by hour. Please provide duration in hours, not days.', 'INVALID_DURATION_UNIT');
          }
          if (!dto.durationHours || dto.durationHours <= 0) {
            return BaseResponseDto.fail('Duration in hours is required for hourly services', 'DURATION_REQUIRED');
          }
          if (dto.durationHours > 24) {
            return BaseResponseDto.fail('Maximum duration for hourly services is 24 hours', 'DURATION_EXCEEDS_LIMIT');
          }
          totalPrice = serviceOffering.basePrice * dto.durationHours;
          break;
          
        case 'PER_DAY':
          if (dto.durationHours && dto.durationHours > 0) {
            return BaseResponseDto.fail('This service is priced by day. Please provide duration in days, not hours.', 'INVALID_DURATION_UNIT');
          }
          if (!dto.durationDays || dto.durationDays <= 0) {
            return BaseResponseDto.fail('Duration in days is required for daily services', 'DURATION_REQUIRED');
          }
          if (dto.durationDays > 30) {
            return BaseResponseDto.fail('Maximum duration for daily services is 30 days', 'DURATION_EXCEEDS_LIMIT');
          }
          totalPrice = serviceOffering.basePrice * dto.durationDays;
          break;
          
        case 'PER_WEEK':
          if (dto.durationHours && dto.durationHours > 0) {
            return BaseResponseDto.fail('This service is priced by week. Please provide duration in weeks.', 'INVALID_DURATION_UNIT');
          }
          if (dto.durationDays && dto.durationDays > 0) {
            const weeks = dto.durationDays / 7;
            if (!Number.isInteger(weeks)) {
              return BaseResponseDto.fail('For weekly services, duration in days must be a multiple of 7', 'INVALID_DURATION');
            }
            totalPrice = serviceOffering.basePrice * weeks;
          } else if (dto.durationWeeks && dto.durationWeeks > 0) {
            totalPrice = serviceOffering.basePrice * dto.durationWeeks;
          } else {
            return BaseResponseDto.fail('Duration in weeks is required for weekly services', 'DURATION_REQUIRED');
          }
          break;
          
        case 'PER_MONTH':
          if (dto.durationHours && dto.durationHours > 0) {
            return BaseResponseDto.fail('This service is priced by month. Duration in hours is not applicable.', 'DURATION_NOT_ALLOWED');
          }
          if (dto.durationDays && dto.durationDays > 0) {
            return BaseResponseDto.fail('This service is priced by month. Duration in days is not applicable.', 'DURATION_NOT_ALLOWED');
          }
          if (dto.durationMonths && dto.durationMonths > 0) {
            totalPrice = serviceOffering.basePrice * dto.durationMonths;
          }
          break;
          
        case 'PER_SESSION':
        case 'FIXED':
        default:
          if (dto.durationHours || dto.durationDays || dto.durationWeeks || dto.durationMonths) {
            return BaseResponseDto.fail(`This service has a fixed price${priceUnit === 'PER_SESSION' ? ' per session' : ''}. Duration is not required.`, 'DURATION_NOT_ALLOWED');
          }
          totalPrice = serviceOffering.basePrice;
          break;
      }

      if (!dto.isPlatformAdmin) {
        const dayOfWeek = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
        const scheduledTime = scheduledDate.toTimeString().slice(0, 5);
        
        const availability = this.parseAvailability(serviceOffering.availability);
        
        if (availability && availability.length > 0) {
          const dayAvailability = availability.find(a => a.day === dayOfWeek);
          
          if (!dayAvailability) {
            return BaseResponseDto.fail(`The professional is not available on ${dayOfWeek}s. Available days: ${availability.map(a => a.day).join(', ')}`, 'DAY_NOT_AVAILABLE');
          }
          
          if (dayAvailability.isClosed) {
            return BaseResponseDto.fail(`The professional is closed on ${dayOfWeek}s`, 'DAY_CLOSED');
          }
          
          const openTime = dayAvailability.open;
          const closeTime = dayAvailability.close;
          
          if (scheduledTime < openTime || scheduledTime > closeTime) {
            return BaseResponseDto.fail(`The scheduled start time (${scheduledTime}) is outside working hours (${openTime} - ${closeTime}) on ${dayOfWeek}`, 'TIME_OUTSIDE_HOURS');
          }
          
          if (priceUnit === 'PER_HOUR' && dto.durationHours) {
            const endDate = new Date(scheduledDate);
            endDate.setHours(endDate.getHours() + dto.durationHours);
            const endTime = endDate.toTimeString().slice(0, 5);
            
            if (endTime > closeTime) {
              return BaseResponseDto.fail(`The service would end at ${endTime}, which is after closing time (${closeTime}). Please adjust the start time or duration.`, 'END_TIME_EXCEEDS_CLOSING');
            }
          }
        }
      }

      if (!dto.isPlatformAdmin) {
        const startOfDay = new Date(scheduledDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(scheduledDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingBookings = await this.prisma.serviceBooking.findMany({
          where: {
            contractorId: dto.contractorId,
            scheduledDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
        });

        const requestedStart = scheduledDate;
        const requestedEnd = new Date(requestedStart);
        
        let durationInHours = 1;
        if (priceUnit === 'PER_HOUR' && dto.durationHours) {
          durationInHours = dto.durationHours;
        } else if (priceUnit === 'PER_DAY' && dto.durationDays) {
          durationInHours = dto.durationDays * 24;
        } else if (priceUnit === 'PER_WEEK' && (dto.durationWeeks || dto.durationDays)) {
          const weeks = dto.durationWeeks || (dto.durationDays ? dto.durationDays / 7 : 1);
          durationInHours = weeks * 7 * 24;
        } else if (priceUnit === 'PER_MONTH' && dto.durationMonths) {
          durationInHours = dto.durationMonths * 30 * 24;
        }
        
        requestedEnd.setHours(requestedEnd.getHours() + durationInHours);

        for (const existing of existingBookings) {
          const existingStart = new Date(existing.scheduledDate);
          const existingEnd = new Date(existingStart);
          existingEnd.setHours(existingEnd.getHours() + 1);
          
          const hasConflict = (
            (requestedStart >= existingStart && requestedStart < existingEnd) ||
            (requestedEnd > existingStart && requestedEnd <= existingEnd) ||
            (requestedStart <= existingStart && requestedEnd >= existingEnd)
          );
          
          if (hasConflict) {
            return BaseResponseDto.fail(`Contractor is already booked during the requested time slot`, 'CONFLICTING_BOOKING');
          }
        }
      }

      const booking = await this.prisma.serviceBooking.create({
        data: {
          contractorId: dto.contractorId,
          clientId: dto.clientId,
          serviceId: serviceOffering.id,
          
          // Contractor details - Add these
          contractorName: contractorProfile.displayName || contractorProfile.title,
          contractorEmail: contractorProfile.email,      // Add
          contractorPhone: contractorProfile.phone,      //  Add
          
          // Client details
          clientName: client.displayName,
          clientEmail: client.email,
          clientPhone: client.phone,
          
          serviceTitle: serviceOffering.title,
          status: BookingStatus.PENDING,
          scheduledDate: scheduledDate,
          locationCity: bookingCity,
          agreedPrice: totalPrice,
          currency: serviceOffering.currency,
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

      this.logger.log(`Booking created: ${booking.id} - Client: ${dto.clientId} - Contractor: ${dto.contractorId} - Price: ${totalPrice} ${serviceOffering.currency}`);

      //  Cache the newly created booking
      const mappedBooking = this.mapBookingToResponseDto(booking as unknown as ServiceBookingWithDetails);
      await this.cacheBooking(booking.id, mappedBooking);
      await this.cacheBookingByExternalId(booking.externalId, mappedBooking);

      // Queue notification
 
    await this.queue.addJob('notification-queue', 'booking.created', {
        // Customer email data
        customerEmail: booking.clientEmail,
        customerName: booking.clientName,
        customerPhone: booking.clientPhone,
        
        // Contractor email data  
        contractorEmail: booking.contractorEmail,
        contractorName: booking.contractorName,
        contractorPhone: booking.contractorPhone,
        
        // Service data
        serviceTitle: booking.serviceTitle,
        scheduledDate: booking.scheduledDate,
        location: booking.locationCity,
        price: `${booking.agreedPrice} ${booking.currency}`,
        notes: booking.customerNotes,
      });

      return BaseResponseDto.ok(
        mappedBooking,
        'Booking created successfully. Waiting for contractor confirmation.',
        'CREATED'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create booking: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Booking creation failed', 'INTERNAL_ERROR');
    }
  }

 async acceptBooking(
  bookingExternalId: string,
  contractorId: string,
  isPlatformAdmin?: boolean
): Promise<BaseResponseDto<BookingActionResponseDto>> {
  try {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingExternalId },
    });
  
    if (!booking) {
      return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
    }

    if (!isPlatformAdmin && booking.contractorId !== contractorId) {
      return BaseResponseDto.fail('Unauthorized: This booking belongs to another contractor', 'FORBIDDEN');
    }

    if (booking.status !== BookingStatus.PENDING) {
      let message = `Cannot accept booking in ${booking.status} status. `;
      if (booking.status === BookingStatus.DECLINED) {
        message = 'This booking has already been declined.';
      } else if (booking.status === BookingStatus.CANCELLED) {
        message = 'This booking has already been cancelled.';
      } else if (booking.status === BookingStatus.CONFIRMED) {
        message = 'This booking has already been confirmed.';
      } else if (booking.status === BookingStatus.COMPLETED) {
        message = 'Cannot accept a completed booking.';
      }
      return BaseResponseDto.fail(message, 'INVALID_STATUS');
    }

    const updatedBooking = await this.prisma.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Booking ${bookingExternalId} accepted by ${isPlatformAdmin ? 'platform admin' : `contractor ${contractorId}`}`);

    // ✅ Invalidate cache
    await this.invalidateBooking(booking.id, booking.externalId);
    await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

    // ✅ Queue notification with full details (including phone numbers for SMS)
    await this.queue.addJob(
      'notification-queue',
      'booking.confirmed',
      {
        // Customer details
        customerEmail: booking.clientEmail,
        customerName: booking.clientName,
        customerPhone: booking.clientPhone,  // ✅ Add this for SMS
        
        // Contractor details
        contractorEmail: booking.contractorEmail,
        contractorName: booking.contractorName,
        contractorPhone: booking.contractorPhone,  // ✅ Add this for SMS
        
        // Service details
        serviceTitle: booking.serviceTitle,
        scheduledDate: booking.scheduledDate,
        location: booking.locationCity,
        price: `${booking.agreedPrice} ${booking.currency}`,
        
        // Reference
        bookingExternalId: booking.externalId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    return BaseResponseDto.ok(
      {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt,
      },
      'Booking accepted successfully. Service is now confirmed.',
      'OK'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to accept booking ${bookingExternalId}: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Acceptance failed', 'INTERNAL_ERROR');
  }
}

 async declineBooking(
  bookingExternalId: string,
  contractorId: string,
  reason?: string,
  isPlatformAdmin?: boolean
): Promise<BaseResponseDto<BookingActionResponseDto>> {
  try {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingExternalId },
    });

    if (!booking) {
      return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
    }

    if (!isPlatformAdmin && booking.contractorId !== contractorId) {
      return BaseResponseDto.fail('Unauthorized: This booking belongs to another contractor', 'FORBIDDEN');
    }

    if (booking.status !== BookingStatus.PENDING) {
      let message = `Cannot decline booking in ${booking.status} status. `;
      if (booking.status === BookingStatus.DECLINED) {
        message = 'This booking has already been declined.';
      } else if (booking.status === BookingStatus.CANCELLED) {
        message = 'This booking has already been cancelled.';
      } else if (booking.status === BookingStatus.CONFIRMED) {
        message = 'This booking has already been confirmed. Please cancel instead of decline.';
      } else if (booking.status === BookingStatus.COMPLETED) {
        message = 'Cannot decline a completed booking.';
      }
      return BaseResponseDto.fail(message, 'INVALID_STATUS');
    }

    const updatedBooking = await this.prisma.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.DECLINED,
        declinedAt: new Date(),
        updatedAt: new Date(),
        customerNotes: reason 
          ? `${booking.customerNotes || ''}\n[Declined by ${isPlatformAdmin ? 'platform admin' : 'contractor'}]: ${reason}`
          : booking.customerNotes,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Booking ${bookingExternalId} declined by ${isPlatformAdmin ? 'platform admin' : `contractor ${contractorId}`}. Reason: ${reason || 'Not provided'}`);

    // ✅ Invalidate cache
    await this.invalidateBooking(booking.id, booking.externalId);
    await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

    // ✅ Queue notification with full contact details (same as createBooking)
    await this.queue.addJob(
      'notification-queue',
      'booking.declined',
      {
        bookingId: booking.id,
        bookingExternalId: booking.externalId,
        
        // Client/Customer details
        customer: {
          name: booking.clientName,
          email: booking.clientEmail,
          phone: booking.clientPhone,
        },
        
        // Contractor details
        contractor: {
          name: booking.contractorName,
          email: booking.contractorEmail,
          phone: booking.contractorPhone,
        },
        
        // Service details
        service: {
          title: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
        },
        
        // Decline details
        decline: {
          reason: reason,
          declinedBy: isPlatformAdmin ? 'platform-admin' : 'contractor',
          declinedAt: new Date().toISOString(),
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    return BaseResponseDto.ok(
      {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt,
      },
      reason ? `Booking declined: ${reason}` : 'Booking declined successfully.',
      'OK'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to decline booking ${bookingExternalId}: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Decline failed', 'INTERNAL_ERROR');
  }
}

async cancelBooking(
  bookingId: string,
  userId: string,
  professionalId?: string,
  reason?: string,
  isPlatformAdmin?: boolean
): Promise<BaseResponseDto<BookingActionResponseDto>> {
  try {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingId },
    });  

    if (!booking) {
      return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
    }

    // Authorization check (skip for platform admins)
    if (!isPlatformAdmin) {
      const isClient = booking.clientId === userId;
      const isContractor = professionalId ? booking.contractorId === professionalId : false;

      if (!isClient && !isContractor) {
        return BaseResponseDto.fail('Unauthorized: You cannot cancel this booking', 'FORBIDDEN');
      }
    }

    // Check if booking status allows cancellation
    const ALLOWED_CANCELLATION_STATUSES: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    
    if (!ALLOWED_CANCELLATION_STATUSES.includes(booking.status)) {
      let message = `Cannot cancel booking in ${booking.status} status. `;
      if (booking.status === BookingStatus.DECLINED) {
        message = 'Cannot cancel a declined booking.';
      } else if (booking.status === BookingStatus.CANCELLED) {
        message = 'This booking has already been cancelled.';
      } else if (booking.status === BookingStatus.COMPLETED) {
        message = 'Cannot cancel a completed booking.';
      }
      return BaseResponseDto.fail(message, 'INVALID_STATUS');
    }

    // ✅ FIX: Determine who cancelled based on userId matching booking IDs
    // This works correctly even for platform admins who have professionalId
    let cancelledBy: string;
    if (isPlatformAdmin) {
      cancelledBy = 'platform-admin';
    } else if (booking.clientId === userId) {
      cancelledBy = 'client';
    } else if (booking.contractorId === userId) {
      cancelledBy = 'contractor';
    } else {
      cancelledBy = 'unknown';
    }

    console.log(`🔍 DEBUG: userId=${userId}, booking.clientId=${booking.clientId}, booking.contractorId=${booking.contractorId}`);
    console.log(`🔍 DEBUG: cancelledBy=${cancelledBy}`);

    const cancellationNote = `Cancelled by ${cancelledBy}${reason ? `: ${reason}` : ''}`;

    const updatedBooking = await this.prisma.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        updatedAt: new Date(),
        customerNotes: `${booking.customerNotes || ''}\n[${cancellationNote}]`,
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Booking ${bookingId} cancelled by ${cancelledBy}: ${userId}. Reason: ${reason || 'Not provided'}`);

    // Invalidate cache
    await this.invalidateBooking(booking.id, booking.externalId);
    await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

    // Queue notification with full contact details
    await this.queue.addJob(
      'notification-queue',
      'booking.cancelled',
      {
        bookingId: booking.id,
        bookingExternalId: booking.externalId,
        
        // Client/Customer details
        customer: {
          name: booking.clientName,
          email: booking.clientEmail,
          phone: booking.clientPhone,
        },
        
        // Contractor details
        contractor: {
          name: booking.contractorName,
          email: booking.contractorEmail,
          phone: booking.contractorPhone,
        },
        
        // Service details
        service: {
          title: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
        },
        
        // Cancellation details
        cancellation: {
          reason: reason,
          cancelledBy: cancelledBy,
          cancelledAt: new Date().toISOString(),
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    return BaseResponseDto.ok(
      {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt,
      },
      reason ? `Booking cancelled: ${reason}` : 'Booking cancelled successfully.',
      'OK'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to cancel booking ${bookingId}: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Cancellation failed', 'INTERNAL_ERROR');
  }
}

  async completeBooking(
  bookingExternalId: string,
  contractorId: string,
  isPlatformAdmin?: boolean
): Promise<BaseResponseDto<BookingActionResponseDto>> {
  try {
    const booking = await this.prisma.serviceBooking.findUnique({
      where: { externalId: bookingExternalId },
    });

    if (!booking) {
      return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
    }

    if (!isPlatformAdmin && booking.contractorId !== contractorId) {
      return BaseResponseDto.fail('Unauthorized: You cannot complete this booking', 'FORBIDDEN');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      let message = `Cannot complete booking in ${booking.status} status. `;
      if (booking.status === BookingStatus.PENDING) {
        message = 'Please accept the booking before completing it.';
      } else if (booking.status === BookingStatus.DECLINED) {
        message = 'Cannot complete a declined booking.';
      } else if (booking.status === BookingStatus.CANCELLED) {
        message = 'Cannot complete a cancelled booking.';
      } else if (booking.status === BookingStatus.COMPLETED) {
        message = 'This booking has already been completed.';
      }
      return BaseResponseDto.fail(message, 'INVALID_STATUS');
    }

    const updatedBooking = await this.prisma.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Booking ${bookingExternalId} completed by ${isPlatformAdmin ? 'platform admin' : `contractor ${contractorId}`}`);

    // ✅ Invalidate cache
    await this.invalidateBooking(booking.id, booking.externalId);
    await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

    // ✅ Queue notification with full contact details
    await this.queue.addJob(
      'notification-queue',
      'booking.completed',
      {
        bookingId: booking.id,
        bookingExternalId: booking.externalId,
        
        // Client/Customer details
        customer: {
          name: booking.clientName,
          email: booking.clientEmail,
          phone: booking.clientPhone,
        },
        
        // Contractor details
        contractor: {
          name: booking.contractorName,
          email: booking.contractorEmail,
          phone: booking.contractorPhone,
        },
        
        // Service details
        service: {
          title: booking.serviceTitle,
          scheduledDate: booking.scheduledDate,
          location: booking.locationCity,
          price: `${booking.agreedPrice} ${booking.currency}`,
        },
        
        // Completion details
        completion: {
          completedBy: isPlatformAdmin ? 'platform-admin' : 'contractor',
          completedAt: new Date().toISOString(),
        },
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    // ✅ Queue review request after 24 hours
    await this.queue.addJob(
      'notification-queue',
      'review.request',
      {
        bookingId: booking.id,
        clientId: booking.clientId,
        contractorId: booking.contractorId,
        serviceTitle: booking.serviceTitle,
      },
      {
        delay: 86400000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    return BaseResponseDto.ok(
      {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: updatedBooking.updatedAt,
      },
      'Service completed successfully. Payment will be released to you shortly.',
      'OK'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to complete booking ${bookingExternalId}: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Completion failed', 'INTERNAL_ERROR');
  }
}

  async getMyBookingsAsCustomer(
    clientId: string,
    status?: string,
    limit = 20,
    offset = 0,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      // ✅ Try to get from cache (only when no filters and not platform admin)
      if (!status && !isPlatformAdmin && offset === 0) {
        const cachedBookings = await this.getCachedUserBookings(clientId);
        if (cachedBookings) {
          this.logger.debug(`User bookings cache HIT for ${clientId}`);
          
          const pagination: PaginationDto = {
            total: cachedBookings.length,
            limit,
            offset,
            hasMore: cachedBookings.length > limit,
          };
          
          const paginatedBookings = cachedBookings.slice(offset, offset + limit);
          
          return BaseResponseDto.okWithPagination(
            paginatedBookings,
            pagination,
            `Found ${cachedBookings.length} bookings (cached)`,
            'OK'
          );
        }
      }
      
      this.logger.debug(`User bookings cache MISS for ${clientId}, fetching from DB`);

      const where: any = {
        clientId: isPlatformAdmin ? undefined : clientId,
      };

      if (status) {
        where.status = status;
      }

      const total = await this.prisma.serviceBooking.count({ where });

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

      // ✅ Cache all user bookings (only when no filters)
      if (!status && !isPlatformAdmin && offset === 0 && mappedBookings.length > 0) {
        await this.cacheUserBookings(clientId, mappedBookings);
      }

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
      this.logger.error(`Failed to fetch customer bookings: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  async getMyBookingsAsProfessional(
    contractorId: string,
    status?: string,
    limit = 20,
    offset = 0,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      // ✅ Try to get from cache (only when no filters and not platform admin)
      if (!status && !isPlatformAdmin && offset === 0) {
        const cachedBookings = await this.getCachedUserBookings(contractorId);
        if (cachedBookings) {
          this.logger.debug(`Contractor bookings cache HIT for ${contractorId}`);
          
          const pagination: PaginationDto = {
            total: cachedBookings.length,
            limit,
            offset,
            hasMore: cachedBookings.length > limit,
          };
          
          const paginatedBookings = cachedBookings.slice(offset, offset + limit);
          
          return BaseResponseDto.okWithPagination(
            paginatedBookings,
            pagination,
            `Found ${cachedBookings.length} bookings (cached)`,
            'OK'
          );
        }
      }
      
      this.logger.debug(`Contractor bookings cache MISS for ${contractorId}, fetching from DB`);

      const where: any = {};

      if (!isPlatformAdmin) {
        where.contractorId = contractorId;
      }

      if (status) {
        where.status = status;
      }

      const total = await this.prisma.serviceBooking.count({ where });

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

      // ✅ Cache all contractor bookings (only when no filters)
      if (!status && !isPlatformAdmin && offset === 0 && mappedBookings.length > 0) {
        await this.cacheUserBookings(contractorId, mappedBookings);
      }

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
      this.logger.error(`Failed to fetch contractor bookings: ${err.message}`);
      return BaseResponseDto.fail(err.message, 'FETCH_ERROR');
    }
  }

  async getBookingDetails(
    bookingId: string,
    userId: string,
    professionalId?: string,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      // ✅ Try to get from Redis cache first
      let mappedBooking = await this.getCachedBooking(bookingId);
      
      // If not found by ID, try by externalId
      if (!mappedBooking) {
        mappedBooking = await this.getCachedBookingByExternalId(bookingId);
      }
      
      let booking: any;
      
      if (mappedBooking) {
        this.logger.debug(`Booking ${bookingId} found in Redis cache`);
      } else {
        // Cache miss - fetch from database
        this.logger.debug(`Booking ${bookingId} not in cache, fetching from database`);
        
        booking = await this.prisma.serviceBooking.findUnique({
          where: { externalId: bookingId },
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

        mappedBooking = this.mapBookingToResponseDto(booking as ServiceBookingWithDetails);
        
        // Cache for future requests
        await this.cacheBooking(booking.id, mappedBooking);
        await this.cacheBookingByExternalId(booking.externalId, mappedBooking);
      }

      if (!isPlatformAdmin) {
        const isClient = booking ? booking.clientId === userId : mappedBooking.clientId === userId;
        const isContractor = professionalId 
          ? (booking ? booking.contractorId === professionalId : mappedBooking.contractorId === professionalId)
          : false;

        if (!isClient && !isContractor) {
          return BaseResponseDto.fail('Unauthorized: You cannot view this booking', 'FORBIDDEN');
        }
      }

      // If we have a cached version but need profile details
      if (mappedBooking && !booking) {
        const [contractorDetails, clientDetails] = await Promise.all([
          this.getSkilledProfessionalDetails(mappedBooking.contractorId),
          this.getUserDetails(mappedBooking.clientId),
        ]);
        
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

        if (mappedBooking.serviceDetails) {
          // serviceDetails already in cache
        }

        return BaseResponseDto.ok(
          mappedBooking,
          'Booking details retrieved successfully',
          'OK'
        );
      }

      // For DB hits, enrich with profile details
      const [contractorDetails, clientDetails] = await Promise.all([
        this.getSkilledProfessionalDetails(booking.contractorId),
        this.getUserDetails(booking.clientId),
      ]);

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

      if (booking.service) {
        mappedBooking.serviceDetails = {
          id: booking.service.id,
          title: booking.service.title,
          description: booking.service.description,
          basePrice: booking.service.basePrice,
          priceUnit: booking.service.priceUnit,
          category: booking.service.category?.name,
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

  async getUpcomingBookingsForProfessional(
    contractorId: string,
    limit = 10,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      const where: any = {
        status: BookingStatus.CONFIRMED,
        scheduledDate: { gte: new Date() },
      };

      if (!isPlatformAdmin) {
        where.contractorId = contractorId;
      }

      const bookings = await this.prisma.serviceBooking.findMany({
        where,
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

  async getProfessionalBookingStats(
    contractorId: string,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      const where: any = {};

      if (!isPlatformAdmin) {
        where.contractorId = contractorId;
      }

      const stats = await this.prisma.serviceBooking.groupBy({
        by: ['status'],
        where,
        _count: {
          id: true,
        },
      });

      const totalBookings = stats.reduce((acc, curr) => acc + curr._count.id, 0);
      
      const statusMap: Record<string, number> = {};
      stats.forEach(stat => {
        statusMap[stat.status] = stat._count.id;
      });

      const upcomingCount = await this.prisma.serviceBooking.count({
        where: {
          ...where,
          status: BookingStatus.CONFIRMED,
          scheduledDate: { gte: new Date() },
        },
      });

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const completedThisMonth = await this.prisma.serviceBooking.count({
        where: {
          ...where,
          status: BookingStatus.COMPLETED,
          updatedAt: { gte: startOfMonth },
        },
      });

      return BaseResponseDto.ok(
        {
          total: totalBookings,
          pending: statusMap[BookingStatus.PENDING] || 0,
          confirmed: statusMap[BookingStatus.CONFIRMED] || 0,
          completed: statusMap[BookingStatus.COMPLETED] || 0,
          cancelled: statusMap[BookingStatus.CANCELLED] || 0,
          declined: statusMap[BookingStatus.DECLINED] || 0,
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

  async getBookingBasicInfo(bookingId: string): Promise<BaseResponseDto<{ clientId: string; contractorId: string }>> {
    try {
      const booking = await this.prisma.serviceBooking.findUnique({
        where: { externalId: bookingId },
        select: { clientId: true, contractorId: true },
      });
      
      if (!booking) {
        return BaseResponseDto.fail('Booking not found', 'NOT_FOUND');
      }
      
      return BaseResponseDto.ok(
        { clientId: booking.clientId, contractorId: booking.contractorId },
        'Booking info retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get booking info: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }
}