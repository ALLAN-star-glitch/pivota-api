/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingStatus, ServiceExecutionStatus } from '../../../../generated/prisma/client';
import {
  BaseResponseDto,
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
import { QueueService, RedisService } from '@pivota-api/shared-redis';

// gRPC interface for Profile Service
interface ProfileServiceGrpc {
  getSkilledProfessionalByAccount(
    data: { accountUuid: string }
  ): import('rxjs').Observable<BaseResponseDto<SkilledProfessionalProfileResponseDto>>;
  
  getSkilledProfessionalByUuid(
    data: { uuid: string }
  ): import('rxjs').Observable<BaseResponseDto<SkilledProfessionalPublicProfileDto>>;
  
  GetUserProfileByUuid(
    data: { userUuid: string }
  ): import('rxjs').Observable<BaseResponseDto<UserProfileResponseDto>>;
  
  GetAccountByUuid(
    data: { accountUuid: string }
  ): import('rxjs').Observable<BaseResponseDto<AccountResponseDto>>;
}

interface ServiceBookingWithDetails {
  id: string;
  externalId: string;
  contractorId: string;
  clientId: string;
  serviceId: string | null;
  service: any | null;
  
  // Denormalized display fields
  contractorName: string | null;
  contractorEmail: string | null;  // ADD THIS
  contractorPhone: string | null;  // ADD THIS
  clientName: string | null;       // ADD THIS
  clientEmail: string | null;      // ADD THIS
  clientPhone: string | null;      // ADD THIS
  serviceTitle: string | null;
  
  status: BookingStatus;
  serviceExecutionStatus: ServiceExecutionStatus;
  scheduledDate: Date | null;
  locationCity: string | null;
  
  // Pricing fields
  servicePrice: number | null;
  servicePriceUnit: string | null;
  serviceDuration: number | null;
  currency: string;
  customerNotes: string | null;
  
  // Booking fee fields
  bookingFeeAmount: number | null;
  bookingFeeCurrency: string | null;
  bookingFeeRefundable: boolean | null;
  totalAmount: number | null;
  
  // Lifecycle timestamps
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
  
  // ========== Negotiable Pricing Fields ==========
  isNegotiable: boolean;
  minNegotiablePrice: number | null;
  maxNegotiablePrice: number | null;
  
  // ========== Booking Fee Override Fields ==========
  useCustomBookingFee: boolean;
  customBookingFeeEnabled: boolean | null;
  customBookingFeeAmount: number | null;
  customBookingFeeCurrency: string | null;
  customBookingFeeDescription: string | null;
  customBookingFeeRefundable: boolean | null;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private profileGrpc: ProfileServiceGrpc;

  // Redis cache keys
  private readonly BOOKING_CACHE_PREFIX = 'booking:id:';
  private readonly BOOKING_EXTERNAL_PREFIX = 'booking:external:';
  private readonly USER_BOOKINGS_PREFIX = 'user:bookings:';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
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
    await this.redis.setObject(key, bookings, 120);
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

  // ==================== PROFILE HELPER METHODS ====================

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

  private parseAvailability(availabilityStr: string | null): any[] | undefined {
    if (!availabilityStr) return undefined;
    try {
      return JSON.parse(availabilityStr);
    } catch (e) {
      this.logger.error(`Failed to parse availability JSON string`);
      return undefined;
    }
  }

  // ==================== BOOKING STATUS ENDPOINT ====================
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
        { value: 'CANCELLED', label: 'Cancelled', description: 'Booking was cancelled', badgeVariant: 'danger', order: 3 },
        { value: 'DECLINED', label: 'Declined', description: 'Contractor declined the booking', badgeVariant: 'danger', order: 4 },
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
      CANCELLED: 'Cancelled',
      DECLINED: 'Declined',
    };
    return labels[status] || status;
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      PENDING: 'Booking created, waiting for contractor response',
      CONFIRMED: 'Contractor accepted the booking',
      CANCELLED: 'Booking was cancelled',
      DECLINED: 'Contractor declined the booking',
    };
    return descriptions[status] || '';
  }

  private getStatusBadgeVariant(status: string): string {
    const variants: Record<string, string> = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      CANCELLED: 'danger',
      DECLINED: 'danger',
    };
    return variants[status] || 'secondary';
  }

  // ==================== BOOKING MAPPING ====================

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
      serviceExecutionStatus: booking.serviceExecutionStatus,
      scheduledDate: booking.scheduledDate,
      locationCity: booking.locationCity,
      servicePrice: booking.servicePrice,
      servicePriceUnit: booking.servicePriceUnit,
      serviceDuration: booking.serviceDuration,
      currency: booking.currency,
      customerNotes: booking.customerNotes,
      confirmedAt: booking.confirmedAt,
      declinedAt: booking.declinedAt,
      cancelledAt: booking.cancelledAt,
      completedAt: booking.completedAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      bookingFeeAmount: booking.bookingFeeAmount,
      bookingFeeCurrency: booking.bookingFeeCurrency,
      bookingFeeRefundable: booking.bookingFeeRefundable,
      totalAmount: booking.totalAmount,
    };
  }

  // ==================== CREATE BOOKING ====================

