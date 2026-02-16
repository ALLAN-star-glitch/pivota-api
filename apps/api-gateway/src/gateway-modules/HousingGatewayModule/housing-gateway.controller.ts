import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Param,
  Version,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  HouseListingResponseDto,
  SearchHouseListingsDto,
  ScheduleViewingDto,
  HouseViewingResponseDto,
  ScheduleViewingGrpcRequestDto,
  UpdateHouseListingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  HouseListingCreateResponseDto,
  GetOwnHousingFilterDto,
  GetAdminHousingFilterDto,
  UpdateOwnHouseListingRequestDto,
  UpdateAdminHouseListingRequestDto,
  CreateHouseListingDto,
  AdminCreateHouseListingDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { HousingGatewayService } from './housing-gateway.service';
import { ParseCuidPipe } from '@pivota-api/pipes';
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { SetModule } from '../../decorators/set-module.decorator';

@ApiTags('Housing Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResponseDto,
  HouseListingCreateResponseDto,
  HouseListingResponseDto,
  HouseViewingResponseDto,
)
@SetModule('housing')
@Controller('housing-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class HousingGatewayController {
  private readonly logger = new Logger(HousingGatewayController.name);

  constructor(private readonly housingService: HousingGatewayService) {}

  // -----------------------------------------------------------
  // Core Housing Creation Logic
  // -----------------------------------------------------------
  private async executeHousingCreation(
    dto: CreateHouseListingGrpcRequestDto,
    actorUuid: string,
    isAdminFlow: boolean,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    try {
      if (isAdminFlow) {
        this.logger.debug(`Processing ADMIN House Creation for Account ${dto.accountId} initiated by admin ${actorUuid}`);
        return await this.housingService.createAdminHouseListing(dto);
      }

      this.logger.debug(`Processing OWN House Creation for Account ${dto.accountId} initiated by ${actorUuid}`);
      return await this.housingService.createHouseListing(dto);
    } catch (error) {
      this.logger.error(`🔥 Housing creation execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error while routing housing creation', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // CREATE OWN LISTING
  // ===========================================================
  @Post('listings')
  @Permissions('houses.create.own')
  @ApiOperation({ summary: 'Create a house listing for the authenticated user' })
  @ApiResponse({ status: 201, type: HouseListingCreateResponseDto })
  async createOwn(
    @Body() dto: CreateHouseListingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const accountId = req.user.accountId;
    const creatorName = req.user.userName;
    const accountName = req.user.accountName;

    const sanitizedDto: CreateHouseListingGrpcRequestDto = {
      ...dto,
      creatorId: requesterUuid,
      accountId,
      creatorName,
      accountName,
    };
    

    const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, false);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // CREATE LISTING FOR ANY USER (ADMIN)
  // ===========================================================
  @Post('admin/accounts/:accountId/listings')
  @Permissions('houses.create.any')
  @ApiOperation({ summary: 'Admin: Create house listing for an account' })
  @ApiParam({ name: 'accountId', description: 'The UUID of the organization account' })
  @ApiResponse({ status: 201, type: HouseListingCreateResponseDto })
  async createAny(
    @Param('accountId') accountId: string,
    @Body() dto: AdminCreateHouseListingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const finalData = {
      ...dto,
      accountId,
      creatorId: dto.creatorId || null,
    };

    const response = await this.executeHousingCreation(finalData, req.user.userUuid, true);
    if (!response.success) throw response;
    return response;
  }

  // -----------------------------------------------------------
  // Core Housing Update Logic
  // -----------------------------------------------------------
  private async executeHousingUpdate(
    dto: UpdateHouseListingGrpcRequestDto,
    actorUuid: string,
    isAdminFlow: boolean,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    try {
      if (isAdminFlow) {
        return await this.housingService.updateAdminHouseListing(dto);
      }
      return await this.housingService.updateHouseListing(dto);
    } catch (error) {
      this.logger.error(`🔥 Housing update execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error during update routing', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // UPDATE OWN LISTING
  // ===========================================================
  @Patch('listings/:id')
  @Permissions('housing.update.own')
  @ApiOperation({ summary: 'Update own house listing' })
  @ApiParam({ name: 'id', type: String, description: 'CUID of the listing' })
  @ApiResponse({ status: 200, type: HouseListingResponseDto })
  async updateOwn(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateOwnHouseListingRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const userId = req.user.userUuid;
    const sanitizedDto: UpdateHouseListingGrpcRequestDto = {
      ...dto,
      listingId: id,
      callerId: userId,
      userRole: req.user.role,
      accountId: req.user.accountId,
    };

    const resp = await this.executeHousingUpdate(sanitizedDto, userId, false);
    if (!resp.success) throw resp;
    return resp;
  }

  // ===========================================================
  // UPDATE LISTING (ADMIN)
  // ===========================================================
  @Patch('admin/listings/:id')
  @Permissions('housing.update.any')
  @ApiOperation({ summary: 'Update any house listing (Admin)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: HouseListingResponseDto })
  async updateAny(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateAdminHouseListingRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const sanitizedDto: UpdateHouseListingGrpcRequestDto = {
      ...dto,
      listingId: id,
      callerId: req.user.userUuid,
      userRole: req.user.role,
    };

    const resp = await this.executeHousingUpdate(sanitizedDto, req.user.userUuid, true);
    if (!resp.success) throw resp;
    return resp;
  }

  // ===========================================================
  // SEARCH LISTINGS (Public)
  // ===========================================================
  @Public()
  @Version('1')
  @Get('listings/search')
  @ApiOperation({ summary: 'Search for available house listings' })
  @ApiResponse({ status: 200, type: [HouseListingResponseDto] })
  async searchListings(
    @Query() dto: SearchHouseListingsDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const resp = await this.housingService.searchListings(dto);
    if (!resp.success) throw resp;
    return resp;
  }

  // ===========================================================
  // GET OWN LISTINGS (Dashboard)
  // ===========================================================
  @Permissions('houses.read')
  @Version('1')
  @Get('my-listings')
  @ApiOperation({ 
    summary: 'Get listings belonging to the authenticated account',
    description: 'Fetches all house listings owned by the user or their organization. Uses accountId from JWT to ensure team-wide visibility.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Listings retrieved successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { type: 'array', items: { $ref: getSchemaPath(HouseListingResponseDto) } } } },
      ],
    },
  })
  async getMyListings(
    @Req() req: JwtRequest,
    @Query() query: GetOwnHousingFilterDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    // We prioritize accountId. If the user is an individual, 
    // accountId and userUuid are often identical or mapped 1:1 in the JWT.
    const ownerId = req.user.accountId;
    
    if (!ownerId) {
      this.logger.error(`❌ Security Alert: User ${req.user.userUuid} attempted to fetch listings without an accountId`);
      throw BaseResponseDto.fail('Account identification missing from session.', 'UNAUTHORIZED');
    }

    this.logger.log(`🏠 Fetching listings for Account: ${ownerId}. Filter Status: ${query.status ?? 'ALL'}`);
    
    // Call service using ownerId (the Account UUID)
    const resp = await this.housingService.getListingsByOwner({ 
      ownerId: ownerId, 
      status: query.status 
    });
    
    // Standardized error handling: throw failed BaseResponseDto
    if (!resp.success) {
      this.logger.warn(`Failed to retrieve listings for Account ${ownerId}: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  // ===========================================================
  // GET ADMIN LISTINGS (Management)
  // ===========================================================
  @Permissions('houses.read')
  @Version('1')
  @Get('admin/listings')
  @ApiOperation({ summary: 'Get all house listings across the system (Admin)' })
  @ApiResponse({ status: 200, type: [HouseListingResponseDto] })
  async getAdminListings(
    @Query() query: GetAdminHousingFilterDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    if (req.user.role === 'GeneralUser') {
      const err = BaseResponseDto.fail('Unauthorized access to admin listings.', 'FORBIDDEN');
      throw err;
    }
    
    this.logger.log(`👮 Admin ${req.user.userUuid} searching system. Filter: ${JSON.stringify(query)}`);
    const resp = await this.housingService.getAdminListings(query);
    if (!resp.success) throw resp;
    return resp;
  }

  // ===========================================================
  // GET LISTING BY ID (Public)
  // ===========================================================
  @Public()
  @Version('1')
  @Get('details/:id')
  @ApiOperation({ summary: 'Get a single house listing by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: HouseListingResponseDto })
  async getListingById(
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const resp = await this.housingService.getHouseListingById({ id });
    if (!resp.success) throw resp;
    return resp;
  }

  // ===========================================================
  // SCHEDULE VIEWING
  // ===========================================================
  @Post('listings/:id/viewing')
  @Permissions('houses.read')
  @ApiOperation({ summary: 'Schedule a viewing for a property' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, type: HouseViewingResponseDto })
  async scheduleViewing(
    @Param('id', ParseCuidPipe) listingId: string,
    @Body() body: ScheduleViewingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    const grpcDto: ScheduleViewingGrpcRequestDto = {
      ...body,
      houseId: listingId,
      callerId: req.user.userUuid,
      userRole: req.user.role,
    };
    
    const resp = await this.housingService.scheduleViewing(grpcDto);
    if (!resp.success) throw resp;
    return resp;
  }
}
