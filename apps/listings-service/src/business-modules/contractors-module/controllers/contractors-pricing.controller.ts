"use strict";

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { 
  ContractorsPricingService 
} from '../services/contractors-pricing.service';
import { 
  CreatePriceUnitRuleDto, 
  BaseResponseDto, 
  PriceUnitRuleResponseDto, 
  PricingMetadataResponseDto,
  PricingUnitsByCategoryResponseDto
} from '@pivota-api/dtos';

@Controller('contractors-pricing')
export class ContractorsPricingController {
  private readonly logger = new Logger(ContractorsPricingController.name);

  constructor(private readonly pricingService: ContractorsPricingService) {}

  /**
   * ADMIN: Create or Update a Pricing Rule
   * Maps to: rpc UpsertRule (CreatePriceUnitRuleRequest)
   */
  @GrpcMethod('ContractorsPricingService', 'UpsertRule')
  async upsertRule(
    data: CreatePriceUnitRuleDto
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`gRPC UpsertRule: ${data.vertical} - ${data.unit}`);
    return this.pricingService.upsertRule(data);
  }

  /**
   * UI: Get Grouped Pricing Metadata
   * Maps to: rpc GetPricingMetadata (GetPricingMetadataRequest)
   */
  @GrpcMethod('ContractorsPricingService', 'GetPricingMetadata')
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    this.logger.debug('gRPC GetPricingMetadata triggered');
    return this.pricingService.getPricingMetadata();
  }

  /**
   * UI/Frontend: Get allowed pricing units by category
   * Maps to: rpc GetPricingUnitsByCategory (GetPricingUnitsByCategoryRequest)
   * Used for dynamic dropdowns when posting a service
   */
 @GrpcMethod('ContractorsPricingService', 'GetPricingUnitsByCategory')
  async getPricingUnitsByCategory(
    data: { categoryId: string }
  ): Promise<BaseResponseDto<PricingUnitsByCategoryResponseDto>> {
    this.logger.debug(`gRPC GetPricingUnitsByCategory: ${data.categoryId}`);
    return this.pricingService.getPricingUnitsByCategory(data.categoryId);
  }

  /**
   * ADMIN: List all defined rules
   * Maps to: rpc GetAllRules (Empty)
   */
  @GrpcMethod('ContractorsPricingService', 'GetAllRules')
  async getAllRules(): Promise<BaseResponseDto<PriceUnitRuleResponseDto[]>> {
    this.logger.debug('gRPC GetAllRules triggered');
    return this.pricingService.getAllRules();
  }

  /**
   * ADMIN: Activate/Deactivate a rule
   * Maps to: rpc ToggleRule (ToggleRuleRequest)
   */
  @GrpcMethod('ContractorsPricingService', 'ToggleRule')
  async toggleRule(data: { id: string; active: boolean }): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`gRPC ToggleRule: ${data.id} to ${data.active}`);
    return this.pricingService.toggleRule(data.id, data.active);
  }
}