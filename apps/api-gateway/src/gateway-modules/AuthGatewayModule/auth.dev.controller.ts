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

@ApiTags('AuthModule - (DEV TOOLS)')
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
  // 1. SYSTEM ADMIN
  // =========================================================
  @Version('1')
  @Get('token/system-admin')
  @ApiOperation({ summary: 'Login as SystemAdmin' })
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

  // =========================================================
  // 2. COMPLIANCE ADMIN
  // =========================================================
  @Version('1')
  @Get('token/compliance-admin')
  @ApiOperation({ summary: 'Login as ComplianceAdmin' })
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

  // =========================================================
  // 3. ANALYTICS ADMIN
  // =========================================================
  @Version('1')
  @Get('token/analytics-admin')
  @ApiOperation({ summary: 'Login as AnalyticsAdmin' })
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

  // =========================================================
  // 4. MODULE MANAGER
  // =========================================================
  @Version('1')
  @Get('token/module-manager')
  @ApiOperation({ summary: 'Login as ModuleManager' })
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

  // =========================================================
  // 5. BUSINESS SYSTEM ADMIN
  // =========================================================
  @Version('1')
  @Get('token/business-system-admin')
  @ApiOperation({ summary: 'Login as BusinessSystemAdmin' })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginBusinessSystemAdmin(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      'biz-sys-uuid-5555',
      'biz.system@pivota-dev.com',
      'BusinessSystemAdmin',
      'biz-sys-account-id', 
      res,
    );
  }

  // =========================================================
  // 6. BUSINESS CONTENT MANAGER
  // =========================================================
  @Version('1')
  @Get('token/business-content-manager')
  @ApiOperation({ summary: 'Login as BusinessContentManager' })
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
  // 7. GENERAL USER
  // =========================================================
  @Version('1')
  @Get('token/general-user')
  @ApiOperation({ summary: 'Login as GeneralUser' })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginGeneralUser(@Res({ passthrough: true }) res: Response) {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '8400a033-eb84-4bd6-b87f-f5e11cba1cd3',
      'stephenjuguna9010@gmail.com',
      'GeneralUser',
      'eb02ea40-4f17-4040-8885-0029105d9fb2',  
      res,
    );
  }

  // =========================================================
  // 8. SUPER ADMIN
  // =========================================================
  @Version('1')
  @Get('token/super-admin')
  @ApiOperation({ summary: 'Login as SuperAdmin' })
  @ApiResponse(AuthDevController.TokenResponseSchema)
  async loginSuperAdmin(@Res({ passthrough: true }) res: Response): Promise<BaseResponseDto<TokenPairDto>> {
    this.validateDevMode();
    return this.authService.generateDevTokenOnly(
      '69a601b6-fdb9-4333-9c01-8895a8b3af45',
      'allanmathenge67@gmail.com',
      'SuperAdmin',
      '462908a2-0f23-472a-b2d7-54966d004256', 
      res,
    );
  }
}

