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
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import {
  
  LoginRequestDto,
  SessionDto,
  GoogleLoginRequestDto,
  LoginResponseDto,
  BaseResponseDto,
  TokenPairDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  RevokeSessionDto,
  OtpPurposeQueryDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  getSchemaPath,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ThrottlerGuard, Throttle} from '@nestjs/throttler';


@ApiTags('AuthModule - ((Auth-Service) - MICROSERVICE)')
@ApiExtraModels(
  BaseResponseDto, 
  LoginResponseDto, 
  UserSignupRequestDto, 
  TokenPairDto, 
  OrganizationSignupDataDto, 
  UserSignupDataDto, 
  GoogleLoginRequestDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  RevokeSessionDto
)
@Controller('auth-module')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

 // ===================== OTP: REQUEST =====================
 // ===================== OTP: REQUEST =====================
  @Version('1')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  @Post('otp/request')
  @ApiOperation({ summary: 'Request a security code (OTP) via email' })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: BaseResponseDto,
  })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Query() query: OtpPurposeQueryDto // Validated via @IsIn in your DTO
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 OTP Request [${query.purpose}] for: ${dto.email}`);
    
    // Pass the validated purpose string to the service
    const result = await this.authService.requestOtp(dto, query.purpose);

    if (!result.success) {
      this.logger.warn(`⚠️ OTP Request failed for ${dto.email}: ${result.message}`);
      throw result; 
    }

    return result;
  }

  // ===================== OTP: VERIFY =====================
  @Version('1')
  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify a security code (Optional standalone check)' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verification result',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(VerifyOtpResponseDataDto) },
          },
        },
      ],
    },
  })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Query() query: OtpPurposeQueryDto // Validated via @IsIn
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`🔍 OTP Verification [${query.purpose}] attempt for: ${dto.email}`);
    const response = await this.authService.verifyOtp(dto, query.purpose);
    if (!response.success) {
      this.logger.error(`OTP verification failed for ${dto.email} with purpose ${query.purpose}: ${response.message}`);
      throw response;
    }
    this.logger.log(`OTP verified successfully for ${dto.email} with purpose ${query.purpose}`);
    return response;
  }

  
  // ===================== SIGNUP =====================
  @Version('1')
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user (Requires valid OTP code)' })
  @ApiBody({ type: UserSignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserSignupDataDto) },
          },
        },
      ],
    },
  })
  async signup(
    @Body() signupDto: UserSignupRequestDto  
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log(`📩 Signup request: ${signupDto.email}`);
    const response = await this.authService.signup(signupDto);
    if (!response.success) {
      this.logger.warn(`⚠️ Signup failed for ${signupDto.email}: ${response.message}`);
      throw response; // Let the global exception filter handle the error response  
    } else {
      this.logger.log(`✅ Signup successful for: ${signupDto.email}`);
    }
    return response;
  }

  // ===================== ORGANISATION SIGNUP =====================
  @Version('1')
  @Post('signup/organization')
  @ApiOperation({ summary: 'Register a new organisation (Requires valid OTP code)' })
  @ApiBody({ type: OrganisationSignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Organisation signed up successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(OrganizationSignupDataDto) },
          },
        },
      ],
    },
  })
  async signupOrganisation(
    @Body() dto: OrganisationSignupRequestDto,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`🏢 Organisation signup request: ${dto.name}`);
    return this.authService.signupOrganisation(dto);
  }

  // ===================== LOGIN: STAGE 1 =====================
  @Version('1')
  @Post('login')
  @ApiOperation({ summary: 'Step 1: Verify password and trigger MFA OTP' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password correct. MFA REQUIRED. Status code: 2FA_PENDING',
    type: BaseResponseDto,
  })
  async login(
    @Body() loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🔑 Login Stage 1 for: ${loginDto.email}`);
    // No clientInfo or Res needed here - cookies are NOT set yet.
    return this.authService.login(loginDto);
  }

  // ===================== LOGIN: STAGE 2 (MFA VERIFY) =====================
  @Version('1')
  @Post('login/verify-mfa')
  @ApiOperation({ summary: 'Step 2: Verify OTP and issue JWT cookies' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'MFA Verified. User logged in and cookies issued.',
    type: BaseResponseDto,
  })
  async verifyMfaLogin(
    @Body() dto: VerifyOtpDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`🛡️ MFA Login Verification for: ${dto.email}`);
    const resp = await this.authService.verifyMfaLogin(dto, clientInfo, res);
    if (!resp.success) {
      this.logger.warn(`⚠️ MFA Login failed for ${dto.email}: ${resp.message}`);
      throw resp; // Let the global exception filter handle the error response  
    } else {
      this.logger.log(`✅ MFA Login successful for: ${dto.email}`);
    }
    return resp;  
  }


  // ===================== GOOGLE LOGIN =====================
  @Version('1')
  @Post('google')
  @ApiOperation({ summary: 'Login or Register using Google OAuth token' })
  @ApiBody({ type: GoogleLoginRequestDto })
  async googleLogin(
    @Body() googleDto: GoogleLoginRequestDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    return this.authService.googleLogin(googleDto.token, clientInfo, res);
  }

  // ===================== REFRESH TOKEN =====================
  @Version('1')
  @Post('refreshToken')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<TokenPairDto>> { 
    return this.authService.refresh(refreshToken, res);
  }

  // ===================== LOGOUT =====================
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user and clear JWT cookies' })
  @ApiBearerAuth()
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { success: true, message: 'Logged out successfully' };
  }

  // ===================== FORGOT PASSWORD: STEP 1 (REQUEST) =====================
  @Version('1')
  @Post('password/forgot')
  @ApiOperation({ summary: 'Step 1: Request a password reset OTP' })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'If the account exists, a reset code has been sent.',
    type: BaseResponseDto,
  })
  async requestPasswordReset(
    @Body() dto: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔑 Password reset requested for: ${dto.email}`);
    return this.authService.requestPasswordReset(dto);
  }

  // ===================== FORGOT PASSWORD: STEP 2 (RESET) =====================
  @Version('1')
  @Post('password/reset')
  @ApiOperation({ summary: 'Step 2: Submit new password using the OTP code' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: BaseResponseDto,
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔄 Processing password reset for: ${dto.email}`);
    return this.authService.resetPassword(dto);
  }

  // ===================== SESSION: REVOKE =====================
  // ===================== SESSION: REVOKE =====================
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Delete('session') // Single path = Single entry in Swagger
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Revoke session(s)',
    description: 'Revokes a specific session or all sessions. Defaults to current user unless targetUserUuid is provided (Admin only).'
  })
  @ApiQuery({
    name: 'tokenId',
    required: false,
    description: 'The unique ID of the session to revoke. Leave empty to revoke ALL sessions.',
  })
  @ApiQuery({
    name: 'userUuid',
    required: false,
    description: 'Admin only: The UUID of the user whose sessions should be revoked.',
  })
  async revokeSession(
    @Req() req: JwtRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('tokenId') tokenId?: string,      // Now both are queries
    @Query('userUuid') targetUserUuid?: string,
  ): Promise<BaseResponseDto<null>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const currentTokenId = req.user.tokenId;

    // 1. Determine Target User
    const finalUserUuid = (targetUserUuid && targetUserUuid.trim() !== '') 
      ? targetUserUuid 
      : requesterUuid;

    // 2. Permission Check
    if (finalUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);
      if (!isAdmin) {
        return BaseResponseDto.fail('Forbidden: Cannot revoke sessions for other users.', 'FORBIDDEN');
      }
    }

    // 3. Cookie Cleanup
    const isGlobalLogout = !tokenId || tokenId.trim() === '';
    const isRevokingCurrentDevice = tokenId === currentTokenId;
    const isTargetingSelf = finalUserUuid === requesterUuid;

    if (isTargetingSelf && (isGlobalLogout || isRevokingCurrentDevice)) {
      await this.authService.logout(res);
    }

    return this.authService.revokeSessions(finalUserUuid, tokenId);
  }

  // ===================== SESSION: GET ACTIVE =====================
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Get('sessions/active')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Retrieve active sessions',
    description: 'General users get their own sessions. Admins can provide a userUuid query param to see sessions for a specific user.'
  })
  @ApiQuery({ 
    name: 'userUuid', 
    required: false, 
    description: 'The UUID of the user to fetch sessions for (Admin only). Defaults to current user.' 
  }) 
  @ApiResponse({ status: 200, type: BaseResponseDto })
  async getActiveSessions(
    @Req() req: JwtRequest,
    @Query('userUuid') targetUserUuid?: string, 
  ): Promise<BaseResponseDto<SessionDto[]>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;

    // 1. Determine which UUID to use
    // Check if targetUserUuid exists AND is not just an empty string/whitespace
    const hasTarget = targetUserUuid && targetUserUuid.trim().length > 0;
    let finalUserUuid = requesterUuid;

    if (hasTarget && targetUserUuid !== requesterUuid) {
      // 2. Security Check: Only privileged roles can view others
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'ModuleManager'].includes(requesterRole);
      
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized session view attempt by ${requesterUuid} on ${targetUserUuid}`);
        return BaseResponseDto.fail(
          'You do not have permission to view sessions for other users.',
          'FORBIDDEN',
        );
      }
      finalUserUuid = targetUserUuid;
      this.logger.log(`👮 Admin ${requesterRole} fetching sessions for user: ${finalUserUuid}`);
    } else {
      this.logger.log(`📱 User ${requesterUuid} fetching their own sessions`);
    }

    return this.authService.getActiveSessions(finalUserUuid);
  }
}


