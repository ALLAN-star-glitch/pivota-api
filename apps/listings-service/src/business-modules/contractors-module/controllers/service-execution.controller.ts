import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import {
  StartWorkRequestDto,
  CompleteWorkRequestDto,
  GetWorkStatusRequestDto,
  CheckAutoReleaseEligibilityRequestDto,
  StartWorkResponseDto,
  CompleteWorkResponseDto,
  WorkStatusResponseDto,
  AutoReleaseEligibilityResponseDto,
  MultipleEvidenceUploadResponseDto,
  BaseResponseDto,
} from '@pivota-api/dtos';
import { ServiceExecutionService } from '../services/service-execution.service';

// Define gRPC request interface for evidence file upload
interface UploadEvidenceFilesGrpcRequest {
  bookingExternalId: string;
  files: Array<{
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }>;
  professionalId: string;
  isPlatformAdmin: boolean;
}

@Controller()
export class ServiceExecutionController {
  private readonly logger = new Logger(ServiceExecutionController.name);

  constructor(
    private readonly serviceExecutionService: ServiceExecutionService,
  ) {}

  // ========================================================================
  // SERVICE EXECUTION METHODS
  // ========================================================================

  @GrpcMethod('ServiceExecutionService', 'StartWork')
  async startWork(
    data: StartWorkRequestDto,
  ): Promise<BaseResponseDto<StartWorkResponseDto>> {
    this.logger.log(`[gRPC] StartWork called: bookingExternalId=${data.bookingExternalId}, professionalId=${data.professionalId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.serviceExecutionService.startWork(data);
  }

  @GrpcMethod('ServiceExecutionService', 'CompleteWork')
  async completeWork(
    data: CompleteWorkRequestDto,
  ): Promise<BaseResponseDto<CompleteWorkResponseDto>> {
    this.logger.log(`[gRPC] CompleteWork called: bookingExternalId=${data.bookingExternalId}, professionalId=${data.professionalId}, evidenceCount=${data.evidenceUrls?.length || 0}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.serviceExecutionService.completeWork(data);
  }



  @GrpcMethod('ServiceExecutionService', 'GetWorkStatus')
  async getWorkStatus(
    data: GetWorkStatusRequestDto,
  ): Promise<BaseResponseDto<WorkStatusResponseDto>> {
    this.logger.log(`[gRPC] GetWorkStatus called: bookingExternalId=${data.bookingExternalId}, userId=${data.userId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.serviceExecutionService.getWorkStatus(data);
  }

  @GrpcMethod('ServiceExecutionService', 'CheckAutoReleaseEligible')
  async checkAutoReleaseEligible(
    data: CheckAutoReleaseEligibilityRequestDto,
  ): Promise<BaseResponseDto<AutoReleaseEligibilityResponseDto>> {
    this.logger.log(`[gRPC] CheckAutoReleaseEligible called: bookingExternalId=${data.bookingExternalId}, isPlatformAdmin=${data.isPlatformAdmin}`);
    return this.serviceExecutionService.checkAutoReleaseEligible(data);
  }
}