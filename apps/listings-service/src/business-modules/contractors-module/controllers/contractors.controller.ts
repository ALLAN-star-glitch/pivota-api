import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import {
  CreateServiceGrpcOfferingDto,
  GetOfferingByVerticalRequestDto,
  UpdateServiceOfferingDto,
  BaseResponseDto,
  ServiceOfferingResponseDto,
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
}