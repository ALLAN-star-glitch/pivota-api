"use strict";

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  CreatePriceUnitRuleDto,
  PriceUnitRuleResponseDto,
  PricingMetadataResponseDto,
} from '@pivota-api/dtos';

// This matches the pricing.proto service definition
interface PricingServiceGrpc {
  UpsertRule(
    data: CreatePriceUnitRuleDto,
  ): Observable<BaseResponseDto<PriceUnitRuleResponseDto>>;

  GetPricingMetadata(
    data: Record<string, never>, // Empty request
  ): Observable<BaseResponseDto<PricingMetadataResponseDto>>;

  GetAllRules(
    data: Record<string, never>,
  ): Observable<BaseResponseDto<PriceUnitRuleResponseDto[]>>;

  ToggleRule(
    data: { id: string; active: boolean },
  ): Observable<BaseResponseDto<PriceUnitRuleResponseDto>>;
}

@Injectable()
export class ProvidersPricingGatewayService {
  private readonly logger = new Logger(ProvidersPricingGatewayService.name);
  private grpcService: PricingServiceGrpc;

  constructor(
    @Inject('PROVIDERS_PRICING_PACKAGE') // Ensure this matches your ClientsModule configuration
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<PricingServiceGrpc>('ProvidersPricingService');
  }

  // ===========================================================
  // ADMIN: UPSERT RULE
  // ===========================================================
  async upsertRule(
    dto: CreatePriceUnitRuleDto,
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.UpsertRule(dto));
      
      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error upserting rule: ${error.message}`);
      return BaseResponseDto.fail('Failed to update pricing rule', 'PRICING_UPDATE_ERROR');
    }
  }

  // ===========================================================
  // UI: GET PRICING METADATA
  // ===========================================================
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.GetPricingMetadata({}));
      
      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error fetching pricing metadata: ${error.message}`);
      return BaseResponseDto.fail('Could not load pricing configuration', 'METADATA_ERROR');
    }
  }

  // ===========================================================
  // ADMIN: TOGGLE RULE
  // ===========================================================
  async toggleRule(id: string, active: boolean): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    try {
      const res = await firstValueFrom(this.grpcService.ToggleRule({ id, active }));
      
      if (res?.success) {
        return BaseResponseDto.ok(res.data, res.message, res.code);
      }
      return BaseResponseDto.fail(res?.message, res?.code);
    } catch (error) {
      this.logger.error(`gRPC Error toggling rule: ${error.message}`);
      return BaseResponseDto.fail('Failed to toggle rule status', 'TOGGLE_ERROR');
    }
  }
}