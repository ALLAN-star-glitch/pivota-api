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
  SessionDto, // Add this import
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
     ORGANIZATION SIGNUP
  ====================================================== */
  @GrpcMethod('AuthService', 'OrganisationSignup')
  async handleOrganisationSignupGrpc(
    dto: OrganisationSignupRequestDto,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`gRPC: Organisation Signup for ${dto.name}`);
    return await this.authService.organisationSignup(dto);
  }

  /* ======================================================
     INDIVIDUAL SIGNUP
  ====================================================== */
  @GrpcMethod('AuthService', 'Signup')
  async handleSignupGrpc(
    signupDto: UserSignupRequestDto,
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log(`gRPC: Individual Signup for ${signupDto.email}`);
    return await this.authService.signup(signupDto);
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
     VERIFY MFA LOGIN (Stage 2: Token Issuance)
  ====================================================== */
  @GrpcMethod('AuthService', 'VerifyMfaLogin')
  async handleVerifyMfaLoginGrpc(
    data: VerifyOtpDto & { 
      clientInfo?: { 
        device?: string; 
        ipAddress?: string;
        userAgent?: string; 
        os?: string 
      } 
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`gRPC: Login Stage 2 (MFA Verify) for ${data.email}`);

    // Map gRPC message to session DTO shape
    const clientInfo = {
      device: data.clientInfo?.device || 'Unknown',
      ipAddress: data.clientInfo?.ipAddress || 'Unknown',
      userAgent: data.clientInfo?.userAgent || 'Unknown',
      os: data.clientInfo?.os || 'Unknown',
    };

    return await this.authService.verifyMfaLogin(data, clientInfo);
  }

  /* ======================================================
     GOOGLE LOGIN
  ====================================================== */
  @GrpcMethod('AuthService', 'GoogleLogin')
  async handleGoogleLoginGrpc(
    data: { 
      token: string; 
      clientInfo?: { 
        device?: string; 
        ipAddress?: string; 
        userAgent?: string; 
        os?: string 
      } 
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const clientInfo = data.clientInfo || { device: 'Unknown', ipAddress: 'Unknown' };
    return await this.authService.signInWithGoogle(data.token, clientInfo);
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
    data: RequestOtpDto
  ): Promise<BaseResponseDto<null>> {
    return await this.authService.requestOtp(data);
  }

  @GrpcMethod('AuthService', 'VerifyOtp')
  async handleVerifyOtpGrpc(
    data: VerifyOtpDto
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
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
    };
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