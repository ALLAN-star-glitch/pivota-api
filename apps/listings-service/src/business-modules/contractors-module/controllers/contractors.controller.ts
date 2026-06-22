import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import {
  CreateServiceGrpcOfferingDto,
  GetOfferingByVerticalRequestDto,
  UpdateServiceOfferingDto,
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetAllOfferingsRequestDto,
  GetOfferingsByCategoryRequestDto,
  GetOfferingsByProfessionalRequestDto,
  GetOfferingsByAccountRequestDto,
  GetOfferingByIdRequestDto,
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
  // SERVICE OFFERING CRUD METHODS
  // ========================================================================

  @GrpcMethod('ContractorsService', 'CreateServiceOffering')
  async createServiceOffering(
    data: CreateServiceGrpcOfferingDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.log(`[gRPC] CreateServiceOffering called for professional: ${data.skilledProfessionalId}`);
    return this.contractorsService.createServiceOffering(data);
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

  // ========================================================================
  // PUBLIC LISTING METHODS (WITH FULL CACHE CONTROL)
  // ========================================================================

  /**
   * Get all offerings across all categories with full cache control
   * 
   * Cache Control Options via DTO:
   * - bypassCache: boolean - Skip cache entirely (admin only)
   * - skipCache: boolean - Don't read cache, still write (cache warming)
   * - refreshCache: boolean - Force refresh cache
   * - cacheTTL: number - Override TTL in seconds
   * - readOnly: boolean - Don't write to cache (analytics)
   */
  @GrpcMethod('ContractorsService', 'GetAllOfferings')
  async getAllOfferings(
    data: GetAllOfferingsRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(
      `[gRPC] GetAllOfferings called: limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.contractorsService.getAllOfferings(data);
  }

  /**
   * Get offerings by vertical with full cache control
   */
  @GrpcMethod('ContractorsService', 'GetOfferingsByVertical')
  async getOfferingsByVertical(
    data: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(
      `[gRPC] GetOfferingsByVertical called: vertical=${data.vertical}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.contractorsService.getOfferingsByVertical(data);
  }

  /**
   * Get offerings by category with full cache control
   */
  @GrpcMethod('ContractorsService', 'GetOfferingsByCategory')
  async getOfferingsByCategory(
    data: GetOfferingsByCategoryRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(
      `[gRPC] GetOfferingsByCategory called: categoryId=${data.categoryId}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.contractorsService.getOfferingsByCategory(data);
  }

  /**
   * Get single offering by ID with full cache control
   */
  @GrpcMethod('ContractorsService', 'GetOfferingById')
  async getOfferingById(
    data: GetOfferingByIdRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    this.logger.log(
      `[gRPC] GetOfferingById called: id=${data.id}, ` +
      `bypassCache=${data.bypassCache}, refreshCache=${data.refreshCache}`
    );
    return this.contractorsService.getOfferingById(data);
  }

  // ========================================================================
  // USER-SPECIFIC METHODS (No Caching)
  // ========================================================================

  @GrpcMethod('ContractorsService', 'GetOfferingsByAccount')
  async getOfferingsByAccount(
    data: GetOfferingsByAccountRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(`[gRPC] GetOfferingsByAccount called: accountId=${data.accountId}`);
    return this.contractorsService.getOfferingsByAccount(data);
  }

  @GrpcMethod('ContractorsService', 'GetOfferingsByProfessional')
  async getOfferingsByProfessional(
    data: GetOfferingsByProfessionalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.log(`[gRPC] GetOfferingsByProfessional called: professionalUuid=${data.professionalUuid}`);
    return this.contractorsService.getOfferingsByProfessional(data);
  }

}