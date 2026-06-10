import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  CancelBookingRequestDto,
  GetCustomerBookingsRequestDto,
  GetContractorBookingsRequestDto,
  GetBookingDetailsRequestDto,
  GetUpcomingBookingsRequestDto,
  GetProfessionalStatsRequestDto,
  BookingResponseDto,
  BookingStatisticsResponseDto,
  PaginatedBookingsResponseDto,
  UpcomingBookingResponseDto,
  BookingActionResponseDto,
  BookingStatusListResponseDto,
} from '@pivota-api/dtos';

// This matches the booking.proto
interface BookingServiceGrpc {
  GetBookingStatuses(
    data: Record<string, never>,
  ): Observable<BaseResponseDto<BookingStatusListResponseDto>>;

  CreateBooking(
    data: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingResponseDto>>;

  AcceptBooking(
    data: AcceptBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingActionResponseDto>>;

  DeclineBooking(
    data: DeclineBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingActionResponseDto>>;

  CancelBooking(
    data: CancelBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingActionResponseDto>>;

  GetMyBookingsAsCustomer(
    data: GetCustomerBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<PaginatedBookingsResponseDto>>;

  GetMyBookingsAsProfessional(
    data: GetContractorBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<PaginatedBookingsResponseDto>>;

  GetBookingDetails(
    data: GetBookingDetailsRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingResponseDto>>;

  GetUpcomingBookingsForProfessional(
    data: GetUpcomingBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<UpcomingBookingResponseDto[]>>;

  GetProfessionalBookingStats(
    data: GetProfessionalStatsRequestDto & { isPlatformAdmin?: boolean },
  ): Observable<BaseResponseDto<BookingStatisticsResponseDto>>;
}

@Injectable()
export class BookingGatewayService {
  private readonly logger = new Logger(BookingGatewayService.name);
  private grpcService: BookingServiceGrpc;

  constructor(
    @Inject('BOOKING_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<BookingServiceGrpc>('BookingService');
  }

  // ===========================================================
  // BOOKING STATUS METHODS
  // ===========================================================

  async getBookingStatuses(): Promise<BaseResponseDto<BookingStatusListResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetBookingStatuses({})
      );

      this.logger.debug(`GetBookingStatuses gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching booking statuses: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch booking statuses', 'GRPC_ERROR');
    }
  }

  // ===========================================================
  // BOOKING CRUD METHODS
  // ===========================================================

  async createBooking(
    dto: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.CreateBooking(dto));

      this.logger.debug(`CreateBooking gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error creating booking: ${error.message}`);
      return BaseResponseDto.fail('Failed to create booking', 'GRPC_ERROR');
    }
  }

  async acceptBooking(
    dto: AcceptBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.AcceptBooking({
        bookingId: dto.bookingId,
        contractorId: dto.contractorId,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`AcceptBooking gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error accepting booking: ${error.message}`);
      return BaseResponseDto.fail('Failed to accept booking', 'GRPC_ERROR');
    }
  }

  async declineBooking(
    dto: DeclineBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.DeclineBooking({
        bookingId: dto.bookingId,
        contractorId: dto.contractorId,
        reason: dto.reason,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`DeclineBooking gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error declining booking: ${error.message}`);
      return BaseResponseDto.fail('Failed to decline booking', 'GRPC_ERROR');
    }
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    professionalId?: string,
    reason?: string,
    isPlatformAdmin?: boolean,
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.CancelBooking({ 
          bookingId, 
          userId, 
          professionalId, 
          reason,
          isPlatformAdmin,
        })
      );
      
      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      
      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error cancelling booking: ${error.message}`);
      return BaseResponseDto.fail('Failed to cancel booking', 'GRPC_ERROR');
    }
  }

  // ===========================================================
  // BOOKING RETRIEVAL METHODS
  // ===========================================================

  async getMyBookingsAsCustomer(
    dto: GetCustomerBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetMyBookingsAsCustomer({
        clientId: dto.clientId,
        status: dto.status,
        limit: dto.limit,
        offset: dto.offset,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`GetMyBookingsAsCustomer gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching customer bookings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch bookings', 'FETCH_ERROR');
    }
  }

  async getMyBookingsAsProfessional(
    dto: GetContractorBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetMyBookingsAsProfessional({
        contractorId: dto.contractorId,
        status: dto.status,
        limit: dto.limit,
        offset: dto.offset,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`GetMyBookingsAsProfessional gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching contractor bookings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch bookings', 'FETCH_ERROR');
    }
  }

  async getBookingDetails(
    bookingId: string,
    userId: string,
    professionalId?: string,
    isPlatformAdmin?: boolean,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetBookingDetails({ 
          bookingId, 
          userId, 
          professionalId,
          isPlatformAdmin,
        })
      );
      
      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      
      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching booking details: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch booking details', 'FETCH_ERROR');
    }
  }

  async getUpcomingBookingsForProfessional(
    dto: GetUpcomingBookingsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<UpcomingBookingResponseDto[]>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetUpcomingBookingsForProfessional({
        contractorId: dto.contractorId,
        limit: dto.limit,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`GetUpcomingBookingsForProfessional gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching upcoming bookings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch upcoming bookings', 'FETCH_ERROR');
    }
  }

  async getProfessionalBookingStats(
    dto: GetProfessionalStatsRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetProfessionalBookingStats({
        contractorId: dto.contractorId,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`GetProfessionalBookingStats gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching booking stats: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch booking statistics', 'FETCH_ERROR');
    }
  }
}