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
import { Roles } from '../../../decorators/roles.decorator';
import { JwtRequest } from '@pivota-api/interfaces';
import { ContractorsGatewayService } from '../services/contractors-gateway.service';

@ApiTags('Contractors General Module - ((Listings-Service) - MICROSERVICE)')
@Controller('contractors-module')
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(private readonly contractorsService: ContractorsGatewayService) {}

  // ===========================================================
  // CREATE SERVICE OFFERING (Authenticated Providers)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'GeneralUser') 
  @Version('1')
  @Post('listing')
  @ApiOperation({ summary: 'Create a proactive service contractor listing' })
  async createServiceOffering(
    @Body() dto: CreateServiceGrpcOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    const providerId = req.user.userUuid;
    dto.creatorId = providerId; // Override with ID from secure JWT

    this.logger.debug(
      `REST CreateServiceOffering by provider=${providerId}: ${dto.title}`,
    );

    return this.contractorsService.createServiceOffering(dto);
  }

  // ===========================================================
  // GET OFFERINGS BY VERTICAL (Public Discovery)
  // ===========================================================
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