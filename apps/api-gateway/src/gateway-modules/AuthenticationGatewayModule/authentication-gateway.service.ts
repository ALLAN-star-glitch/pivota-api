/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, Observable } from 'rxjs';
import {
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
  UserResponseDto,
  BaseResponseDto,
  GetUserByUserUuidDto,
  TokenPairDto,
  RequestOtpDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
  AuthClientInfoDto,
  GoogleOnboardingDataDto,
} from '@pivota-api/dtos';
import { JwtPayload } from '@pivota-api/interfaces';
import { OtpPurpose } from '@pivota-api/shared-redis';

// Updated gRPC interface for AuthenticationService
interface AuthenticationServiceGrpc {
  login(
    data: LoginRequestDto
  ): Observable<BaseResponseDto<LoginResponseDto>>;

  verifyMfaLogin(
    data: VerifyOtpDto & {
      clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<BaseResponseDto<LoginResponseDto>>;

  refresh(
    data: { refreshToken: string }
  ): Observable<BaseResponseDto<TokenPairDto>>;

  requestOtp(
    data: RequestOtpDto & { purpose: OtpPurpose }
  ): Observable<BaseResponseDto<null>>;

  verifyOtp(
    data: VerifyOtpDto & { purpose: string }
  ): Observable<BaseResponseDto<VerifyOtpResponseDataDto>>;

  googleLogin(data: {
    token: string;
    clientInfo: AuthClientInfoDto;
    onboardingData?: GoogleOnboardingDataDto;
  }): Observable<BaseResponseDto<LoginResponseDto>>;

  requestPasswordReset(
    data: RequestOtpDto
  ): Observable<BaseResponseDto<null>>;

  resetPassword(
    data: ResetPasswordDto
  ): Observable<BaseResponseDto<null>>;

  revokeSessions(
    data: { userUuid: string; tokenId?: string }
  ): Observable<BaseResponseDto<null>>;

  getActiveSessions(
    data: { userUuid: string }
  ): Observable<BaseResponseDto<SessionDto[]>>;

  generateDevToken(
    data: { userUuid: string; email: string; role: string; accountId: string }
  ): Observable<BaseResponseDto<TokenPairDto>>;
}

interface UserServiceGrpc {
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserResponseDto> | null>;
}

@Injectable()
export class AuthenticationGatewayService {
  private readonly logger = new Logger(AuthenticationGatewayService.name);
  private authGrpc: AuthenticationServiceGrpc;
  private userGrpc: UserServiceGrpc;
  
  // ✅ Read cookie expiry from config
  private readonly accessTokenCookieMaxAge: number;
  private readonly refreshTokenCookieMaxAge: number;

  constructor(
    @Inject('AUTHENTICATION_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('PROFILE_PACKAGE') private readonly userGrpcClient: ClientGrpc,
    private readonly configService: ConfigService,
  ) {
    this.authGrpc = this.grpcClient.getService<AuthenticationServiceGrpc>('AuthenticationService');
    this.userGrpc = this.userGrpcClient.getService<UserServiceGrpc>('ProfileService');
    
    // ✅ Read cookie expiry from config (match token expiry)
    this.accessTokenCookieMaxAge = this.parseDurationToMs(
      this.configService.get<string>('JWT_EXPIRES_IN', '15m')
    );
    this.refreshTokenCookieMaxAge = this.parseDurationToMs(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')
    );
    
    this.logger.log('🍪 Cookie configuration initialized');
    this.logger.log(`  Access token cookie maxAge: ${this.accessTokenCookieMaxAge}ms`);
    this.logger.log(`  Refresh token cookie maxAge: ${this.refreshTokenCookieMaxAge}ms`);
  }

  /** ------------------ Private Helper: Set Auth Cookies ------------------ */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'none' as const,
      secure: true,
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: this.accessTokenCookieMaxAge,
    });
    
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: this.refreshTokenCookieMaxAge,
    });

    this.logger.debug(`🍪 Auth cookies set (access: ${this.accessTokenCookieMaxAge}ms, refresh: ${this.refreshTokenCookieMaxAge}ms)`);
  }

  /** ------------------ Parse Duration Helper ------------------ */
  private parseDurationToMs(duration: string): number {
    // Handle numeric values (treat as seconds)
    if (/^\d+$/.test(duration)) {
      return parseInt(duration) * 1000;
    }
    
    // Handle duration strings like '15m', '7d', '1h'
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1));
    
    if (isNaN(value)) {
      this.logger.warn(`Invalid duration format: ${duration}, defaulting to 15 minutes`);
      return 15 * 60 * 1000;
    }
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 3600 * 1000;
      case 'd': return value * 86400 * 1000;
      default: 
        // If no unit, assume seconds
        if (!isNaN(parseInt(duration))) {
          return parseInt(duration) * 1000;
        }
        this.logger.warn(`Unknown duration unit: ${unit}, defaulting to 15 minutes`);
        return 15 * 60 * 1000;
    }
  }

  /** ------------------ OTP Management ------------------ */

  async requestOtp(
    dto: RequestOtpDto,
    purpose: OtpPurpose
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 Requesting OTP [${purpose}] for: ${dto.email}`);

    const response = await firstValueFrom(
      this.authGrpc.requestOtp({ ...dto, purpose })
    );

    if (response.success) {
      return BaseResponseDto.ok(null, response.message, response.code);
    }
    return BaseResponseDto.fail(response.message, response.code);
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    purpose: string
  ): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    this.logger.log(`🔍 Verifying OTP [${purpose}] for: ${dto.email}`);

    const response = await firstValueFrom(
      this.authGrpc.verifyOtp({ ...dto, purpose })
    );

    if (response.success) {
      return BaseResponseDto.ok(response.data, response.message, response.code);
    }
    return BaseResponseDto.fail(response.message, response.code);
  }

  /** ------------------ Login (Stage 1) ------------------ */
  async login(
    loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const grpcLoginResponse = await firstValueFrom(this.authGrpc.login(loginDto));

    this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grpcLoginResponse)}`);

    if (!grpcLoginResponse.success || !grpcLoginResponse.data) {
      return BaseResponseDto.fail(grpcLoginResponse.message, grpcLoginResponse.code);
    }

    return BaseResponseDto.ok(grpcLoginResponse.data, grpcLoginResponse.message, grpcLoginResponse.code);
  }

  /** ------------------ Verify MFA Login (Stage 2) ------------------ */
  async verifyMfaLogin(
    dto: VerifyOtpDto,
    clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`📩 Verifying MFA Login for: ${dto.email}`);

    const response = await firstValueFrom(
      this.authGrpc.verifyMfaLogin({ ...dto, clientInfo })
    );

    if (!response.success || !response.data) {
      return BaseResponseDto.fail(response.message, response.code);
    }

    const loginData = response.data;
    this.setAuthCookies(res, loginData.accessToken, loginData.refreshToken);

    return BaseResponseDto.ok(loginData, response.message, response.code);
  }

  /** ------------------ Google Login ------------------ */
  async googleLogin(
    token: string,
    clientInfo: AuthClientInfoDto,
    res: Response,
    onboardingData?: GoogleOnboardingDataDto
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log('📩 Calling Auth microservice for Google login');

    const grpcPayload: any = { token, clientInfo };

    if (onboardingData) {
      grpcPayload.onboardingData = {
        primaryPurpose: onboardingData.primaryPurpose,
        jobSeekerData: onboardingData.jobSeekerData,
        housingSeekerData: onboardingData.housingSeekerData,
        skilledProfessionalData: onboardingData.skilledProfessionalData,
        intermediaryAgentData: onboardingData.intermediaryAgentData,
        supportBeneficiaryData: onboardingData.supportBeneficiaryData,
        employerData: onboardingData.employerData,
        propertyOwnerData: onboardingData.propertyOwnerData,
      };

      this.logger.log(`📦 Google Login with onboarding data - Purpose: ${onboardingData.primaryPurpose}`);
    }

    const grpcResponse = await firstValueFrom(this.authGrpc.googleLogin(grpcPayload));

    if (!grpcResponse.success || !grpcResponse.data) {
      return BaseResponseDto.fail(grpcResponse.message, grpcResponse.code);
    }

    const loginData = grpcResponse.data;
    this.setAuthCookies(res, loginData.accessToken, loginData.refreshToken);

    return BaseResponseDto.ok(loginData, grpcResponse.message, grpcResponse.code);
  }

  /** ------------------ Refresh ------------------ */
  async refresh(refreshToken: string, res: Response): Promise<BaseResponseDto<TokenPairDto>> {
    const refreshResp = await firstValueFrom(this.authGrpc.refresh({ refreshToken }));

    if (!refreshResp.success || !refreshResp.data) {
      return BaseResponseDto.fail(refreshResp.message, refreshResp.code);
    }

    this.setAuthCookies(res, refreshResp.data.accessToken, refreshResp.data.refreshToken);

    return BaseResponseDto.ok(refreshResp.data, refreshResp.message, refreshResp.code);
  }

  /** ------------------ Logout ------------------ */
  async logout(userUuid: string, tokenId: string, res: Response): Promise<BaseResponseDto<null>> {
    this.logger.log(`🚨 Logout requested for user: ${userUuid}, tokenId: ${tokenId}`);

    try {
      const revokeResponse = await this.revokeSessions(userUuid, tokenId);

      if (!revokeResponse.success) {
        this.logger.warn(`⚠️ Failed to revoke session: ${revokeResponse.message}`);
      } else {
        this.logger.log(`✅ Session revoked successfully for user: ${userUuid}`);
      }

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      this.logger.log('🍪 Auth cookies cleared');

      return BaseResponseDto.ok(null, 'Logged out successfully', 'OK');

    } catch (error) {
      this.logger.error(`❌ Logout error: ${error.message}`);

      res.clearCookie('access_token');
      res.clearCookie('refresh_token');

      return BaseResponseDto.ok(null, 'Logged out successfully', 'OK');
    }
  }

  /** ------------------ Get User From Payload ------------------ */
  async getUserFromPayload(payload: JwtPayload): Promise<UserResponseDto> {
    const userResponse = await firstValueFrom(
      this.userGrpc.getUserProfileByUuid({ userUuid: payload.sub })
    );

    if (!userResponse.success || !userResponse.data) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return userResponse.data;
  }

  /** ------------------ Dev Token Generation ------------------ */
  async generateDevTokenOnly(
    userUuid: string,
    email: string,
    role: string,
    accountId: string,
    res: Response
  ): Promise<BaseResponseDto<TokenPairDto>> {
    try {
      this.logger.debug(`🛠 Generating Dev Token for Account: ${accountId}`);

      const grpcResponse = await firstValueFrom(
        this.authGrpc.generateDevToken({ userUuid, email, role, accountId })
      );

      if (!grpcResponse.success || !grpcResponse.data) {
        return BaseResponseDto.fail(grpcResponse.message, grpcResponse.code);
      }

      const { accessToken, refreshToken } = grpcResponse.data;
      this.setAuthCookies(res, accessToken, refreshToken);

      return BaseResponseDto.ok({ accessToken, refreshToken }, 'Dev tokens generated', 'OK');
    } catch (error) {
      this.logger.error('gRPC Dev Token Failure:', error);
      return BaseResponseDto.fail('Failed to generate dev token', 'INTERNAL');
    }
  }

  /** ------------------ Password Management ------------------ */
  async requestPasswordReset(dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 Requesting password reset OTP for: ${dto.email}`);

    const response = await firstValueFrom(
      this.authGrpc.requestPasswordReset(dto)
    );

    if (response.success) {
      return BaseResponseDto.ok(null, response.message, response.code);
    }
    return BaseResponseDto.fail(response.message, response.code);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔄 Attempting password reset for: ${dto.email}`);

    const response = await firstValueFrom(
      this.authGrpc.resetPassword(dto)
    );

    if (response.success) {
      return BaseResponseDto.ok(null, response.message, response.code);
    }
    return BaseResponseDto.fail(response.message, response.code);
  }

  /** ------------------ Session Management ------------------ */
  async revokeSessions(userUuid: string, tokenId?: string): Promise<BaseResponseDto<null>> {
    this.logger.log(`🚫 Requesting session revocation for user: ${userUuid} ${tokenId ? `(Token: ${tokenId})` : '(ALL)'}`);

    try {
      const response = await firstValueFrom(
        this.authGrpc.revokeSessions({ userUuid, tokenId })
      );

      if (response.success) {
        return BaseResponseDto.ok(null, response.message, response.code);
      }
      return BaseResponseDto.fail(response.message, response.code);
    } catch (error) {
      this.logger.error(`Failed to revoke session via gRPC: ${error.message}`);
      return BaseResponseDto.fail('Communication error during session revocation', 'INTERNAL');
    }
  }

  async getActiveSessions(userUuid: string): Promise<BaseResponseDto<SessionDto[]>> {
    this.logger.log(`🔍 Fetching active sessions for user: ${userUuid}`);

    try {
      const response = await firstValueFrom(
        this.authGrpc.getActiveSessions({ userUuid })
      );

      if (response.success) {
        return BaseResponseDto.ok(response.data || [], response.message, response.code);
      }

      return BaseResponseDto.fail(response.message, response.code);
    } catch (error) {
      this.logger.error(`Failed to fetch active sessions via gRPC: ${error.message}`);
      return BaseResponseDto.fail('Communication error while fetching sessions', 'SERVICE_UNAVAILABLE');
    }
  }
}