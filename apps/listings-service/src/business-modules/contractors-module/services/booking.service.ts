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

      // ========== NEGOTIATION LOGIC ==========
      let servicePrice = serviceOffering.basePrice;
      let isNegotiated = false;
      let proposedPrice: number | null = null;
      const priceUnit = serviceOffering.priceUnit;
      const bookingCity = dto.locationCity;
      let serviceDuration: number | null = null;

      // Check if customer is proposing a different price
      if (dto.proposedPrice !== undefined && dto.proposedPrice !== null && dto.proposedPrice !== serviceOffering.basePrice) {
        proposedPrice = dto.proposedPrice;
        
        // Check if service is negotiable
        if (!serviceOffering.isNegotiable) {
          return BaseResponseDto.fail(
            'This service is not negotiable. Please accept the standard price.',
            'NOT_NEGOTIABLE'
          );
        }
        
        // Validate proposed price against min/max range
        if (serviceOffering.minNegotiablePrice !== null && proposedPrice < serviceOffering.minNegotiablePrice) {
          return BaseResponseDto.fail(
            `Proposed price (${proposedPrice} ${serviceOffering.currency}) is below the professional's minimum acceptable price (${serviceOffering.minNegotiablePrice} ${serviceOffering.currency}).`,
            'PRICE_BELOW_MINIMUM'
          );
        }
        
        if (serviceOffering.maxNegotiablePrice !== null && proposedPrice > serviceOffering.maxNegotiablePrice) {
          return BaseResponseDto.fail(
            `Proposed price (${proposedPrice} ${serviceOffering.currency}) exceeds the professional's maximum price (${serviceOffering.maxNegotiablePrice} ${serviceOffering.currency}).`,
            'PRICE_ABOVE_MAXIMUM'
          );
        }
        
        isNegotiated = true;
        servicePrice = proposedPrice;
        
        this.logger.log(`Negotiated price: Customer proposed ${proposedPrice} ${serviceOffering.currency} for service ${serviceOffering.id}`);
      }

      // Calculate total price based on duration
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
          serviceDuration = dto.durationHours;
          servicePrice = servicePrice * dto.durationHours;
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
          serviceDuration = dto.durationDays;
          servicePrice = servicePrice * dto.durationDays;
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
            serviceDuration = weeks;
            servicePrice = servicePrice * weeks;
          } else if (dto.durationWeeks && dto.durationWeeks > 0) {
            serviceDuration = dto.durationWeeks;
            servicePrice = servicePrice * dto.durationWeeks;
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
            serviceDuration = dto.durationMonths;
            servicePrice = servicePrice * dto.durationMonths;
          }
          break;
          
        case 'PER_SESSION':
        case 'FIXED':
        default:
          if (dto.durationHours || dto.durationDays || dto.durationWeeks || dto.durationMonths) {
            return BaseResponseDto.fail(`This service has a fixed price${priceUnit === 'PER_SESSION' ? ' per session' : ''}. Duration is not required.`, 'DURATION_NOT_ALLOWED');
          }
          serviceDuration = 1;
          break;
      }

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

      // ========== BOOKING FEE CALCULATION ==========
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

      this.logger.log(`Booking created: ${bookingWithDetails.id} - Client: ${dto.clientId} - Contractor: ${dto.contractorId} - ${isNegotiated ? `Negotiated Price: ${servicePrice}` : `Standard Price: ${servicePrice}`} + Booking Fee: ${bookingFeeAmount} = Total: ${totalAmount} ${serviceOffering.currency}`);

      const mappedBooking = this.mapBookingToResponseDto(bookingWithDetails);
      await this.cacheBooking(booking.id, mappedBooking);
      await this.cacheBookingByExternalId(booking.externalId, mappedBooking);

      await this.queue.addJob('notification-queue', 'booking.created', {
        customerEmail: bookingWithDetails.clientEmail,
        customerName: bookingWithDetails.clientName,
        customerPhone: bookingWithDetails.clientPhone,
        contractorEmail: bookingWithDetails.contractorEmail,
        contractorName: bookingWithDetails.contractorName,
        contractorPhone: bookingWithDetails.contractorPhone,
        serviceTitle: bookingWithDetails.serviceTitle,
        scheduledDate: bookingWithDetails.scheduledDate,
        location: bookingWithDetails.locationCity,
        servicePrice: `${bookingWithDetails.servicePrice} ${bookingWithDetails.currency}`,
        bookingFee: `${bookingWithDetails.bookingFeeAmount} ${bookingWithDetails.bookingFeeCurrency}`,
        totalPrice: `${bookingWithDetails.totalAmount} ${bookingWithDetails.currency}`,
        isNegotiated: isNegotiated,
        notes: bookingWithDetails.customerNotes,
      });

      return BaseResponseDto.ok(
        mappedBooking,
        isNegotiated 
          ? `Booking created with negotiated price (${servicePrice} ${serviceOffering.currency}). Waiting for contractor confirmation.`
          : 'Booking created successfully. Waiting for contractor confirmation.',
        'CREATED'
      );

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create booking: ${err.message}`);
      return BaseResponseDto.fail(err.message || 'Booking creation failed', 'INTERNAL_ERROR');
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
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
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