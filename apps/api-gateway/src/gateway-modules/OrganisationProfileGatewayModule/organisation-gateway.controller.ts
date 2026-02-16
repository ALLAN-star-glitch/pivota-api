import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  Version,
  Query,
} from '@nestjs/common';
import { OrganisationGatewayService } from './organisation-gateway.service';
import {
  BaseResponseDto,
  OrganizationProfileResponseDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';

@ApiTags('Organisation Module - ((Profile-Service) - MICROSERVICE)')
@ApiExtraModels(BaseResponseDto, OrganizationProfileResponseDto)
@Controller('organisation-gateway')
export class OrganisationGatewayController {
  private readonly logger = new Logger(OrganisationGatewayController.name);

  constructor(
    private readonly organisationService: OrganisationGatewayService,
  ) {}

  /**
   * 🏢 Get Organizations by Type (Slug)
   * Example: /organisation-gateway/v1/organisations/filter?type=NGO
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'SystemAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
  )
  @Version('1')
  @Get('organisations/filter')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Filter organisations by their legal type slug (e.g. NGO, PRIVATE_LIMITED)' })
  @ApiQuery({
    name: 'type',
    required: true,
    type: String,
    description: 'The slug of the organization type',
    example: 'NGO',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of organisations matching the type',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(OrganizationProfileResponseDto) },
            },
          },
        },
      ],
    },
  })
  async getByOrgType(
    @Query('type') typeSlug: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    this.logger.debug(`API-GW: Filtering organisations by type: ${typeSlug}`);
    return this.organisationService.getOrganisationsByType(typeSlug);
  }

  /**
   * 🔍 Get Organization by UUID
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'SystemAdmin',
    'ComplianceAdmin',
    'BusinessSystemAdmin', // Allow the org admin to view their own profile
  )
  @Version('1')
  @Get('organisations/:uuid')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed organisation profile by UUID' })
  @ApiParam({
    name: 'uuid',
    type: String,
    description: 'The unique UUID of the organisation',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a single organisation profile',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(OrganizationProfileResponseDto) },
          },
        },
      ],
    },
  })
  async getByUuid(
    @Param('uuid') uuid: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    this.logger.debug(`API-GW: Fetching organisation profile for UUID: ${uuid}`);
    return this.organisationService.getOrganisationByUuid(uuid);
  }
}