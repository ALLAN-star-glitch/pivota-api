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

@ApiTags('Auth - Development Tools')
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
  // 🛠️ DEV TOOLS - PLATFORM ROLES
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
   * Generate Platform System Admin token (Development Only)
   * 
   * Creates a JWT token for Platform System Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/platform-system-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as PlatformSystemAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Platform System Admin role in development environment.
      
      **Platform System Admin Capabilities:**
      • Platform operations
      • User management
      • System configuration
      • Module management
      • System monitoring
      
      **Use Cases:**
      • Testing platform administration
      • Module management testing
      • System configuration UI
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginPlatformSystemAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'plat-sys-admin-uuid-1111',
      'platform.system@pivota-dev.com',
      'PlatformSystemAdmin',
      'plat-sys-admin-account-id',
      res,
    );
  }

  /**
   * Generate Platform Compliance Admin token (Development Only)
   * 
   * Creates a JWT token for Platform Compliance Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/platform-compliance-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as PlatformComplianceAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Platform Compliance Admin role in development environment.
      
      **Platform Compliance Admin Capabilities:**
      • KYC verification
      • Fraud monitoring
      • Review flagged content
      • Access user reports
      • Compliance monitoring
      • Audit log viewing
      
      **Use Cases:**
      • Testing moderation tools
      • Compliance dashboard
      • Report review system
      • Audit log access
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginPlatformComplianceAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'plat-comp-admin-uuid-2222',
      'platform.compliance@pivota-dev.com',
      'PlatformComplianceAdmin',
      'plat-comp-admin-account-id',
      res,
    );
  }

  /**
   * Generate Platform Analytics Admin token (Development Only)
   * 
   * Creates a JWT token for Platform Analytics Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/platform-analytics-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as PlatformAnalyticsAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Platform Analytics Admin role in development environment.
      
      **Platform Analytics Admin Capabilities:**
      • Access platform analytics
      • View reports and dashboards
      • Export data
      • Performance metrics
      • User behavior analytics
      
      **Use Cases:**
      • Testing analytics dashboards
      • Report generation
      • Metrics visualization
      • Data export testing
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginPlatformAnalyticsAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'plat-analyt-admin-uuid-3333',
      'platform.analytics@pivota-dev.com',
      'PlatformAnalyticsAdmin',
      'plat-analyt-admin-account-id',
      res,
    );
  }

  /**
   * Generate Platform Module Manager token (Development Only)
   * 
   * Creates a JWT token for Platform Module Manager role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/platform-module-manager')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as PlatformModuleManager (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Platform Module Manager role in development environment.
      
      **Platform Module Manager Capabilities:**
      • Manage specific modules
      • Module configuration
      • Feature flags
      • Module access control
      • Module analytics
      
      **Use Cases:**
      • Testing module-specific features
      • Module configuration UI
      • Feature flag testing
      • Module access control
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginPlatformModuleManager(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'plat-mod-mgr-uuid-4444',
      'platform.module@pivota-dev.com',
      'PlatformModuleManager',
      'plat-mod-mgr-account-id', 
      res,
    );
  }

  /**
   * Generate AI Developer token (Development Only)
   * 
   * Creates a JWT token for AI Developer role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/ai-developer')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as AIDeveloper (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for AI Developer role in development environment.
      
      **AI Developer Capabilities:**
      • Access training datasets
      • Export AI/ML data
      • Model training data access
      • Data pipeline testing
      • AI feature development
      
      **Use Cases:**
      • Testing AI training data endpoints
      • Data pipeline development
      • Model validation
      • AI feature testing
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginAIDeveloper(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'de6aea28-2dfa-45e3-a527-314917747204',
      'allanmathenge319@gmail.com',
      'AIDeveloper',
      '2eb7df04-3374-44c6-89e4-d94c0b46c024',
      res,
    );
  }

  // =========================================================
  // 🛠️ DEV TOOLS - BUSINESS ROLES
  // =========================================================

  /**
   * Generate Admin token (Development Only)
   * 
   * Creates a JWT token for Admin role (business owner) in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as Admin (Business Owner) (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Admin role (business owner) in development environment.
      
      **Admin Capabilities:**
      • Organization management
      • Business settings
      • Team management
      • Invite members
      • Business analytics
      • Subscription management
      • Organization-wide permissions
      
      **Use Cases:**
      • Testing organization features
      • Team management UI
      • Business analytics dashboard
      • Organization settings
      • Member invitation flow
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '24bbd3d2-6d88-456f-9881-741c38003104',
      'allanmathenge22@gmail.com',
      'Admin',
      '2178edf5-465b-463f-a36e-e9df92ea3e0e', 
      res,
    );
  }

  /**
   * Generate Content Manager Admin token (Development Only)
   * 
   * Creates a JWT token for Content Manager Admin role in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/content-manager-admin')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as ContentManagerAdmin (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Content Manager Admin role in development environment.
      
      **Content Manager Admin Capabilities:**
      • Create and manage content
      • Edit business listings
      • Moderate user content
      • Content analytics
      • Publishing tools
      • Cannot invite members
      
      **Use Cases:**
      • Testing content management
      • Content moderation tools
      • Publishing workflow
      • Content analytics
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginContentManagerAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'biz-cont-uuid-6666',
      'content.manager@pivota-dev.com',
      'ContentManagerAdmin',
      'biz-cont-account-id',  
      res,
    );
  }

  /**
   * Generate Member token (Development Only)
   * 
   * Creates a JWT token for Member role (regular business member) in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/member')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as Member (Regular Business Member) (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Member role (regular business member) in development environment.
      
      **Member Capabilities:**
      • Create own listings
      • Apply for jobs
      • Schedule viewings
      • Manage own profile
      • Basic platform features
      • Cannot invite members
      • Cannot manage organization settings
      
      **Use Cases:**
      • Testing user-facing features
      • Listing creation flow
      • Application process
      • Profile management
      • General platform testing
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginMember(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '8e28dfe2-fb8d-4b42-9a90-295e66a3af0f',
      'member@pivota-dev.com',
      'Member',
      'e71c5af5-e59c-49fc-ad95-af9e999ed16f',  
      res,
    );
  }

  // =========================================================
  // 🛠️ DEV TOOLS - INDIVIDUAL ROLE
  // =========================================================

  /**
   * Generate Individual token (Development Only)
   * 
   * Creates a JWT token for Individual role (solo user) in development environment.
   * 
   * @param res - Express response object
   * @returns Token pair
   */
  @Get('token/individual')
  @Version('1')
  @ApiTags('Auth - Dev Tools')
  @ApiOperation({ 
    summary: 'Login as Individual (Solo User) (Development Only)',
    description: `
      ⚠️ **DEVELOPMENT ONLY ENDPOINT** ⚠️
      
      Creates a JWT token for Individual role (solo user) in development environment.
      
      **Individual Capabilities:**
      • Create own listings
      • Apply for jobs
      • Schedule viewings
      • Manage own profile
      • Book professional services
      • Basic platform features
      • Personal account only
      • Cannot invite members
      
      **Use Cases:**
      • Testing user-facing features
      • Listing creation flow
      • Application process
      • Profile management
      • General platform testing
      • Solo user experience
    `
  })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginIndividual(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '8400a033-eb84-4bd6-b87f-f5e11cba1cd3',
      'stephenjuguna9010@gmail.com',
      'Individual',
      'eb02ea40-4f17-4040-8885-0029105d9fb2',   
      res,
    );
  }
}