import {
  Body,
  Controller,
  Logger,
  Post,
  Version,
  Res,
  UseGuards,
  Req,
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
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';
import { RolesGuard } from '../../guards/role.guard';
import { Roles } from '../../decorators/roles.decorator';


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
  @Version('1')
  @Post('otp/request')
  @ApiOperation({ summary: 'Request a security code (OTP) via email' })
  @ApiBody({ type: RequestOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    type: BaseResponseDto,
  })
  async requestOtp(
    @Body() dto: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 OTP Request for: ${dto.email}`);
    return this.authService.requestOtp(dto);
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
    @Body() dto: VerifyOtpDto
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`🔍 OTP Verification attempt for: ${dto.email}`);
    return this.authService.verifyOtp(dto);
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
    return this.authService.signup(signupDto);
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
    return this.authService.verifyMfaLogin(dto, clientInfo, res);
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
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Post('session/revoke')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Revoke one or all sessions',
    description: 'Terminates user sessions. Users can revoke their own sessions. Admins can revoke sessions for any user by providing a userUuid.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session(s) successfully invalidated.',
    type: BaseResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to revoke another user\'s session.' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async revokeSession(
    @Req() req: JwtRequest,
    @Body() dto: RevokeSessionDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<null>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const currentTokenId = req.user.tokenId;

    const targetUserUuid = dto.userUuid || requesterUuid;

    if (targetUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(requesterRole);
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized revoke attempt by ${requesterUuid} on ${targetUserUuid}`);
        return BaseResponseDto.fail(
          'You do not have permission to revoke sessions for other users.',
          'FORBIDDEN',
        );
      }
      this.logger.warn(`👮 Admin ${requesterRole} (${requesterUuid}) revoking session for user: ${targetUserUuid}`);
    }

    const isGlobalLogout = !dto.tokenId;
    const isRevokingCurrentDevice = dto.tokenId === currentTokenId;
    const isTargetingSelf = targetUserUuid === requesterUuid;

    if (isTargetingSelf && (isGlobalLogout || isRevokingCurrentDevice)) {
      this.logger.log(`🧹 Cleaning up local cookies for user: ${requesterUuid}`);
      await this.authService.logout(res);
    }

    return this.authService.revokeSessions(targetUserUuid, dto.tokenId);
  }
}