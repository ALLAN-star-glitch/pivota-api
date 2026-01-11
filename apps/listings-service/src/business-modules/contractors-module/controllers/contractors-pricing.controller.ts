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
  PricingMetadataResponseDto 
} from '@pivota-api/dtos';

@Controller('providers-pricing')
export class ContractorsPricingController {
  private readonly logger = new Logger(ContractorsPricingController.name);

  constructor(private readonly pricingService: ContractorsPricingService) {}

  /**
   * ADMIN: Create or Update a Pricing Rule
   * Maps to: rpc UpsertRule (CreatePriceUnitRuleRequest)
   */
  @GrpcMethod('ProvidersPricingService', 'UpsertRule')
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
  @GrpcMethod('ProvidersPricingService', 'GetPricingMetadata')
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    this.logger.debug('gRPC GetPricingMetadata triggered');
    return this.pricingService.getPricingMetadata();
  }

  /**
   * ADMIN: List all defined rules
   * Maps to: rpc GetAllRules (Empty)
   */
  @GrpcMethod('ProvidersPricingService', 'GetAllRules')
  async getAllRules(): Promise<BaseResponseDto<PriceUnitRuleResponseDto[]>> {
    this.logger.debug('gRPC GetAllRules triggered');
    return this.pricingService.getAllRules();
  }

  /**
   * ADMIN: Activate/Deactivate a rule
   * Maps to: rpc ToggleRule (ToggleRuleRequest)
   */
  @GrpcMethod('ProvidersPricingService', 'ToggleRule')
  async toggleRule(data: { id: string; active: boolean }): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`gRPC ToggleRule: ${data.id} to ${data.active}`);
    return this.pricingService.toggleRule(data.id, data.active);
  }
}