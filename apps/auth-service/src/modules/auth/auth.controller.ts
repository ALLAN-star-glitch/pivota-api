import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  LoginResponseDto,
  LoginRequestDto,
  TokenPairDto,
  BaseResponseDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  SessionDto,
  AuthClientInfoDto, // Keep this import
} from '@pivota-api/dtos';


@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /* ======================================================
     FORGOT PASSWORD FLOW
  ====================================================== */

  @GrpcMethod('AuthService', 'RequestPasswordReset')
  async handleRequestPasswordResetGrpc(
    dto: RequestOtpDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Requesting Password Reset for ${dto.email}`);
    return await this.authService.requestPasswordReset(dto);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  async handleResetPasswordGrpc(
    dto: ResetPasswordDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Resetting Password for ${dto.email}`);
    return await this.authService.resetPassword(dto);
  }

  /* ======================================================
     ORGANIZATION SIGNUP - UPDATED with clientInfo
  ====================================================== */
  @GrpcMethod('AuthService', 'OrganisationSignup')
  async handleOrganisationSignupGrpc(
    data: OrganisationSignupRequestDto & { 
      clientInfo?: AuthClientInfoDto  // Add clientInfo
    }
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`gRPC: Organisation Signup for ${data.name} from ${data.clientInfo?.device || 'Unknown'}`);
    return await this.authService.organisationSignup(data, data.clientInfo);
  }
 
  /* ======================================================
     INDIVIDUAL SIGNUP - UPDATED with clientInfo
  ====================================================== */
  @GrpcMethod('AuthService', 'Signup')
  async handleSignupGrpc(
    data: UserSignupRequestDto & { 
      clientInfo?: AuthClientInfoDto  // Add clientInfo
    }
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log(`gRPC: Individual Signup for ${data.email} from ${data.clientInfo?.device || 'Unknown'}`);
    return await this.authService.signup(data, data.clientInfo);
  }

  /* ======================================================
     LOGIN (Stage 1: Identity Challenge)
  ====================================================== */
  @GrpcMethod('AuthService', 'Login')
  async handleLoginGrpc(
    loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`gRPC: Login Stage 1 for ${loginDto.email}`);
    return await this.authService.login(loginDto);
  }

  /* ======================================================
     VERIFY MFA LOGIN (Stage 2: Token Issuance) - UPDATED
  ====================================================== */
  @GrpcMethod('AuthService', 'VerifyMfaLogin')
  async handleVerifyMfaLoginGrpc(
    data: VerifyOtpDto & { 
      clientInfo?: AuthClientInfoDto  // Use the full DTO
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`gRPC: Login Stage 2 (MFA Verify) for ${data.email}`);
    
    // Log device info if available
    if (data.clientInfo) {
      this.logger.debug(`Device: ${data.clientInfo.device} (${data.clientInfo.deviceType}), Browser: ${data.clientInfo.browser}`);
    }
    
    return await this.authService.verifyMfaLogin(data, data.clientInfo);
  }
 
  /* ======================================================
     GOOGLE LOGIN - UPDATED with full AuthClientInfoDto
  ====================================================== */
  @GrpcMethod('AuthService', 'GoogleLogin')
  async handleGoogleLoginGrpc(
    data: { 
      token: string; 
      clientInfo?: AuthClientInfoDto  // Use full AuthClientInfoDto
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`gRPC: Google Login from ${data.clientInfo?.device || 'Unknown'}`);
    return await this.authService.signInWithGoogle(data.token, data.clientInfo);
  }

  /* ======================================================
     REFRESH TOKEN
  ====================================================== */
  @GrpcMethod('AuthService', 'Refresh')
  async handleRefreshGrpc(data: { refreshToken: string }): Promise<BaseResponseDto<TokenPairDto>> {
    return await this.authService.refreshToken(data.refreshToken);
  }

  /* ======================================================
     OTP MANAGEMENT
  ====================================================== */

  @GrpcMethod('AuthService', 'RequestOtp')
  async handleRequestOtpGrpc(
    data: RequestOtpDto & { purpose: string } 
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Request OTP for ${data.email} (${data.purpose})`);
    return await this.authService.requestOtp(data);
  }

  @GrpcMethod('AuthService', 'VerifyOtp')
  async handleVerifyOtpGrpc(
    data: VerifyOtpDto & { purpose: string }
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`gRPC: Verify OTP for ${data.email} (${data.purpose})`);
    return await this.authService.verifyOtp(data);
  }

  /* ======================================================
     SESSION MANAGEMENT
  ====================================================== */

  @GrpcMethod('AuthService', 'GetActiveSessions')
  async handleGetActiveSessionsGrpc(
    data: { userUuid: string }
  ): Promise<BaseResponseDto<SessionDto[]>> {
    this.logger.log(`gRPC: Fetching active sessions for user ${data.userUuid}`);
    return await this.authService.getActiveSessions(data.userUuid);
  }

  @GrpcMethod('AuthService', 'RevokeSessions')
  async handleRevokeSessionsGrpc(
    data: { userUuid: string; tokenId?: string }
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Revoking session(s) for user ${data.userUuid}`);
    
    // Perform the revoke
    await this.authService.logout(data.userUuid, data.tokenId);
    
    return {
      success: true,
      message: data.tokenId ? 'Session revoked successfully' : 'All sessions revoked',
      code: 'OK',
      data: null,
      error: null
    } as BaseResponseDto<null>;
  }

  /* ======================================================
     DEV TOKEN (BYPASS)
  ====================================================== */
  @GrpcMethod('AuthService', 'GenerateDevToken')
  async handleGenerateDevTokenGrpc(data: { 
    userUuid: string; 
    email: string; 
    role: string;
    accountId: string;
  }): Promise<BaseResponseDto<TokenPairDto>> {
    this.logger.warn(`🛠️ gRPC Bypass: Generating tokens for ${data.email} as ${data.role}`);

    const response = await this.authService.generateDevToken(
      data.userUuid, 
      data.email, 
      data.role, 
      data.accountId
    ); 
    
    return response;
  }
  
}