async createBooking(
  dto: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean }
): Promise<BaseResponseDto<any>> {
  try {
    // ========== FETCH SERVICE OFFERING ==========
    const serviceOffering = await this.prisma.serviceOffering.findUnique({
      where: { externalId: dto.serviceId },
      include: { 
        category: true,
        reviews: true,
      },
    }) as ServiceOfferingWithDetails | null;

    if (!serviceOffering) {
      return BaseResponseDto.fail('Service offering not found', 'NOT_FOUND');
    }

    if (serviceOffering.status !== 'ACTIVE') {
      return BaseResponseDto.fail('Service offering is not available for booking', 'SERVICE_UNAVAILABLE');
    }

    // ========== FETCH CLIENT DETAILS ==========
    const client = await this.getUserDetails(dto.clientId);
    if (!client) {
      return BaseResponseDto.fail('Client profile not found', 'CLIENT_NOT_FOUND');
    }

    // ========== FETCH CONTRACTOR DETAILS ==========
    const contractorProfile = await this.getSkilledProfessionalDetails(dto.contractorId);
    if (!contractorProfile) {
      return BaseResponseDto.fail('Contractor profile not found', 'CONTRACTOR_NOT_FOUND');
    }

    // ========== VALIDATE SCHEDULED DATE ==========
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

    // ================================================================
    // ========== SELF-BOOKING VALIDATION - APPLIES TO EVERYONE ==========
    // ================================================================
    // These checks apply to ALL users including platform admins
    
    // Check 1: Client cannot book their own service (by account UUID)
    if (client.accountUuid === contractorProfile.accountUuid) {
      this.logger.warn(`⚠️ SELF-BOOKING ATTEMPT: Client ${dto.clientId} tried to book their own service (contractor ${dto.contractorId})`);
      return BaseResponseDto.fail('You cannot book your own service offering', 'SELF_BOOKING_NOT_ALLOWED');
    }
    
    // Check 2: Client cannot book a service they created
    if (serviceOffering.creatorId === dto.clientId) {
      this.logger.warn(`⚠️ SELF-BOOKING ATTEMPT: Client ${dto.clientId} tried to book service they created (${serviceOffering.id})`);
      return BaseResponseDto.fail('You cannot book a service that you created', 'SELF_BOOKING_NOT_ALLOWED');
    }
    
    // Check 3: Client ID cannot equal contractor ID (direct match)
    if (dto.clientId === dto.contractorId) {
      this.logger.warn(`⚠️ SELF-BOOKING ATTEMPT: Client ${dto.clientId} tried to book themselves as contractor`);
      return BaseResponseDto.fail('You cannot book a service from yourself', 'SELF_BOOKING_NOT_ALLOWED');
    }
    
    // Check 4: Client's account UUID cannot match the service offering's creator account UUID
    const serviceCreatorDetails = await this.getUserDetails(serviceOffering.creatorId);
    if (serviceCreatorDetails && client.accountUuid === serviceCreatorDetails.accountUuid) {
      this.logger.warn(`⚠️ SELF-BOOKING ATTEMPT: Client ${dto.clientId} tried to book service owned by their account`);
      return BaseResponseDto.fail('You cannot book a service that you own', 'SELF_BOOKING_NOT_ALLOWED');
    }
    
    // Check 5: Ensure the service offering belongs to the contractor being booked
    if (serviceOffering.skilledProfessionalId !== dto.contractorId) {
      this.logger.warn(`⚠️ MISMATCH: Service ${serviceOffering.id} belongs to ${serviceOffering.skilledProfessionalId} but booking targets ${dto.contractorId}`);
      return BaseResponseDto.fail('The service offering does not belong to the selected contractor', 'INVALID_SERVICE_CONTRACTOR');
    }

    // ================================================================
    // ========== COVERAGE AREA VALIDATION ==========
    // ================================================================
    // If you want admins to bypass coverage checks, keep the !dto.isPlatformAdmin condition
    // If admins should also respect coverage, remove the condition entirely
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

    // ================================================================
    // ========== NEGOTIATION LOGIC ==========
    // ================================================================
    let servicePrice = serviceOffering.basePrice;
    let isNegotiated = false;
    let proposedPrice: number | null = null;
    const priceUnit = serviceOffering.priceUnit;
    const bookingCity = dto.locationCity;
    let serviceDuration: number | null = null;

    // Check if customer is proposing a different price
    if (dto.proposedPrice !== undefined && dto.proposedPrice !== null && dto.proposedPrice !== serviceOffering.basePrice) {
      proposedPrice = dto.proposedPrice;
      
      if (!serviceOffering.isNegotiable) {
        return BaseResponseDto.fail(
          'This service is not negotiable. Please accept the standard price.',
          'NOT_NEGOTIABLE'
        );
      }
      
      if (serviceOffering.minNegotiablePrice !== null && proposedPrice < serviceOffering.minNegotiablePrice) {
        return BaseResponseDto.fail(
          `Price too low. Minimum: ${serviceOffering.minNegotiablePrice} ${serviceOffering.currency}`,
          'PRICE_BELOW_MINIMUM'
        );
      }
      
      if (serviceOffering.maxNegotiablePrice !== null && proposedPrice > serviceOffering.maxNegotiablePrice) {
        return BaseResponseDto.fail(
          `Price too high. Maximum: ${serviceOffering.maxNegotiablePrice} ${serviceOffering.currency}`,
          'PRICE_ABOVE_MAXIMUM'
        );
      }
      
      isNegotiated = true;
      servicePrice = proposedPrice;
      
      this.logger.log(`Negotiated price: Customer proposed ${proposedPrice} ${serviceOffering.currency} for service ${serviceOffering.id}`);
    }

    // ================================================================
    // ========== DURATION AND PRICE CALCULATION ==========
    // ================================================================
    switch (priceUnit) {
      case 'PER_HOUR':
        if (dto.durationHours !== undefined && dto.durationHours !== null) {
          if (dto.durationHours <= 0) {
            return BaseResponseDto.fail('Duration must be greater than 0 hours', 'INVALID_DURATION');
          }
          if (dto.durationHours > 24) {
            return BaseResponseDto.fail('Maximum duration for hourly services is 24 hours', 'DURATION_EXCEEDS_LIMIT');
          }
          serviceDuration = dto.durationHours;
          servicePrice = servicePrice * dto.durationHours;
        } else {
          return BaseResponseDto.fail('Duration in hours is required for hourly services', 'DURATION_REQUIRED');
        }
        break;
        
      case 'PER_DAY':
        if (dto.durationDays !== undefined && dto.durationDays !== null) {
          if (dto.durationDays <= 0) {
            return BaseResponseDto.fail('Duration must be greater than 0 days', 'INVALID_DURATION');
          }
          if (dto.durationDays > 30) {
            return BaseResponseDto.fail('Maximum duration for daily services is 30 days', 'DURATION_EXCEEDS_LIMIT');
          }
          serviceDuration = dto.durationDays;
          servicePrice = servicePrice * dto.durationDays;
        } else {
          return BaseResponseDto.fail('Duration in days is required for daily services', 'DURATION_REQUIRED');
        }
        break;
        
      case 'PER_WEEK':
        if (dto.durationWeeks !== undefined && dto.durationWeeks !== null && dto.durationWeeks > 0) {
          if (dto.durationWeeks <= 0) {
            return BaseResponseDto.fail('Duration must be greater than 0 weeks', 'INVALID_DURATION');
          }
          serviceDuration = dto.durationWeeks;
          servicePrice = servicePrice * dto.durationWeeks;
        } else if (dto.durationDays !== undefined && dto.durationDays !== null && dto.durationDays > 0) {
          const weeks = dto.durationDays / 7;
          if (!Number.isInteger(weeks)) {
            return BaseResponseDto.fail('For weekly services, duration in days must be a multiple of 7', 'INVALID_DURATION');
          }
          serviceDuration = weeks;
          servicePrice = servicePrice * weeks;
        } else {
          return BaseResponseDto.fail('Duration in weeks is required for weekly services', 'DURATION_REQUIRED');
        }
        break;
        
      case 'PER_MONTH':
        if (dto.durationMonths !== undefined && dto.durationMonths !== null && dto.durationMonths > 0) {
          if (dto.durationMonths <= 0) {
            return BaseResponseDto.fail('Duration must be greater than 0 months', 'INVALID_DURATION');
          }
          serviceDuration = dto.durationMonths;
          servicePrice = servicePrice * dto.durationMonths;
        } else {
          return BaseResponseDto.fail('Duration in months is required for monthly services', 'DURATION_REQUIRED');
        }
        break;
        
      case 'PER_SESSION':
      case 'FIXED':
      default:
        serviceDuration = 1;
        this.logger.debug(`Fixed price service: ${priceUnit} - using base price ${servicePrice} without duration multiplier`);
        break;
    }

    // ================================================================
    // ========== AVAILABILITY CHECK ==========
    // ================================================================
    if (!dto.isPlatformAdmin) {
      const dayOfWeek = scheduledDate.toLocaleDateString('en-US', { weekday: 'long' });
      const scheduledTime = scheduledDate.toTimeString().slice(0, 5);
      
      const availability = this.parseAvailability(serviceOffering.availability);
      
      if (availability && availability.length > 0) {
        const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);
        
        if (!dayAvailability) {
          return BaseResponseDto.fail(`The professional is not available on ${dayOfWeek}s. Available days: ${availability.map((a: any) => a.day).join(', ')}`, 'DAY_NOT_AVAILABLE');
        }
        
        if (dayAvailability.isClosed) {
          return BaseResponseDto.fail(`The professional is closed on ${dayOfWeek}s`, 'DAY_CLOSED');
        }
        
        const openTime = dayAvailability.open;
        const closeTime = dayAvailability.close;
        
        if (scheduledTime < openTime || scheduledTime > closeTime) {
          return BaseResponseDto.fail(`The scheduled start time (${scheduledTime}) is outside working hours (${openTime} - ${closeTime}) on ${dayOfWeek}`, 'TIME_OUTSIDE_HOURS');
        }
        
        if (priceUnit === 'PER_HOUR' && dto.durationHours && dto.durationHours > 0) {
          const endDate = new Date(scheduledDate);
          endDate.setHours(endDate.getHours() + dto.durationHours);
          const endTime = endDate.toTimeString().slice(0, 5);
          
          if (endTime > closeTime) {
            return BaseResponseDto.fail(`The service would end at ${endTime}, which is after closing time (${closeTime}). Please adjust the start time or duration.`, 'END_TIME_EXCEEDS_CLOSING');
          }
        }
      }
    }

    // ================================================================
    // ========== CONFLICT CHECK ==========
    // ================================================================
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

    // ================================================================
    // ========== BOOKING FEE CALCULATION ==========
    // ================================================================
    let bookingFeeAmount = 0;
    let bookingFeeRefundable = false;
    let bookingFeeCurrency = serviceOffering.currency;

    if (serviceOffering.useCustomBookingFee && serviceOffering.customBookingFeeEnabled) {
      bookingFeeAmount = serviceOffering.customBookingFeeAmount || 0;
      bookingFeeRefundable = serviceOffering.customBookingFeeRefundable || false;
      bookingFeeCurrency = serviceOffering.customBookingFeeCurrency || serviceOffering.currency;
    } else if (contractorProfile.profileBookingFeeEnabled) {
      bookingFeeAmount = contractorProfile.profileBookingFeeAmount || 0;
      bookingFeeRefundable = contractorProfile.profileBookingFeeRefundable || false;
      bookingFeeCurrency = contractorProfile.profileBookingFeeCurrency || serviceOffering.currency;
    }

    const totalAmount = servicePrice + bookingFeeAmount;

    // ================================================================
    // ========== PLATFORM COMMISSION CALCULATION ==========
    // ================================================================
    const PLATFORM_COMMISSION_PERCENTAGE = 5; // 5%
    const platformCommissionAmount = (totalAmount * PLATFORM_COMMISSION_PERCENTAGE) / 100;
    const platformCommissionFormatted = `${platformCommissionAmount.toLocaleString()} ${serviceOffering.currency}`;
    const serviceProviderPayout = totalAmount - platformCommissionAmount;
    const serviceProviderPayoutFormatted = `${serviceProviderPayout.toLocaleString()} ${serviceOffering.currency}`;

    // ================================================================
    // ========== CREATE BOOKING ==========
    // ================================================================
    const booking = await this.prisma.serviceBooking.create({
      data: {
        contractorId: dto.contractorId,
        clientId: dto.clientId,
        serviceId: serviceOffering.id,
        contractorName: contractorProfile.displayName || contractorProfile.title,
        contractorEmail: contractorProfile.email,
        contractorPhone: contractorProfile.phone,
        clientName: client.displayName,
        clientEmail: client.email,
        clientPhone: client.phone,
        serviceTitle: serviceOffering.title,
        status: BookingStatus.PENDING,
        serviceExecutionStatus: ServiceExecutionStatus.NOT_STARTED,
        scheduledDate: scheduledDate,
        locationCity: bookingCity,
        servicePrice: servicePrice,
        servicePriceUnit: priceUnit,
        serviceDuration: serviceDuration,
        currency: serviceOffering.currency,
        customerNotes: dto.customerNotes,
        bookingFeeAmount: bookingFeeAmount,
        bookingFeeCurrency: bookingFeeCurrency,
        bookingFeeRefundable: bookingFeeRefundable,
        totalAmount: totalAmount,
      },
      include: {
        service: {
          include: {
            category: true,
          },
        },
      },
    });

    const bookingWithDetails = booking as unknown as ServiceBookingWithDetails;

    // ========== LOG ADMIN ACTIONS ==========
    if (dto.isPlatformAdmin) {
      this.logger.warn(`⚠️ ADMIN ACTION: Platform admin created booking ${bookingWithDetails.id} for client ${dto.clientId} with contractor ${dto.contractorId}`);
    }

    this.logger.log(`Booking created: ${bookingWithDetails.id} - Client: ${dto.clientId} - Contractor: ${dto.contractorId} - ${isNegotiated ? `Negotiated Price: ${servicePrice}` : `Standard Price: ${servicePrice}`} + Booking Fee: ${bookingFeeAmount} = Total: ${totalAmount} ${serviceOffering.currency}`);

    const mappedBooking = this.mapBookingToResponseDto(bookingWithDetails);
    await this.cacheBooking(booking.id, mappedBooking);
    await this.cacheBookingByExternalId(booking.externalId, mappedBooking);

    // ================================================================
    // ========== FORMAT PRICE UNIT DISPLAY ==========
    // ================================================================
    const getPriceUnitDisplay = (unit: string): string => {
      switch (unit) {
        case 'PER_HOUR': return 'hourly';
        case 'PER_DAY': return 'daily';
        case 'PER_WEEK': return 'weekly';
        case 'PER_MONTH': return 'monthly';
        case 'PER_SESSION': return 'per session';
        case 'FIXED': return 'fixed price';
        default: return unit.toLowerCase().replace('_', ' ');
      }
    };

    const getDurationDisplay = (): { text: string; unit: string; displayText: string } => {
      if (priceUnit === 'FIXED' || priceUnit === 'PER_SESSION') {
        return { text: '', unit: '', displayText: 'One-time service' };
      }
      
      if (serviceDuration) {
        switch (priceUnit) {
          case 'PER_HOUR':
            return { 
              text: `${serviceDuration}`, 
              unit: 'hour',
              displayText: `${serviceDuration} hour${serviceDuration !== 1 ? 's' : ''}`
            };
          case 'PER_DAY':
            return { 
              text: `${serviceDuration}`, 
              unit: 'day',
              displayText: `${serviceDuration} day${serviceDuration !== 1 ? 's' : ''}`
            };
          case 'PER_WEEK':
            return { 
              text: `${serviceDuration}`, 
              unit: 'week',
              displayText: `${serviceDuration} week${serviceDuration !== 1 ? 's' : ''}`
            };
          case 'PER_MONTH':
            return { 
              text: `${serviceDuration}`, 
              unit: 'month',
              displayText: `${serviceDuration} month${serviceDuration !== 1 ? 's' : ''}`
            };
          default:
            return { text: '', unit: '', displayText: '' };
        }
      }
      return { text: '', unit: '', displayText: '' };
    };

    const durationInfo = getDurationDisplay();
    const priceUnitDisplay = getPriceUnitDisplay(priceUnit);

    // ================================================================
    // ========== CALCULATE NEGOTIATION DETAILS ==========
    // ================================================================
    let negotiationDetails = null;
    if (isNegotiated && proposedPrice) {
      const originalAmount = serviceOffering.basePrice;
      const proposedAmount = proposedPrice;
      const perDaySavings = originalAmount - proposedAmount;
      const totalOriginalAmount = originalAmount * (serviceDuration || 1);
      const totalProposedAmount = proposedAmount * (serviceDuration || 1);
      const totalSavings = totalOriginalAmount - totalProposedAmount;
      const savingsPercentage = ((perDaySavings / originalAmount) * 100).toFixed(1);
      const isLower = perDaySavings > 0;
      
      negotiationDetails = {
        proposedAmount: proposedAmount,
        proposedAmountFormatted: `${proposedAmount.toLocaleString()} ${serviceOffering.currency}`,
        originalAmount: originalAmount,
        originalAmountFormatted: `${originalAmount.toLocaleString()} ${serviceOffering.currency}`,
        totalProposedAmount: totalProposedAmount,
        totalProposedAmountFormatted: `${totalProposedAmount.toLocaleString()} ${serviceOffering.currency}`,
        totalOriginalAmount: totalOriginalAmount,
        totalOriginalAmountFormatted: `${totalOriginalAmount.toLocaleString()} ${serviceOffering.currency}`,
        savingsAmount: Math.abs(totalSavings),
        savingsAmountFormatted: `${Math.abs(totalSavings).toLocaleString()} ${serviceOffering.currency}`,
        savingsPercentage: savingsPercentage,
        isLower: isLower,
        negotiationStatus: 'CUSTOMER_PROPOSED',
        message: `Customer has proposed a negotiated price of ${proposedAmount.toLocaleString()} ${serviceOffering.currency} (original: ${originalAmount.toLocaleString()} ${serviceOffering.currency})`,
        actionRequired: `Please review the customer's proposal of ${proposedAmount.toLocaleString()} ${serviceOffering.currency}. You can accept, decline, or make a counter-offer.`
      };
    }

    const originalSubtotal = serviceOffering.basePrice * (serviceDuration || 1);
    const hasBookingFee = bookingFeeAmount > 0;

    // ================================================================
    // ========== QUEUE NOTIFICATIONS ==========
    // ================================================================
    await this.queue.addJob('notification-queue', 'booking.created', {
      // Customer details
      customerEmail: bookingWithDetails.clientEmail,
      customerName: bookingWithDetails.clientName,
      customerPhone: bookingWithDetails.clientPhone,
      
      // Contractor details
      contractorEmail: bookingWithDetails.contractorEmail,
      contractorName: bookingWithDetails.contractorName,
      contractorPhone: bookingWithDetails.contractorPhone,
      
      // Service details
      serviceTitle: bookingWithDetails.serviceTitle,
      scheduledDate: bookingWithDetails.scheduledDate,
      location: bookingWithDetails.locationCity,
      customerNotes: bookingWithDetails.customerNotes,
      
      // Pricing type information
      priceUnitType: priceUnit,
      priceUnitDisplay: priceUnitDisplay,
      
      // Duration information
      duration: durationInfo.text,
      durationUnit: durationInfo.unit,
      durationDisplay: durationInfo.displayText,
      
      // Pricing details with negotiation info
      originalPrice: serviceOffering.basePrice,
      originalPriceFormatted: `${serviceOffering.basePrice.toLocaleString()} ${serviceOffering.currency}`,
      originalPricePerUnit: `/${this.formatUnitLabel(serviceOffering.priceUnit)}`,
      
      servicePrice: bookingWithDetails.servicePrice,
      servicePriceFormatted: `${bookingWithDetails.servicePrice.toLocaleString()} ${bookingWithDetails.currency}`,
      servicePricePerUnit: priceUnit !== 'FIXED' && priceUnit !== 'PER_SESSION' 
        ? `/${this.formatUnitLabel(priceUnit)}` 
        : '',
      
      bookingFee: bookingWithDetails.bookingFeeAmount,
      bookingFeeFormatted: `${bookingWithDetails.bookingFeeAmount.toLocaleString()} ${bookingWithDetails.bookingFeeCurrency}`,
      
      totalPrice: bookingWithDetails.totalAmount,
      totalPriceFormatted: `${bookingWithDetails.totalAmount.toLocaleString()} ${bookingWithDetails.currency}`,
      
      hasBookingFee: hasBookingFee,
      
      // Platform commission details
      platformCommissionPercentage: PLATFORM_COMMISSION_PERCENTAGE,
      platformCommissionAmount: platformCommissionAmount,
      platformCommissionFormatted: platformCommissionFormatted,
      serviceProviderPayout: serviceProviderPayout,
      serviceProviderPayoutFormatted: serviceProviderPayoutFormatted,
      
      // Calculation breakdown
      calculationBreakdown: {
        baseRate: serviceOffering.basePrice,
        baseRateFormatted: `${serviceOffering.basePrice.toLocaleString()} ${serviceOffering.currency}`,
        duration: serviceDuration,
        durationLabel: durationInfo.displayText,
        multiplier: serviceDuration || 1,
        subtotal: originalSubtotal,
        subtotalFormatted: `${originalSubtotal.toLocaleString()} ${serviceOffering.currency}`,
        bookingFee: bookingFeeAmount,
        bookingFeeFormatted: `${bookingFeeAmount.toLocaleString()} ${bookingFeeCurrency}`,
        total: totalAmount,
        totalFormatted: `${totalAmount.toLocaleString()} ${serviceOffering.currency}`
      },
      
      // Negotiation flags
      isNegotiated: isNegotiated,
      proposedPrice: proposedPrice,
      proposedPriceFormatted: proposedPrice ? `${proposedPrice.toLocaleString()} ${serviceOffering.currency}` : null,
      
      // Price breakdown for email template
      priceBreakdown: {
        basePrice: serviceOffering.basePrice,
        basePriceFormatted: `${serviceOffering.basePrice.toLocaleString()} ${serviceOffering.currency}`,
        priceUnit: serviceOffering.priceUnit,
        priceUnitLabel: this.formatUnitLabel(serviceOffering.priceUnit),
        priceUnitDisplay: priceUnitDisplay,
        duration: serviceDuration,
        durationUnit: priceUnit === 'PER_HOUR' ? 'hour(s)' : 
                      priceUnit === 'PER_DAY' ? 'day(s)' :
                      priceUnit === 'PER_WEEK' ? 'week(s)' :
                      priceUnit === 'PER_MONTH' ? 'month(s)' : 'session',
        durationDisplay: durationInfo.displayText,
        calculatedAmount: servicePrice,
        calculatedAmountFormatted: `${servicePrice.toLocaleString()} ${serviceOffering.currency}`,
        calculatedAmountPerUnit: priceUnit !== 'FIXED' && priceUnit !== 'PER_SESSION'
          ? `${(servicePrice / (serviceDuration || 1)).toLocaleString()} ${serviceOffering.currency}/${this.formatUnitLabel(priceUnit)}`
          : null,
        bookingFeeAmount: bookingFeeAmount,
        bookingFeeFormatted: `${bookingFeeAmount.toLocaleString()} ${bookingFeeCurrency}`,
        platformCommissionAmount: platformCommissionAmount,
        platformCommissionFormatted: platformCommissionFormatted,
        serviceProviderPayout: serviceProviderPayout,
        serviceProviderPayoutFormatted: serviceProviderPayoutFormatted,
        totalAmount: totalAmount,
        totalAmountFormatted: `${totalAmount.toLocaleString()} ${serviceOffering.currency}`
      },
      
      // Detailed negotiation info for email templates
      negotiationDetails: negotiationDetails,
      
      // Booking metadata
      bookingId: booking.id,
      bookingExternalId: booking.externalId,
      createdAt: booking.createdAt,
      status: booking.status,
      currency: serviceOffering.currency,
      
      // Admin action flag for audit
      createdByAdmin: dto.isPlatformAdmin || false
    }); 

    // ================================================================
    // ========== RETURN RESPONSE ==========
    // ================================================================
    return BaseResponseDto.ok(
      mappedBooking,
      isNegotiated 
        ? `Booking created with negotiated price (${servicePrice.toLocaleString()} ${serviceOffering.currency}). Waiting for contractor confirmation.`
        : 'Booking created successfully. Waiting for contractor confirmation.',
      'CREATED'
    );

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Failed to create booking: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Booking creation failed', 'INTERNAL_ERROR');
  }
}

