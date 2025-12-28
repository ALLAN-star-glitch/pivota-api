import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { 
  BaseResponseDto, 
  CreateServiceOfferingDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto 
} from '@pivota-api/dtos';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  private readonly logger = new Logger(ProvidersController.name);

  constructor(private readonly providersService: ProvidersService) {}

  /**
   * CREATE SERVICE OFFERING
   * Maps to: rpc CreateServiceOffering (CreateServiceOfferingRequest)
   */
  @GrpcMethod('ProvidersService', 'CreateServiceOffering')
  async createServiceOffering(
    data: CreateServiceOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.debug(`gRPC CreateServiceOffering: ${data.title} by ${data.providerId}`);
    return this.providersService.createServiceOffering(data);
  }

  /**
   * GET OFFERINGS BY VERTICAL (Discovery)
   * Maps to: rpc GetOfferingsByVertical (GetOfferingsByVerticalRequest)
   */
  @GrpcMethod('ProvidersService', 'GetOfferingsByVertical')
  async getOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`gRPC GetOfferingsByVertical: ${data.vertical} in ${data.city || 'Any'}`);
    return this.providersService.getOfferingsByVertical(data);
  }
}