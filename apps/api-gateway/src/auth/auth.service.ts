import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SignupRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { JwtPayload } from '@pivota-api/interfaces';

interface AuthServiceGrpc {
  signup(data: SignupRequestDto): Observable<UserResponseDto>;
  login(
    data: LoginRequestDto & { clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'> }
  ): Observable<LoginResponseDto>;
  refresh(data: { refreshToken: string }): Observable<LoginResponseDto>;
  logout(data: { userId: string }): Observable<{ message: string }>;
}

interface UserServiceGrpc {
  getUserProfileById(data: { id: string }): Observable<UserResponseDto | null>;
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

  async signup(signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log('📩 Calling Auth microservice for signup');
    return firstValueFrom(this.authGrpc.signup(signupDto));
  }

  async login(
    loginDto: LoginRequestDto,
    clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    res: Response
  ): Promise<LoginResponseDto> {
    const grpcPayload = { ...loginDto, clientInfo };
    const loginResp = await firstValueFrom(this.authGrpc.login(grpcPayload));

    // Set cookies
    res.cookie('access_token', loginResp.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', loginResp.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return loginResp;
  }

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

  async logout(res: Response): Promise<void> {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  // Used by JwtStrategy
  async getUserFromPayload(payload: JwtPayload): Promise<UserResponseDto | null> {
    this.logger.debug(`Fetching user from User service for payload: ${JSON.stringify(payload)}`);
    const user$ = this.userGrpc.getUserProfileById({ id: payload.sub });
    const user = await firstValueFrom(user$);
    return user || null;
  }
}
