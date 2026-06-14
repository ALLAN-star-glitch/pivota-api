import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  ConfirmSatisfactionRequestDto,
  ReportDissatisfactionRequestDto,
  ConfirmSatisfactionResponseDto,
  ReportDissatisfactionResponseDto,
} from '@pivota-api/dtos';

// This matches the customer_confirmation.proto
interface CustomerConfirmationServiceGrpc {
  ConfirmSatisfaction(
    data: ConfirmSatisfactionRequestDto,
  ): Observable<BaseResponseDto<ConfirmSatisfactionResponseDto>>;

  ReportDissatisfaction(
    data: ReportDissatisfactionRequestDto,
  ): Observable<BaseResponseDto<ReportDissatisfactionResponseDto>>;
}

@Injectable()
export class CustomerConfirmationGatewayService {
  private readonly logger = new Logger(CustomerConfirmationGatewayService.name);
  private grpcService: CustomerConfirmationServiceGrpc;

  constructor(
    @Inject('CUSTOMER_CONFIRMATION_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<CustomerConfirmationServiceGrpc>('CustomerConfirmationService');
  }

  // ===========================================================
  // CUSTOMER CONFIRMATION METHODS
  // ===========================================================

  async confirmSatisfaction(
    dto: ConfirmSatisfactionRequestDto,
  ): Promise<BaseResponseDto<ConfirmSatisfactionResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.ConfirmSatisfaction(dto));

      this.logger.debug(`ConfirmSatisfaction gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error confirming satisfaction: ${error.message}`);
      return BaseResponseDto.fail('Failed to confirm satisfaction', 'GRPC_ERROR');
    }
  }

  async reportDissatisfaction(
    dto: ReportDissatisfactionRequestDto,
  ): Promise<BaseResponseDto<ReportDissatisfactionResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.ReportDissatisfaction(dto));

      this.logger.debug(`ReportDissatisfaction gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error reporting dissatisfaction: ${error.message}`);
      return BaseResponseDto.fail('Failed to report dissatisfaction', 'GRPC_ERROR');
    }
  }
}