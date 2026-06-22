import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import {
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  CancelBookingRequestDto,
  BookingResponseDto,
  BookingStatisticsResponseDto,
  PaginatedBookingsResponseDto,
  UpcomingBookingResponseDto,
  GetBookingDetailsRequestDto,
  GetContractorBookingsRequestDto,
  GetCustomerBookingsRequestDto,
  GetProfessionalStatsRequestDto,  
  GetUpcomingBookingsRequestDto,
  BookingActionResponseDto,
  BookingStatusListResponseDto,
  BaseResponseDto,
} from '@pivota-api/dtos';
import { BookingService } from '../services/booking.service';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    private readonly bookingService: BookingService,
  ) {}

  // ========================================================================
  // BOOKING STATUS METHODS
  // ========================================================================

  @GrpcMethod('BookingService', 'GetBookingStatuses')
  async getBookingStatuses(): Promise<BaseResponseDto<BookingStatusListResponseDto>> {
    this.logger.log(`[gRPC] GetBookingStatuses called`);
    return this.bookingService.getBookingStatuses();
  }

  // ========================================================================
  // BOOKING CRUD METHODS
  // ========================================================================

  @GrpcMethod('BookingService', 'CreateBooking')
  async createBooking(
    data: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] CreateBooking called: serviceId=${data.serviceId}, clientId=${data.clientId}, contractorId=${data.contractorId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.createBooking(data);
  }

  @GrpcMethod('BookingService', 'AcceptBooking')
  async acceptBooking(
    data: AcceptBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    this.logger.log(`[gRPC] AcceptBooking called: ${data.bookingId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.acceptBooking(data.bookingId, data.contractorId, data.isPlatformAdmin);
  }

  @GrpcMethod('BookingService', 'DeclineBooking')
  async declineBooking(
    data: DeclineBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    this.logger.log(`[gRPC] DeclineBooking called: ${data.bookingId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.declineBooking(data.bookingId, data.contractorId, data.reason, data.isPlatformAdmin);
  }

  @GrpcMethod('BookingService', 'CancelBooking')
  async cancelBooking(
    data: CancelBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    this.logger.log(`[gRPC] CancelBooking called: ${data.bookingId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    
    if (!data) {
      this.logger.error(`[gRPC] CancelBooking - data is undefined!`);
      return BaseResponseDto.fail('Invalid request data', 'BAD_REQUEST');
    }
    
    return this.bookingService.cancelBooking(
      data.bookingId,
      data.userId,
      data.professionalId,
      data.reason,
      data.isPlatformAdmin
    );
  }

  // ========================================================================
  // BOOKING RETRIEVAL METHODS
  // ========================================================================

  @GrpcMethod('BookingService', 'GetMyBookingsAsCustomer')
  async getMyBookingsAsCustomer(
    data: GetCustomerBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
    this.logger.log(`[gRPC] GetMyBookingsAsCustomer called: ${data.clientId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.getMyBookingsAsCustomer(
      data.clientId,
      data.status,
      data.limit ?? 20,
      data.offset ?? 0,
      data.isPlatformAdmin,
    );
  }  

  @GrpcMethod('BookingService', 'GetMyBookingsAsProfessional')
  async getMyBookingsAsProfessional(
    data: GetContractorBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
    this.logger.log(`[gRPC] GetMyBookingsAsProfessional called: ${data.contractorId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.getMyBookingsAsProfessional(
      data.contractorId,
      data.status,
      data.limit ?? 20,
      data.offset ?? 0,
      data.isPlatformAdmin,
    );
  }

  @GrpcMethod('BookingService', 'GetBookingDetails')
  async getBookingDetails(
    data: GetBookingDetailsRequestDto & { isPlatformAdmin?: boolean }
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] GetBookingDetails called: ${data.bookingId} by userId: ${data.userId}, professionalId: ${data.professionalId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.getBookingDetails(
      data.bookingId,
      data.userId,
      data.professionalId,
      data.isPlatformAdmin
    );
  }

  @GrpcMethod('BookingService', 'GetUpcomingBookingsForProfessional')
  async getUpcomingBookingsForProfessional(
    data: GetUpcomingBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<UpcomingBookingResponseDto[]>> {
    this.logger.log(`[gRPC] GetUpcomingBookingsForProfessional called: ${data.contractorId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.getUpcomingBookingsForProfessional(
      data.contractorId,
      data.limit ?? 10,
      data.isPlatformAdmin
    );
  }

  @GrpcMethod('BookingService', 'GetProfessionalBookingStats')
  async getProfessionalBookingStats(
    data: GetProfessionalStatsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
    this.logger.log(`[gRPC] GetProfessionalBookingStats called: ${data.contractorId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.bookingService.getProfessionalBookingStats(
      data.contractorId,
      data.isPlatformAdmin
    );
  }
}