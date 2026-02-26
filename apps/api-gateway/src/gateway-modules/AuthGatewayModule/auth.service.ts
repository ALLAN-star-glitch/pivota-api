import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
  UserResponseDto,
  BaseResponseDto,
  GetUserByUserUuidDto,
  TokenPairDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto,
  RequestOtpDto,        
  VerifyOtpDto,         
  VerifyOtpResponseDataDto,
  ResetPasswordDto,
} from '@pivota-api/dtos';
import { BaseRefreshTokenResponseGrpc, JwtPayload } from '@pivota-api/interfaces';

// Updated gRPC interface for AuthService
interface AuthServiceGrpc {
  signup(
    data: UserSignupRequestDto
  ): Observable<BaseResponseDto<UserSignupDataDto>>;

  organisationSignup(
    data: OrganisationSignupRequestDto
  ): Observable<BaseResponseDto<OrganizationSignupDataDto>>;

  requestOtp(
    data: RequestOtpDto & { purpose: string }
  ): Observable<BaseResponseDto<null>>;

  verifyOtp(
    data: VerifyOtpDto & { purpose: string }
  ): Observable<BaseResponseDto<VerifyOtpResponseDataDto>>;

  login(
    data: LoginRequestDto
  ): Observable<BaseResponseDto<LoginResponseDto>>;

  // NEW: Specifically for the 2nd stage of the MFA flow
  verifyMfaLogin(
    data: VerifyOtpDto & {
      clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<BaseResponseDto<LoginResponseDto>>;

  refresh(
    data: { refreshToken: string }
  ): Observable<BaseRefreshTokenResponseGrpc<TokenPairDto>>;

  logout(data: { userId: string }): Observable<{ message: string }>;

  generateDevToken(
    data: { userUuid: string; email: string; role: string; accountId: string }
  ): Observable<BaseResponseDto<TokenPairDto>>;

  googleLogin(
    data: {
      token: string;
      clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<BaseResponseDto<LoginResponseDto>>;

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
}

interface UserServiceGrpc {
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserResponseDto> | null>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private authGrpc: AuthServiceGrpc;
  private userGrpc: UserServiceGrpc;

  constructor(
    @Inject('AUTH_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('PROFILE_PACKAGE') private readonly userGrpcClient: ClientGrpc,
  ) {
    this.authGrpc = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
    this.userGrpc = this.userGrpcClient.getService<UserServiceGrpc>('ProfileService');
  }

  /** ------------------ Private Helper: Set Auth Cookies ------------------ */
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  /** ------------------ OTP Management ------------------ */

 async requestOtp(
    dto: RequestOtpDto, 
    purpose: string
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📩 Requesting OTP [${purpose}] for: ${dto.email}`);

    // We spread the dto and add the purpose so the gRPC microservice receives both
    const response = await firstValueFrom(
      this.authGrpc.requestOtp({ 
        ...dto, 
        purpose 
      })
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

    // Pass the purpose to verifyOtp to ensure the code is valid for this specific action
    const response = await firstValueFrom(
      this.authGrpc.verifyOtp({ 
        ...dto, 
        purpose 
      })
    );

    if (response.success) {
      return BaseResponseDto.ok(response.data, response.message, response.code);
    }
    return BaseResponseDto.fail(response.message, response.code);
  }
  /** ------------------ Signup ------------------ */
  async signup(signupDto: UserSignupRequestDto): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log('📩 Calling Auth microservice for signup');

    const grcpSignupResponse = await firstValueFrom(this.authGrpc.signup(signupDto));
    this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grcpSignupResponse)}`);

    if (grcpSignupResponse.success) {
      return BaseResponseDto.ok(grcpSignupResponse.data, grcpSignupResponse.message, grcpSignupResponse.code);
    }

    return BaseResponseDto.fail(grcpSignupResponse.message, grcpSignupResponse.code);
  }

  /** ------------------ Organisation Signup ------------------ */
  async signupOrganisation(
    dto: OrganisationSignupRequestDto,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log('📩 Calling Auth microservice for organisation signup');

    const grpcResponse = await firstValueFrom(
      this.authGrpc.organisationSignup(dto),
    );

    this.logger.debug(
      `📩 Received response from Auth microservice: ${JSON.stringify(grpcResponse)}`,
    );

    if (grpcResponse.success) {
      return BaseResponseDto.ok(
        grpcResponse.data,
        grpcResponse.message,
        grpcResponse.code,
      );
    }

    return BaseResponseDto.fail(
      grpcResponse.message,
      grpcResponse.code,
    );
  }

  /** ------------------ Login (Stage 1) ------------------ */
  async login(
    loginDto: LoginRequestDto,
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    // Stage 1: Just credentials. No cookies set here.
    const grcpLoginResponse = await firstValueFrom(this.authGrpc.login(loginDto));
    
    this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grcpLoginResponse)}`);

    if (!grcpLoginResponse.success || !grcpLoginResponse.data) {
      return BaseResponseDto.fail(grcpLoginResponse.message, grcpLoginResponse.code);
    }

    return BaseResponseDto.ok(grcpLoginResponse.data, grcpLoginResponse.message, grcpLoginResponse.code);
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
    
    // Tokens are now available. Set cookies.
    this.setAuthCookies(res, loginData.accessToken, loginData.refreshToken);

    return BaseResponseDto.ok(loginData, response.message, response.code);
  }

  /** ------------------ Google Login ------------------ */
  async googleLogin(
    token: string,
    clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log('📩 Calling Auth microservice for Google login');

    const grpcPayload = { token, clientInfo };
    const grpcResponse = await firstValueFrom(this.authGrpc.googleLogin(grpcPayload));

    this.logger.debug(`📩 Google Auth response: ${JSON.stringify(grpcResponse)}`);

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

    if (!refreshResp.success || !refreshResp.tokens) {
        return BaseResponseDto.fail(refreshResp.message, refreshResp.code);
    }

    this.setAuthCookies(res, refreshResp.tokens.accessToken, refreshResp.tokens.refreshToken);

    return BaseResponseDto.ok(refreshResp.tokens, refreshResp.message, refreshResp.code);
  }

  /** ------------------ Logout (Enhanced) ------------------ */
  async logout(res: Response): Promise<void> {
    // We clear the browser cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    this.logger.log('🍪 Auth cookies cleared');
  }


  /** ------------------ Get User From Payload ------------------ */
  async getUserFromPayload(payload: JwtPayload): Promise<UserResponseDto> {
    const userResponse = await firstValueFrom(
      this.userGrpc.getUserProfileByUuid({ userUuid: payload.userUuid })
    );

    this.logger.debug(`User Response: ${JSON.stringify(userResponse.data)}`)
    if (!userResponse.success || !userResponse.data) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return userResponse.data;
  }
  
  

  /** ------------------ Generate Dev Token (Testing Only) ------------------ */
  /** * ------------------ Generate Dev Token (Testing Only) ------------------ 
   * FIXED: Now correctly accepts and passes accountId to the auth microservice.
   */
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

  /** ------------------ Forgot Password: Step 1 (Request) ------------------ */
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

  /** ------------------ Forgot Password: Step 2 (Reset) ------------------ */
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
        // Return the array of SessionDto objects (device, ip, lastActiveAt, etc.)
        return BaseResponseDto.ok(response.data || [], response.message, response.code);
      }
      
      return BaseResponseDto.fail(response.message, response.code);
    } catch (error) {
      this.logger.error(`Failed to fetch active sessions via gRPC: ${error.message}`);
      return BaseResponseDto.fail('Communication error while fetching sessions', 'SERVICE_UNAVAILABLE');
    }
  }
}