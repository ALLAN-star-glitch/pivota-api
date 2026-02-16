import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Query,
  Version,
  UseGuards,
  Req,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceGrpcOfferingDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../../guards/role.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { ContractorsGatewayService } from '../services/contractors-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';

/**
 * Helper decorator for SubscriptionGuard to identify module context
 */
const SetModule = (slug: string) => SetMetadata('module', slug);

@ApiTags('Contractors General Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('contractors-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard) // Moved here to protect all routes
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(private readonly contractorsService: ContractorsGatewayService) {}

  // ===========================================================
  // CREATE SERVICE OFFERING (Authenticated Providers)
  // ===========================================================
  @Permissions('services.create') 
  @SetModule('services') 
  @Version('1')
  @Post('listing')
  @ApiOperation({ summary: 'Create a proactive service contractor listing' })
  async createServiceOffering(
    @Body() dto: CreateServiceGrpcOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    
    const { userUuid, accountId, role } = req.user;
    const isAdmin = ['SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin'].includes(role);

    /**
     * IDENTITY POPULATION
     * - Admin: Can provide a custom creator/account ID or default to their own.
     * - GeneralUser: Forced to use their own IDs from the JWT.
     */
    if (isAdmin) {
      dto.creatorId = dto.creatorId || userUuid;
      dto.accountId = dto.accountId || accountId;
    } else {
      dto.creatorId = userUuid;
      dto.accountId = accountId;
    }
    

    this.logger.debug(
      `[Services] Creating listing for Creator: ${dto.creatorId} under Account: ${dto.accountId}`,
    );

    return this.contractorsService.createServiceOffering(dto);
  }

  // ===========================================================
  // GET OFFERINGS BY VERTICAL (Public Discovery)
  // ===========================================================
  @Public() // This bypasses the class-level guards
  @Version('1')
  @Get('discovery')
  @ApiOperation({ summary: 'Discover service offering by life pillar (Jobs, Housing, Social Support)' })
  @ApiOkResponse({ type: BaseResponseDto })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}`);
    
    return this.contractorsService.getOfferingsByVertical(dto);
  }
}