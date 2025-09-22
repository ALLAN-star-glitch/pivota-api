import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignupRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  SessionDto,
  TokenPairDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { JwtPayload } from './jwt.strategy';
import { firstValueFrom, Observable } from 'rxjs';

// ---------------- gRPC Interface ----------------
interface UserServiceGrpc {
  createUserProfile(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Observable<UserResponseDto>;
  getUserProfileByEmail(data: { email: string }): Observable<UserResponseDto | null>;
  getUserProfileById(data: { id: string }): Observable<UserResponseDto | null>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private userGrpcService: UserServiceGrpc;
  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService){
        this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    }
    return this.userGrpcService;
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject('USER_GRPC') private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    this.logger.log('✅ AuthService initialized (gRPC)');
  }

  // ------------------ Validate User ------------------
  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
  const userGrpcService = this.getGrpcService();
  const userProfile$ = userGrpcService.getUserProfileByEmail({ email });
  const userProfile = await firstValueFrom(userProfile$);   // ✅ convert Observable → Promise

  if (!userProfile) return null;

  const credential = await this.prisma.credential.findUnique({
    where: { userId: parseInt(userProfile.id) },
  });
  if (!credential) return null;

  const isValid = await bcrypt.compare(password, credential.passwordHash);
  if (!isValid) return null;

  return userProfile;
}


  // ------------------ Generate Tokens ------------------
  async generateTokens(
    user: { id: string; email: string },
    clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: parseInt(user.id, 10),
        tokenId: payload.sub + '-' + Date.now(), // unique token/session id
        hashedToken,
        device: clientInfo?.device,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        os: clientInfo?.os,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  // ------------------ Signup ------------------
  async signup(signupDto: SignupRequestDto): Promise<UserResponseDto> {
  try {
    const userGrpcService = this.getGrpcService();

    // Explicitly type the Observable
    const userProfile$ = userGrpcService.createUserProfile({
      email: signupDto.email,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      phone: signupDto.phone,
    }) as Observable<UserResponseDto>;  // 👈 ensure Observable<UserResponseDto>

    const userProfile = await firstValueFrom(userProfile$);

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    this.logger.debug('UserProfile from gRPC:', userProfile);

    await this.prisma.credential.create({
      data: {
        userId: parseInt(userProfile.id, 10),
        passwordHash: hashedPassword,
      },
    });

    return userProfile;
  } catch (err: unknown) {
    this.logger.error('Signup failed', err);

    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'P2002') {
      throw new ConflictException('Email already exists');
    }

    throw new InternalServerErrorException('Signup failed');
  }
}


  // ------------------ Login ------------------
  async login(
    loginDto: LoginRequestDto,
    clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
  ): Promise<LoginResponseDto> {
    // Validate credentials
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      { id: user.id, email: loginDto.email },
      clientInfo,
    );

    return { ...user, accessToken, refreshToken };
  }

  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<TokenPairDto> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    const user$ = this.userGrpcService.getUserProfileById({ id: payload.sub });
    const user = await firstValueFrom(user$);

    // Get all active sessions
    const sessions = await this.prisma.refreshToken.findMany({ where: { userId: parseInt(payload.sub), revoked: false } });

    // Find matching hashed token
    const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
    if (!validSession) throw new UnauthorizedException('Invalid or revoked refresh token');

    return this.generateTokens({ id: user.id, email: user.email });
  }

  // ------------------ Logout ------------------
  async logout(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // Logout from a single session
      await this.prisma.refreshToken.updateMany({ where: { tokenId }, data: { revoked: true } });
    } else {
      // Logout from all sessions
      await this.prisma.refreshToken.updateMany({ where: { userId: parseInt(userId) }, data: { revoked: true } });
    }
  }
}
