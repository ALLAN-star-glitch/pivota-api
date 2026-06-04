import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import {
  CreateServiceGrpcOfferingDto,
  GetOfferingByVerticalRequestDto,
  UpdateServiceOfferingDto,
  BaseResponseDto,
  ServiceOfferingResponseDto,
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  CancelBookingRequestDto,
  CompleteBookingRequestDto,
  BookingResponseDto,
  BookingStatisticsResponseDto,
  PaginatedBookingsResponseDto,
  UpcomingBookingResponseDto,
  GetBookingDetailsRequestDto,
  GetContractorBookingsRequestDto,
  GetCustomerBookingsRequestDto,
  GetProfessionalStatsRequestDto,
  GetUpcomingBookingsRequestDto,
} from '@pivota-api/dtos';
import { ContractorsPricingService } from '../services/contractors-pricing.service';
import { ContractorsService } from '../services/contractors.service';

@Controller()
export class ContractorsController {
  private readonly logger = new Logger(ContractorsController.name);

  constructor(
    private readonly contractorsService: ContractorsService,
    private readonly pricingService: ContractorsPricingService,
  ) {}

  // ========================================================================
  // SERVICE OFFERING METHODS
  // ========================================================================

  @GrpcMethod('ContractorsService', 'CreateServiceOffering')
  async createServiceOffering(
    data: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.log(`[gRPC] CreateServiceOffering called for professional: ${data.skilledProfessionalId}`);
    return this.contractorsService.createServiceOffering(data);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingsByVertical')
  async getOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(`[gRPC] GetOfferingsByVertical called: ${data.vertical}`);
    return this.contractorsService.getOfferingsByVertical(data);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingsByAccount')
  async getOfferingsByAccount(
    data: { accountId: string },
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(`[gRPC] GetOfferingsByAccount called: ${data.accountId}`);
    return this.contractorsService.getOfferingsByAccount(data.accountId);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingsByProfessional')
  async getOfferingsByProfessional(
    data: { professionalId: string },
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(`[gRPC] GetOfferingsByProfessional called: ${data.professionalId}`);
    return this.contractorsService.getOfferingsByProfessional(data.professionalId);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingById')
  async getOfferingById(
    data: { id: string },
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.log(`[gRPC] GetOfferingById called: ${data.id}`);
    return this.contractorsService.getOfferingById(data.id);
  }

  @GrpcMethod('ContractorsService', 'UpdateServiceOffering')
  async updateServiceOffering(
    data: { id: string; userId: string } & UpdateServiceOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.log(`[gRPC] UpdateServiceOffering called: ${data.id}`);
    return this.contractorsService.updateServiceOffering(data.id, data, data.userId);
  }

  @GrpcMethod('ContractorsService', 'DeleteServiceOffering')
  async deleteServiceOffering(
    data: { id: string; userId: string },
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`[gRPC] DeleteServiceOffering called: ${data.id}`);
    return this.contractorsService.deleteServiceOffering(data.id, data.userId);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingsByCategory')
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
    this.logger.log(`[gRPC] GetOfferingsByCategory called: ${data.categoryId}`);
    return this.contractorsService.getOfferingsByCategory(data);
  }

  // ========================================================================
  // BOOKING MANAGEMENT METHODS
  // ========================================================================

 @GrpcMethod('ContractorsService', 'CreateBooking')
async createBooking(
  data: CreateBookingRequestDto & { clientId: string },  // clientId is now included from gateway
): Promise<BaseResponseDto<BookingResponseDto>> {
  this.logger.log(`[gRPC] CreateBooking called: serviceId=${data.serviceId}, clientId=${data.clientId}, contractorId=${data.contractorId}`);
  return this.contractorsService.createBooking(data);
}

  @GrpcMethod('ContractorsService', 'AcceptBooking')
  async acceptBooking(
    data: AcceptBookingRequestDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] AcceptBooking called: ${data.bookingId}`);
    return this.contractorsService.acceptBooking(data.bookingId, data.contractorId);
  }

  @GrpcMethod('ContractorsService', 'DeclineBooking')
  async declineBooking(
    data: DeclineBookingRequestDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] DeclineBooking called: ${data.bookingId}`);
    return this.contractorsService.declineBooking(data.bookingId, data.contractorId, data.reason);
  }

  @GrpcMethod('ContractorsService', 'CancelBooking')
  async cancelBooking(
    data: CancelBookingRequestDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] CancelBooking called: ${data.bookingId}`);
    return this.contractorsService.cancelBooking(data.bookingId, data.userId, data.userType, data.reason);
  }

  @GrpcMethod('ContractorsService', 'CompleteBooking')
  async completeBooking(
    data: CompleteBookingRequestDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    this.logger.log(`[gRPC] CompleteBooking called: ${data.bookingId}`);
    return this.contractorsService.completeBooking(data.bookingId, data.contractorId);
  }

  @GrpcMethod('ContractorsService', 'GetMyBookingsAsCustomer')
async getMyBookingsAsCustomer(
  data: GetCustomerBookingsRequestDto,
): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
  this.logger.log(`[gRPC] GetMyBookingsAsCustomer called: ${data.clientId}`);
  return this.contractorsService.getMyBookingsAsCustomer(
    data.clientId,
    data.status,
    data.limit ?? 20,
    data.offset ?? 0,
  );
}

  @GrpcMethod('ContractorsService', 'GetMyBookingsAsProfessional')
async getMyBookingsAsProfessional(
  data: GetContractorBookingsRequestDto,
): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
  this.logger.log(`[gRPC] GetMyBookingsAsProfessional called: ${data.contractorId}`);
  return this.contractorsService.getMyBookingsAsProfessional(
    data.contractorId,
    data.status,
    data.limit ?? 20,
    data.offset ?? 0,
  );
}

 @GrpcMethod('ContractorsService', 'GetBookingDetails')
async getBookingDetails(
  data: GetBookingDetailsRequestDto,
): Promise<BaseResponseDto<BookingResponseDto>> {
  this.logger.log(`[gRPC] GetBookingDetails called: ${data.bookingId}`);
  return this.contractorsService.getBookingDetails(data.bookingId, data.userId, data.userType);
}

@GrpcMethod('ContractorsService', 'GetUpcomingBookingsForProfessional')
async getUpcomingBookingsForProfessional(
  data: GetUpcomingBookingsRequestDto,
): Promise<BaseResponseDto<UpcomingBookingResponseDto[]>> {
  this.logger.log(`[gRPC] GetUpcomingBookingsForProfessional called: ${data.contractorId}`);
  return this.contractorsService.getUpcomingBookingsForProfessional(data.contractorId, data.limit ?? 10);
}

 @GrpcMethod('ContractorsService', 'GetProfessionalBookingStats')
async getProfessionalBookingStats(
  data: GetProfessionalStatsRequestDto,
): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
  this.logger.log(`[gRPC] GetProfessionalBookingStats called: ${data.contractorId}`);
  return this.contractorsService.getProfessionalBookingStats(data.contractorId);
}
}