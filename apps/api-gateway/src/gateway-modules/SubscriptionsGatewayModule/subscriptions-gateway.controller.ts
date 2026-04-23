import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import {
  AccessDataDto,
  BaseResponseDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
} from '@pivota-api/dtos';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { SetModule } from '../../decorators/set-module.decorator';
import { Public } from '../../decorators/public.decorator';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions-gateway')
@SetModule(ModuleSlug.DASHBOARD)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsGatewayController {
  private readonly logger = new Logger(SubscriptionsGatewayController.name);

  constructor(private readonly subscriptionsService: SubscriptionsGatewayService) {}

  // ===========================================================
  // 💳 SUBSCRIPTIONS - MANAGEMENT
  // ===========================================================

  /**
   * Assign a subscription plan to a user
   * 
   * Manually assigns a subscription plan to a user account.
   * This is an admin-only operation for manual plan assignments.
   * 
   * @param dto - Subscription details including plan ID and subscriber UUID
   * @param req - JWT request containing user information
   * @returns Created subscription details
   */
  @Post('/subscription')
  @Version('1')
  @Permissions(P.SUBSCRIPTION_MANAGE)
  @ApiTags('Subscriptions - Management')
  @ApiOperation({ 
    summary: '💳 Assign a subscription plan to a user',
    description: `
      Manually assigns a subscription plan to a user account.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission Required:** \`${P.SUBSCRIPTION_MANAGE}\`
      - **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      ---
      ## 📦 What are Subscriptions?
      Subscriptions link users to plans, granting them access to features
      and modules based on their plan's configuration.
      
      ---
      ## 📋 Subscription Types
      | Type | Description |
      |------|-------------|
      | **PLAN** | Standard plan subscription (monthly/yearly) |
      | **LISTING** | Individual listing purchase |
      | **MODULE** | Module-based subscription |
      
      ---
      ## 🔄 Assignment Process
      1. Validates plan exists and is active
      2. Checks if user already has active subscription
      3. Creates new subscription record
      4. Sets expiration date based on billing cycle
      5. Updates user's access permissions
      
      ---
      ## 🎯 Use Cases
      - Manual plan upgrades for customers
      - Promotional plan assignments
      - Trial extensions
      - Compensatory credits
      - Internal testing
      
      ---
      ## 📅 Billing Cycles
      | Cycle | Duration |
      |-------|----------|
      | **monthly** | 30-day subscription |
      | **yearly** | 365-day subscription |
      | **lifetime** | No expiration |
      | **trial** | Limited-time free access |
      
      ---
      ## ⚠️ Important Notes
      - This bypasses normal payment flow
      - Use for administrative purposes only
      - All assignments are logged for audit
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: '✅ Subscription assigned successfully',
    type: SubscriptionResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Subscription assigned successfully',
        code: 'CREATED',
        data: {
          id: 'sub_123abc',
          accountUuid: 'usr_123abc',
          planId: 'plan_456def',
          type: 'PLAN',
          status: 'ACTIVE',
          billingCycle: 'monthly',
          totalAmount: 29.99,
          amountPaid: 29.99,
          currency: 'USD',
          startedAt: '2026-03-05T10:30:00.000Z',
          expiresAt: '2026-04-04T10:30:00.000Z',
          createdAt: '2026-03-05T10:30:00.000Z'
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
    description: `❌ Forbidden - Requires ${P.SUBSCRIPTION_MANAGE} permission` 
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ Plan or user not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: '❌ User already has active subscription' 
  })
  async assignPlan(
    @Body() dto: SubscribeToPlanDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const userUuid = req.user.sub;
    this.logger.debug(
      `REST assignPlan request by user=${userUuid}: ${JSON.stringify(dto)}`,
    );

    const response = await this.subscriptionsService.subscribeToPlan(dto);
    return response;
  }

  /**
   * Get subscription by account UUID
   * 
   * Retrieves the current subscription details for a specific account.
   * 
   * @param accountUuid - UUID of the account to fetch subscription for
   * @returns Current subscription details
   */
  @Get('/user/:accountUuid')
  @Version('1')
  @ApiTags('Subscriptions - Management')
  @ApiOperation({ 
    summary: '📋 Get subscription details by account UUID',
    description: `
      Retrieves the current subscription details for a specific account.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission:** No specific permission required (self-access only)
      - **Access Rules:**
        - Users can view their own subscription
        - Platform Admins can view any user's subscription
      
      ---
      ## 📊 Subscription Information
      | Field | Description |
      |-------|-------------|
      | **Plan details** | Name, features, limits |
      | **Status** | ACTIVE, EXPIRED, CANCELLED, PENDING, TRIAL |
      | **Billing** | Cycle, dates, payment history |
      | **Access** | Module access rights |
      
      ---
      ## 📈 Status Types
      | Status | Description |
      |--------|-------------|
      | **ACTIVE** | Subscription is current and valid |
      | **EXPIRED** | Subscription has ended |
      | **CANCELLED** | Subscription was cancelled |
      | **PENDING** | Awaiting payment/activation |
      | **TRIAL** | Trial period active |
      
      ---
      ## 🎯 Use Cases
      - Display current plan on dashboard
      - Check subscription status
      - Plan upgrade/downgrade UI
      - Billing information display
      - Access verification
    `
  })
  @ApiParam({ 
    name: 'accountUuid', 
    type: String, 
    description: 'UUID of the Account to fetch subscription for',
    example: 'usr_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Subscription details retrieved successfully',
    type: SubscriptionResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Subscription retrieved successfully',
        code: 'OK',
        data: {
          id: 'sub_123abc',
          accountUuid: 'usr_123abc',
          planId: 'plan_456def',
          plan: {
            id: 'plan_456def',
            name: 'Professional Plan',
            slug: 'professional',
            features: {
              maxListings: 50,
              maxTeamMembers: 10,
              hasAnalytics: true
            }
          },
          type: 'PLAN',
          status: 'ACTIVE',
          billingCycle: 'monthly',
          totalAmount: 29.99,
          amountPaid: 29.99,
          currency: 'USD',
          startedAt: '2026-03-05T10:30:00.000Z',
          expiresAt: '2026-04-04T10:30:00.000Z',
          createdAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '❌ Unauthorized' 
  })
  @ApiResponse({ 
    status: 403, 
    description: '❌ Forbidden - Cannot view other users\' subscriptions' 
  })
  @ApiResponse({ 
    status: 404, 
    description: '❌ Subscription not found' 
  })
  async getSubscriptionsByUser(
    @Param('accountUuid') accountUuid: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SubscriptionResponseDto>> {
    const requesterAccountId = req.user.accountId;
    const requesterRole = req.user.role;

    // Define admin roles
    const adminRoles = [
      'SuperAdmin', 
      'PlatformSystemAdmin', 
      'PlatformComplianceAdmin', 
      'PlatformAnalyticsAdmin', 
      'PlatformModuleManager'
    ];
    const isAdmin = adminRoles.includes(requesterRole);

    // Check if user is requesting their own subscription or is an admin
    if (accountUuid !== requesterAccountId && !isAdmin) {
      this.logger.warn(`🚫 Unauthorized subscription access attempt by ${requesterAccountId} for account ${accountUuid}`);
      throw new ForbiddenException('You do not have permission to view subscriptions for other accounts.');
    }

    this.logger.debug(`REST getSubscriptionByAccount request: accountUuid=${accountUuid}`);

    const response = await this.subscriptionsService.getSubscriptionsByAccount(accountUuid);
    return response;
  }

  // ===========================================================
  // 🔑 SUBSCRIPTIONS - ACCESS CONTROL
  // ===========================================================

  /**
   * Check module access for the authenticated account
   * 
   * Verifies if the authenticated account has access to a specific module
   * based on their subscription plan.
   * 
   * @param moduleSlug - Slug of the module to check access for
   * @param req - JWT request containing account information
   * @returns Access status with any restrictions
   */
  @Get('/check-access/:moduleSlug')
  @Version('1')
  @ApiTags('Subscriptions - Access')
  @ApiOperation({ 
    summary: '🔑 Check module access for the authenticated account',
    description: `
      Verifies if the authenticated account has access to a specific module
      based on their subscription plan.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT cookie)
      - **Permission:** No specific permission required (self-access only)
      - **Access Rules:** Users can only check their own account's access
      
      ---
      ## 📦 What is Module Access?
      Modules are feature groups like 'listings', 'jobs', 'analytics', etc.
      Subscription plans determine which modules an account can access.
      
      ---
      ## 🔄 Access Determination Process
      1. Find user's active subscription
      2. Get associated plan
      3. Check if plan includes requested module
      4. Apply any module-specific restrictions
      5. Return access status
      
      ---
      ## 📊 Response Includes
      | Field | Description |
      |-------|-------------|
      | **hasAccess** | Boolean indicating if access is granted |
      | **restrictions** | Module-specific limitations (e.g., listing limits) |
      | **plan** | Current plan details |
      | **expiresAt** | When access expires |
      
      ---
      ## 📋 Example Restrictions
      \`\`\`json
      {
        "maxListings": 10,
        "maxImages": 5,
        "featuredAllowed": false,
        "analytics": "basic"
      }
      \`\`\`
      
      ---
      ## 🎯 Use Cases
      - Feature gating in UI
      - API middleware authorization
      - Dashboard access control
      - Feature limit enforcement
      - Upgrade prompts
      
      ---
      ## 📁 Common Modules
      | Module | Description |
      |--------|-------------|
      | **housing** | Housing and real estate listings |
      | **employment** | Job listings and hiring |
      | **social-support** | NGO and community programs |
      | **professional-services** | Contractor services |
      | **analytics** | Platform analytics |
      | **team-management** | Team management features |
    `
  })
  @ApiParam({ 
    name: 'moduleSlug', 
    description: 'The slug of the module to check access for',
    example: 'housing'
  })
  @ApiResponse({ 
    status: 200, 
    description: '✅ Access check completed - Access Granted',
    type: AccessDataDto,
    schema: {
      example: {
        success: true,
        message: 'Access check completed',
        code: 'OK',
        data: {
          isAllowed: true,
          restrictions: {
            maxListings: 50,
            maxImages: 10,
            featuredAllowed: true,
            analytics: 'advanced'
          },
          reason: null
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: '⚠️ Access check completed - Access Denied',
    schema: {
      example: {
        success: true,
        message: 'Access check completed',
        code: 'OK',
        data: {
          isAllowed: false,
          restrictions: {},
          reason: 'MODULE_NOT_IN_PLAN'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: '❌ Unauthorized' 
  })
  async checkAccess(
    @Param('moduleSlug') moduleSlug: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<AccessDataDto>> {
    const targetAccountId = req.user.accountId;

    this.logger.debug(
      `REST checkAccess: Checking access for Self (Account: ${targetAccountId}) for Module: ${moduleSlug}`
    );

    const response = await this.subscriptionsService.checkModuleAccess(targetAccountId, moduleSlug);
    
    // Parse restrictions if they are a string (from database)
    if (response.success && response.data && typeof response.data.restrictions === 'string') {
      try {
        response.data.restrictions = JSON.parse(response.data.restrictions);
      } catch (e) {
        this.logger.error(`Failed to parse restrictions for account ${targetAccountId}`);
        response.data.restrictions = {};
      }
    }

    return response;
  }
}