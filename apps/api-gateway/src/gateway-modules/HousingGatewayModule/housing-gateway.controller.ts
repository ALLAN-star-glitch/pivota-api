/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

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
  Headers
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  UpdateAdminHouseListingRequestDto,
  CreateHouseListingDto,
  AdminCreateHouseListingDto,
  GetHouseListingByIdDto,
  ListingViewContextDto,
  SearchContextDto,
  GetListingHeadersDto,
  GetListingQueryDto,
  AdminScheduleViewingDto,
  ScheduleAdminViewingGrpcRequestDto,
  AuthClientInfoDto,
  GetHouseListingsByCategoryDto,
  GetAllHouseListingsRequestDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthenticationGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { HousingGatewayService } from './housing-gateway.service';
import { ParseCuidPipe } from '@pivota-api/pipes';
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { SetModule } from '../../decorators/set-module.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '@pivota-api/filters';
import { ClientInfo } from '../../decorators/client-info.decorator';
import { HOUSE_LISTING_STATUSES, HOUSE_LISTING_TYPES } from '@pivota-api/constants';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

@ApiTags('Housing & Real-Estate Pillar')
@ApiExtraModels( 
  BaseResponseDto,
  HouseListingCreateResponseDto,
  HouseListingResponseDto,
  HouseViewingResponseDto, 
  CreateHouseListingDto, 
  AdminCreateHouseListingDto
)
@SetModule(ModuleSlug.HOUSING)
@Controller('housing-module')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class HousingGatewayController {
  private readonly logger = new Logger(HousingGatewayController.name);

  constructor(private readonly housingService: HousingGatewayService) {}

  /**
   * Helper to parse boolean from query params
   * This fixes the "false" → true issue
   */
  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null) return undefined; 
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return !!value;
  }



  /**
   * Helper to parse number from query params
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

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
      this.logger.error(`Housing creation execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error while routing housing creation', 'INTERNAL_ERROR');
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
      this.logger.error(`Housing update execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error during update routing', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // HOUSING - PUBLIC DISCOVERY
  // ===========================================================

  @Public()
  @Version('1')
  @Get('listings/search')
  @ApiOperation({ 
    summary: 'Search for available house listings with AI-powered analytics tracking',
    description: 'Public endpoint to search and filter available house listings with cache control.'
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session identifier for tracking search journey across requests',
    required: false,
    example: 'sess_abc123'
  })
  @ApiHeader({
    name: 'x-platform',
    description: 'Platform identifier (web/mobile/api)',
    required: false,
    enum: ['web', 'mobile', 'api']
  })
  @ApiHeader({
    name: 'referer',
    description: 'Source URL - identifies where the search originated',
    required: false
  })
  @ApiQuery({ name: 'city', required: false, description: 'Filter listings by city', example: 'Nairobi' })
  @ApiQuery({ name: 'listingType', required: false, description: 'Filter by listing type', enum: HOUSE_LISTING_TYPES })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter', example: 20000, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter', example: 100000, type: Number })
  @ApiQuery({ name: 'bedrooms', required: false, description: 'Minimum number of bedrooms', example: 2, type: Number })
  @ApiQuery({ name: 'propertyType', required: false, description: 'Filter by property type', enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'] })
  @ApiQuery({ name: 'minLeaseTerm', required: false, description: 'Minimum lease term in months', example: 6, type: Number })
  @ApiQuery({ name: 'isPetFriendly', required: false, description: 'Filter by pet friendly status', example: true, type: Boolean })
  @ApiQuery({ name: 'utilitiesIncluded', required: false, description: 'Filter by utilities included status', example: true, type: Boolean })
  @ApiQuery({ name: 'isNegotiable', required: false, description: 'Filter by negotiable price status', example: true, type: Boolean })
  @ApiQuery({ name: 'titleDeedAvailable', required: false, description: 'Filter by title deed availability', example: true, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort order', enum: ['recent', 'price_asc', 'price_desc'], example: 'recent' })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, description: 'Skip reading cache, still write', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results retrieved successfully',
    type: [HouseListingResponseDto]
  })
  async searchListings(
    @Query() query: any,  // ✅ Use 'any' and manually parse
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-platform') platform?: 'web' | 'mobile' | 'api',
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    // ✅ MANUALLY PARSE ALL VALUES
    const dto: SearchHouseListingsDto = {
      city: query.city,
      listingType: query.listingType,
      minPrice: this.parseNumber(query.minPrice),
      maxPrice: this.parseNumber(query.maxPrice),
      bedrooms: this.parseNumber(query.bedrooms),
      propertyType: query.propertyType,
      minLeaseTerm: this.parseNumber(query.minLeaseTerm),
      isPetFriendly: this.parseBoolean(query.isPetFriendly),
      utilitiesIncluded: this.parseBoolean(query.utilitiesIncluded),
      isNegotiable: this.parseBoolean(query.isNegotiable),
      titleDeedAvailable: this.parseBoolean(query.titleDeedAvailable),
      sortBy: query.sortBy || 'recent',
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      categoryId: query.categoryId,
      subCategoryId: query.subCategoryId,
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `Public search executed with filters: ${JSON.stringify(dto)}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    
    const context: Partial<ListingViewContextDto> = {
      sessionId: sessionId || this.generateAnonymousId(clientInfo),
      platform: platform?.toUpperCase() as 'WEB' | 'MOBILE' | 'API' | undefined || this.determinePlatform(clientInfo),
      referrer: referer || 'DIRECT',
      client: clientInfo,
    };
    
    dto.context = context as ListingViewContextDto;
    
    const resp = await this.housingService.searchListings(dto);
    
    if (!resp.success) {
      this.logger.warn(`Search failed: ${resp.message}`);
      throw resp;
    }

    this.logger.log(`Search returned ${resp.data?.length || 0} results`);
    return resp;
  }

  // ===========================================================
  // GET HOUSE LISTINGS BY CATEGORY (PUBLIC WITH CACHE CONTROL)
  // ===========================================================

  @Public()
  @Version('1')
  @Get('listings/category')
  @ApiOperation({ 
    summary: 'Get house listings by category with cache control',
    description: 'Public endpoint to retrieve house listings by category with pagination and cache control.'
  })
  @ApiQuery({ name: 'categoryId', required: true, type: String, description: 'Category ID to filter by', example: 'cat_apartments' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'listingType', required: false, enum: HOUSE_LISTING_TYPES, description: 'Filter by listing type' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 20000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 100000 })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number, description: 'Minimum number of bedrooms', example: 2 })
  @ApiQuery({ name: 'propertyType', required: false, enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'], description: 'Filter by property type' })
  @ApiQuery({ name: 'isFurnished', required: false, type: Boolean, description: 'Filter by furnished status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, description: 'Skip reading cache, still write', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Listings retrieved successfully',
    type: [HouseListingResponseDto]
  })
  async getHouseListingsByCategory(
    @Query() query: any,  // ✅ Use 'any' and manually parse
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    // ✅ MANUALLY PARSE ALL VALUES
    const dto: GetHouseListingsByCategoryDto = {
      categoryId: query.categoryId,
      city: query.city,
      listingType: query.listingType,
      minPrice: this.parseNumber(query.minPrice),
      maxPrice: this.parseNumber(query.maxPrice),
      bedrooms: this.parseNumber(query.bedrooms),
      propertyType: query.propertyType,
      isFurnished: this.parseBoolean(query.isFurnished),
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `GetHouseListingsByCategory: categoryId=${dto.categoryId}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    
    const resp = await this.housingService.getHouseListingsByCategory(dto);
    
    if (!resp.success) {
      this.logger.warn(`GetHouseListingsByCategory failed: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  // ===========================================================
  // GET ALL HOUSE LISTINGS (PUBLIC WITH CACHE CONTROL)
  // ===========================================================

  @Public()
  @Version('1')
  @Get('listings')
  @ApiOperation({ 
    summary: 'Get all house listings with pagination and cache control',
    description: 'Public endpoint to retrieve all available house listings with pagination and filtering options.'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'listingType', required: false, enum: HOUSE_LISTING_TYPES, description: 'Filter by listing type' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 20000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 100000 })
  @ApiQuery({ name: 'bedrooms', required: false, type: Number, description: 'Minimum number of bedrooms', example: 2 })
  @ApiQuery({ name: 'propertyType', required: false, enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'], description: 'Filter by property type' })
  @ApiQuery({ name: 'isFurnished', required: false, type: Boolean, description: 'Filter by furnished status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['recent', 'price_asc', 'price_desc'], description: 'Sort order', example: 'recent' })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, description: 'Skip reading cache, still write', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Listings retrieved successfully',
    type: [HouseListingResponseDto]
  })
  async getAllHouseListings(
    @Query() query: any,  //  Use 'any' and manually parse
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    // MANUALLY PARSE ALL VALUES
    const dto: GetAllHouseListingsRequestDto = {
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      city: query.city,
      listingType: query.listingType,
      minPrice: this.parseNumber(query.minPrice),
      maxPrice: this.parseNumber(query.maxPrice),
      bedrooms: this.parseNumber(query.bedrooms),
      propertyType: query.propertyType,
      isFurnished: this.parseBoolean(query.isFurnished),
      sortBy: query.sortBy || 'recent',
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    
    this.logger.log(
      `GetAllHouseListings: limit=${dto.limit}, offset=${dto.offset}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    
    const resp = await this.housingService.getAllHouseListings(dto);
    
    if (!resp.success) {
      this.logger.warn(`GetAllHouseListings failed: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  // ===========================================================
  // HOUSING - USER MANAGEMENT
  // ===========================================================
 
  @Post('listings')
  @Permissions(P.HOUSING_CREATE_OWN)
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  @ApiOperation({ 
    summary: 'Create a new house listing',
    description: 'Creates a new house listing with images.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateHouseListingDto) },
        {
          type: 'object',
          required: ['images'],
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              minItems: 1,
              maxItems: 10
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'House listing created successfully',
    type: HouseListingCreateResponseDto
  })
  async createOwn(
    @Body() dto: CreateHouseListingDto,
    @Req() req: JwtRequest,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @UploadedFiles() files: Array<Express.Multer.File>, 
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.sub;
    const storagePath = `houses/${req.user.accountId}`;
    
    this.logger.log(`Creating new house listing for user ${requesterUuid}`);

    const imageUrls = await this.housingService.uploadMultipleToStorage(
      files, 
      storagePath, 
      'pivota-public'
    );
 
    try {
      const sanitizedDto: CreateHouseListingGrpcRequestDto = {
        ...dto,
        subCategoryId: dto.subCategoryId,
        creatorId: requesterUuid,
        accountId: req.user.accountId,
        imageUrls: imageUrls,
        ownerEmail: req.user.email,
        clientInfo: clientInfo,
      };

      const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, false);

      if (!response.success) {
        this.logger.warn(`Housing creation failed: ${response.message}. Cleaning up uploaded images...`);
        await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
        return response;
      }

      this.logger.log(`House listing created successfully with ID: ${response.data?.id}`);
      return response;

    } catch (error) {
      this.logger.error(`Critical error during housing creation. Rolling back uploaded images.`);
      await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
      throw error;
    }
  }

  @Permissions(P.HOUSING_READ)
  @Version('1')
  @Get('my-listings')
  @ApiOperation({ 
    summary: 'Get your own listings',
    description: 'Retrieves all house listings owned by the authenticated account.'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by listing status',
    enum: HOUSE_LISTING_STATUSES
  })
  @ApiResponse({
    status: 200,
    description: 'Listings retrieved successfully',
    type: [HouseListingResponseDto]
  })
  async getMyListings(
    @Req() req: JwtRequest,
    @Query() query: GetOwnHousingFilterDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    const ownerId = req.user.accountId;
    
    if (!ownerId) {
      this.logger.error(`Security Alert: User ${req.user.sub} attempted to fetch listings without an accountId`);
      throw BaseResponseDto.fail('Account identification missing from session.', 'UNAUTHORIZED');
    }

    this.logger.log(`Fetching listings for Account: ${ownerId}. Filter Status: ${query.status ?? 'ALL'}`);
    
    const resp = await this.housingService.getListingsByOwner({ 
      ownerId: ownerId, 
      status: query.status 
    });
    
    if (!resp.success) {
      this.logger.warn(`Failed to retrieve listings for Account ${ownerId}: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  // ===========================================================
  // USER - Schedule Viewing
  // ===========================================================
  @Post('listings/:id/viewing')
  @Permissions(P.HOUSING_READ)
  @ApiOperation({ 
    summary: 'Schedule a property viewing for yourself',
    description: 'Schedules an appointment to view a property.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the property',
    example: 'cmlqzy0zt000mdl7nx18c66bu',
    required: true
  })
  @ApiBody({ 
    type: ScheduleViewingDto
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Viewing scheduled successfully',
    type: HouseViewingResponseDto
  })
  async scheduleViewing(
    @Param('id', ParseCuidPipe) listingId: string,
    @Body() body: ScheduleViewingDto,
    @Req() req: JwtRequest,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('x-platform') platform?: string,
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    const seekerId = req.user.sub;
    const sessionId = req.user.jti;
    const userEmail = req.user.email;
    const userRole = req.user.role;
    
    this.logger.log(`User ${seekerId} scheduling viewing for listing ${listingId}`);

    const context = new ListingViewContextDto();
    context.seekerId = seekerId;
    context.sessionId = sessionId || this.generateAnonymousId(clientInfo);
    context.platform = (platform?.toUpperCase() as 'WEB' | 'MOBILE' | 'API' | 'CLI') || 
                       this.determinePlatform(clientInfo);
    context.referrer = referer || 'DIRECT';
    context.client = clientInfo;

    const grpcDto: ScheduleViewingGrpcRequestDto = {
      ...body,
      houseId: listingId,
      userRole: userRole || 'USER',
      callerId: seekerId,
      callerEmail: userEmail,
      context: context
    };
    
    const resp = await this.housingService.scheduleViewing(grpcDto);
    
    if (!resp.success) {
      this.logger.warn(`Viewing scheduling failed: ${resp.message}`);
      throw resp;
    }

    this.logger.log(`Viewing scheduled successfully for user ${seekerId}`);
    return resp;
  }

  // ===========================================================
  // ADMIN - Schedule Viewing for Any User
  // ===========================================================
  @Post('admin/listings/:id/viewing')
  @Permissions(P.HOUSING_CREATE_ANY)
  @ApiOperation({ 
    summary: 'Schedule a viewing on behalf of any user (Admin only)',
    description: 'Admin-only endpoint: Schedules a viewing appointment for any user with bypass capabilities.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the property',
    example: 'cmlqzy0zt000mdl7nx18c66bu',
    required: true
  })
  @ApiBody({ 
    type: AdminScheduleViewingDto
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin viewing scheduled successfully',
    type: HouseViewingResponseDto
  })
  async scheduleAdminViewing(
    @Param('id', ParseCuidPipe) listingId: string,
    @Body() body: AdminScheduleViewingDto,
    @Req() req: JwtRequest,
    @ClientInfo() clientInfo: AuthClientInfoDto,
  ): Promise<BaseResponseDto<HouseViewingResponseDto>> {
    this.logger.log(`ADMIN ${req.user.sub} scheduling viewing for user ${body.targetViewerId} on listing ${listingId}`);

    const grpcDto: ScheduleAdminViewingGrpcRequestDto = {
      ...body,
      houseId: listingId,
      callerId: req.user.sub,
      callerEmail: req.user.email,
      userRole: req.user.role,
      targetViewerId: body.targetViewerId,
      targetViewerEmail: body.targetViewerEmail,
      targetViewerName: body.targetViewerName,
      adminMetadata: {
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        scheduledAt: new Date().toISOString(),
        isAdminBooking: true
      }
    };
    
    const resp = await this.housingService.scheduleAdminViewing(grpcDto);
    
    if (!resp.success) {
      this.logger.warn(`Admin viewing scheduling failed: ${resp.message}`);
      throw resp;
    }

    this.logger.log(`Admin audit: ${req.user.sub} scheduled viewing for ${body.targetViewerId}`);
    return resp;
  }

  // ===========================================================
  // HOUSING - ADMIN OPERATIONS
  // ===========================================================

  @Post('admin/accounts/:accountId/listings')
  @Permissions(P.HOUSING_CREATE_ANY)
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  @ApiOperation({ 
    summary: 'Create a house listing for any account',
    description: 'Admin-only endpoint: Creates listings on behalf of any account.'
  })
  @ApiParam({ 
    name: 'accountId', 
    description: 'UUID of the account that will own this listing',
    example: '462908a2-0f23-472a-b2d7-54966d004256',
    required: true
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AdminCreateHouseListingDto) },
        {
          type: 'object',
          required: ['images'],
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              minItems: 1,
              maxItems: 10
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'House listing created successfully',
    type: HouseListingCreateResponseDto
  })
  async createAny(
    @Param('accountId') accountId: string,
    @Body() dto: AdminCreateHouseListingDto,
    @Req() req: JwtRequest,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.sub;
    const storagePath = `houses/${req.user.accountId}`;

    this.logger.log(`ADMIN ${req.user.sub} creating listing for account ${accountId}`);

    const imageUrls = await this.housingService.uploadMultipleToStorage(
      files, 
      storagePath, 
      'pivota-public'
    );

    try {
      const sanitizedDto: CreateHouseListingGrpcRequestDto = {
        ...dto,
        subCategoryId: dto.subCategoryId,
        imageUrls, 
        accountId,
        creatorId: dto.creatorId || requesterUuid,
        accountName: 'Admin Created', 
      };

      const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, true);

      if (!response.success) {
        this.logger.warn(`Admin listing creation failed: ${response.message}. Rolling back uploaded images.`);
        await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
        return response; 
      }

      this.logger.log(`Admin created listing ${response.data?.id} for account ${accountId}`);
      return response;

    } catch (error) {
      this.logger.error(`Critical error in Admin Create. Rolling back uploaded images.`);
      await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
      throw error;
    }
  }

  @Patch('admin/listings/:id')
  @Permissions(P.HOUSING_UPDATE_ANY)
  @ApiOperation({ 
    summary: 'Update any house listing',
    description: 'Admin-only endpoint: Updates any house listing in the system.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the listing to update',
    example: 'cmlqzy0zt000mdl7nx18c66bu',
    required: true
  })
  @ApiBody({ 
    type: UpdateAdminHouseListingRequestDto
  })
  @ApiResponse({ 
    status: 200, 
    description: 'House listing updated successfully',
    type: HouseListingResponseDto
  })
  async updateAny(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateAdminHouseListingRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    this.logger.log(`ADMIN ${req.user.sub} updating listing ${id}`);

    const sanitizedDto: UpdateHouseListingGrpcRequestDto = {
      ...dto,
      listingId: id,
      callerId: req.user.sub,
      userRole: req.user.role,
    };

    const resp = await this.executeHousingUpdate(sanitizedDto, req.user.sub, true);

    if (!resp.success) {
      this.logger.warn(`Admin update failed for listing ${id}: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  @Permissions(P.HOUSING_READ)
  @Version('1')
  @Get('admin/listings')
  @ApiOperation({ 
    summary: 'Get all listings across the system',
    description: 'Admin-only endpoint: View all house listings with filters.'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by status',
    enum: HOUSE_LISTING_STATUSES
  })
  @ApiQuery({ 
    name: 'accountId', 
    required: false,
    description: 'Filter by owning account ID',
    type: String
  })
  @ApiQuery({ 
    name: 'creatorId', 
    required: false,
    description: 'Filter by creator ID',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin listings retrieved successfully',
    type: [HouseListingResponseDto]
  })
  async getAdminListings(
    @Query() query: GetAdminHousingFilterDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    if (req.user.role === 'Individual' || req.user.role === 'Member') {
      this.logger.warn(`Unauthorized admin access attempt by ${req.user.role} ${req.user.sub}`);
      throw BaseResponseDto.fail('Unauthorized access to admin listings.', 'FORBIDDEN');
    }

    this.logger.log(`Admin ${req.user.sub} searching system listings`);

    const resp = await this.housingService.getAdminListings(query);
    
    if (!resp.success) {
      this.logger.warn(`Admin search failed: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  // ===========================================================
  // GET LISTING DETAILS (WITH CACHE CONTROL)
  // ===========================================================

  @Version('1')
  @Get('details/:id')
  @ApiOperation({ 
    summary: 'Get detailed listing information with AI-powered analytics tracking',
    description: 'Retrieves complete details of a specific house listing by its ID with cache control.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the listing',
    example: 'cmlqzy0zt000mdl7nx18c66bu',
    required: true
  })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 600 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'House listing retrieved successfully',
    type: HouseListingResponseDto
  })
  async viewHouseListing(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: JwtRequest,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers() headers: GetListingHeadersDto,
    @Query() query: any,  // ✅ Use 'any' and manually parse
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    const sessionId = req.user?.jti;
    const seekerId = req.user?.sub;
    
    this.logger.debug(`Listing view - Seeker: ${seekerId}, Listing: ${id}`);

    const context = new ListingViewContextDto();
    context.seekerId = seekerId;
    context.sessionId = sessionId;
    context.client = clientInfo;
    context.platform = (headers['x-platform'] as 'WEB' | 'MOBILE' | 'API' | 'CLI') || 
                       this.determinePlatform(clientInfo);
    context.referrer = headers.referer || 'DIRECT';
    context.timeSpent = query.timeSpent ? parseInt(query.timeSpent) : undefined;
    context.interactionType = query.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined;
    context.viewDuration = query.timeSpent ? parseInt(query.timeSpent) : undefined;
    context.scrollDepth = query.scrollDepth ? parseInt(query.scrollDepth) : undefined;
    
    if (query.searchId || query.q || query.pos) {
      const searchContext = new SearchContextDto();
      searchContext.searchId = query.searchId;
      searchContext.query = query.q;
      searchContext.position = query.pos ? parseInt(query.pos) : undefined;
      context.search = searchContext;
    }
 
    // ✅ MANUALLY PARSE ALL VALUES
    const dto: GetHouseListingByIdDto = {
      id: id,
      context: context,
      bypassCache: this.parseBoolean(query.bypassCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 600,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `GetHouseListingById: id=${id}, ` +
      `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}, readOnly=${dto.readOnly}`
    );

    const resp = await this.housingService.getHouseListingWithTracking(dto);
    if (!resp.success) throw resp;
    
    return resp;
  }

  // ===========================================================
  // PRIVATE HELPERS
  // ===========================================================

  private determinePlatform(clientInfo: AuthClientInfoDto): 'WEB' | 'MOBILE' | 'API' | 'CLI' {
    if (clientInfo.isBot) return 'API';
    if (clientInfo.deviceType === 'MOBILE' || clientInfo.deviceType === 'TABLET') return 'MOBILE';
    if (clientInfo.deviceType === 'DESKTOP') return 'WEB';
    return 'WEB';
  }

  private generateAnonymousId(clientInfo: AuthClientInfoDto): string {
    const deviceFingerprint = `${clientInfo.device}_${clientInfo.os}_${clientInfo.osVersion || ''}_${clientInfo.browser || ''}_${clientInfo.ipAddress}`
      .replace(/\s+/g, '')
      .substring(0, 100);
    
    const buffer = Buffer.from(deviceFingerprint);
    const hash = buffer.toString('base64').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    
    return `anon_${hash}`;
  }
}