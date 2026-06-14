
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import {
  BaseResponseDto,
  ConfirmSatisfactionGrpcRequestDto,
  ReportDissatisfactionGrpcRequestDto,
  ConfirmSatisfactionResponseDto,
  ReportDissatisfactionResponseDto,
  ConfirmSatisfactionRequestDto,
  ReportDissatisfactionRequestDto,
} from '@pivota-api/dtos';
import { CustomerConfirmationService } from '../services/customer-confirmation.service';

@Controller()
export class CustomerConfirmationController {
  private readonly logger = new Logger(CustomerConfirmationController.name);

  constructor(
    private readonly customerConfirmationService: CustomerConfirmationService,
  ) {}

  // ========================================================================
  // CUSTOMER CONFIRMATION METHODS
  // ========================================================================

  @GrpcMethod('CustomerConfirmationService', 'ConfirmSatisfaction')
  async confirmSatisfaction(
    @Payload() data: ConfirmSatisfactionGrpcRequestDto,
  ): Promise<BaseResponseDto<ConfirmSatisfactionResponseDto>> {
    this.logger.log(`[gRPC] ConfirmSatisfaction called: bookingExternalId=${data.bookingExternalId}, customerId=${data.customerId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    
    const dto: ConfirmSatisfactionRequestDto = {
      bookingExternalId: data.bookingExternalId,
      customerId: data.customerId,
      isPlatformAdmin: data.isPlatformAdmin,
    };
    
    return this.customerConfirmationService.confirmSatisfaction(dto);
  }

  @GrpcMethod('CustomerConfirmationService', 'ReportDissatisfaction')
  async reportDissatisfaction(
    @Payload() data: ReportDissatisfactionGrpcRequestDto,
  ): Promise<BaseResponseDto<ReportDissatisfactionResponseDto>> {
    this.logger.log(`[gRPC] ReportDissatisfaction called: bookingExternalId=${data.bookingExternalId}, customerId=${data.customerId}, reason=${data.reason}, isPlatformAdmin=${data.isPlatformAdmin}`);
    
    const dto: ReportDissatisfactionRequestDto = {
      bookingExternalId: data.bookingExternalId,
      customerId: data.customerId,
      isPlatformAdmin: data.isPlatformAdmin,
      reason: data.reason,
      description: data.description,
      evidenceUrls: data.evidenceUrls,
    };
    
    return this.customerConfirmationService.reportDissatisfaction(dto);
  }
}