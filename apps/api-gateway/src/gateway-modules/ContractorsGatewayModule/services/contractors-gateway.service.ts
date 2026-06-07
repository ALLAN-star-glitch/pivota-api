import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceGrpcOfferingDto,
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  CancelBookingRequestDto,
  CompleteBookingRequestDto,
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
import { UserService } from '../../UserProfileGatewayModule/services/user.service';

// This matches the contractors.proto
interface ContractorsServiceGrpc {
  // Service Offering Methods
  CreateServiceOffering(
    data: CreateServiceGrpcOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  GetOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingsByAccount(
    data: { accountId: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingsByProfessional(
    data: { professionalId: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  GetOfferingById(
    data: { id: string },
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  UpdateServiceOffering(
    data: { id: string; userId: string } & UpdateServiceOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  DeleteServiceOffering(
    data: { id: string; userId: string },
  ): Observable<BaseResponseDto<null>>;

  GetOfferingsByCategory(
    data: { 
      categoryId: string; 
      limit?: number; 
      offset?: number;
      city?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;

  // Booking Methods
  CreateBooking(
    data: CreateBookingRequestDto & { isPlatformAdmin?: boolean },
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

  CompleteBooking(
    data: CompleteBookingRequestDto & { isPlatformAdmin?: boolean },
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

  GetBookingStatuses(
    data: Record<string, never>,
  ): Observable<BaseResponseDto<BookingStatusListResponseDto>>;
}

@Injectable()
export class ContractorsGatewayService {
  private readonly logger = new Logger(ContractorsGatewayService.name);
  private grpcService: ContractorsServiceGrpc;

  constructor(
    @Inject('CONTRACTORS_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
    private readonly userService: UserService,
  ) {
    this.grpcService = this.grpcClient.getService<ContractorsServiceGrpc>('ContractorsService');
  }

  // ===========================================================
  // SERVICE OFFERING METHODS
  // ===========================================================

  async createServiceOffering(
    dto: CreateServiceOfferingDto,
    userId: string,
    accountId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const professionalProfile = await this.userService.getSkilledProfessionalByAccount(accountId);
      
      if (!professionalProfile.success || !professionalProfile.data) {
        return BaseResponseDto.fail(
          'No skilled professional profile found. Please create a professional profile first.',
          'PROFILE_NOT_FOUND'
        );
      }

      const grpcRequest: CreateServiceGrpcOfferingDto = {
        ...dto,
        skilledProfessionalId: professionalProfile.data.uuid,
        creatorId: userId,
        accountId: accountId,
      };

      const res = await firstValueFrom(this.grpcService.CreateServiceOffering(grpcRequest));

      this.logger.debug(`CreateServiceOffering gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error creating offering: ${error.message}`);
      return BaseResponseDto.fail('Internal Service Error', 'GRPC_ERROR');
    }
  }

  async getOfferingsByVertical(
    dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetOfferingsByVertical(dto));

      this.logger.debug(`GetOfferingsByVertical gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch providers', 'FETCH_ERROR');
    }
  }

  async getOfferingsByAccount(
    accountId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByAccount({ accountId })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by account: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  async getOfferingsByProfessional(
    professionalId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByProfessional({ professionalId })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by professional: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  async getOfferingById(
    id: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingById({ id })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offering by id: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offering', 'FETCH_ERROR');
    }
  }

  async updateServiceOffering(
    id: string,
    dto: UpdateServiceOfferingDto,
    userId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.UpdateServiceOffering({
          id,
          userId,
          ...dto,
        })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error updating offering: ${error.message}`);
      return BaseResponseDto.fail('Failed to update offering', 'UPDATE_ERROR');
    } 
  }

  async deleteServiceOffering(
    id: string,
    userId: string,
  ): Promise<BaseResponseDto<null>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.DeleteServiceOffering({ id, userId })
      );

      if (res?.success) {
        return BaseResponseDto.ok(null, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error deleting offering: ${error.message}`);
      return BaseResponseDto.fail('Failed to delete offering', 'DELETE_ERROR');
    }
  }

  async getOfferingsByCategory(
    categoryId: string,
    limit?: number,
    offset?: number,
    city?: string,
    minPrice?: number,
    maxPrice?: number,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    try {
      const res = await firstValueFrom(
        this.grpcService.GetOfferingsByCategory({ 
          categoryId, 
          limit: limit || 20, 
          offset: offset || 0,
          city,
          minPrice,
          maxPrice,
        })
      );

      if (res?.success) {
        return BaseResponseDto.ok(res.data || [], res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching offerings by category: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch offerings', 'FETCH_ERROR');
    }
  }

  // ===========================================================
  // BOOKING METHODS
  // ===========================================================

 async createBooking(
  dto: CreateBookingRequestDto & { clientId: string; isPlatformAdmin?: boolean },
): Promise<BaseResponseDto<BookingResponseDto>> {
  try {
    // ✅ Just spread the entire dto - it already contains all fields including clientId
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
    professionalId: string | undefined,
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

  async completeBooking(
    dto: CompleteBookingRequestDto & { isPlatformAdmin?: boolean },
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.CompleteBooking({
        bookingId: dto.bookingId,
        contractorId: dto.contractorId,
        isPlatformAdmin: dto.isPlatformAdmin,
      }));

      this.logger.debug(`CompleteBooking gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error completing booking: ${error.message}`);
      return BaseResponseDto.fail('Failed to complete booking', 'GRPC_ERROR');
    }
  }

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
}