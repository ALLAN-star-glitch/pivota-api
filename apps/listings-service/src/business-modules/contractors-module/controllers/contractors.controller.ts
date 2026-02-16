import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { 
  BaseResponseDto, 
  ServiceOfferingResponseDto, 
  GetOfferingByVerticalRequestDto, 
  CreateServiceGrpcOfferingDto
} from '@pivota-api/dtos';
import { ContractorsService } from '../services/contractors.service';

@Controller('providers')
export class ContractorsController {
  private readonly logger = new Logger(ContractorsController.name);

  constructor(private readonly contractorsService: ContractorsService) {}

  /**
   * CREATE SERVICE OFFERING
   * Maps to: rpc CreateServiceOffering (CreateServiceOfferingRequest)
   */
  @GrpcMethod('ContractorsService', 'CreateServiceOffering')
  async createServiceOffering(
    data: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.debug(`gRPC CreateServiceOffering: ${data.title} by ${data.creatorId}`);
    return this.contractorsService.createServiceOffering(data);
  }

  /**
   * GET OFFERINGS BY VERTICAL (Discovery)
   * Maps to: rpc GetOfferingsByVertical (GetOfferingsByVerticalRequest)
   */
  @GrpcMethod('ContractorsService', 'GetOfferingsByVertical')
  async getOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`gRPC GetOfferingsByVertical: ${data.vertical} in ${data.city || 'Any'}`);
    return this.contractorsService.getOfferingsByVertical(data);
  }
}

