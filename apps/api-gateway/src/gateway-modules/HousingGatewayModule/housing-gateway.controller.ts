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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { FilesInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '@pivota-api/filters';

@ApiTags('Housing Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResponseDto,
  HouseListingCreateResponseDto,
  HouseListingResponseDto,
  HouseViewingResponseDto,
  CreateHouseListingDto, 
  AdminCreateHouseListingDto
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
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateHouseListingDto) }, 
        {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              description: 'Select up to 10 images for the property',
            },
          },
        },
      ],
    },
  })
  @ApiOperation({ summary: 'Create a house listing with images' })
  async createOwn(
    @Body() dto: CreateHouseListingDto,
    @Req() req: JwtRequest,
    @UploadedFiles() files: Array<Express.Multer.File>, 
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
     const storagePath = `houses/${req.user.accountId}`;
    const imageUrls = await this.housingService.uploadMultipleToStorage(
      files, 
      storagePath, 
      'pivota-public'
    );

    try {
      // 2. Prepare gRPC DTO
      const sanitizedDto: CreateHouseListingGrpcRequestDto = {
        ...dto,
        subCategoryId: dto.subCategoryId,
        creatorId: requesterUuid,
        accountId: req.user.accountId,
        creatorName: req.user.userName,
        accountName: req.user.accountName,
        imageUrls: imageUrls,
      };

      // 3. Attempt to create the listing in the housing microservice
      const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, false);

      // 4. Handle logical failure (e.g., validation error in microservice)
      if (!response.success) {
        this.logger.warn(`Housing creation failed: ${response.message}. Cleaning up storage...`);
        
        // Use the deletion method to remove orphaned files
        await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
        
        // Return the failure response directly
        return response;
      }

      return response;
    } catch (error) {
      // 5. Handle unexpected crashes (e.g., gRPC timeout or network error)
      this.logger.error(`Critical error during housing creation. Rolling back storage uploads.`);
      
      await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
      
      throw error;
    }
  }

 // ===========================================================
  // CREATE LISTING FOR ANY USER (ADMIN)
  // ===========================================================
  @Post('admin/accounts/:accountId/listings')
  @Permissions('houses.create.any')
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AdminCreateHouseListingDto) },
        {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              description: 'Upload property images (Admin context)',
            },
          },
        },
      ],
    },
  })
  @ApiOperation({ summary: 'Admin: Create house listing for an account' })
  @ApiParam({ name: 'accountId', description: 'The UUID of the organization account' })
  @ApiResponse({ status: 201, type: HouseListingCreateResponseDto })
  async createAny(
    @Param('accountId') accountId: string,
    @Body() dto: AdminCreateHouseListingDto,
    @Req() req: JwtRequest,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const storagePath = `houses/${req.user.accountId}`;

    // 1. Upload property images to the public bucket
    const imageUrls = await this.housingService.uploadMultipleToStorage(
      files, 
      storagePath, 
      'pivota-public'
    );

    try {
      // 2. Build the full gRPC DTO with the generated URLs
      const sanitizedDto: CreateHouseListingGrpcRequestDto = {
        ...dto,
        subCategoryId: dto.subCategoryId,
        imageUrls, 
        accountId,
        creatorId: dto.creatorId || requesterUuid,
        creatorName: req.user.userName,
        accountName: 'Admin Created', 
      };

      // 3. Request the housing microservice to create the record
      const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, true);

      // 4. Cleanup if the microservice rejected the request (e.g., business logic failure)
      if (!response.success) {
        this.logger.warn(`Admin listing creation failed: ${response.message}. Rolling back storage.`);
        await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
        return response; 
      }

      return response;
    } catch (error) {
      // 5. Cleanup if there is a network or gRPC communication failure
      this.logger.error(`Critical error in Admin Create: Rolling back ${imageUrls.length} images.`);
      await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
      throw error;
    }
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
