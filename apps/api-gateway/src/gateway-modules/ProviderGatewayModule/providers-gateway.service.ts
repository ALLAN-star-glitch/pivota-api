import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  CreateServiceOfferingDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
} from '@pivota-api/dtos';

// This matches the providers.proto we created earlier
interface ProvidersServiceGrpc {
  CreateServiceOffering(
    data: CreateServiceOfferingDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto>>;

  GetOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Observable<BaseResponseDto<ServiceOfferingResponseDto[]>>;
}

@Injectable()
export class ProvidersGatewayService {
  private readonly logger = new Logger(ProvidersGatewayService.name);
  private grpcService: ProvidersServiceGrpc;

  constructor(
    @Inject('PROVIDERS_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<ProvidersServiceGrpc>('ProvidersService');
  }

  // ===========================================================
  // CREATE SERVICE OFFERING
  // ===========================================================
  async createServiceOffering(
    dto: CreateServiceOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.CreateServiceOffering(dto));

      this.logger.debug(`CreateServiceOffering gRPC Response: ${JSON.stringify(res)}`);

      if (res?.success) {
        // Map 'data' from gRPC response back to BaseResponseDto.ok
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }

      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error creating offering: ${error.message}`);
      return BaseResponseDto.fail('Internal Service Error', 'GRPC_ERROR');
    }
  }

  // ===========================================================
  // GET OFFERINGS BY VERTICAL (Discovery)
  // ===========================================================
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
}