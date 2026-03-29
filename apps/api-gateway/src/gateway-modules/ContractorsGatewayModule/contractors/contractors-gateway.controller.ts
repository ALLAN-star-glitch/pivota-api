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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceGrpcOfferingDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { ContractorsGatewayService } from '../services/contractors-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

@ApiTags('Contractors')
@ApiBearerAuth()
@Controller('contractors-module')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(private readonly contractorsService: ContractorsGatewayService) {}
 
  // ===========================================================
  // 🛠️ CONTRACTORS - SERVICE MANAGEMENT
  // ===========================================================

  /**
   * Create a service offering (contractor listing)
   * 
   * Allows verified providers to create service offerings that appear in discovery searches.
   * 
   * @param dto - Service offering details including title, description, pricing, etc.
   * @param req - JWT request containing user information
   * @returns Created service offering
   */
  @Post('listing')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN)
  @Version('1')
  @ApiTags('Contractors - Services')
  @ApiOperation({ 
    summary: '🛠️ Create a service offering',
    description: `
      Creates a new service offering (contractor listing) in the system.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission Required:** \`${P.PROFESSIONAL_SERVICES_CREATE_OWN}\`
      - **Accessible by:** 
        - Individual users (personal account)
        - Business Admins (for their business account)
        - Business Content Managers (for their business account)
        - Business Members (for themselves)
      
      ---
      ## 📦 What are Service Offerings?
      Service offerings are proactive listings created by contractors/providers
      to advertise their services. Unlike job posts (which are requests from employers),
      service offerings represent services that providers are offering to the market.
      
      ---
      ## 👥 Provider Types
      | Type | Description |
      |------|-------------|
      | **Individual Providers** | Freelancers, sole proprietors |
      | **Organization Providers** | Companies, agencies |
      
      ---
      ## 🔄 Identity Population Rules
      | User Type | creatorId | accountId |
      |-----------|-----------|-----------|
      | **General User** | Automatically from JWT | Automatically from JWT |
      | **Admin** | Can override or use own | Can override or use own |
      
      ---
      ## 📋 Required Information
      | Field | Description |
      |-------|-------------|
      | **title** | Name of the service |
      | **description** | Detailed service description |
      | **categoryId** | Primary service category |
      | **basePrice** | Starting price for the service |
      | **priceUnit** | Pricing model (FIXED, PER_HOUR, PER_SESSION) |
      | **locationCity** | City where service is offered |
      | **verticals** | Pillars this service belongs to |
      
      ---
      ## 📝 Optional Information
      - **subCategoryId** - More specific categorization
      - **yearsExperience** - Provider's experience level
      - **availability** - Availability schedule (JSON string)
      - **images** - Service portfolio images
      
      ---
      ## ✅ After Creation
      - Service becomes discoverable in search results
      - Can receive bookings from clients
      - Provider can manage through dashboard
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: '✅ Service offering created successfully',
    type: ServiceOfferingResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Service offering created successfully',
        code: 'CREATED',
        data: {
          id: 'srv_123abc',
          externalId: 'ext_456def',
          creatorId: 'usr_789ghi',
          accountId: 'acc_123abc',
          creatorName: 'John Doe',
          accountName: 'John Doe Plumbing',
          title: 'Professional Plumbing Services',
          description: 'Expert plumbing services for residential and commercial properties...',
          verticals: ['JOBS', 'HOUSING'],
          categoryId: 'cat_123abc',
          subCategoryId: 'cat_456def',
          basePrice: 5000,
          priceUnit: 'PER_HOUR',
          currency: 'KES',
          locationCity: 'Nairobi',
          locationNeighborhood: 'Kilimani',
          yearsExperience: 10,
          availability: '{"Mon-Fri": "8am-5pm", "Sat": "9am-12pm"}',
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Validation error - Invalid input data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: '❌ Unauthorized - Missing or invalid JWT token' 
  })
  @ApiResponse({ 
    status: 403, 
    description: `❌ Forbidden - Requires ${P.PROFESSIONAL_SERVICES_CREATE_OWN} permission` 
  })
  @ApiResponse({ 
    status: 409, 
    description: '❌ Conflict - Service with same details already exists' 
  })
  @ApiResponse({ 
    status: 500, 
    description: '❌ Internal server error' 
  })
  async createServiceOffering(
    @Body() dto: CreateServiceGrpcOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    
    const { userUuid, accountId, role } = req.user;
    
    // Define admin roles (Platform roles)
    const adminRoles = [
      'SuperAdmin', 
      'PlatformSystemAdmin', 
      'PlatformComplianceAdmin', 
      'PlatformAnalyticsAdmin', 
      'PlatformModuleManager'
    ];
    const isAdmin = adminRoles.includes(role);

    /**
     * IDENTITY POPULATION
     * - Admin: Can provide a custom creator/account ID or default to their own.
     * - General User: Forced to use their own IDs from the JWT.
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
  // 🔍 CONTRACTORS - PUBLIC DISCOVERY
  // ===========================================================

  /**
   * Discover service offerings by vertical
   * 
   * Public endpoint to search and discover service offerings across different pillars.
   * 
   * @param dto - Search parameters including vertical, city, and filters
   * @returns List of matching service offerings
   */
  @Public()
  @Get('discovery')
  @Version('1')
  @ApiTags('Contractors - Discovery')
  @ApiOperation({ 
    summary: '🔍 Discover service offerings by vertical',
    description: `
      Public endpoint to search and discover service offerings across different life pillars.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Not required
      - **Permission:** Public endpoint
      
      ---
      ## 📦 What is Discovery?
      Discovery allows users to find service providers offering specific types of services
      in their area. Unlike job posts (employer-driven), discovery is provider-driven.
      
      ---
      ## 🔎 Search Capabilities
      | Parameter | Description |
      |-----------|-------------|
      | **vertical** | Filter by life pillar (JOBS, HOUSING, SOCIAL_SUPPORT, SERVICES) |
      | **city** | Filter by city |
      | **categoryId** | Filter by service category |
      | **minPrice** | Minimum price filter |
      | **maxPrice** | Maximum price filter |
      | **minRating** | Filter by provider rating (1-5) |
      | **limit** | Maximum number of results |
      | **offset** | Pagination offset |
      
      ---
      ## 📊 Sorting
      Results are sorted by relevance (combination of rating, experience, and recency).
      Can be extended to sort by price, rating, or distance.
      
      ---
      ## 📈 Response Includes
      - Provider details (name, verification status, rating)
      - Service details (title, description, price)
      - Location information
      - Availability
      
      ---
      ## 🎯 Use Cases
      - Finding plumbers in Nairobi
      - Discovering tutors in a specific area
      - Finding verified electricians
      - Comparing service prices
      
      ---
      ## 📝 Example Request
      \`\`\`
      GET /contractors-module/discovery?vertical=HOUSING&city=Nairobi&minPrice=1000&maxPrice=10000
      \`\`\`
    `
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: true,
    description: 'Life pillar to search within',
    enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'city', 
    required: false,
    description: 'Filter by city',
    example: 'Nairobi'
  })
  @ApiQuery({ 
    name: 'categoryId', 
    required: false,
    description: 'Filter by service category ID',
    example: 'cat_123abc'
  })
  @ApiQuery({ 
    name: 'subCategoryId', 
    required: false,
    description: 'Filter by sub-category ID',
    example: 'subcat_456def'
  })
  @ApiQuery({ 
    name: 'minPrice', 
    required: false,
    description: 'Minimum price filter (in KES)',
    example: 1000,
    type: Number
  })
  @ApiQuery({ 
    name: 'maxPrice', 
    required: false,
    description: 'Maximum price filter (in KES)',
    example: 10000,
    type: Number
  })
  @ApiQuery({ 
    name: 'minRating', 
    required: false,
    description: 'Minimum provider rating (1-5)',
    example: 4,
    type: Number
  })
  @ApiQuery({ 
    name: 'isVerified', 
    required: false,
    description: 'Filter by verification status',
    example: true,
    type: Boolean
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false,
    description: 'Maximum number of results (default: 20, max: 100)',
    example: 20,
    type: Number
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false,
    description: 'Pagination offset for paginated results',
    example: 0,
    type: Number
  })
  @ApiOkResponse({ 
    description: '✅ Service offerings retrieved successfully',
    type: [ServiceOfferingResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Service offerings retrieved successfully',
        code: 'OK',
        data: [
          {
            id: 'srv_123abc',
            title: 'Professional Plumbing Services',
            description: 'Expert plumbing services for residential properties...',
            accountName: 'John Doe Plumbing',
            basePrice: 5000,
            priceUnit: 'PER_HOUR',
            currency: 'KES',
            locationCity: 'Nairobi',
            locationNeighborhood: 'Kilimani',
            yearsExperience: 10,
            averageRating: 4.8,
            totalReviews: 45,
            isVerified: true,
            availability: '{"Mon-Fri": "8am-5pm"}',
            createdAt: '2026-03-01T10:30:00.000Z'
          },
          {
            id: 'srv_456def',
            title: 'Electrical Services',
            description: 'Licensed electrician for all electrical needs...',
            accountName: 'Safe Electrics Ltd',
            basePrice: 3500,
            priceUnit: 'PER_HOUR',
            currency: 'KES',
            locationCity: 'Nairobi',
            locationNeighborhood: 'Westlands',
            yearsExperience: 8,
            averageRating: 4.9,
            totalReviews: 67,
            isVerified: true,
            availability: '{"Mon-Fri": "8am-6pm", "Sat": "9am-1pm"}',
            createdAt: '2026-02-28T14:20:00.000Z'
          }
        ],
        pagination: {
          total: 156,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200,
    description: '⚠️ No service offerings found matching criteria',
    schema: {
      example: {
        success: true,
        message: 'No service offerings match your criteria',
        code: 'SUCCESS_EMPTY',
        data: [],
        pagination: {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: '❌ Invalid search parameters' 
  })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}`);
    
    return this.contractorsService.getOfferingsByVertical(dto);
  }
}