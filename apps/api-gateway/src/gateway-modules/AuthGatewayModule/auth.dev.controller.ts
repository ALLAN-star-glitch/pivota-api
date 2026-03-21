import {
  Controller,
  Get,
  Res,
  ForbiddenException,
  Logger,
  Version,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { 
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { BaseResponseDto, TokenPairDto } from '@pivota-api/dtos';

@ApiTags('Auth - Development Tools') // Development tools tag
@ApiExtraModels(BaseResponseDto, TokenPairDto)
@Controller('auth-dev')
export class AuthDevController {
  private readonly logger = new Logger(AuthDevController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Shared validation logic to protect production environments
   */
  private validateDevMode() {
    if (process.env.NODE_ENV === 'production') {
      this.logger.error('CRITICAL: Dev bypass blocked in production!');
      throw new ForbiddenException('Bypass disabled in production');
    }
  }

  /**
   * Reusable Swagger Response definition to keep code clean
   */
  private static readonly TokenResponseSchema = {
    status: 200,
    description: 'Tokens generated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenPairDto) },
          },
        },
      ],
    },
  };

  // =========================================================
  // 🛠️ DEV TOOLS - ADMIN ROLES
  // =========================================================

  /**
   * Generate Super Admin token (Development Only)
   * 
   * Creates a JWT token for Super Admin role in development environment.
   * 
   * **IMPORTANT:** This endpoint is ONLY available in development!
   * In production, it returns 403 Forbidden.
   * 
   * @param res - Express response object for setting cookies
   * @returns Token pair with access and refresh tokens
   */
  @Get('token/super-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as SuperAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Super Admin role in development environment.
      
      **Security Warning:**
      This endpoint is strictly for local development and testing.
      It is completely disabled in production environments.
      
      **Super Admin Capabilities:**
      • Full system access
      • User management
      • Role and permission management
      • System configuration
      • Audit log access
      • All administrative functions
      
      **Development UUIDs:**
      • User UUID: 69a601b6-fdb9-4333-9c01-8895a8b3af45
      • Email: allanmathenge67@gmail.com
      • Account ID: 462908a2-0f23-472a-b2d7-54966d004256
      
      **Token Generation:**
      • Creates complete JWT with all claims
      • Sets HTTP-only cookies automatically
      • Includes user metadata and permissions
      • Session is created and tracked
      
      **Use Cases:**
      • Testing admin-only endpoints
      • Development and debugging
      • Local integration testing
      • UI development with admin privileges
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  @ApiResponse({ status: 403, description: 'Bypass disabled in production' })
  async loginSuperAdmin(@Res({ passthrough: true }) res: Response): Promise<BaseResponseDto<TokenPairDto>> {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'eeafe623-65e7-4fb8-9fd4-b9c17991afd9',
      'allanmathenge67@gmail.com',
      'SuperAdmin',
      'e25328b9-1b68-47c4-bb9f-86188f530e88', 
      res,
    );
  }

  /**
   * Generate System Admin token (Development Only)
   * 
   * Creates a JWT token for System Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/system-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as SystemAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for System Admin role in development environment.
      
      **System Admin Capabilities:**
      • System configuration
      • User management
      • Module management
      • System monitoring
      • Limited super admin functions
      
      **Development UUIDs:**
      • User UUID: sys-admin-uuid-1111
      • Email: system.admin@pivota-dev.com
      • Account ID: sys-admin-account-id
      
      **Use Cases:**
      • Testing system administration
      • Module management testing
      • System configuration UI
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginSystemAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'sys-admin-uuid-1111',
      'system.admin@pivota-dev.com',
      'SystemAdmin',
      'sys-admin-account-id',
      res,
    );
  }

  /**
   * Generate Business System Admin token (Development Only)
   * 
   * Creates a JWT token for Business System Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/business-system-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as BusinessSystemAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Business System Admin role in development environment.
      
      **Business System Admin Capabilities:**
      • Organization management
      • Business settings
      • Team management
      • Business analytics
      • Organization-wide permissions
      
      **Development UUIDs:**
      • User UUID: 75249f7d-d2ce-4ad5-b6d1-0b9cf3230f33
      • Email: allanmathenge22@gmail.com
      • Account ID: ec46d97e-1fe0-4893-a554-96be8beef377
      
      **Use Cases:**
      • Testing organization features
      • Team management UI
      • Business analytics dashboard
      • Organization settings
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginBusinessSystemAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '24bbd3d2-6d88-456f-9881-741c38003104',
      'allanmathenge22@gmail.com',
      'BusinessSystemAdmin',
      '2178edf5-465b-463f-a36e-e9df92ea3e0e', 
      res,
    );
  } 

  // =========================================================
  // 🛠️ DEV TOOLS - SPECIALIZED ADMINS
  // =========================================================

  /**
   * Generate Compliance Admin token (Development Only)
   * 
   * Creates a JWT token for Compliance Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/compliance-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as ComplianceAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Compliance Admin role in development environment.
      
      **Compliance Admin Capabilities:**
      • Review flagged content
      • Access user reports
      • Compliance monitoring
      • Audit log viewing
      • Policy enforcement
      
      **Development UUIDs:**
      • User UUID: comp-admin-uuid-2222
      • Email: compliance.admin@pivota-dev.com
      • Account ID: comp-admin-account-id
      
      **Use Cases:**
      • Testing moderation tools
      • Compliance dashboard
      • Report review system
      • Audit log access
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginComplianceAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'comp-admin-uuid-2222',
      'compliance.admin@pivota-dev.com',
      'ComplianceAdmin',
      'comp-admin-account-id',
      res,
    );
  }

  /**
   * Generate Analytics Admin token (Development Only)
   * 
   * Creates a JWT token for Analytics Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/analytics-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as AnalyticsAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Analytics Admin role in development environment.
      
      **Analytics Admin Capabilities:**
      • Access platform analytics
      • View reports and dashboards
      • Export data
      • Performance metrics
      • User behavior analytics
      
      **Development UUIDs:**
      • User UUID: analyt-admin-uuid-3333
      • Email: analytics.admin@pivota-dev.com
      • Account ID: analyt-admin-account-id
      
      **Use Cases:**
      • Testing analytics dashboards
      • Report generation
      • Metrics visualization
      • Data export testing
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginAnalyticsAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'analyt-admin-uuid-3333',
      'analytics.admin@pivota-dev.com',
      'AnalyticsAdmin',
      'analyt-admin-account-id',
      res,
    );
  }

  /**
   * Generate Module Manager token (Development Only)
   * 
   * Creates a JWT token for Module Manager role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/module-manager')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as ModuleManager (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Module Manager role in development environment.
      
      **Module Manager Capabilities:**
      • Manage specific modules
      • Module configuration
      • Feature flags
      • Module access control
      • Module analytics
      
      **Development UUIDs:**
      • User UUID: mod-manager-uuid-4444
      • Email: module.manager@pivota-dev.com
      • Account ID: mod-manager-account-id
      
      **Use Cases:**
      • Testing module-specific features
      • Module configuration UI
      • Feature flag testing
      • Module access control
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginModuleManager(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'mod-manager-uuid-4444',
      'module.manager@pivota-dev.com',
      'ModuleManager',
      'mod-manager-account-id', 
      res,
    );
  }

  /**
   * Generate Business Content Manager token (Development Only)
   * 
   * Creates a JWT token for Business Content Manager role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/business-content-manager')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as BusinessContentManager (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Business Content Manager role in development environment.
      
      **Business Content Manager Capabilities:**
      • Create and manage content
      • Edit business listings
      • Moderate user content
      • Content analytics
      • Publishing tools
      
      **Development UUIDs:**
      • User UUID: biz-cont-uuid-6666
      • Email: biz.content@pivota-dev.com
      • Account ID: biz-cont-account-id
      
      **Use Cases:**
      • Testing content management
      • Content moderation tools
      • Publishing workflow
      • Content analytics
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginBusinessContentManager(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'biz-cont-uuid-6666',
      'biz.content@pivota-dev.com',
      'BusinessContentManager',
      'biz-cont-account-id',  
      res,
    );
  }

  // =========================================================
  // 🛠️ DEV TOOLS - GENERAL USER
  // =========================================================

  /**
   * Generate General User token (Development Only)
   * 
   * Creates a JWT token for General User role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/general-user')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as GeneralUser (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for General User role in development environment.
      
      **General User Capabilities:**
      • Create listings
      • Apply for jobs
      • Schedule viewings
      • Manage profile
      • Basic platform features
      
      **Development UUIDs:**
      • User UUID: 8400a033-eb84-4bd6-b87f-f5e11cba1cd3
      • Email: stephenjuguna9010@gmail.com
      • Account ID: eb02ea40-4f17-4040-8885-0029105d9fb2
      
      **Use Cases:**
      • Testing user-facing features
      • Listing creation flow
      • Application process
      • Profile management
      • General platform testing
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginGeneralUser(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '53ebe2fb-da59-4758-a90d-c41b6f38c54e',
      'allanmathenge82@gmail.com',
      'GeneralUser',
      '04dedb6f-e3f5-4766-9c7c-fb13642a1101',  
      res,
    );
  } 
}  