// ========== HELPER METHOD FOR FORMATTING UNIT LABELS ==========
private formatUnitLabel(priceUnit: string): string {
  switch (priceUnit) {
    case 'PER_HOUR': return 'hour';
    case 'PER_DAY': return 'day';
    case 'PER_WEEK': return 'week';
    case 'PER_MONTH': return 'month';
    case 'PER_SESSION': return 'session';
    case 'FIXED': return 'fixed';
    default: return priceUnit.toLowerCase().replace('_', ' ');
  }
}



  // ==================== ACCEPT BOOKING ====================

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
        }
        return BaseResponseDto.fail(message, 'INVALID_STATUS');
      }

      const updatedBooking = await this.prisma.serviceBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          updatedAt: new Date(),
          serviceExecutionStatus: ServiceExecutionStatus.NOT_STARTED,  // Add this line
        },
      });

      this.logger.log(`Booking ${bookingExternalId} accepted by ${isPlatformAdmin ? 'platform admin' : `contractor ${contractorId}`}`);

      await this.invalidateBooking(booking.id, booking.externalId);
      await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

      const bookingWithDetails = booking as unknown as ServiceBookingWithDetails;

    await this.queue.addJob(
  'notification-queue',
  'booking.confirmed',
  {
    customerEmail: bookingWithDetails.clientEmail,
    customerName: bookingWithDetails.clientName,
    customerPhone: bookingWithDetails.clientPhone,
    contractorEmail: bookingWithDetails.contractorEmail,
    contractorName: bookingWithDetails.contractorName,
    contractorPhone: bookingWithDetails.contractorPhone,
    serviceTitle: bookingWithDetails.serviceTitle,
    scheduledDate: bookingWithDetails.scheduledDate,
    location: bookingWithDetails.locationCity,
    price: `${bookingWithDetails.servicePrice} ${bookingWithDetails.currency}`,
    totalAmount: `${bookingWithDetails.totalAmount} ${bookingWithDetails.currency}`,
    bookingExternalId: booking.externalId,
    // NEW fields for booking confirmed emails
    servicePrice: `${bookingWithDetails.servicePrice} ${bookingWithDetails.currency}`,
    hasBookingFee: (bookingWithDetails.bookingFeeAmount || 0) > 0,
    bookingFee: bookingWithDetails.bookingFeeAmount ? `${bookingWithDetails.bookingFeeAmount} ${bookingWithDetails.bookingFeeCurrency}` : null,
    isNegotiated: false, // You may want to track this if negotiation happens before acceptance
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

  // ==================== DECLINE BOOKING ====================

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

      await this.invalidateBooking(booking.id, booking.externalId);
      await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

      await this.queue.addJob(
  'notification-queue',
  'booking.declined',
  {
    bookingId: booking.id,
    bookingExternalId: booking.externalId,
    customer: {
      name: booking.clientName,
      email: booking.clientEmail,
      phone: booking.clientPhone,
    },
    contractor: {
      name: booking.contractorName,
      email: booking.contractorEmail,
      phone: booking.contractorPhone,
    },
    service: {
      title: booking.serviceTitle,
      scheduledDate: booking.scheduledDate,
      location: booking.locationCity,
    },
    decline: {
      reason: reason,
      declinedBy: isPlatformAdmin ? 'platform-admin' : 'contractor',
      declinedAt: new Date().toISOString(),
    },
    // NEW fields for refund info
    hasBookingFee: (booking.bookingFeeAmount || 0) > 0,
    bookingFee: booking.bookingFeeAmount ? `${booking.bookingFeeAmount} ${booking.bookingFeeCurrency}` : null,
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

  // ==================== CANCEL BOOKING ====================

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

      if (!isPlatformAdmin) {
        const isClient = booking.clientId === userId;
        const isContractor = professionalId ? booking.contractorId === professionalId : false;

        if (!isClient && !isContractor) {
          return BaseResponseDto.fail('Unauthorized: You cannot cancel this booking', 'FORBIDDEN');
        }
      }

      const ALLOWED_CANCELLATION_STATUSES: BookingStatus[] = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
      
      if (!ALLOWED_CANCELLATION_STATUSES.includes(booking.status)) {
        let message = `Cannot cancel booking in ${booking.status} status. `;
        if (booking.status === BookingStatus.DECLINED) {
          message = 'Cannot cancel a declined booking.';
        } else if (booking.status === BookingStatus.CANCELLED) {
          message = 'This booking has already been cancelled.';
        }
        return BaseResponseDto.fail(message, 'INVALID_STATUS');
      }

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

      await this.invalidateBooking(booking.id, booking.externalId);
      await this.invalidateBothUsersBookings(booking.clientId, booking.contractorId);

    await this.queue.addJob(
  'notification-queue',
  'booking.cancelled',
  {
    bookingId: booking.id,
    bookingExternalId: booking.externalId,
    customer: {
      name: booking.clientName,
      email: booking.clientEmail,
      phone: booking.clientPhone,
    },
    contractor: {
      name: booking.contractorName,
      email: booking.contractorEmail,
      phone: booking.contractorPhone,
    },
    service: {
      title: booking.serviceTitle,
      scheduledDate: booking.scheduledDate,
      location: booking.locationCity,
    },
    cancellation: {
      reason: reason,
      cancelledBy: cancelledBy,
      cancelledAt: new Date().toISOString(),
    },
    // NEW fields for refund info
    hasBookingFee: (booking.bookingFeeAmount || 0) > 0,
    bookingFee: booking.bookingFeeAmount ? `${booking.bookingFeeAmount} ${booking.bookingFeeCurrency}` : null,
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

  // ==================== GET MY BOOKINGS AS CUSTOMER ====================

  async getMyBookingsAsCustomer(
    clientId: string,
    status?: string,
    limit = 20,
    offset = 0,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
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

      const mappedBookings = bookings.map((booking: any) =>
        this.mapBookingToResponseDto(booking as ServiceBookingWithDetails)
      );

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

  // ==================== GET MY BOOKINGS AS PROFESSIONAL ====================

  async getMyBookingsAsProfessional(
    contractorId: string,
    status?: string,
    limit = 20,
    offset = 0,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
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

      const clientIds = [...new Set(bookings.map((b: any) => b.clientId))];
      const clientDetails = new Map();
      
      await Promise.all(
        clientIds.map(async (id: string) => {
          const details = await this.getUserDetails(id);
          if (details) {
            clientDetails.set(id, details);
          }
        })
      );

      const mappedBookings = bookings.map((booking: any) => {
        const mapped = this.mapBookingToResponseDto(booking as ServiceBookingWithDetails);
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

  // ==================== GET BOOKING DETAILS ====================

  async getBookingDetails(
    bookingId: string,
    userId: string,
    professionalId?: string,
    isPlatformAdmin?: boolean
  ): Promise<BaseResponseDto<any>> {
    try {
      let mappedBooking = await this.getCachedBooking(bookingId);
      
      if (!mappedBooking) {
        mappedBooking = await this.getCachedBookingByExternalId(bookingId);
      }
      
      let booking: any;
      
      if (mappedBooking) {
        this.logger.debug(`Booking ${bookingId} found in Redis cache`);
      } else {
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

        return BaseResponseDto.ok(
          mappedBooking,
          'Booking details retrieved successfully',
          'OK'
        );
      }

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

  // ==================== GET UPCOMING BOOKINGS FOR PROFESSIONAL ====================

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

      const mappedBookings = bookings.map((booking: any) =>
        this.mapBookingToResponseDto(booking as ServiceBookingWithDetails)
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

  // ==================== GET PROFESSIONAL BOOKING STATS ====================

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

      return BaseResponseDto.ok(
        {
          total: totalBookings,
          pending: statusMap[BookingStatus.PENDING] || 0,
          confirmed: statusMap[BookingStatus.CONFIRMED] || 0,
          cancelled: statusMap[BookingStatus.CANCELLED] || 0,
          declined: statusMap[BookingStatus.DECLINED] || 0,
          upcoming: upcomingCount,
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

  // ==================== GET BOOKING BASIC INFO ====================

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