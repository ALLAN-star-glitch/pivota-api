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
  ApiTags, 
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  HouseListingResponseDto,
  SearchHouseListingsDto,
  UpdateHouseListingRequestDto,
  UpdateHouseListingStatusDto,
  ScheduleViewingDto,
  HouseViewingResponseDto,
  ScheduleViewingGrpcRequestDto,
  UpdateHouseListingGrpcRequestDto,
  CreateHouseListingGrpcRequestDto,
  ArchiveHouseListingsGrpcRequestDto,
  HouseListingCreateResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';
import { JwtRequest } from '@pivota-api/interfaces';
import { HousingGatewayService } from './housing-gateway.service'; // Assuming this is your gateway service name
import { ParseCuidPipe } from '@pivota-api/pipes';

@ApiTags('Housing Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(BaseResponseDto, HouseListingCreateResponseDto, HouseListingResponseDto, HouseViewingResponseDto, CreateHouseListingGrpcRequestDto, UpdateHouseListingGrpcRequestDto, ScheduleViewingGrpcRequestDto, ArchiveHouseListingsGrpcRequestDto)
@Controller('housing-module')
export class HousingGatewayController {
  private readonly logger = new Logger(HousingGatewayController.name);

  constructor(private readonly housingService: HousingGatewayService) {}


  // ===========================================================
  // CREATE HOUSE LISTING
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @Post('listings')
  @ApiOperation({ summary: 'Create a new house listing' })
  async createListing(
    @Body() dto: CreateHouseListingGrpcRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> { // Changed to Lean DTO
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const requesterAccountId = req.user.accountId;

    // 1. Identify Target: Allow Admin override or default to requester
    const targetCreatorId = dto.creatorId || requesterUuid;
    const targetAccountId = dto.accountId || requesterAccountId;

    // 2. Permission Check
    if (targetCreatorId !== requesterUuid || targetAccountId !== requesterAccountId) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);

      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized Housing Listing attempt by ${requesterUuid} for User ${targetCreatorId}`);
        return BaseResponseDto.fail(
          'You do not have permission to create listings for other accounts or users.',
          'FORBIDDEN',
        );
      }
      this.logger.log(`👮 Admin ${requesterRole} (${requesterUuid}) creating house listing for: User ${targetCreatorId}`);
    }

    const sanitizedDto: CreateHouseListingGrpcRequestDto = {
      ...dto,
      creatorId: targetCreatorId,
      accountId: targetAccountId,
    };

    this.logger.debug(`Processing House Listing for Account ${targetAccountId} initiated by ${requesterUuid}`);

    try {
      // Assuming housingService follows the same lean return pattern as jobsService
      return await this.housingService.createHouseListing(sanitizedDto);
    } catch (error) {
      this.logger.error(`🔥 Critical error during housing creation for user ${targetCreatorId}`, error.stack);
      return BaseResponseDto.fail('An unexpected error occurred while creating the listing.', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // SEARCH LISTINGS (Public)
  // ===========================================================
  @Version('1')
  @Get('listings/search')
  @ApiOperation({ summary: 'Search for available house listings' })
  async searchListings(
    @Query() dto: SearchHouseListingsDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.debug(`REST searchListings request with filters`);
    return this.housingService.searchListings(dto);
  }

  // ===========================================================
  // GET LISTINGS BY OWNER (Dashboard)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GeneralUser', 'SuperAdmin', 'SystemAdmin', 'ModuleManager') // Every valid user role
  @Version('1')
  @Get('listings/my-listings')
  @ApiOperation({ summary: 'Get listings belonging to the authenticated user' })
  async getMyListings(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const userId = req.user.userUuid;
    return this.housingService.getListingsByOwner({ ownerId: userId });
  }

  // ===========================================================
  // GET LISTING BY ID (Public)
  // ===========================================================
  @Version('1')
  @Get('listings/:id')
  @ApiOperation({ summary: 'Get a single house listing by ID' })
  @ApiParam({ name: 'id', type: String })
  async getListingById(
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    return this.housingService.getHouseListingById({ id });
  }

  // ===========================================================
  // UPDATE LISTING
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'GeneralUser')
  @Version('1')
  @Patch('listings/:id')
  @ApiOperation({ summary: 'Update house listing details' })
  @ApiParam({ name: 'id', description: 'The CUID of the listing' })
  async updateListing(
    @Param('id', ParseCuidPipe) listingId: string, // Validate ID format
    @Body() updatePayload: UpdateHouseListingRequestDto, // Use your specific DTO here
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const userId = req.user.userUuid;

    const userRole = req.user.role;

    const grpcRequest: UpdateHouseListingGrpcRequestDto = {
      ...updatePayload,
      callerId: userId,
      listingId: listingId,
      userRole: userRole,
    };  


    this.logger.debug(`REST updateListing id=${listingId} by user=${userId}`);
    return this.housingService.updateHouseListing(grpcRequest);
  }

  // ===========================================================
  // UPDATE LISTING STATUS (LIFECYCLE)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'GeneralUser')
  @Version('1')
  @Patch('listings/:id/status')
  @ApiOperation({ summary: 'Update listing status (AVAILABLE, SOLD, RENTED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const userId = req.user.userUuid;
    const dto: UpdateHouseListingStatusDto = { id, ownerId: userId, status };

    return this.housingService.updateListingStatus(dto);
  }

  // ===========================================================
  // ARCHIVE LISTING (SOFT DELETE)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'GeneralUser')
  @Version('1')
  @Patch('listings/:id/archive')
  @ApiOperation({ summary: 'Archive a listing (Soft Delete)' })
  async archiveListing(
    @Param('id') id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const userId = req.user.userUuid;
    const dto: ArchiveHouseListingsGrpcRequestDto = { id, ownerId: userId };

    return this.housingService.archiveHouseListing(dto);
  }

  // ===========================================================
  // SCHEDULE VIEWING
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'GeneralUser')
  @Version('1')
  @Post('listings/:id/viewing')
  @ApiOperation({ summary: 'Schedule a viewing for a property' })
  async scheduleViewing(
    @Param('id', ParseCuidPipe) listingId: string, // Resource ID from URL
    @Body() body: ScheduleViewingDto,              // Date, targetViewerId, notes from Body
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    
    // 1. Extract metadata from the Request/JWT
    const userId = req.user.userUuid;
    const userRole = req.user.role;

    // 2. Map everything into the Extended Grpc Request DTO
    // This combines URL params, JWT data, and Body data into one object
    const grpcDto: ScheduleViewingGrpcRequestDto = {
      ...body,           // Spreads viewingDate, targetViewerId, and notes
      houseId: listingId,
      callerId: userId,
      userRole: userRole,
    };

    this.logger.debug(`Scheduling viewing: house=${listingId} for user=${grpcDto.targetViewerId || userId}`);

    // 3. Pass the single DTO object to your service
    return this.housingService.scheduleViewing(grpcDto);
  }
}