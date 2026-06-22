
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthenticationService } from '../services/authentication.service';
import { MfaService } from '../services/mfa.service';
import {
  LoginResponseDto,
  LoginRequestDto,
  TokenPairDto,
  BaseResponseDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  SessionDto,
  AuthClientInfoDto,
  GoogleOnboardingDataDto,
  GoogleLoginRequestDto,
  SyncUserRoleResponseDto,
} from '@pivota-api/dtos';
import { OtpPurpose } from '@pivota-api/shared-redis';

@Controller()
export class AuthenticationController {
  private readonly logger = new Logger(AuthenticationController.name);

  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly mfaService: MfaService,
  ) {}

  /* ======================================================
     FORGOT PASSWORD FLOW
  ====================================================== */

  @GrpcMethod('AuthenticationService', 'RequestPasswordReset')
  async handleRequestPasswordResetGrpc(
    dto: RequestOtpDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Requesting Password Reset for ${dto.email}`);
    return await this.authenticationService.requestPasswordReset(dto);
  }

  @GrpcMethod('AuthenticationService', 'ResetPassword')
  async handleResetPasswordGrpc(
    dto: ResetPasswordDto,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Resetting Password for ${dto.email}`);
    return await this.authenticationService.resetPassword(dto);
  }

  /* ======================================================
     LOGIN (Stage 1: Identity Challenge)
  ====================================================== */
  @GrpcMethod('AuthenticationService', 'Login')
  async handleLoginGrpc(
    loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`gRPC: Login Stage 1 for ${loginDto.email}`);
    return await this.authenticationService.login(loginDto);
  }
 
  /* ======================================================
     VERIFY MFA LOGIN (Stage 2: Token Issuance)
  ====================================================== */
  @GrpcMethod('AuthenticationService', 'VerifyMfaLogin')
  async handleVerifyMfaLoginGrpc(
    data: VerifyOtpDto & { 
      clientInfo?: AuthClientInfoDto
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`gRPC: Login Stage 2 (MFA Verify) for ${data.email}`);
    
    if (data.clientInfo) {
      this.logger.debug(`Device: ${data.clientInfo.device} (${data.clientInfo.deviceType}), Browser: ${data.clientInfo.browser}`);
    }
    
    return await this.authenticationService.verifyMfaLogin(data, data.clientInfo);
  }
 
  /* ======================================================
     GOOGLE LOGIN
  ====================================================== */
  @GrpcMethod('AuthenticationService', 'GoogleLogin')
  async handleGoogleLoginGrpc(
    data: { 
      token: string; 
      clientInfo?: AuthClientInfoDto;
      onboardingData?: GoogleOnboardingDataDto;
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`gRPC: Google Login from ${data.clientInfo?.device || 'Unknown'}`);
    
    const googleLoginRequest: GoogleLoginRequestDto = {
      token: data.token,
      onboardingData: data.onboardingData
    };
    
    if (data.onboardingData?.primaryPurpose) {
      this.logger.log(`gRPC: Google Login with onboarding purpose: ${data.onboardingData.primaryPurpose}`);
    }
    
    return await this.authenticationService.signInWithGoogle(
      data.clientInfo,
      googleLoginRequest
    );
  }

  /* ======================================================
     REFRESH TOKEN
  ====================================================== */
  @GrpcMethod('AuthenticationService', 'Refresh')
  async handleRefreshGrpc(data: { refreshToken: string }): Promise<BaseResponseDto<TokenPairDto>> {
    return await this.authenticationService.refreshToken(data.refreshToken);
  }

  /* ======================================================
     OTP MANAGEMENT
  ====================================================== */

  @GrpcMethod('AuthenticationService', 'RequestOtp')
  async handleRequestOtpGrpc(
    data: RequestOtpDto & { purpose: OtpPurpose } 
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Request OTP for ${data.email} (${data.purpose})`);
    return await this.mfaService.requestOtp(data);
  }
  
  @GrpcMethod('AuthenticationService', 'VerifyOtp')
  async handleVerifyOtpGrpc(
    data: VerifyOtpDto & { purpose: OtpPurpose }
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`gRPC: Verify OTP for ${data.email} (${data.purpose})`);
    return await this.mfaService.verifyOtp(data);
  }

  /* ======================================================
     SESSION MANAGEMENT
  ====================================================== */

  @GrpcMethod('AuthenticationService', 'GetActiveSessions')
  async handleGetActiveSessionsGrpc(
    data: { userUuid: string }
  ): Promise<BaseResponseDto<SessionDto[]>> {
    this.logger.log(`gRPC: Fetching active sessions for user ${data.userUuid}`);
    return await this.authenticationService.getActiveSessions(data.userUuid);
  }

  @GrpcMethod('AuthenticationService', 'RevokeSessions')
  async handleRevokeSessionsGrpc(
    data: { userUuid: string; tokenId?: string }
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`gRPC: Revoking session(s) for user ${data.userUuid}`);
    
    await this.authenticationService.logout(data.userUuid, data.tokenId);
    
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
  @GrpcMethod('AuthenticationService', 'GenerateDevToken')
  async handleGenerateDevTokenGrpc(data: { 
    userUuid: string; 
    email: string; 
    role: string;
    accountId: string;
  }): Promise<BaseResponseDto<TokenPairDto>> {
    this.logger.warn(`🛠️ gRPC Bypass: Generating tokens for ${data.email} as ${data.role}`);

    const response = await this.authenticationService.generateDevToken(
      data.userUuid, 
      data.email, 
      data.role, 
      data.accountId
    ); 
    
    return response;
  }

  /* ======================================================
     SYNC USER ROLE
  ====================================================== */
  @GrpcMethod('AuthenticationService', 'SyncUserRole')
  async handleSyncUserRole(
    data: { userUuid: string; roleName: string; roleType: string; scope: string }
  ): Promise<BaseResponseDto<SyncUserRoleResponseDto>> {
    this.logger.log(`🔄 gRPC: Syncing role for user ${data.userUuid} to ${data.roleName} (${data.roleType}) with scope ${data.scope}`);
    
    return this.authenticationService.syncUserRole(
      data.userUuid,
      data.roleName,
      data.roleType,
      data.scope
    );
  }
}