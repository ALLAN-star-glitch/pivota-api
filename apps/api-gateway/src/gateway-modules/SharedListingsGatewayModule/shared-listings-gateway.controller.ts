import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Logger,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiExtraModels, 
  ApiOperation, 
  ApiQuery,
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';

import { 
  AdminListingFilterDto, 
  BaseResponseDto, 
  ListingRegistryDataDto,
  GetOwnListingsResponseDto,
  GetAdminListingsResponseDto
} from '@pivota-api/dtos';

import { SharedListingsGatewayService } from './shared-listings-gateway.service';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard'; 
import { JwtRequest } from '@pivota-api/interfaces';

// Custom Decorators & Guards
import { Permissions } from '../../decorators/permissions.decorator';
import { Roles } from '../../decorators/roles.decorator'; 
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';

@ApiTags('Registry') // Main module tag
@ApiBearerAuth()
@ApiExtraModels(BaseResponseDto, ListingRegistryDataDto, GetOwnListingsResponseDto, GetAdminListingsResponseDto)
@SetModule('registry') 
@Controller('registry-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class SharedListingsGatewayController {
  private readonly logger = new Logger(SharedListingsGatewayController.name);

  constructor(private readonly gatewayService: SharedListingsGatewayService) {}

  /**
   * Core Execution Logic
   * Private method that handles both own and admin registry lookups
   */
  private async executeRegistryLookup(
    accountId: string | null,
    query?: AdminListingFilterDto
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    try {
      if (query) {
        this.logger.debug(`Processing ADMIN Registry Lookup: ${JSON.stringify(query)}`);
        return await this.gatewayService.getAdminListings(query);
      }

      this.logger.debug(`Processing OWN Registry Lookup for Account ${accountId}`);
      return await this.gatewayService.getOwnListings(accountId as string);
      
    } catch (error) {
      this.logger.error(`🔥 Registry lookup execution failed`, error instanceof Error ? error.stack : error);
      return BaseResponseDto.fail('Unexpected error while aggregating listings', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // 📋 REGISTRY - MY PORTFOLIO
  // ===========================================================

  /**
   * Get all listings belonging to the authenticated account
   * 
   * Retrieves a consolidated view of all listings owned by the authenticated
   * account across all verticals (Housing, Jobs, Services, etc.).
   * 
   * @param req - JWT request containing user account information
   * @returns Aggregated portfolio of all user's listings
   */
  @Get('my-portfolio')
  @Permissions('listings.read')
  @ApiTags('Registry - Portfolio')
  @ApiOperation({ 
    summary: 'Get all listings belonging to the authenticated account',
    description: `
      Retrieves a consolidated portfolio of all listings owned by the authenticated account.
      
      **Microservice:** Listings Service (Registry Module)
      **Authentication:** Required (JWT cookie)
      **Permission:** listings.read
      
      **What is the Registry?**
      The Registry is a cross-vertical listing aggregator that provides a unified view
      of all listings owned by an account, regardless of the listing type or vertical.
      
      **What's included:**
      • **Housing Listings** - Rental and sale properties
      • **Job Postings** - Employment opportunities
      • **Service Offerings** - Contractor services
      • **Social Support Programs** - NGO and community programs
      
      **Data Aggregated:**
      For each listing, the registry provides:
      • Basic listing info (title, description, status)
      • Vertical-specific metadata
      • Creation and update timestamps
      • Performance metrics (views, applications)
      • Images and media
      
      **Use Cases:**
      • **Dashboard View** - Single place to manage all listings
      • **Analytics** - Cross-vertical performance comparison
      • **Bulk Operations** - Manage multiple listings efficiently
      • **Reporting** - Generate portfolio reports
      
      **Access Control:**
      • Strictly enforces ownership using accountId from JWT
      • Users can only see their own listings
      • Team members see organization-wide listings
      
      **Response Structure:**
      The response includes categorized listings by vertical with counts
      and aggregated metadata for quick overview.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Portfolio retrieved successfully',
    type: GetOwnListingsResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Portfolio retrieved successfully',
        code: 'OK',
        data: {
          accountId: 'acc_123abc',
          totalListings: 15,
          listings: {
            housing: [
              {
                id: 'lst_housing_1',
                title: 'Modern 2 Bedroom Apartment',
                vertical: 'HOUSING',
                status: 'ACTIVE',
                createdAt: '2026-03-01T10:30:00Z',
                metrics: {
                  views: 245,
                  inquiries: 12
                }
              }
            ],
            jobs: [
              {
                id: 'lst_job_1',
                title: 'Senior Software Engineer',
                vertical: 'JOBS',
                status: 'ACTIVE',
                createdAt: '2026-03-02T14:20:00Z',
                metrics: {
                  views: 89,
                  applications: 5
                }
              }
            ],
            services: [
              {
                id: 'lst_service_1',
                title: 'Professional Plumbing Services',
                vertical: 'SERVICES',
                status: 'ACTIVE',
                createdAt: '2026-03-03T09:15:00Z',
                metrics: {
                  views: 67,
                  bookings: 3
                }
              }
            ]
          },
          summary: {
            totalViews: 401,
            totalInteractions: 20,
            lastUpdated: '2026-03-05T16:30:00Z'
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getOwnListings(
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterAccountId = req.user.accountId;

    this.logger.log(`👤 User ${requesterUuid} accessing portfolio for account ${requesterAccountId}`);
    
    const response = await this.executeRegistryLookup(requesterAccountId);

    if (!response.success) {
      this.logger.error(`Registry fetch failed for User ${requesterUuid}: ${response.message}`);
      throw response;
    }

    return response;
  }

  // ===========================================================
  // 📋 REGISTRY - ADMIN OPERATIONS
  // ===========================================================

  /**
   * System-wide listing lookup (Admin only)
   * 
   * Provides administrators with a comprehensive view of all listings
   * across the entire platform with powerful filtering capabilities.
   * 
   * @param query - Filter parameters (status, accountId, creatorId)
   * @param req - JWT request containing user role information
   * @returns Filtered list of listings across the system
   */
  @Get('admin/all-listings')
  @Permissions('listings.read')
  @Roles('SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin', 'ComplianceAdmin', 'ModuleManager')
  @ApiTags('Registry - Admin')
  @ApiOperation({ 
    summary: 'Admin: System-wide listing lookup',
    description: `
      Provides administrators with a comprehensive view of all listings
      across the entire platform with powerful filtering capabilities.
      
      **Microservice:** Listings Service (Registry Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** listings.read
      **Roles:** SuperAdmin, SystemAdmin, BusinessSystemAdmin, ComplianceAdmin, ModuleManager
      
      **What is the Admin Registry?**
      The Admin Registry is a powerful tool for platform administrators to:
      • Monitor all listings across the platform
      • Investigate user activity
      • Perform compliance checks
      • Generate platform-wide reports
      • Moderate content
      
      **Filtering Capabilities:**
      • **status** - Filter by listing status (ACTIVE, INACTIVE, ARCHIVED)
      • **accountId** - Filter by owning account
      • **creatorId** - Filter by creator user
      • Additional filters can be extended as needed
      
      **Permission Model:**
      • **Self-view** - Users can only see their own listings (handled by my-portfolio)
      • **Cross-account view** - Requires specific admin roles
      • **Global view** - Available to SuperAdmin and SystemAdmin
      
      **Security Checks:**
      The endpoint performs automatic permission validation:
      1. If viewing own account/creator - allowed for all authenticated users
      2. If viewing another account - requires admin role
      3. If no filters - global view requires admin role
      
      **Use Cases:**
      • **Compliance Monitoring** - Review listings for policy violations
      • **Customer Support** - Access user listings to assist with issues
      • **Platform Analytics** - Generate reports on listing activity
      • **Audit Trail** - Investigate historical listing data
      • **Content Moderation** - Flag and review suspicious content
      
      **Response includes:**
      • Full listing details across all verticals
      • Owner information (account and creator)
      • Performance metrics
      • Moderation history
      • Audit trail information
    `
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter listings by their current status',
    enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING_REVIEW'],
    example: 'ACTIVE'
  })
  @ApiQuery({ 
    name: 'accountId', 
    required: false,
    description: 'Filter listings by owning account ID (UUID)',
    example: 'acc_123abc'
  })
  @ApiQuery({ 
    name: 'creatorId', 
    required: false,
    description: 'Filter listings by creator/user ID (UUID)',
    example: 'usr_123abc'
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: false,
    description: 'Filter by vertical',
    enum: ['HOUSING', 'JOBS', 'SERVICES', 'SOCIAL_SUPPORT'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'fromDate', 
    required: false,
    description: 'Filter listings created after this date',
    example: '2026-01-01T00:00:00Z'
  })
  @ApiQuery({ 
    name: 'toDate', 
    required: false,
    description: 'Filter listings created before this date',
    example: '2026-12-31T23:59:59Z'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false,
    description: 'Maximum number of results to return',
    example: 50,
    type: Number
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false,
    description: 'Pagination offset',
    example: 0,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin listings retrieved successfully',
    type: GetAdminListingsResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Admin listings retrieved successfully',
        code: 'OK',
        data: {
          totalCount: 1250,
          filteredCount: 45,
          listings: [
            {
              id: 'lst_123abc',
              title: 'Modern 2 Bedroom Apartment',
              vertical: 'HOUSING',
              status: 'ACTIVE',
              accountId: 'acc_456def',
              accountName: 'Pivota Properties Ltd',
              creatorId: 'usr_789ghi',
              creatorName: 'John Doe',
              createdAt: '2026-03-01T10:30:00Z',
              metrics: {
                views: 245,
                inquiries: 12
              }
            },
            {
              id: 'lst_456def',
              title: 'Senior Developer Position',
              vertical: 'JOBS',
              status: 'ACTIVE',
              accountId: 'acc_789ghi',
              accountName: 'Tech Solutions Inc',
              creatorId: 'usr_123abc',
              creatorName: 'Jane Smith',
              createdAt: '2026-03-02T14:20:00Z',
              metrics: {
                views: 89,
                applications: 5
              }
            }
          ],
          filters: {
            status: 'ACTIVE',
            accountId: null,
            creatorId: null
          },
          pagination: {
            limit: 50,
            offset: 0,
            total: 1250,
            hasMore: true
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAdminListings(
    @Query() query: AdminListingFilterDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ListingRegistryDataDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterAccountId = req.user.accountId;
    const requesterRole = req.user.role;

    // Resolve Target Identity from Query (if provided)
    const targetAccountId = query.accountId || null;
    const targetCreatorId = query.creatorId || null;

    // Permission Check Logic
    // If the request targets a specific account/user that is NOT the requester
    if (
      (targetAccountId && targetAccountId !== requesterAccountId) || 
      (targetCreatorId && targetCreatorId !== requesterUuid)
    ) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager', 'BusinessSystemAdmin', 'ComplianceAdmin'].includes(requesterRole);

      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized Registry access attempt by ${requesterUuid} for Account ${targetAccountId}`);
        throw new ForbiddenException('You do not have permission to view listings for other accounts or users.');
      }
      
      this.logger.log(`👮 Admin ${requesterRole} (${requesterUuid}) inspecting registry for: Account ${targetAccountId ?? 'Global'}`);
    }

    const response = await this.executeRegistryLookup(null, query);

    if (!response.success) {
      if (response.code === 'FORBIDDEN') throw new ForbiddenException(response.message);
      throw response;
    }

    return response;
  }
}