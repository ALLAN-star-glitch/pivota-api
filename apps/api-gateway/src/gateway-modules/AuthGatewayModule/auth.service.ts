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
} from '@pivota-api/dtos';
import {  BaseRefreshTokenResponseGrpc, JwtPayload, BaseTokenResponseGrpc } from '@pivota-api/interfaces';


// Updated gRPC interface for AuthService (signup now returns BaseResponse)
interface AuthServiceGrpc {
  signup(
    data: UserSignupRequestDto
  ): Observable<BaseResponseDto<UserSignupDataDto>>;

  organisationSignup(
    data: OrganisationSignupRequestDto
  ): Observable<BaseResponseDto<OrganizationSignupDataDto>>;

  login(
    data: LoginRequestDto & {
      clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<BaseResponseDto<LoginResponseDto>>;

  refresh(
    data: { refreshToken: string }
  ): Observable<BaseRefreshTokenResponseGrpc<TokenPairDto>>;

  logout(data: { userId: string }): Observable<{ message: string }>;

  generateDevToken(
    data: { userUuid: string; email: string; role: string }
  ): Observable<BaseTokenResponseGrpc<TokenPairDto>>;

  googleLogin(
    data: {
      token: string;
      clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<BaseResponseDto<LoginResponseDto>>;
}




interface UserServiceGrpc {
  getUserProfileByUuid  (data: GetUserByUserUuidDto ): Observable<BaseResponseDto<UserResponseDto> | null>;
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

  /** ------------------ Signup ------------------ */
  async signup(signupDto: UserSignupRequestDto): Promise<BaseResponseDto<UserSignupDataDto>> {
  this.logger.log('📩 Calling Auth microservice for signup');
  

  const grcpSignupResponse = await firstValueFrom(this.authGrpc.signup(signupDto));
  this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grcpSignupResponse)}`);

  // Map gRPC response to BaseResponseDto
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


  /** ------------------ Login ------------------ */
  async login(
    loginDto: LoginRequestDto,
    clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    const grpcPayload = { ...loginDto, clientInfo };
    const grcpLoginResponse = await firstValueFrom(this.authGrpc.login(grpcPayload));
    
    this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grcpLoginResponse)}`);

    // ✅ 1. Check for failure first
    if (!grcpLoginResponse.success || !grcpLoginResponse.data) {
      return BaseResponseDto.fail(grcpLoginResponse.message, grcpLoginResponse.code);
    }

    // ✅ 2. Safe to access data now because we know it exists
    const loginData = grcpLoginResponse.data;
    const access_token = loginData.accessToken;
    const refresh_token = loginData.refreshToken;

    // 3. Set Cookies
    res.cookie('access_token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 4. Return the successful DTO
    return BaseResponseDto.ok(loginData, grcpLoginResponse.message, grcpLoginResponse.code);
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

    // 1. Handle failure
    if (!grpcResponse.success || !grpcResponse.data) {
      return BaseResponseDto.fail(grpcResponse.message, grpcResponse.code);
    }

    const loginData = grpcResponse.data;

    // 2. Set Secure Cookies (Matches standard login behavior)
    res.cookie('access_token', loginData.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refresh_token', loginData.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 3. Return the response to the Gateway Controller
    return BaseResponseDto.ok(loginData, grpcResponse.message, grpcResponse.code);
  }

  /** ------------------ Refresh ------------------ */
  /** ------------------ Refresh ------------------ */
  async refresh(refreshToken: string, res: Response): Promise<BaseResponseDto<TokenPairDto>> {
    const refreshResp = await firstValueFrom(this.authGrpc.refresh({ refreshToken }));

    // Check success before setting cookies
    if (!refreshResp.success || !refreshResp.tokens) {
        return BaseResponseDto.fail(refreshResp.message, refreshResp.code);
    }

    res.cookie('access_token', refreshResp.tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    
    res.cookie('refresh_token', refreshResp.tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return BaseResponseDto.ok(refreshResp.tokens, refreshResp.message, refreshResp.code);
  }

  /** ------------------ Logout ------------------ */
  async logout(res: Response): Promise<void> {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
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
async generateDevTokenOnly(
  userUuid: string,
  email: string,
  role: string,
  res: Response
): Promise<BaseResponseDto<TokenPairDto>> {
  try {
    // Call microservice via gRPC
    const grpcResponse = await firstValueFrom(
      this.authGrpc.generateDevToken({ userUuid, email, role })
    );

    if (!grpcResponse.success || !grpcResponse.tokens) {
      return BaseResponseDto.fail(grpcResponse.message, grpcResponse.code);
    }

    const { accessToken, refreshToken } = grpcResponse.tokens;

    // Set Cookies (Matches your login behavior)
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

    // Return only the tokens in the data envelope
    const tokenData: TokenPairDto = { accessToken, refreshToken };
    return BaseResponseDto.ok(tokenData, 'Dev tokens generated', 'OK');
  } catch (error) {
    this.logger.error('gRPC Dev Token Failure:', error);
    return BaseResponseDto.fail('Failed to generate dev token', 'INTERNAL');
  }
}


}
