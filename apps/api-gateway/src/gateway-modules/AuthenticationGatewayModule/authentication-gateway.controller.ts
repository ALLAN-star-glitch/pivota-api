import {
  Body,
  Controller,
  Logger,
  Post,
  Version,
  Res,
  UseGuards,
  Req,
  Get,
  Query,
  Delete,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticationGatewayService } from './authentication-gateway.service';
import {
  LoginRequestDto,
  SessionDto,
  GoogleLoginRequestDto,
  LoginResponseDto,
  BaseResponseDto,
  TokenPairDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  AuthClientInfoDto,
  RequestOtpQueryDto,
  OtpPurposeQueryDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';
import { Public } from '../../decorators/public.decorator';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { TimeoutInterceptor } from '@pivota-api/interceptors';
import { JwtAuthGuard } from './jwt.guard';

// ✅ Only ONE @ApiTags at the class level - this is all you need
@ApiTags('Authentication')
@ApiExtraModels(
  BaseResponseDto,
  LoginResponseDto,
  TokenPairDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
)
@Controller('authentication')
@UseInterceptors(TimeoutInterceptor)
export class AuthenticationGatewayController {
  private readonly logger = new Logger(AuthenticationGatewayController.name);

  constructor(
    private readonly authenticationService: AuthenticationGatewayService,
  ) {}

  // ===========================================================
  // 🔐 AUTH - LOGIN
  // ===========================================================

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Login')
  @ApiOperation({
    summary: 'Step 1: Verify password and trigger MFA OTP',
    description: `
      First step of two-factor authentication login.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required
      
      **Flow:**
      1. User provides email and password
      2. System validates credentials
      3. If valid, an OTP is sent to the user's email
      4. Response indicates MFA is required
      
      **Rate Limits:**
      - 10 requests per IP per minute
      
      **Security:**
      - Account lockout after 10 failed attempts
      - Lockout duration: 30 minutes
    `
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password correct. MFA REQUIRED.',
    schema: {
      example: {
        success: true,
        message: 'MFA_REQUIRED',
        code: '2FA_PENDING',
        data: {
          email: 'user@example.com',
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          message: 'MFA_REQUIRED'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        message: 'Invalid email or password',
        code: 'UNAUTHORIZED'
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Too many attempts - rate limited',
    schema: {
      example: {
        success: false,
        message: 'Too many attempts. Try again in 5 minutes.',
        code: 'TOO_MANY_REQUESTS'
      }
    }
  })
  @ApiResponse({
    status: 423,
    description: 'Account locked',
    schema: {
      example: {
        success: false,
        message: 'Account locked. Try again in 30 minutes.',
        code: 'ACCOUNT_LOCKED'
      }
    }
  })
  async login(
    @Body() loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🔑 Login Stage 1 for: ${loginDto.email}`);
    return this.authenticationService.login(loginDto);
  }

  @Post('login/verify-mfa')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Login')
  @ApiOperation({
    summary: 'Step 2: Verify OTP and issue JWT cookies',
    description: `
      Completes the two-factor authentication process.
       
      **Microservice:** Authentication Service
      **Authentication:** Not required (completes login)
      
      **Flow:**
      1. User provides email and OTP code
      2. System validates OTP
      3. If valid, JWT tokens are generated
      4. Tokens are set as HTTP-only cookies
      5. User is fully authenticated
      
      **Cookie Settings:**
      - access_token: HTTP-only, Secure, SameSite=None, 15 min expiry
      - refresh_token: HTTP-only, Secure, SameSite=None, 7 day expiry
    `
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'MFA Verified. User logged in and cookies issued.',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        code: 'OK',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
          message: 'Login successful',
          hasProfessionalProfile: true
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired verification code',
        code: 'UNAUTHORIZED'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication failed',
    schema: {
      example: {
        success: false,
        message: 'Authentication failed',
        code: 'UNAUTHORIZED'
      }
    }
  })
  async verifyMfaLogin(
    @Body() dto: VerifyOtpDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🛡️ MFA Login Verification for: ${dto.email}`);

    this.logger.debug(`[GATEWAY] MFA Verify - Client info:`, {
      device: clientInfo?.device,
      deviceType: clientInfo?.deviceType,
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      os: clientInfo?.os
    });

    const response = await this.authenticationService.verifyMfaLogin(
      dto,
      clientInfo,
      res
    );

    if (!response.success) {
      this.logger.warn(`⚠️ MFA Login failed for ${dto.email}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ MFA Login successful for: ${dto.email}`);
    return response;
  }

  @Post('google')
  @Public()
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Login')
  @ApiOperation({
    summary: 'Login or Register using Google OAuth token',
    description: `
      Authenticates user with Google OAuth token.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required (uses Google token)
      
      **Flow:**
      1. User provides Google ID token
      2. System verifies token with Google
      3. If user exists: Login flow
      4. If user doesn't exist: Creates new account
      5. JWT tokens generated and set as cookies
      
      **Onboarding Data:**
      If the user is signing up for the first time, you can pass onboarding data 
      collected from previous screens to create a complete user profile.
    `
  })
  @ApiBody({ type: GoogleLoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login/Signup successful',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        code: 'OK',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          userCode: 'USR123456789',
          accountId: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+254712345678',
          status: 'ACTIVE',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Google token',
    schema: {
      example: {
        success: false,
        message: 'Invalid Google token',
        code: 'UNAUTHORIZED'
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already registered',
    schema: {
      example: {
        success: false,
        message: 'This email is already registered. Please login instead.',
        code: 'CONFLICT'
      }
    }
  })
  async googleLogin(
    @Body() googleDto: GoogleLoginRequestDto,
    @ClientInfo() clientInfo: AuthClientInfoDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const { token, onboardingData } = googleDto;

    this.logger.log(`🔑 Google Login request received`);
    this.logger.debug(`📱 Device: ${clientInfo?.device || 'Unknown'}`);
    this.logger.debug(`📍 IP: ${clientInfo?.ipAddress || 'Unknown'}`);

    if (onboardingData?.primaryPurpose) {
      this.logger.log(`📝 Google Login with onboarding data - Purpose: ${onboardingData.primaryPurpose}`);
    }

    const response = await this.authenticationService.googleLogin(
      token,
      clientInfo,
      res,
      onboardingData
    );

    if (!response.success) {
      this.logger.warn(`⚠️ Google Login failed: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Google Login successful`);
    return response;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Version('1')
  @ApiBearerAuth()
  // ❌ REMOVED: @ApiTags('Auth - Login')
  @ApiOperation({
    summary: 'Logout user and clear JWT cookies',
    description: `
      Terminates current session and clears authentication cookies.
      
      **Microservice:** Authentication Service
      **Authentication:** Required (JWT cookie)
      
      **Flow:**
      1. Blacklists the JWT token
      2. Revokes the session
      3. Clears authentication cookies
      4. User is fully logged out
    `
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Req() req: JwtRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<null>> {
    const userUuid = req.user?.sub;
    const tokenId = req.user?.jti;

    if (!userUuid) {
      throw new UnauthorizedException('User not authenticated');
    }

    this.logger.log(`🚪 Logout requested for user: ${userUuid}`);

    const response = await this.authenticationService.logout(
      userUuid,
      tokenId,
      res
    );

    if (!response.success) {
      this.logger.warn(`⚠️ Logout failed for user ${userUuid}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Logout successful for user: ${userUuid}`);
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - TOKEN MANAGEMENT
  // ===========================================================

  @Post('refresh-token')
  @Public()
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Tokens')
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description: `
      Uses refresh token to obtain a new access token.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required (uses refresh token)
      
      **Flow:**
      1. User provides refresh token (from cookie or request body)
      2. System validates refresh token
      3. If valid, generates new access and refresh tokens
      4. Updates session with new tokens
      5. Sets new tokens as cookies
    `
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        message: 'Tokens refreshed successfully',
        code: 'OK',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED'
      }
    }
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<TokenPairDto>> {
    this.logger.log(`🔄 Refresh token request received`);

    const response = await this.authenticationService.refresh(
      refreshToken,
      res
    );

    if (!response.success) {
      this.logger.warn(`⚠️ Refresh token failed: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Refresh token successful`);
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - OTP MANAGEMENT
  // ===========================================================

  @Post('otp/request')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - OTP')
  @ApiOperation({
    summary: 'Request a security code (OTP) via email',
    description: `
      Sends a verification code to the user's email for various purposes.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required
      
      **Purpose Types:**
      - EMAIL_VERIFICATION: Sign up new account (requires phone number)
      - ORGANIZATION_EMAIL_VERIFICATION: Organization sign up
      - LOGIN_2FA: Two-factor authentication during login
      - PASSWORD_RESET: Reset forgotten password
      - CHANGE_EMAIL: Change email address
      - CHANGE_PHONE: Change phone number
      - WITHDRAWAL: Withdraw money from wallet
      - ESCROW_RELEASE: Release escrow funds
      - PAYMENT_CONFIRM: Confirm payment
      - JOB_ACCEPT: Accept job offer
      - CONTRACT_SIGN: Sign employment contract
      - LEASE_SIGN: Sign lease agreement
      - DEPOSIT_CONFIRM: Confirm deposit payment
      - AID_RECEIPT: Confirm aid receipt
      - CASH_DISBURSEMENT: Receive cash aid
      - DELETE_ACCOUNT: Delete account confirmation
      - MFA_RECOVERY: Recover from lost MFA
      
      **Rate Limits:**
      - IP-based: 10 requests per minute (ThrottlerGuard at gateway)
      - Email-based: Purpose-specific limits (3-10 attempts per time window)
      
      **Security:**
      - No user enumeration: Returns same response for existing/non-existing emails
      - Timing attack protection: Random delays on error paths
    `
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully (or appears sent for security reasons)',
    schema: {
      example: {
        success: true,
        message: 'Verification code sent to your email',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid purpose or request',
    schema: {
      example: {
        success: false,
        message: 'Purpose must be one of: EMAIL_VERIFICATION, ORGANIZATION_EMAIL_VERIFICATION, LOGIN_2FA, ...',
        code: 'BAD_REQUEST'
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (IP or email based)',
    schema: {
      example: {
        success: false,
        message: 'Too many attempts. Try again in 5 minutes.',
        code: 'TOO_MANY_REQUESTS'
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      example: {
        success: false,
        message: 'An error occurred while processing your request',
        code: 'INTERNAL_ERROR'
      }
    }
  })
  async requestOtp(
    @Body() body: RequestOtpDto,
    @Query() query: RequestOtpQueryDto
  ): Promise<BaseResponseDto<null>> {
    const { email, phone } = body;
    const { purpose } = query;

    this.logger.log(`📩 OTP Request [${purpose}] for: ${email}${phone ? ` with phone: ${phone}` : ''}`);

    const result = await this.authenticationService.requestOtp(
      { email, phone },
      purpose
    );

    if (!result.success) {
      this.logger.warn(`⚠️ OTP Request failed for ${email} [${purpose}]: ${result.message}`);
      throw result;
    }

    this.logger.log(`✅ OTP Request successful for ${email} [${purpose}]`);
    return result;
  }

  @Post('otp/verify')
  @Public()
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - OTP')
  @ApiOperation({
    summary: 'Verify a security code',
    description: `
      Validates an OTP code for a specific purpose.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required
      
      **Flow:**
      1. User provides email, OTP code, and purpose
      2. System validates OTP against stored value
      3. If valid, OTP is deleted (one-time use)
      4. Returns verification result
    `
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiQuery({
    name: 'purpose',
    required: true,
    enum: [
      'EMAIL_VERIFICATION',
      'ORGANIZATION_EMAIL_VERIFICATION',
      'LOGIN_2FA',
      'PASSWORD_RESET',
      'CHANGE_EMAIL',
      'CHANGE_PHONE',
      'WITHDRAWAL',
      'ESCROW_RELEASE',
      'PAYMENT_CONFIRM',
      'JOB_ACCEPT',
      'CONTRACT_SIGN',
      'LEASE_SIGN',
      'DEPOSIT_CONFIRM',
      'AID_RECEIPT',
      'CASH_DISBURSEMENT',
      'DELETE_ACCOUNT',
      'MFA_RECOVERY'
    ]
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verification result',
    schema: {
      example: {
        success: true,
        message: 'Verification successful',
        code: 'OK',
        data: { verified: true }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired verification code',
        code: 'UNAUTHORIZED'
      }
    }
  })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Query() query: OtpPurposeQueryDto
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`🔍 OTP Verification [${query.purpose}] attempt for: ${dto.email}`);

    const response = await this.authenticationService.verifyOtp(dto, query.purpose);

    if (!response.success) {
      this.logger.warn(`⚠️ OTP verification failed for ${dto.email} with purpose ${query.purpose}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ OTP verified successfully for ${dto.email} with purpose ${query.purpose}`);
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - PASSWORD MANAGEMENT
  // ===========================================================

  @Post('password/forgot')
  @Public()
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Password')
  @ApiOperation({
    summary: 'Step 1: Request a password reset OTP',
    description: `
      Initiates password reset flow by sending OTP to email.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required
      
      **Flow:**
      1. User provides email
      2. System checks if account exists
      3. If exists, sends OTP to email
      4. Returns success (or appears success for security)
      
      **Security:**
      - No user enumeration: Returns same response for existing/non-existing emails
    `
  })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Reset code sent if account exists',
    schema: {
      example: {
        success: true,
        message: 'If an account exists, a reset code has been sent.',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: {
        success: false,
        message: 'Too many attempts. Try again in 1 hour.',
        code: 'TOO_MANY_REQUESTS'
      }
    }
  })
  async requestPasswordReset(
    @Body() dto: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔑 Password reset requested for: ${dto.email}`);

    const response = await this.authenticationService.requestPasswordReset(dto);

    if (!response.success) {
      this.logger.warn(`⚠️ Password reset request failed for ${dto.email}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Password reset request successful for ${dto.email}`);
    return response;
  }

  @Post('password/reset')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Version('1')
  // ❌ REMOVED: @ApiTags('Auth - Password')
  @ApiOperation({
    summary: 'Step 2: Submit new password using the OTP code',
    description: `
      Completes password reset flow with new password.
      
      **Microservice:** Authentication Service
      **Authentication:** Not required
      
      **Flow:**
      1. User provides email, OTP code, and new password
      2. System validates OTP
      3. If valid, updates password
      4. Revokes all active sessions
      5. Returns success
    `
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      example: {
        success: true,
        message: 'Password updated and all active sessions revoked.',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired OTP',
    schema: {
      example: {
        success: false,
        message: 'Invalid or expired verification code',
        code: 'UNAUTHORIZED'
      }
    }
  })
  @ApiResponse({
    status: 422,
    description: 'Password does not meet requirements',
    schema: {
      example: {
        success: false,
        message: 'Password must be at least 8 characters long',
        code: 'BAD_REQUEST'
      }
    }
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔄 Processing password reset for: ${dto.email}`);

    const response = await this.authenticationService.resetPassword(dto);

    if (!response.success) {
      this.logger.warn(`⚠️ Password reset failed for ${dto.email}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Password reset successful for ${dto.email}`);
    return response;
  }

  // ===========================================================
  // 🔐 AUTH - SESSION MANAGEMENT
  // ===========================================================

  @Delete('session')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Version('1')
  @ApiBearerAuth()
  // ❌ REMOVED: @ApiTags('Auth - Sessions')
  @ApiOperation({
    summary: 'Revoke session(s)',
    description: `
      Revokes a specific session or all sessions for a user.
      
      **Microservice:** Authentication Service
      **Authentication:** Required (JWT cookie)
      
      **Permission Model:**
      • **Own sessions** - Any user can revoke their own sessions
      • **Other users** - Admin only (SuperAdmin, SystemAdmin, ModuleManager)
      
      **Flow:**
      1. User provides target user UUID and optional token ID
      2. System checks permissions
      3. If valid, revokes session(s)
      4. Returns success
    `
  })
  @ApiQuery({ name: 'tokenId', required: false })
  @ApiQuery({ name: 'userUuid', required: false })
  @ApiResponse({ status: 200, description: 'Sessions revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot revoke other users\' sessions' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @Req() req: JwtRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('tokenId') tokenId?: string,
    @Query('userUuid') targetUserUuid?: string,
  ): Promise<BaseResponseDto<null>> {
    const requesterUuid = req.user.sub;
    const requesterRole = req.user.role;
    const currentTokenId = req.user.jti;

    const finalUserUuid = (targetUserUuid && targetUserUuid.trim() !== '')
      ? targetUserUuid
      : requesterUuid;

    // Check permissions for cross-user session revocation
    if (finalUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized session revocation attempt by ${requesterUuid} on ${finalUserUuid}`);
        return BaseResponseDto.fail(
          'Forbidden: Cannot revoke sessions for other users.',
          'FORBIDDEN'
        );
      }
    }

    const isGlobalLogout = !tokenId || tokenId.trim() === '';
    const isRevokingCurrentDevice = tokenId === currentTokenId;
    const isTargetingSelf = finalUserUuid === requesterUuid;

    // If user is revoking their own current session, handle logout
    if (isTargetingSelf && (isGlobalLogout || isRevokingCurrentDevice)) {
      await this.authenticationService.logout(requesterUuid, currentTokenId, res);
    }

    const response = await this.authenticationService.revokeSessions(
      finalUserUuid,
      tokenId
    );

    if (!response.success) {
      this.logger.warn(`⚠️ Failed to revoke session(s) for user ${finalUserUuid} by requester ${requesterUuid}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Successfully revoked session(s) for user ${finalUserUuid} by requester ${requesterUuid}`);
    return response;
  }

  @Get('sessions/active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Version('1')
  @ApiBearerAuth()
  // ❌ REMOVED: @ApiTags('Auth - Sessions')
  @ApiOperation({
    summary: 'Retrieve active sessions',
    description: `
      Retrieves all active sessions for a user.
      
      **Microservice:** Authentication Service
      **Authentication:** Required (JWT cookie)
      
      **Permission Model:**
      • **Own sessions** - Any user can view their own sessions
      • **Other users** - Admin only (SuperAdmin, SystemAdmin, ModuleManager)
      
      **Response:**
      - List of sessions with device info, IP, timestamps
      - Sessions are ordered by last activity (most recent first)
    `
  })
  @ApiQuery({ name: 'userUuid', required: false })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved',
    type: [SessionDto],
    schema: {
      example: {
        success: true,
        message: 'Found 2 active sessions.',
        code: 'OK',
        data: [
          {
            id: 1,
            tokenId: 'abc-123',
            device: 'Chrome on Windows',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            os: 'Windows 10',
            lastActiveAt: '2024-01-01T12:00:00.000Z',
            expiresAt: '2024-01-08T12:00:00.000Z',
            createdAt: '2024-01-01T12:00:00.000Z',
            revoked: false
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot view other users\' sessions' })
  async getActiveSessions(
    @Req() req: JwtRequest,
    @Query('userUuid') targetUserUuid?: string,
  ): Promise<BaseResponseDto<SessionDto[]>> {
    const requesterUuid = req.user.sub;
    const requesterRole = req.user.role;

    const hasTarget = targetUserUuid && targetUserUuid.trim().length > 0;
    let finalUserUuid = requesterUuid;

    if (hasTarget && targetUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);

      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized session view attempt by ${requesterUuid} on ${targetUserUuid}`);
        return BaseResponseDto.fail(
          'You do not have permission to view sessions for other users.',
          'FORBIDDEN'
        );
      }
      finalUserUuid = targetUserUuid;
      this.logger.log(`👮 Admin ${requesterRole} fetching sessions for user: ${finalUserUuid}`);
    } else {
      this.logger.log(`📱 User ${requesterUuid} fetching their own sessions`);
    }

    const response = await this.authenticationService.getActiveSessions(finalUserUuid);

    if (!response.success) {
      this.logger.warn(`⚠️ Failed to fetch sessions for user ${finalUserUuid}: ${response.message}`);
      throw response;
    }

    this.logger.log(`✅ Retrieved ${response.data?.length || 0} sessions for user ${finalUserUuid}`);
    return response;
  }
}