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
  CreateServiceOfferingDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtRequest } from '@pivota-api/interfaces';
import { ProvidersGatewayService } from './providers-gateway.service';

@ApiTags('Providers Module - (Service Listings Discovery)')
@Controller('providers-module')
export class ProvidersGatewayController {
  private readonly logger = new Logger(ProvidersGatewayController.name);

  constructor(private readonly providersService: ProvidersGatewayService) {}

  // ===========================================================
  // CREATE SERVICE OFFERING (Authenticated Providers)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'GeneralUser') 
  @Version('1')
  @Post('listing')
  @ApiOperation({ summary: 'Create a proactive service provider listing' })
  async createServiceOffering(
    @Body() dto: CreateServiceOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    const providerId = req.user.userUuid;
    dto.providerId = providerId; // Override with ID from secure JWT

    this.logger.debug(
      `REST CreateServiceOffering by provider=${providerId}: ${dto.title}`,
    );

    return this.providersService.createServiceOffering(dto);
  }

  // ===========================================================
  // GET OFFERINGS BY VERTICAL (Public Discovery)
  // ===========================================================
  @Version('1')
  @Get('discovery')
  @ApiOperation({ summary: 'Discover providers by life pillar (Jobs, Housing, Social Support)' })
  @ApiOkResponse({ type: BaseResponseDto })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}`);
    
    return this.providersService.getOfferingsByVertical(dto);
  }
}