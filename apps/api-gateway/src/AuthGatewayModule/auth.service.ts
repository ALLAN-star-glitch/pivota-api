import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SignupRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
  UserResponseDto,
  BaseResponseDto,
  SignupResponseDto,
  GetUserByUserUuidDto,
} from '@pivota-api/dtos';
import { BaseUserResponseGrpc, JwtPayload } from '@pivota-api/interfaces';


// Updated gRPC interface for AuthService (signup now returns BaseResponse)
interface AuthServiceGrpc {
  signup(data: SignupRequestDto): Observable<BaseUserResponseGrpc<SignupResponseDto>>;
  login(
    data: LoginRequestDto & { clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'> }
  ): Observable<BaseUserResponseGrpc<LoginResponseDto>>;
  refresh(data: { refreshToken: string }): Observable<LoginResponseDto>;
  logout(data: { userId: string }): Observable<{ message: string }>;
}



interface UserServiceGrpc {
  getUserProfileByUuid  (data: GetUserByUserUuidDto ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private authGrpc: AuthServiceGrpc;
  private userGrpc: UserServiceGrpc;

  constructor(
    @Inject('AUTH_PACKAGE') private readonly grpcClient: ClientGrpc,
    @Inject('USER_PACKAGE') private readonly userGrpcClient: ClientGrpc,
  ) {
    this.authGrpc = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
    this.userGrpc = this.userGrpcClient.getService<UserServiceGrpc>('UserService');
  }

  /** ------------------ Signup ------------------ */
  async signup(signupDto: SignupRequestDto): Promise<BaseResponseDto<SignupResponseDto>> {
  this.logger.log('📩 Calling Auth microservice for signup');
  

  const grcpSignupResponse = await firstValueFrom(this.authGrpc.signup(signupDto));
  this.logger.log(`📩 Received response from Auth microservice: ${JSON.stringify(grcpSignupResponse)}`);

  // Map gRPC response to BaseResponseDto
  if (grcpSignupResponse.success) {
    return BaseResponseDto.ok(grcpSignupResponse.user, grcpSignupResponse.message, grcpSignupResponse.code);
  }

  return BaseResponseDto.fail(grcpSignupResponse.message, grcpSignupResponse.code);
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

    const LoginResponseData = grcpLoginResponse.user

    const access_token = LoginResponseData.accessToken

    const refresh_token = LoginResponseData.refreshToken

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
    

    if ( grcpLoginResponse.success) {
      return BaseResponseDto.ok(grcpLoginResponse.user, grcpLoginResponse.message, grcpLoginResponse.code);
    }
    return BaseResponseDto.fail(grcpLoginResponse.message, grcpLoginResponse.code);
  }

  /** ------------------ Refresh ------------------ */
  async refresh(refreshToken: string, res: Response): Promise<LoginResponseDto> {
    const refreshResp = await firstValueFrom(this.authGrpc.refresh({ refreshToken }));

    res.cookie('access_token', refreshResp.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshResp.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return refreshResp;
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

    if (!userResponse.success || !userResponse.user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return userResponse.user;
  }
  


}
