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
import { ClientInfo } from '../../decorators/client-info.decorator';
import { HOUSE_LISTING_STATUSES, HOUSE_LISTING_TYPES } from '@pivota-api/constants';

@ApiTags('Housing')
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
  @ApiTags('Housing - Discovery')
  @ApiOperation({ 
    summary: 'Search for available house listings with AI-powered analytics tracking',
    description: `
      Public endpoint to search and filter available house listings.
      No authentication required.
      
      **Microservice:** Listings Service
      
      **AI Analytics & Tracking System**
      
      This endpoint captures search behavior that is critical for training recommendation models and improving search relevance.
      
      **Event Type: SEARCH**
      Search events reveal user intent and preferences, forming the foundation of the recommendation system.
      
      **Data Collected for AI Training:**
      
      | Category | Fields | AI Use Case |
      |----------|--------|-------------|
      | **Search Intent** | Search query, filters applied, results count | Query understanding, intent classification |
      | **User Context** | Session ID, platform, referrer | Personalization, user profiling |
      | **Filter Preferences** | City, price range, bedrooms, property type | Preference learning, feature importance |
      | **Pagination Data** | Limit, offset, total results | User patience, scroll behavior |
      
      **AI Training Applications:**
      
      1. **Search Relevance Optimization**
         - Analyze which search parameters yield the most clicks
         - Learn which filters users apply most frequently
         - Optimize ranking algorithms based on search patterns
         - Track zero-result searches to improve inventory
      
      2. **Query Understanding**
         - Map search patterns to structured filters
         - Learn popular search terms and locations
         - Understand intent behind searches
         - Improve autocomplete and suggestions
      
      3. **User Preference Profiling**
         - Build anonymous session-based preference profiles
         - Learn preferred locations and price ranges
         - Track search patterns over time
         - Personalize future search results
      
      4. **Market Demand Analysis**
         - Identify high-demand areas and property types
         - Track seasonal search patterns
         - Analyze price sensitivity across markets
         - Detect emerging neighborhood trends
      
      **Context Headers (for analytics):**
      - **x-session-id** - Session identifier for tracking search journey
      - **x-platform** - Platform identifier (web/mobile/api)
      - **referer** - Source URL where the search originated
    `
  })
  @ApiHeader({
    name: 'x-session-id',
    description: 'Session identifier for tracking search journey across requests',
    required: false,
    example: 'sess_abc123'
  })
  @ApiHeader({
    name: 'x-platform',
    description: 'Platform identifier (web/mobile/api) - used for platform-specific behavior analysis',
    required: false,
    enum: ['web', 'mobile', 'api']
  })
  @ApiHeader({
    name: 'referer',
    description: 'Source URL - identifies where the search originated (homepage, direct, external)',
    required: false
  })
  @ApiQuery({ 
    name: 'city', 
    required: false,
    description: 'Filter listings by city - used for location preference learning',
    example: 'Nairobi',
    type: String
  })
  @ApiQuery({ 
    name: 'listingType', 
    required: false,
    description: 'Filter by listing type (rental/sale) - captures user intent',
    enum: HOUSE_LISTING_TYPES,
    example: 'RENTAL'
  })
  @ApiQuery({ 
    name: 'minPrice', 
    required: false,
    description: 'Minimum price filter - establishes lower bound of user budget range',
    example: 20000,
    type: Number
  })
  @ApiQuery({ 
    name: 'maxPrice', 
    required: false,
    description: 'Maximum price filter - establishes upper bound of user budget range',
    example: 100000,
    type: Number
  })
  @ApiQuery({ 
    name: 'bedrooms', 
    required: false,
    description: 'Minimum number of bedrooms - captures space requirements',
    example: 2,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results retrieved successfully with analytics tracking',
    type: [HouseListingResponseDto]
  })
  async searchListings(
    @Query() dto: SearchHouseListingsDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-platform') platform?: 'web' | 'mobile' | 'api',
    @Headers('referer') referer?: string,
  ): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
    this.logger.log(`Public search executed with filters: ${JSON.stringify(dto)}`);
    
    this.logger.debug(`Search from Device: ${clientInfo.device} (${clientInfo.deviceType})`);
    
    // Add context to DTO
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

  @Version('1')
  @Get('details/:id')
  @ApiTags('Housing - Discovery')
  @ApiOperation({ 
    summary: 'Get detailed listing information with AI-powered analytics tracking',
    description: `
      Retrieves complete details of a specific house listing by its ID with comprehensive analytics tracking.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      
      **AI Analytics & Tracking System**
      
      This endpoint captures rich user interaction data for training recommendation models.
      
      **Event Type: VIEW**
      Primary event when users view listing details - forms the foundation of the recommendation system.
      
      **Data Collected:**
      - User Context - User ID, Session ID
      - Device Info - Platform, Device Type, OS, Browser
      - Search Context - Search ID, Position, Query
      - Interaction Metrics - Time Spent, Scroll Depth
      - Listing Features - Price, Location, Amenities
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the listing',
    example: 'cmlqzy0zt000mdl7nx18c66bu',
    required: true
  })
  @ApiResponse({ 
    status: 200, 
    description: 'House listing retrieved successfully with analytics tracking',
    type: HouseListingResponseDto
  })
  async viewHouseListing(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: JwtRequest,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Headers() headers: GetListingHeadersDto,
    @Query() query: GetListingQueryDto,
  ): Promise<BaseResponseDto<HouseListingResponseDto>> {
    
    const sessionId = req.user?.tokenId;
    const seekerId = req.user?.userUuid;
    
    this.logger.debug(`Device: ${clientInfo.device} (${clientInfo.deviceType})`);
    this.logger.debug(`OS: ${clientInfo.os} ${clientInfo.osVersion || ''}`);
    this.logger.debug(`Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}`);
    this.logger.debug(`Classification: ${clientInfo.isBot ? 'Bot' : 'User'}`);
    this.logger.debug(`Listing view - Seeker: ${seekerId}, Listing: ${id}`);

    const context = new ListingViewContextDto();
    
    // Set seeker and session info from JWT
    context.seekerId = seekerId;
    context.sessionId = sessionId;
    
    // Set client/device info
    context.client = clientInfo;
    
    // Set platform and referrer
    context.platform = (headers['x-platform'] as 'WEB' | 'MOBILE' | 'API' | 'CLI') || 
                       this.determinePlatform(clientInfo);
    context.referrer = headers.referer || 'DIRECT';
    
    // Set interaction data from query params
    context.timeSpent = query.timeSpent ? parseInt(query.timeSpent) : undefined;
    context.interactionType = query.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined;
    context.viewDuration = query.timeSpent ? parseInt(query.timeSpent) : undefined;
    context.scrollDepth = query.scrollDepth ? parseInt(query.scrollDepth) : undefined;
    
    // Set search context if coming from search
    if (query.searchId || query.q || query.pos) {
      const searchContext = new SearchContextDto();
      searchContext.searchId = query.searchId;
      searchContext.query = query.q;
      searchContext.position = query.pos ? parseInt(query.pos) : undefined;
      context.search = searchContext;
    }
 
    const dto = new GetHouseListingByIdDto();
    dto.id = id;
    dto.context = context;

    const resp = await this.housingService.getHouseListingWithTracking(dto);
    if (!resp.success) throw resp;
    
    return resp;
  }

  // ===========================================================
  // HOUSING - USER MANAGEMENT
  // ===========================================================
 
  @Post('listings')
  @Permissions('houses.create.own')
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  @ApiTags('Housing - Management')
  @ApiOperation({ 
    summary: 'Create a new house listing',
    description: `
      Creates a new house listing with images.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.own
    `
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
    const requesterUuid = req.user.userUuid;
    const storagePath = `houses/${req.user.accountId}`;
    
    this.logger.log(`Creating new house listing for user ${requesterUuid}`);
    this.logger.debug(`Client info: ${JSON.stringify({
      device: clientInfo?.device,
      deviceType: clientInfo?.deviceType,
      os: clientInfo?.os,
      browser: clientInfo?.browser,
      ipAddress: clientInfo?.ipAddress
    })}`);

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
        creatorName: req.user.userName,
        accountName: req.user.accountName,
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

  @Permissions('houses.read')
  @Version('1')
  @Get('my-listings')
  @ApiTags('Housing - Management')
  @ApiOperation({ 
    summary: 'Get your own listings',
    description: `
      Retrieves all house listings owned by the authenticated account.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.read
    `
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by listing status',
    enum: HOUSE_LISTING_STATUSES,
    example: 'ACTIVE'
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
      this.logger.error(`Security Alert: User ${req.user.userUuid} attempted to fetch listings without an accountId`);
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
  @Permissions('houses.read')
  @ApiTags('Housing - Management')
  @ApiOperation({ 
    summary: 'Schedule a property viewing for yourself with AI-powered analytics tracking',
    description: `
      Schedules an appointment to view a property with comprehensive AI tracking for recommendation systems.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.read
      
      **AI Analytics & Tracking**
      
      This endpoint captures high-intent user signals that are critical for training recommendation models.
      
      **Event Type: SCHEDULE_VIEWING**
      This is a strong positive signal in the AI model - users who schedule viewings are highly likely to convert.
      
      **AI Training Applications:**
      - Conversion Prediction - Identify users likely to rent/buy
      - Recommendation Weighting - Boost similar properties in results
      - Price Sensitivity - Analyze price vs. viewing patterns
      - Location Affinity - Build neighborhood preference profiles
    `
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
    
    if (!req.user) {
      this.logger.error('No user object found in request');
      throw BaseResponseDto.fail('Unauthorized. Please login.', 'UNAUTHORIZED');
    }
    
    const seekerId = req.user.userUuid;
    const sessionId = req.user.tokenId;
    const userEmail = req.user.email;
    const userName = req.user.userName;
    const userRole = req.user.role;
    
    if (!seekerId) {
      this.logger.error(`No userUuid found in req.user. Available fields: ${Object.keys(req.user).join(', ')}`);
      throw BaseResponseDto.fail('User identification missing.', 'UNAUTHORIZED');
    }
    
    if (!sessionId) {
      this.logger.warn(`No tokenId found for user ${seekerId}, using generated session ID`);
    }
    
    this.logger.log(`User ${seekerId} scheduling viewing for listing ${listingId}`);
    this.logger.debug(`Scheduling from Device: ${clientInfo.device} (${clientInfo.deviceType})`);

    // Build context object for tracking
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
      callerName: userName,
      context: context
    };
    
    this.logger.debug(`gRPC Request - callerId: ${grpcDto.callerId}`);
    
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
  @Permissions('houses.create.any')
  @ApiTags('Housing - Admin')
  @ApiOperation({ 
    summary: 'Schedule a viewing on behalf of any user (Admin only)',
    description: `
      Admin-only endpoint: Schedules a viewing appointment for any user with bypass capabilities.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.any
      
      **Admin Bypass Capabilities:**
      - Can book for any user (targetViewerId required)
      - Can book non-AVAILABLE houses
      - Can book past dates
      - No double-booking checks
    `
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
    this.logger.log(`ADMIN ${req.user.userUuid} scheduling viewing for user ${body.targetViewerId} on listing ${listingId}`);

    const grpcDto: ScheduleAdminViewingGrpcRequestDto = {
      ...body,
      houseId: listingId,
      callerId: req.user.userUuid,
      callerEmail: req.user.email,
      callerName: req.user.userName,
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

    this.logger.log(`Admin audit: ${req.user.userUuid} scheduled viewing for ${body.targetViewerId}`);
    return resp;
  }

  // ===========================================================
  // HOUSING - ADMIN OPERATIONS
  // ===========================================================

  @Post('admin/accounts/:accountId/listings')
  @Permissions('houses.create.any')
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  @ApiTags('Housing - Admin')
  @ApiOperation({ 
    summary: 'Create a house listing for any account',
    description: `
      Admin-only endpoint: Creates listings on behalf of any account.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.any
    `
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
    const requesterUuid = req.user.userUuid;
    const storagePath = `houses/${req.user.accountId}`;

    this.logger.log(`ADMIN ${req.user.userUuid} creating listing for account ${accountId}`);

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
        creatorName: req.user.userName,
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
  @Permissions('housing.update.any')
  @ApiTags('Housing - Admin')
  @ApiOperation({ 
    summary: 'Update any house listing',
    description: `
      Admin-only endpoint: Updates any house listing in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** housing.update.any
    `
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
    this.logger.log(`ADMIN ${req.user.userUuid} updating listing ${id}`);

    const sanitizedDto: UpdateHouseListingGrpcRequestDto = {
      ...dto,
      listingId: id,
      callerId: req.user.userUuid,
      userRole: req.user.role,
    };

    const resp = await this.executeHousingUpdate(sanitizedDto, req.user.userUuid, true);
    
    if (!resp.success) {
      this.logger.warn(`Admin update failed for listing ${id}: ${resp.message}`);
      throw resp;
    }

    return resp;
  }

  @Permissions('houses.read')
  @Version('1')
  @Get('admin/listings')
  @ApiTags('Housing - Admin')
  @ApiOperation({ 
    summary: 'Get all listings across the system',
    description: `
      Admin-only endpoint: View all house listings with filters.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.read
    `
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
    if (req.user.role === 'GeneralUser') {
      this.logger.warn(`Unauthorized admin access attempt by GeneralUser ${req.user.userUuid}`);
      throw BaseResponseDto.fail('Unauthorized access to admin listings.', 'FORBIDDEN');
    }
    
    this.logger.log(`Admin ${req.user.userUuid} searching system listings`);
    
    const resp = await this.housingService.getAdminListings(query);
    
    if (!resp.success) {
      this.logger.warn(`Admin search failed: ${resp.message}`);
      throw resp;
    }

    return resp;
  } 

  // Helper method to determine platform from AuthClientInfoDto
  private determinePlatform(clientInfo: AuthClientInfoDto): 'WEB' | 'MOBILE' | 'API' | 'CLI' {
    if (clientInfo.isBot) return 'API';
    if (clientInfo.deviceType === 'MOBILE' || clientInfo.deviceType === 'TABLET') return 'MOBILE';
    if (clientInfo.deviceType === 'DESKTOP') return 'WEB';
    return 'WEB';
  }
 
  // Helper method to generate anonymous ID using AuthClientInfoDto
  private generateAnonymousId(clientInfo: AuthClientInfoDto): string {
    const deviceFingerprint = `${clientInfo.device}_${clientInfo.os}_${clientInfo.osVersion || ''}_${clientInfo.browser || ''}_${clientInfo.ipAddress}`
      .replace(/\s+/g, '')
      .substring(0, 100);
    
    const buffer = Buffer.from(deviceFingerprint);
    const hash = buffer.toString('base64').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    
    return `anon_${hash}`;
  }
}