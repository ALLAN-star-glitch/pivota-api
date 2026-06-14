import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  StartWorkRequestDto,
  CompleteWorkRequestDto,
  GetWorkStatusRequestDto,
  CheckAutoReleaseEligibilityRequestDto,
  StartWorkResponseDto,
  CompleteWorkResponseDto,
  WorkStatusResponseDto,
  AutoReleaseEligibilityResponseDto,
} from '@pivota-api/dtos';

// This matches the service_execution.proto
interface ServiceExecutionServiceGrpc {
  StartWork(
    data: StartWorkRequestDto,
  ): Observable<BaseResponseDto<StartWorkResponseDto>>;

  CompleteWork(
    data: CompleteWorkRequestDto,
  ): Observable<BaseResponseDto<CompleteWorkResponseDto>>;

  GetWorkStatus(
    data: GetWorkStatusRequestDto,
  ): Observable<BaseResponseDto<WorkStatusResponseDto>>;

  CheckAutoReleaseEligible(
    data: CheckAutoReleaseEligibilityRequestDto,
  ): Observable<BaseResponseDto<AutoReleaseEligibilityResponseDto>>;
}

@Injectable()
export class ServiceExecutionGatewayService {
  private readonly logger = new Logger(ServiceExecutionGatewayService.name);
  private grpcService: ServiceExecutionServiceGrpc;

  constructor(
    @Inject('SERVICE_EXECUTION_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<ServiceExecutionServiceGrpc>('ServiceExecutionService');
  }

  // ===========================================================
  // SERVICE EXECUTION METHODS
  // ===========================================================

  async startWork(
    dto: StartWorkRequestDto,
  ): Promise<BaseResponseDto<StartWorkResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.StartWork(dto));

      this.logger.debug(`StartWork gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error starting work: ${error.message}`);
      return BaseResponseDto.fail('Failed to start work', 'GRPC_ERROR');
    }
  }

  async completeWork(
    dto: CompleteWorkRequestDto,
  ): Promise<BaseResponseDto<CompleteWorkResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.CompleteWork(dto));

      this.logger.debug(`CompleteWork gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error completing work: ${error.message}`);
      return BaseResponseDto.fail('Failed to complete work', 'GRPC_ERROR');
    }
  }

  async getWorkStatus(
    dto: GetWorkStatusRequestDto,
  ): Promise<BaseResponseDto<WorkStatusResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetWorkStatus(dto));

      this.logger.debug(`GetWorkStatus gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching work status: ${error.message}`);
      return BaseResponseDto.fail('Failed to fetch work status', 'GRPC_ERROR');
    }
  }

  async checkAutoReleaseEligible(
    dto: CheckAutoReleaseEligibilityRequestDto,
  ): Promise<BaseResponseDto<AutoReleaseEligibilityResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.CheckAutoReleaseEligible(dto));

      this.logger.debug(`CheckAutoReleaseEligible gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error checking auto-release eligibility: ${error.message}`);
      return BaseResponseDto.fail('Failed to check auto-release eligibility', 'GRPC_ERROR');
    }
  }
}