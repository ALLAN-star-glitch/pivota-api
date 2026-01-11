"use strict";

import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Param,
  Version,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  CreatePriceUnitRuleDto,
  PriceUnitRuleResponseDto,
  PricingMetadataResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../../guards/role.guard';
import { Roles } from '../../../decorators/roles.decorator';
import { ContractorsPricingGatewayService } from '../services/contractors-pricing-gateway.service';

@ApiTags('Contractors Pricing Module - ((Listings-Service) - MICROSERVICE)')
@Controller('contractors-pricing')
export class ContractorsPricingGatewayController {
  private readonly logger = new Logger(ContractorsPricingGatewayController.name);

  constructor(private readonly pricingService: ContractorsPricingGatewayService) {}

  // ===========================================================
  // 1. GET PRICING METADATA (Public/Authenticated App Users)
  // ===========================================================
  @Version('1')
  @Get('metadata')
  @ApiOperation({ 
    summary: 'Fetch pricing units and validation rules grouped by vertical',
    description: 'Used by the frontend to dynamically show min/max prices and required fields.'
  })
  @ApiOkResponse({ type: BaseResponseDto })
  async getPricingMetadata(): Promise<BaseResponseDto<PricingMetadataResponseDto>> {
    this.logger.debug('REST GetPricingMetadata triggered');
    return this.pricingService.getPricingMetadata();
  }

  // ===========================================================
  // 2. UPSERT PRICING RULE (Admin Only)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin') // Restricted to Admins
  @Version('1')
  @Post('rule')
  @ApiOperation({ summary: 'Admin: Create or update a pricing validation rule' })
  async upsertRule(
    @Body() dto: CreatePriceUnitRuleDto,
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`REST UpsertRule for vertical: ${dto.vertical}`);
    return this.pricingService.upsertRule(dto);
  }

  // ===========================================================
  // 3. TOGGLE RULE STATUS (Admin Only)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin')
  @Version('1')
  @Patch('rule/:id/toggle')
  @ApiOperation({ summary: 'Admin: Activate or deactivate a pricing rule' })
  async toggleRule(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ): Promise<BaseResponseDto<PriceUnitRuleResponseDto>> {
    this.logger.debug(`REST ToggleRule ID: ${id} to ${active}`);
    return this.pricingService.toggleRule(id, active);
  }
}