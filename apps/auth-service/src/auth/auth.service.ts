import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
  OnModuleInit,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './jwt.strategy';
import {
  SignupRequestDto,
  SignupResponseDto,
  LoginResponseDto,
  AuthUserDto,
  LoginRequestDto,
  UserCredentialsDto,
  TokenPairDto,
  SessionDto,
} from '@pivota-api/dtos';
import * as grpc from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';

// gRPC interface from UserService proto
interface UserServiceGrpc {
  createUser(data: SignupRequestDto): Promise<SignupResponseDto>;
  getUserByEmail(data: { email: string }): Promise<AuthUserDto>;
  getUserByEmailInternal(data: { email: string }): Promise<UserCredentialsDto>;
  getUserByIdInternal(data: { id: string }): Promise<UserCredentialsDto>;
  validateUserCredentials(data: LoginRequestDto): Observable<AuthUserDto>;
  createRefreshToken(data: {
    userId: number;
    hashedToken: string;
    device?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void>;

  getRefreshTokenByTokenId(tokenId: string): Promise<{
    tokenId: string;
    hashedToken: string;  // internal
    revoked: boolean;
    expiresAt: Date;
  } | null>;

  revokeRefreshToken(tokenId: string): Promise<void>;
  listUserSessions(userId: string): Promise<SessionDto[]>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private userGrpcService: UserServiceGrpc;
  private getGrpcService(): UserServiceGrpc {
  if (!this.userGrpcService) {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
  }
  return this.userGrpcService;
}


  constructor(
    private readonly jwtService: JwtService,
    @Inject('USER_GRPC') private readonly grpcClient: ClientGrpc,
  ) {}

  async onModuleInit() {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    this.logger.log('✅ AuthService initialized (gRPC)');
  }

  // ------------------ Helpers ------------------
  private async generateTokens(user: Pick<AuthUserDto, 'id' | 'email'>) {
    const payload = { email: user.email, sub: user.id };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    // store hashed refresh token in UserService as a new session
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.userGrpcService.createRefreshToken({
      userId: Number(user.id),
      hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return { accessToken, refreshToken };
  }

  // ------------------ Signup ------------------
  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
  try {
    const grpcService = this.getGrpcService();
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    return await grpcService.createUser({ ...signupDto, password: hashedPassword });
  } catch (err: unknown) {
    const grpcError = err as grpc.ServiceError;
    this.logger.error('Signup gRPC error:', grpcError.message);

    switch (grpcError.code) {
      case grpc.status.ALREADY_EXISTS:
        throw new ConflictException(grpcError.message || 'Email or phone already exists');
      case grpc.status.INVALID_ARGUMENT:
        throw new BadRequestException(grpcError.message || 'Invalid signup details');
      default:
        throw new InternalServerErrorException(grpcError.message || 'Signup failed');
    }
  }
}



  // ------------------ Login ------------------
 async login(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
  const grpcService = this.getGrpcService();

  // Convert Observable to Promise
  const user = await firstValueFrom(grpcService.validateUserCredentials(loginDto));
  this.logger.log("User Returned:", user);

  if (!user) {
    throw new UnauthorizedException('User not found or invalid credentials');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;
  const tokens = await this.generateTokens({ id: user.id, email: user.email });

  return {
    ...safeUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}






  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<TokenPairDto> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    // get user internal data including sessions
    const user = await this.userGrpcService.getUserByIdInternal({ id: payload.sub.toString() });

    if (!user || !user.refreshTokens?.length) {
      throw new UnauthorizedException('No active sessions found');
    }

    // validate refresh token by fetching its hashed version
    let validSession = null;
    for (const session of user.refreshTokens) {
      const dbToken = await this.userGrpcService.getRefreshTokenByTokenId(session.tokenId);
      if (!dbToken) continue;
      const isValid = await bcrypt.compare(refreshToken, dbToken.hashedToken);
      if (isValid && !dbToken.revoked) {
        validSession = session;
        break;
      }
    }

    if (!validSession) throw new UnauthorizedException('Invalid or revoked refresh token');

    return this.generateTokens({ id: user.id, email: user.email });
  }


  // ------------------ Logout ------------------
  async logout(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // logout from one device/session
      await this.userGrpcService.revokeRefreshToken(tokenId);
    } else {
      // logout from all sessions
      const user = await this.userGrpcService.getUserByIdInternal({ id: userId });
      if (user.refreshTokens?.length) {
        await Promise.all(
          user.refreshTokens.map((rt) => this.userGrpcService.revokeRefreshToken(rt.tokenId))
        );
      }
    }
  }

  // ------------------ Validate User ------------------
  // ------------------ Validate User ------------------
  async validateUser(email: string, plainPassword: string): Promise<AuthUserDto | null> {
    // Lazy initialize gRPC service
    const grpcService = this.getGrpcService();
    this.logger.log('⚡ gRPC service ensured in validateUser');

    try {
      const user = await grpcService.getUserByEmail({ email });
      if (!user || !user.password) {
        this.logger.warn(`User not found or password missing for email: ${email}`);
        return null;
      }

      const isValid = await bcrypt.compare(plainPassword, user.password);
      if (!isValid) {
        this.logger.warn(`Invalid password for email: ${email}`);
        return null;
      }

      // Exclude password before returning
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeUser } = user;
      return safeUser as AuthUserDto;
    } catch (err: unknown) {
      this.logger.error('gRPC error in validateUser', err);
      throw new UnauthorizedException('Failed to validate user');
    }
  }


}
