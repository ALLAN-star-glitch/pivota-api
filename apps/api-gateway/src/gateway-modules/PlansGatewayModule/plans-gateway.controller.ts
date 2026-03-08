import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';

import {
  BaseResponseDto,
  CreatePlanDto,
  UpdatePlanDto,
  PlanResponseDto,
  PlanIdDtoResponse,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { JwtRequest } from '@pivota-api/interfaces';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PlansGatewayService } from './plans-gateway.service';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('Plans') // Main module tag
@ApiBearerAuth()
@Controller('pricing-plans-module')
export class PlansGatewayController {
  private readonly logger = new Logger(PlansGatewayController.name);

  constructor(private readonly plansService: PlansGatewayService) {}

  // ===========================================================
  // 📊 PLANS - ADMIN OPERATIONS
  // ===========================================================

  /**
   * Create a new subscription plan
   * 
   * Creates a new pricing plan that users can subscribe to.
   * 
   * @param dto - Plan creation details (name, slug, price, features, etc.)
   * @param req - JWT request containing user information
   * @returns Created plan details
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @ApiTags('Plans - Admin')
  @ApiOperation({ 
    summary: 'Create a new subscription plan',
    description: `
      Creates a new subscription plan in the system.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemsAdmin
      
      **What are Plans?**
      Plans define subscription tiers with specific features, limits, and pricing.
      They are used to control access to various platform features and modules.
      
      **Plan Components:**
      • **Basic Information** - name, slug, description
      • **Pricing** - amount, currency, billing cycle (monthly/yearly)
      • **Features** - JSON object defining included features
      • **Limits** - Usage limits (e.g., max listings, max users)
      • **Module Access** - Which modules are included
      
      **Features JSON Structure:**
      \`\`\`json
      {
        "maxListings": 10,
        "maxTeamMembers": 5,
        "hasAnalytics": true,
        "hasPrioritySupport": false,
        "customDomain": false
      }
      \`\`\`
      
      **Plan Types:**
      • **Free Forever** - Basic plan with limited features
      • **Premium** - Paid plans with additional features
      • **Enterprise** - Custom plans for large organizations
      
      **Validation Rules:**
      • Slug must be unique across all plans
      • Price must be non-negative
      • Features must be valid JSON
      • TotalListings must be non-negative
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Plan created successfully',
    type: PlanResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Plan created successfully',
        code: 'CREATED',
        data: {
          id: 'plan_123abc',
          name: 'Professional Plan',
          slug: 'professional',
          description: 'Perfect for growing businesses',
          totalListings: 50,
          features: {
            maxListings: 50,
            maxTeamMembers: 10,
            hasAnalytics: true,
            hasPrioritySupport: true,
            customDomain: true
          },
          isPremium: true,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Plan with same slug already exists' })
  async createPlan(
    @Body() dto: CreatePlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const userId = req.user.userUuid;
    dto.userId = userId;

    this.logger.debug(
      `REST createPlan request by user=${userId}: ${JSON.stringify(dto)}`,
    );

    return this.plansService.createPlan(dto);
  }

  /**
   * Update an existing subscription plan
   * 
   * Updates properties of an existing plan.
   * 
   * @param planId - ID of the plan to update
   * @param dto - Fields to update
   * @param req - JWT request
   * @returns Updated plan details
   */
  @Put(':planId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @ApiTags('Plans - Admin')
  @ApiOperation({ 
    summary: 'Update an existing subscription plan',
    description: `
      Updates an existing subscription plan's properties.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemsAdmin
      
      **Updatable Fields:**
      • **name** - Display name of the plan
      • **description** - Detailed description
      • **totalListings** - Maximum number of listings allowed
      • **features** - JSON object with feature flags
      • **isPremium** - Whether this is a premium plan
      
      **Important Notes:**
      • Slug cannot be changed once created
      • Changing features affects all active subscriptions
      • Price changes are handled at subscription level
      • Consider versioning for major changes
      
      **Impact on Existing Subscriptions:**
      • Feature changes apply immediately
      • Limits may affect current users
      • Downgrades may require user confirmation
      
      **Best Practices:**
      • Communicate changes to affected users
      • Provide grace period for limit reductions
      • Consider grandfathering existing subscribers
    `
  })
  @ApiParam({ 
    name: 'planId', 
    type: String, 
    description: 'ID of the plan to update',
    example: 'plan_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan updated successfully',
    type: PlanResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Plan updated successfully',
        code: 'OK',
        data: {
          id: 'plan_123abc',
          name: 'Professional Plan (Updated)',
          slug: 'professional',
          description: 'Enhanced features for growing businesses',
          totalListings: 100,
          features: {
            maxListings: 100,
            maxTeamMembers: 15,
            hasAnalytics: true,
            hasPrioritySupport: true,
            customDomain: true,
            apiAccess: true
          },
          isPremium: true,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T14:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    const userId = req.user.userUuid;

    this.logger.debug(
      `REST updatePlan request by user=${userId} for plan=${planId}: ${JSON.stringify(dto)}`,
    );

    return this.plansService.updatePlan(planId, dto);
  }

  /**
   * Delete a subscription plan
   * 
   * Permanently removes a subscription plan from the system.
   * 
   * @param id - ID of the plan to delete
   * @param req - JWT request
   * @returns Success confirmation
   */
  @Delete('/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @ApiTags('Plans - Admin')
  @ApiOperation({ 
    summary: 'Delete a subscription plan',
    description: `
      Permanently removes a subscription plan from the system.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, SystemsAdmin
      
      **Deletion Rules:**
      • Plan must have no active subscriptions
      • Plan cannot be the default plan
      • System plans cannot be deleted
      • Operation cannot be undone
      
      **What happens to affected users?**
      • Users with this plan must be migrated first
      • Consider archiving instead of deleting
      • Provide migration path to another plan
      
      **Alternatives:**
      • **Archive** - Hide from new signups but keep existing
      • **Deprecate** - Mark as legacy, prevent new subscriptions
      • **Soft delete** - Mark as deleted but retain data
      
      **Recommendation:**
      Instead of deleting, consider setting isActive = false
      to hide from new signups while maintaining existing subscriptions.
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String, 
    description: 'ID of the plan to delete',
    example: 'plan_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Plan deleted successfully',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Plan has active subscriptions and cannot be deleted' })
  async deletePlan(
    @Param('id') id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const userId = req.user.userUuid;

    this.logger.debug(
      `REST deletePlan request by user=${userId}: planId=${id}`,
    );

    return this.plansService.deletePlan(id);
  }

  // ===========================================================
  // 📊 PLANS - PUBLIC OPERATIONS
  // ===========================================================

  /**
   * Get plan by ID
   * 
   * Retrieves detailed information about a specific plan.
   * 
   * @param id - Plan ID
   * @returns Plan details
   */
  @Get('/:id')
  @Version('1')
  @ApiTags('Plans - Public')
  @ApiOperation({ 
    summary: 'Get plan by ID',
    description: `
      Retrieves detailed information about a specific subscription plan.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Not required
      
      **Information returned:**
      • Plan name and description
      • Pricing details
      • Features included
      • Usage limits
      • Module access
      
      **Use Cases:**
      • Display plan details on pricing page
      • Show plan features during signup
      • Compare plans side-by-side
      • Plan upgrade/downgrade UI
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String, 
    description: 'Plan ID to fetch',
    example: 'plan_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan retrieved successfully',
    type: PlanResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Plan retrieved successfully',
        code: 'OK',
        data: {
          id: 'plan_123abc',
          name: 'Professional Plan',
          slug: 'professional',
          description: 'Perfect for growing businesses',
          totalListings: 50,
          features: {
            maxListings: 50,
            maxTeamMembers: 10,
            hasAnalytics: true,
            hasPrioritySupport: true,
            customDomain: true
          },
          isPremium: true,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<PlanResponseDto>> {
    this.logger.debug(`REST getPlanById request: ${id}`);
    return this.plansService.getPlanById(id);
  }

  /**
   * Get all available plans
   * 
   * Retrieves a list of all subscription plans in the system.
   * 
   * @returns List of all plans
   */
  @Get()
  @Version('1')
  @ApiTags('Plans - Public')
  @ApiOperation({ 
    summary: 'Get all available plans',
    description: `
      Retrieves a list of all subscription plans available in the system.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Not required
      
      **What's included:**
      • All active plans (including free and premium)
      • Full plan details for each
      • Sorted by price (ascending)
      
      **Use Cases:**
      • Pricing page display
      • Plan comparison tables
      • Signup/registration flow
      • Subscription management UI
      
      **Filtering:**
      To get only active plans, check the isActive flag.
      To get only premium plans, filter by isPremium flag.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plans retrieved successfully',
    type: [PlanResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Plans retrieved successfully',
        code: 'OK',
        data: [
          {
            id: 'plan_free',
            name: 'Free Forever',
            slug: 'free-forever',
            description: 'Basic features for individuals',
            totalListings: 3,
            features: {
              maxListings: 3,
              maxTeamMembers: 1,
              hasAnalytics: false,
              hasPrioritySupport: false
            },
            isPremium: false
          },
          {
            id: 'plan_basic',
            name: 'Basic Plan',
            slug: 'basic',
            description: 'Essential features for small teams',
            totalListings: 15,
            features: {
              maxListings: 15,
              maxTeamMembers: 3,
              hasAnalytics: true,
              hasPrioritySupport: false
            },
            isPremium: true
          },
          {
            id: 'plan_pro',
            name: 'Professional Plan',
            slug: 'professional',
            description: 'Advanced features for growing businesses',
            totalListings: 50,
            features: {
              maxListings: 50,
              maxTeamMembers: 10,
              hasAnalytics: true,
              hasPrioritySupport: true
            },
            isPremium: true
          }
        ]
      }
    }
  })
  async getAllPlans(): Promise<BaseResponseDto<PlanResponseDto[]>> {
    this.logger.debug(`REST getAllPlans request`);
    return this.plansService.getAllPlans();
  }

  /**
   * Get plan ID by slug
   * 
   * Retrieves a plan's ID using its URL-friendly slug.
   * 
   * @param slug - Plan slug
   * @returns Plan ID
   */
  @Get('/slug/:slug')
  @Version('1')
  @ApiTags('Plans - Public')
  @ApiOperation({ 
    summary: 'Get plan ID by slug',
    description: `
      Retrieves a plan's unique identifier using its URL-friendly slug.
      
      **Microservice:** Plans Service (Admin Service)
      **Authentication:** Not required
      
      **What are slugs?**
      Slugs are human-readable, URL-friendly identifiers.
      Examples: 'free-forever', 'basic', 'professional', 'enterprise'
      
      **Use Cases:**
      • Referencing plans in URLs
      • Plan selection during signup
      • Redirecting to plan details
      • API calls that need plan ID
      
      **Advantages:**
      • Human-readable and memorable
      • SEO-friendly
      • Stable across environments
      • Can be used in client-side code
      
      **Response:**
      Returns the internal UUID of the plan for use in subsequent API calls.
    `
  })
  @ApiParam({ 
    name: 'slug', 
    type: String, 
    description: 'Slug of the plan to fetch',
    example: 'professional'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Plan ID retrieved successfully',
    type: PlanIdDtoResponse,
    schema: {
      example: {
        success: true,
        message: 'Plan ID retrieved successfully',
        code: 'OK',
        data: {
          planId: 'plan_123abc'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanIdBySlug(
    @Param('slug') slug: string
  ): Promise<BaseResponseDto<PlanIdDtoResponse>> {
    this.logger.debug(`REST getPlanIdBySlug request: ${slug}`);
    return this.plansService.getPlanIdBySlug(slug);
  }
}