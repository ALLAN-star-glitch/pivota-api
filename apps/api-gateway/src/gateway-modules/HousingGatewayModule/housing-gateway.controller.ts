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
import {JwtRequest} from '@pivota-api/interfaces';
import { HousingGatewayService } from './housing-gateway.service';
import { ParseCuidPipe } from '@pivota-api/pipes';
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { SetModule } from '../../decorators/set-module.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { imageFileFilter } from '@pivota-api/filters';
import { ClientInfo } from '../../decorators/client-info.decorator';
import { HOUSE_LISTING_STATUSES, HOUSE_LISTING_TYPES } from '@pivota-api/constants';

// Remove the main @ApiTags from here
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
      this.logger.error(`🔥 Housing creation execution failed`, error.stack);
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
      this.logger.error(`🔥 Housing update execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error during update routing', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // 🏠 HOUSING - PUBLIC DISCOVERY
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
    
    **🤖 AI Analytics & Tracking System**
    
    This endpoint captures search behavior that is critical for training recommendation models and improving search relevance:
    
    **📊 Event Type: SEARCH**
    Search events reveal user intent and preferences, forming the foundation of the recommendation system.
    
    **📈 Data Collected for AI Training:**
    
    | Category | Fields | AI Use Case |
    |----------|--------|-------------|
    | **Search Intent** | Search query, filters applied, results count | Query understanding, intent classification |
    | **User Context** | Session ID, platform, referrer | Personalization, user profiling |
    | **Filter Preferences** | City, price range, bedrooms, property type | Preference learning, feature importance |
    | **Pagination Data** | Limit, offset, total results | User patience, scroll behavior |
    
    **🎯 AI Training Applications:**
    
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
    
    **Search Capabilities:**
    • **Location** - Filter by city
    • **Listing Type** - Rent or sale
    • **Price Range** - Min/max price filtering
    • **Bedrooms** - Minimum bedrooms required
    • **Property Features** - Square footage, year built, furnished status
    • **Amenities** - Filter by required amenities
    • **Categories** - Main category and sub-category filtering
    • **Pagination** - Control result size and offset
    
    **Sorting:**
    • Results are sorted by creation date (newest first)
    
    **Availability:**
    • Only returns listings with status = 'AVAILABLE'
    
    **Context Headers (for analytics):**
    • **x-session-id** - Session identifier for tracking search journey
    • **x-platform** - Platform identifier (web/mobile/api)
    • **referer** - Source URL where the search originated
    
    **Privacy & Compliance:**
    • All tracking is anonymized (no PII stored for public searches)
    • Session-based tracking only
    • Data used exclusively for platform improvement
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
  description: 'Filter by listing type (rental/sale) - captures user intent (long-term vs short-term)',
  enum: HOUSE_LISTING_TYPES,
  example: 'RENTAL',
  schema: { 
    type: 'string',
    enum: HOUSE_LISTING_TYPES
  }
})
@ApiQuery({ 
  name: 'minPrice', 
  required: false,
  description: 'Minimum price filter - establishes lower bound of user budget range',
  example: 20000,
  type: Number,
  minimum: 0
})
@ApiQuery({ 
  name: 'maxPrice', 
  required: false,
  description: 'Maximum price filter - establishes upper bound of user budget range',
  example: 100000,
  type: Number,
  minimum: 0
})
@ApiQuery({ 
  name: 'bedrooms', 
  required: false,
  description: 'Minimum number of bedrooms - captures space requirements',
  example: 2,
  type: Number,
  minimum: 0
})
@ApiQuery({ 
  name: 'propertyType', 
  required: false,
  description: 'Filter by property type (apartment/house/condo) - captures dwelling preference',
  example: 'APARTMENT',
  enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'],
  type: String
})
@ApiQuery({ 
  name: 'minSquareFootage', 
  required: false,
  description: 'Minimum square footage - captures space requirements in detail',
  example: 800,
  type: Number,
  minimum: 0
})
@ApiQuery({ 
  name: 'maxSquareFootage', 
  required: false,
  description: 'Maximum square footage - captures upper bound of space needs',
  example: 2000,
  type: Number,
  minimum: 0
})
@ApiQuery({ 
  name: 'minYearBuilt', 
  required: false,
  description: 'Minimum year built - captures preference for newer/older properties',
  example: 2000,
  type: Number,
  minimum: 1800
})
@ApiQuery({ 
  name: 'isFurnished', 
  required: false,
  description: 'Filter by furnished status - captures preference for move-in ready vs unfurnished',
  example: true,
  type: Boolean
})
@ApiQuery({ 
  name: 'amenities', 
  required: false,
  description: 'Filter by required amenities - comma-separated list. Captures must-have features',
  example: 'Parking,WiFi',
  type: String
})
@ApiQuery({ 
  name: 'categoryId', 
  required: false,
  description: 'Filter by main category ID - captures high-level property classification',
  example: 'clm123housingid',
  type: String
})
@ApiQuery({ 
  name: 'subCategoryId', 
  required: false,
  description: 'Filter by specific sub-category ID - captures detailed classification (studio, duplex, etc.)',
  example: 'sub-clm123id',
  type: String
})
@ApiQuery({ 
  name: 'limit', 
  required: false,
  description: 'Maximum number of results to return - captures user patience and scroll behavior',
  example: 20,
  type: Number,
  minimum: 1,
  maximum: 100,
  default: 20
})
@ApiQuery({ 
  name: 'offset', 
  required: false,
  description: 'Number of results to skip - captures pagination depth (how many pages user viewed)',
  example: 0,
  type: Number,
  minimum: 0,
  default: 0
})
@ApiResponse({ 
  status: 200, 
  description: 'Search results retrieved successfully with analytics tracking',
  type: [HouseListingResponseDto],
  headers: {
    'X-Search-ID': {
      description: 'Unique identifier for this search session (for analytics)',
      schema: { type: 'string', example: 'search_abc123_20260304' }
    }
  },
  schema: {
    example: {
      success: true,
      message: 'Search completed successfully',
      code: 'OK',
      data: [
        {
          id: 'cmlqzy0zt000mdl7nx18c66bu',
          title: 'Modern 2 Bedroom Apartment in Kilimani',
          description: 'Spacious apartment with parking and security...',
          price: 45000,
          currency: 'KES',
          listingType: 'RENTAL',
          bedrooms: 2,
          bathrooms: 1,
          locationCity: 'Nairobi',
          locationNeighborhood: 'Kilimani',
          amenities: ['Parking', 'WiFi', 'Security'],
          isFurnished: true,
          status: 'AVAILABLE',
          images: [
            { id: 'img1', url: 'https://example.com/image1.jpg', isMain: true },
            { id: 'img2', url: 'https://example.com/image2.jpg', isMain: false }
          ],
          createdAt: '2026-03-01T10:30:00Z'
        }
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 45,
        hasMore: true
      },
      tracking: {
        searchId: 'search_abc123_20260304',
        eventType: 'SEARCH',
        timestamp: '2026-03-04T10:30:00Z',
        filters: {
          city: 'Nairobi',
          minPrice: 20000,
          maxPrice: 100000,
          bedrooms: 2,
          listingType: 'RENTAL'
        },
        resultsCount: 45,
        sessionId: 'sess_abc123',
        platform: 'MOBILE'
      }
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Invalid search parameters',
  schema: {
    example: {
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: [
        { field: 'minPrice', message: 'minPrice must be a positive number' },
        { field: 'maxPrice', message: 'maxPrice must be greater than minPrice' }
      ]
    }
  }
})
@ApiResponse({ 
  status: 200,
  description: 'No results found - useful for inventory gap analysis',
  schema: {
    example: {
      success: true,
      message: 'No listings match your search criteria',
      code: 'SUCCESS_EMPTY',
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false
      },
      tracking: {
        searchId: 'search_abc123_20260304',
        eventType: 'SEARCH',
        timestamp: '2026-03-04T10:30:00Z',
        filters: {
          city: 'Nakuru',
          minPrice: 5000,
          maxPrice: 10000
        },
        zeroResultAnalysis: {
          suggestedAlternatives: ['Nairobi', 'Limuru'],
          missingPriceRange: true,
          missingInventory: true
        }
      }
    }
  }
})
async searchListings(
  @Query() dto: SearchHouseListingsDto,
  @ClientInfo() clientInfo: AuthClientInfoDto, // Add this
  @Headers('x-session-id') sessionId?: string,
  @Headers('x-platform') platform?: 'web' | 'mobile' | 'api',
  @Headers('referer') referer?: string,
): Promise<BaseResponseDto<HouseListingResponseDto[]>> {
  this.logger.log(`🔍 Public search executed with filters: ${JSON.stringify(dto)}`);
  
  // Log device info for debugging
  this.logger.debug(`📱 Search from Device: ${clientInfo.device} (${clientInfo.deviceType})`);
  
  // Add context to DTO
  const context: Partial<ListingViewContextDto> = {
    sessionId: sessionId || this.generateAnonymousId(clientInfo),
    platform: platform?.toUpperCase() as 'WEB' | 'MOBILE' | 'API' | undefined || this.determinePlatform(clientInfo),
    referrer: referer || 'DIRECT',
    client: clientInfo, // Now using AuthClientInfoDto directly
  };
  
  dto.context = context as ListingViewContextDto;
  
  const resp = await this.housingService.searchListings(dto);
  
  if (!resp.success) {
    this.logger.warn(`Search failed: ${resp.message}`);
    throw resp;
  }

  this.logger.log(`✅ Search returned ${resp.data?.length || 0} results`);
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
    
    **Authentication Notes:**
    • Authenticated users: Full access with analytics tracking
    • Unauthenticated users: This endpoint returns 401 Unauthorized
    
    **🤖 AI Analytics & Tracking System**
    
    This endpoint captures rich user interaction data for training recommendation models:
    
    **📊 Event Type: VIEW**
    Primary event when users view listing details - forms the foundation of the recommendation system.
    
    **📈 Data Collected:**
    • **User Context** - User ID, Session ID
    • **Device Info** - Platform, Device Type, OS, Browser, Device Classification
    • **Search Context** - Search ID, Position, Query
    • **Interaction Metrics** - Time Spent, Scroll Depth, Interaction Type
    • **Listing Features** - Price, Location, Amenities, Property Details
    
    **Device Information Captured:**
    • **Device Model** - iPhone 15, Samsung Galaxy, etc.
    • **Device Type** - MOBILE, TABLET, DESKTOP, BOT, UNKNOWN
    • **Operating System** - iOS, Android, Windows, macOS
    • **OS Version** - 17.2, 14, 11, etc.
    • **Browser** - Chrome, Safari, Firefox, etc.
    • **Browser Version** - 120.0.0, 17.2, etc.
    • **Device Classification** - isMobile, isTablet, isDesktop, isBot flags
    
    **Context Parameters:**
    • **x-platform** - Client platform (web, mobile, api)
    • **x-device** - Custom device identifier (for mobile apps)
    • **x-device-type** - Custom device type (MOBILE/TABLET/DESKTOP)
    • **x-os** - Custom OS identifier
    • **x-os-version** - Custom OS version
    • **referer** - Source URL of the request
    • **searchId** - Search session identifier
    • **pos** - Listing position in search results
    • **q** - Original search query
    • **timeSpent** - Time spent viewing (seconds)
    • **interactionType** - CLICK/SCROLL/DWELL
    • **scrollDepth** - Scroll percentage
  `
})
@ApiParam({ 
  name: 'id', 
  type: String,
  description: 'CUID of the listing',
  example: 'cmlqzy0zt000mdl7nx18c66bu',
  required: true
})
@ApiHeader({
  name: 'x-platform',
  description: 'Platform (web, mobile, api) - used for device segmentation',
  required: false,
  enum: ['web', 'mobile', 'api']
})
@ApiHeader({
  name: 'x-device',
  description: 'Custom device identifier (for mobile apps)',
  required: false,
  example: 'iPhone15,3'
})
@ApiHeader({
  name: 'x-device-type',
  description: 'Custom device type (MOBILE/TABLET/DESKTOP)',
  required: false,
  enum: ['MOBILE', 'TABLET', 'DESKTOP']
})
@ApiHeader({
  name: 'x-os',
  description: 'Custom OS identifier',
  required: false,
  example: 'iOS'
})
@ApiHeader({
  name: 'x-os-version',
  description: 'Custom OS version',
  required: false,
  example: '17.2'
})
@ApiHeader({
  name: 'referer',
  description: 'Source URL - for traffic source analysis',
  required: false
})
@ApiQuery({
  name: 'searchId',
  description: 'Search session ID - links this view to a search session',
  required: false,
  example: 'search_abc123'
})
@ApiQuery({
  name: 'pos',
  description: 'Position in search results (1-based) - for CTR analysis',
  required: false,
  example: '3'
})
@ApiQuery({
  name: 'q',
  description: 'Original search query - for search relevance',
  required: false,
  example: '2 bedroom apartment kilimani'
})
@ApiQuery({
  name: 'timeSpent',
  description: 'Time spent viewing in seconds - for engagement scoring',
  required: false,
  example: '45'
})
@ApiQuery({
  name: 'interactionType',
  description: 'Type of user interaction - for behavior analysis',
  required: false,
  enum: ['CLICK', 'SCROLL', 'DWELL'],
  example: 'SCROLL'
})
@ApiQuery({
  name: 'scrollDepth',
  description: 'How far the user scrolled (percentage) - for content engagement',
  required: false,
  example: '75'
})
@ApiResponse({ 
  status: 200, 
  description: 'House listing retrieved successfully with analytics tracking',
  type: HouseListingResponseDto,
  headers: {
    'X-Device-Info': {
      description: 'Device classification for debugging',
      schema: { type: 'string', example: 'MOBILE|iOS|17.2|Safari' }
    }
  },
  schema: {
    example: {
      success: true,
      message: 'Listing retrieved successfully',
      code: 'OK',
      data: {
        id: 'cmlqzy0zt000mdl7nx18c66bu',
        title: 'Modern 2 Bedroom Apartment in Kilimani',
        description: 'Spacious apartment with parking, backup power, and security.',
        price: 45000,
        currency: 'KES',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 1,
        locationCity: 'Nairobi',
        locationNeighborhood: 'Kilimani',
        amenities: ['Parking', 'WiFi', 'Security'],
        isFurnished: true,
        status: 'AVAILABLE',
        squareFootage: 1200,
        yearBuilt: 2015,
        propertyType: 'APARTMENT',
        images: [
          { id: 'img1', url: 'https://example.com/image1.jpg', isMain: true },
          { id: 'img2', url: 'https://example.com/image2.jpg', isMain: false }
        ],
        category: {
          id: 'cat_123',
          name: 'Apartments',
          slug: 'apartments',
          vertical: 'HOUSING'
        },
        creator: {
          id: 'usr_456',
          fullName: 'John Doe'
        },
        account: {
          id: 'acc_789',
          name: 'Pivota Properties Ltd'
        },
        createdAt: '2026-03-01T10:30:00Z',
        updatedAt: '2026-03-01T10:30:00Z'
      }
    }
  }
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized - Authentication required',
  schema: {
    example: {
      success: false,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED'
    }
  }
})
@ApiResponse({ 
  status: 404, 
  description: 'House listing not found',
  schema: {
    example: {
      success: false,
      message: 'Listing not found',
      code: 'NOT_FOUND'
    }
  }
})
@ApiResponse({ 
  status: 500, 
  description: 'Internal server error',
  schema: {
    example: {
      success: false,
      message: 'Fetch failed',
      code: 'ERROR'
    }
  }
})
async viewHouseListing(
  @Param('id', ParseCuidPipe) id: string,
  @Req() req: JwtRequest,
  @ClientInfo() clientInfo: AuthClientInfoDto,
  @Headers() headers: GetListingHeadersDto,
  @Query() query: GetListingQueryDto,
): Promise<BaseResponseDto<HouseListingResponseDto>> {
  
  const sessionId = req.user?.tokenId;
  
  // Log rich device info for debugging
  this.logger.debug(`📱 Device: ${clientInfo.device} (${clientInfo.deviceType})`);
  this.logger.debug(`💻 OS: ${clientInfo.os} ${clientInfo.osVersion || ''}`);
  this.logger.debug(`🌐 Browser: ${clientInfo.browser} ${clientInfo.browserVersion || ''}`);
  this.logger.debug(`📊 Classification: ${[
    clientInfo.isBot ? 'Bot' : ''
  ].filter(Boolean).join(', ') || 'Unknown'}`);
  
  this.logger.debug(`📱 Listing view - User: ${req.user?.userUuid || 'anonymous'}, Listing: ${id}`);

  const context = new ListingViewContextDto();
  
  // Set user and session info
  context.userId = req.user?.userUuid;
  context.sessionId = sessionId || this.generateAnonymousId(clientInfo);
  
  // Set client/device info - now using AuthClientInfoDto directly
  context.client = clientInfo; // No need to create a new DTO, just assign directly
  
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
  // 👤 HOUSING - USER MANAGEMENT
  // ===========================================================
 
  @Post('listings')
  @Permissions('houses.create.own')
  @UseInterceptors(FilesInterceptor('images', 10, {
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
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
      
      **Upload Process:**
      • Accepts multipart/form-data with listing details and images
      • Supports up to 10 images (5MB max per file)
      • Images are uploaded to Supabase storage automatically
      
      **Error Handling:**
      • If listing creation fails, uploaded images are automatically cleaned up
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
              items: { 
                type: 'string', 
                format: 'binary',
                description: 'Image file (JPEG, PNG, GIF)'
              },
              description: 'Property images (max 10 files, 5MB each)',
              minItems: 1,
              maxItems: 10
            },
          },
        },
      ],
      example: {
        title: 'Modern 2 Bedroom Apartment in Kilimani',
        description: 'Spacious apartment with parking, backup power, and security.',
        categoryId: 'clm123housingid',
        subCategoryId: 'sub-clm123id',
        listingType: 'RENTAL',
        price: 45000,
        currency: 'KES',
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['Parking', 'WiFi', 'Security'],
        isFurnished: true,
        locationCity: 'Nairobi',
        locationNeighborhood: 'Kilimani',
        address: '123 Riverside Drive, Nairobi',
        images: ['(binary file data)']
      }
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'House listing created successfully',
    type: HouseListingCreateResponseDto,
    schema: {
      example: {
        success: true,
        message: 'House Posted successfully',
        code: 'CREATED',
        data: {
          id: 'house_123abc',
          status: 'AVAILABLE',
          createdAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error - Invalid input data',
    schema: {
      example: {
        success: false,
        message: 'Invalid category for Housing pillar',
        code: 'CATEGORY_NOT_FOUND'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid JWT token',
    schema: {
      example: {
        success: false,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN'
      }
    }
  })
  @ApiResponse({ 
    status: 413, 
    description: 'Payload Too Large - File size exceeds 5MB limit',
    schema: {
      example: {
        success: false,
        message: 'File too large',
        code: 'FILE_TOO_LARGE'
      }
    }
  })
  @ApiResponse({ 
    status: 415, 
    description: 'Unsupported Media Type - Invalid file format',
    schema: {
      example: {
        success: false,
        message: 'Invalid file format. Only images are allowed',
        code: 'INVALID_FILE_TYPE'
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        message: 'Creation failed',
        code: 'ERROR'
      }
    }
  })
  async createOwn(
    @Body() dto: CreateHouseListingDto,
    @Req() req: JwtRequest,
    @UploadedFiles() files: Array<Express.Multer.File>, 
  ): Promise<BaseResponseDto<HouseListingCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const storagePath = `houses/${req.user.accountId}`;
    
    this.logger.log(`🏠 Creating new house listing for user ${requesterUuid}`);

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
      };

      const response = await this.executeHousingCreation(sanitizedDto, requesterUuid, false);

      if (!response.success) {
        this.logger.warn(`Housing creation failed: ${response.message}. Cleaning up uploaded images...`);
        await this.housingService.deleteFromStorage(imageUrls, 'pivota-public');
        return response;
      }

      this.logger.log(`✅ House listing created successfully with ID: ${response.data?.id}`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Critical error during housing creation. Rolling back uploaded images.`);
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
      
      • Uses accountId from JWT for team-wide visibility
      • All team members can view organization listings
      • Supports filtering by listing status
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
      this.logger.error(`❌ Security Alert: User ${req.user.userUuid} attempted to fetch listings without an accountId`);
      throw BaseResponseDto.fail('Account identification missing from session.', 'UNAUTHORIZED');
    }

    this.logger.log(`🏠 Fetching listings for Account: ${ownerId}. Filter Status: ${query.status ?? 'ALL'}`);
    
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
// 👤 USER - Schedule Viewing (for themselves)
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
    
    **🤖 AI Analytics & Tracking**
    
    This endpoint captures **high-intent user signals** that are critical for training recommendation models:
    
    **📊 Event Type: SCHEDULE_VIEWING**
    This is a **strong positive signal** in the AI model - users who schedule viewings are highly likely to convert.
    
    **📈 Data Collected for AI Training:**
    
    | Category | Fields | AI Use Case |
    |----------|--------|-------------|
    | **User Intent** | User ID, Session ID, Role | Conversion prediction |
    | **Listing Context** | Price, Bedrooms, Location, Type | Content-based filtering |
    | **Temporal Data** | Viewing Date/Time | Timing optimization |
    | **Session Context** | Platform, Referrer | Channel analysis |
    | **User Notes** | Special requests | Preference signals |
    
    **🎯 AI Training Applications:**
    
    • **Conversion Prediction** - Identify users likely to rent/buy
    • **Recommendation Weighting** - Boost similar properties in results
    • **Price Sensitivity** - Analyze price vs. viewing patterns
    • **Location Affinity** - Build neighborhood preference profiles
    • **Timing Optimization** - Learn best times to show properties
    
    **Process Flow:**
    1. **Validation Checks**
       - House exists and is AVAILABLE
       - User cannot view their own property (prevents self-booking)
       - Viewing date is in the future
       - No conflicting booking within ±30 minutes
    
    2. **Database Transaction**
       - Creates viewing record with status SCHEDULED
       - Sets viewerId = callerId (self-booking)
       - Atomic operation with rollback on failure
       - Retry logic (3x) for transient database errors
    
    3. **AI Tracking (Kafka)**
       - Emits 'housing.ai.tracking' event with SCHEDULE_VIEWING type
       - Includes all context and listing data
       - Fire-and-forget, doesn't block response
       - Updates user preference profiles in SmartMatchy
    
    4. **Notifications (RabbitMQ)**
       - Domain event: 'viewing.scheduled' (internal)
       - Email to viewer: 'VIEWING_SCHEDULED' template with property image
       - Email to property owner: 'VIEWING_REQUESTED' template (if owner email exists)
    
    5. **Analytics (Kafka)**
       - Event: 'analytics.event' with type 'viewing_scheduled'
       - Tracks user role, booking source, timestamps
    
    **Context Parameters (for enhanced tracking):**
    
    | Header | Description | Purpose |
    |--------|-------------|---------|
    | **x-platform** | Client platform (web/mobile/api) | Device segmentation |
    | **x-session-id** | Session identifier | Journey tracking |
    | **referer** | Source URL | Traffic analysis |
    
    **Error Handling:**
    • 403 Forbidden - Cannot view your own property
    • 409 Conflict - Time slot already booked
    • 400 Bad Request - Past dates or invalid input
    • 404 Not Found - House doesn't exist
    • 409 Conflict - House not AVAILABLE
    
    **Note:** This automatically sets you as the viewer (targetViewerId not needed)
  `
})
@ApiParam({ 
  name: 'id', 
  type: String,
  description: 'CUID of the property',
  example: 'cmlqzy0zt000mdl7nx18c66bu',
  required: true
})
@ApiHeader({
  name: 'x-platform',
  description: 'Platform (web, mobile, api) - used for device segmentation in analytics',
  required: false,
  enum: ['web', 'mobile', 'api']
})
@ApiHeader({
  name: 'x-session-id',
  description: 'Session identifier for tracking user journey across requests',
  required: false,
  example: 'sess_abc123'
})
@ApiHeader({
  name: 'referer',
  description: 'Source URL where the request originated - for traffic source analysis',
  required: false
})
@ApiBody({ 
  type: ScheduleViewingDto,
  examples: {
    'Schedule for myself': {
      value: {
        viewingDate: '2026-03-15T14:00:00Z',
        notes: 'I would like to see the property after work'
      }
    },
    'Schedule with specific time': {
      value: {
        viewingDate: '2026-03-16T10:30:00Z',
        notes: 'Please ensure parking is available'
      }
    }
  }
})
@ApiResponse({ 
  status: 201, 
  description: 'Viewing scheduled successfully. Event tracked for AI training.',
  type: HouseViewingResponseDto,
  headers: {
    'X-Event-ID': {
      description: 'Unique identifier for the tracking event',
      schema: { type: 'string', example: 'scheduled_view_abc123' }
    }
  },
  schema: {
    example: {
      success: true,
      message: 'Viewing scheduled successfully',
      code: 'CREATED',
      data: {
        id: 'view_789xyz',
        houseId: 'cmlqzy0zt000mdl7nx18c66bu',
        viewerId: 'user_123abc',
        viewingDate: '2026-03-15T14:00:00Z',
        status: 'SCHEDULED',
        notes: 'I would like to see the property after work',
        bookedById: 'user_123abc',
        createdAt: '2026-03-04T10:30:00Z',
        updatedAt: '2026-03-04T10:30:00Z'
      },
      tracking: {
        eventId: 'scheduled_view_abc123',
        eventType: 'SCHEDULE_VIEWING',
        timestamp: '2026-03-04T10:30:00Z',
        confidence: 'HIGH' // Strong positive signal for AI
      }
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Validation failed - Past date or invalid input',
  schema: {
    example: {
      success: false,
      message: 'Viewing date must be in the future',
      code: 'INVALID_DATE'
    }
  }
})
@ApiResponse({ 
  status: 403, 
  description: 'Forbidden - Cannot view your own property',
  schema: {
    example: {
      success: false,
      message: 'You cannot schedule a viewing for your own property',
      code: 'FORBIDDEN'
    }
  }
})
@ApiResponse({ 
  status: 404, 
  description: 'House not found',
  schema: {
    example: {
      success: false,
      message: 'House not found',
      code: 'NOT_FOUND'
    }
  }
})
@ApiResponse({ 
  status: 409, 
  description: 'Conflict - House not available or time slot booked',
  schema: {
    examples: {
      'Not Available': {
        value: {
          success: false,
          message: 'House is not available for viewing (current status: RENTED)',
          code: 'CONFLICT'
        }
      },
      'Double Booking': {
        value: {
          success: false,
          message: 'This time slot is already booked. Please choose another time.',
          code: 'CONFLICT'
        }
      }
    }
  }
})
async scheduleViewing(
  @Param('id', ParseCuidPipe) listingId: string,
  @Body() body: ScheduleViewingDto,
  @Req() req: JwtRequest,
  @ClientInfo() clientInfo: AuthClientInfoDto, // Add this
  @Headers('x-platform') platform?: string,
  @Headers('x-session-id') sessionId?: string,
  @Headers('referer') referer?: string,
): Promise<BaseResponseDto<HouseViewingResponseDto>> {
  this.logger.log(`📅 User ${req.user.userUuid} scheduling viewing for listing ${listingId}`);
  
  // Log device info for debugging
  this.logger.debug(`📱 Scheduling from Device: ${clientInfo.device} (${clientInfo.deviceType})`);

  // Build context object for tracking with full client info
  const context = new ListingViewContextDto();
  context.userId = req.user.userUuid;
  context.sessionId = sessionId || this.generateAnonymousId(clientInfo);
  context.platform = (platform?.toUpperCase() as 'WEB' | 'MOBILE' | 'API' | 'CLI') || 
                     this.determinePlatform(clientInfo);
  context.referrer = referer || 'DIRECT';
  context.client = clientInfo; // Now using AuthClientInfoDto directly

  const grpcDto: ScheduleViewingGrpcRequestDto = {
    ...body,
    houseId: listingId,
    callerId: req.user.userUuid,
    userRole: req.user.role,
    callerEmail: req.user.email,
    callerName: req.user.userName,
    context: context
  };
  
  const resp = await this.housingService.scheduleViewing(grpcDto);
  
  if (!resp.success) {
    this.logger.warn(`Viewing scheduling failed: ${resp.message}`);
    throw resp;
  }

  return resp;
}

// ===========================================================
// 🔐 ADMIN - Schedule Viewing for Any User
// ===========================================================
@Post('admin/listings/:id/viewing')
@Permissions('houses.create.any')
@ApiTags('Housing - Admin')
@ApiOperation({ 
  summary: 'Schedule a viewing on behalf of any user (Admin only)',
  description: `
    **Admin-only endpoint**: Schedules a viewing appointment for any user with bypass capabilities.
    
    **Microservice:** Listings Service
    **Authentication:** Required (JWT cookie)
    **Permission:** houses.create.any
    
    **Admin Bypass Capabilities:**
    • Can book for any user (targetViewerId required)
    • Can book non-AVAILABLE houses (logs warning but proceeds)
    • Can book past dates (logs warning but proceeds)
    • No double-booking checks
    • No availability validation
    
    **Validation & Business Rules:**
    • Validates viewer exists via Profile Service
    • Automatically fetches viewer's name and email from Profile Service
    • Prevents booking for property owners on their own listings
    • Admin name is used in notes instead of ID for better UX
    
    **Process Flow:**
    1. **Minimal Validation**
       - Only checks if house exists
       - Validates viewer exists in Profile Service
       - Prevents booking for property owner (creator/account holder)
       - Logs warnings for non-standard bookings
    
    2. **Profile Service Integration**
       - Fetches viewer's email and name using targetViewerId
       - Ensures data consistency and reduces frontend payload
    
    3. **Database Transaction**
       - Creates viewing with admin-prefixed notes using admin name
       - viewerId = targetViewerId (required)
       - bookedById = callerId (admin)
    
    4. **Admin Audit Trail**
       - Creates entry in AdminAuditLog table
       - Stores metadata (IP, user agent, timestamp, admin ID)
       - Tracks all admin actions for compliance
    
    5. **Notifications (RabbitMQ) - Admin Templates**
       - Domain event: 'viewing.scheduled' with admin metadata
       - Email to viewer: 'VIEWING_SCHEDULED_ADMIN' template with property image
       - Email to property owner: 'VIEWING_REQUESTED_ADMIN' template (admin flag)
    
    6. **Analytics (Kafka)**
       - Event: 'analytics.event' with isAdminBooking=true
       - Enables tracking of admin-assisted bookings
    
    **Use Cases:**
    • Customer support booking for clients
    • Agency staff scheduling on behalf of tenants
    • Emergency/off-hours bookings
    • System migrations or data fixes
    
    **Note:** All admin actions are audited for compliance and transparency.
    Viewer details are automatically fetched from Profile Service.
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
  type: AdminScheduleViewingDto,
  examples: {
    'Admin booking for client': {
      value: {
        viewingDate: '2026-03-15T14:00:00Z',
        notes: 'Client prefers afternoon viewings - please ensure parking',
        targetViewerId: 'user_789abc',
      }
    },
    'Emergency booking (past date)': {
      value: {
        viewingDate: '2026-03-01T09:00:00Z',
        notes: 'Emergency booking - client already viewed, need record',
        targetViewerId: 'user_789abc',
      }
    }
  }
})
@ApiResponse({ 
  status: 201, 
  description: 'Admin viewing scheduled successfully. Audit log created and notifications sent.',
  type: HouseViewingResponseDto,
  schema: {
    example: {
      success: true,
      message: 'Admin viewing scheduled successfully',
      code: 'CREATED',
      data: {
        id: 'view_789xyz',
        houseId: 'cmlqzy0zt000mdl7nx18c66bu',
        viewerId: 'user_789abc',
        viewingDate: '2026-03-15T14:00:00Z',
        status: 'SCHEDULED',
        notes: '[Admin: John Admin] Client prefers afternoon viewings - please ensure parking',
        bookedById: 'admin_123',
        createdAt: '2026-03-04T10:30:00Z',
        updatedAt: '2026-03-04T10:30:00Z'
      }
    }
  }
})
@ApiResponse({ 
  status: 400, 
  description: 'Validation failed - Invalid input',
  schema: {
    example: {
      success: false,
      message: 'targetViewerId is required',
      code: 'BAD_REQUEST'
    }
  }
})
@ApiResponse({ 
  status: 403, 
  description: 'Forbidden - Cannot book for property owner',
  schema: {
    example: {
      success: false,
      message: 'Cannot schedule a viewing for the property owner on their own listing',
      code: 'FORBIDDEN'
    }
  }
})
@ApiResponse({ 
  status: 404, 
  description: 'House or viewer not found',
  schema: {
    examples: {
      'House not found': {
        value: {
          success: false,
          message: 'House not found',
          code: 'NOT_FOUND'
        }
      },
      'Viewer not found': {
        value: {
          success: false,
          message: 'Viewer with ID user_789abc not found',
          code: 'NOT_FOUND'
        }
      }
    }
  }
})
@ApiResponse({ 
  status: 500, 
  description: 'Internal server error - Profile service unavailable',
  schema: {
    example: {
      success: false,
      message: 'Unable to validate viewer. Please try again.',
      code: 'PROFILE_SERVICE_ERROR'
    }
  }
})
async scheduleAdminViewing(
  @Param('id', ParseCuidPipe) listingId: string,
  @Body() body: AdminScheduleViewingDto,
  @Req() req: JwtRequest,
  @ClientInfo() clientInfo: AuthClientInfoDto,
): Promise<BaseResponseDto<HouseViewingResponseDto>> {
  this.logger.log(`👑 ADMIN ${req.user.userUuid} scheduling viewing for user ${body.targetViewerId} on listing ${listingId}`);

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

  this.logger.log(`📝 Admin audit: ${req.user.userUuid} scheduled viewing for ${body.targetViewerId}`);
  return resp;
}

  // ===========================================================
  // 🔐 HOUSING - ADMIN OPERATIONS
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
      **Admin-only endpoint**: Creates listings on behalf of any account.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.any
      
      **Admin Privileges:**
      • Can specify any account ID via URL parameter
      • Can override creator ID (optional)
      • Bypasses normal ownership validation
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
              items: { 
                type: 'string', 
                format: 'binary',
                description: 'Image file (JPEG, PNG, GIF)'
              },
              description: 'Property images (max 10 files, 5MB each)',
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

    this.logger.log(`👑 ADMIN ${req.user.userUuid} creating listing for account ${accountId}`);

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

      this.logger.log(`✅ Admin created listing ${response.data?.id} for account ${accountId}`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Critical error in Admin Create. Rolling back uploaded images.`);
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
      **Admin-only endpoint**: Updates any house listing in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** housing.update.any
      
      **Admin Capabilities:**
      • Modify listing details for any account
      • Change ownership (accountId, creatorId)
      • Update listing status
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
    type: UpdateAdminHouseListingRequestDto,
    examples: {
      'Update Price': { value: { price: 55000 } },
      'Transfer Ownership': { value: { accountId: 'acc_789xyz' } }
    }
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
    this.logger.log(`👑 ADMIN ${req.user.userUuid} updating listing ${id}`);

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
      **Admin-only endpoint**: View all house listings with filters.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.read
      
      **Admin Capabilities:**
      • View listings from any account or creator
      • Filter by status, account ID, or creator ID
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
      this.logger.warn(`🚫 Unauthorized admin access attempt by GeneralUser ${req.user.userUuid}`);
      throw BaseResponseDto.fail('Unauthorized access to admin listings.', 'FORBIDDEN');
    }
    
    this.logger.log(`👮 Admin ${req.user.userUuid} searching system listings`);
    
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
  return 'WEB'; // Default
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