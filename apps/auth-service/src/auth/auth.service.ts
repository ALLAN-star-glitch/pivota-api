import {
  Injectable,
  Logger,
  UnauthorizedException,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignupRequestDto,
  LoginResponseDto,
  LoginRequestDto,
  SessionDto,
  TokenPairDto,
  UserResponseDto,
  BaseResponseDto,
} from '@pivota-api/dtos';
import { JwtPayload } from './jwt.strategy';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc } from '@pivota-api/interfaces';




// ---------------- gRPC Interface ----------------
interface UserServiceGrpc {
  createUserProfile(data: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Observable<UserResponseDto>;
  getUserProfileByEmail(data: { email: string }): Observable<BaseUserResponseGrpc<UserResponseDto >| null>;
  getUserProfileById(data: { id: string }): Observable<BaseUserResponseGrpc<UserResponseDto >| null>;
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
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.userGrpcService = this.grpcClient.getService<UserServiceGrpc>('UserService');
    this.logger.log('✅ AuthService initialized (gRPC)');
  }

  // ------------------ Validate User ------------------
  async validateUser(email: string, password: string): Promise<UserResponseDto | null> {
  // Call gRPC service
  const userGrpcService = this.getGrpcService();
  const userProfileGrpcResponse: BaseUserResponseGrpc<UserResponseDto> | null =
    await firstValueFrom(userGrpcService.getUserProfileByEmail({ email }));

  if (!userProfileGrpcResponse || !userProfileGrpcResponse.success || !userProfileGrpcResponse.user) {
    return null;
  }

  const userProfile = userProfileGrpcResponse.user;

  // Look up credentials
  const credential = await this.prisma.credential.findUnique({
    where: { userId: parseInt(userProfile.id) },
  });
  if (!credential) return null;

  // Check password
  const isValid = await bcrypt.compare(password, credential.passwordHash);
  if (!isValid) return null;

  // return clean UserResponseDto
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

    await this.prisma.session.create({
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
 async signup(signupDto: SignupRequestDto): Promise<BaseResponseDto<UserResponseDto>> {
  const userGrpcService = this.getGrpcService();
  try {
    const userProfile$ = userGrpcService.createUserProfile({
      email: signupDto.email,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      phone: signupDto.phone,
    });

    const userProfile = await firstValueFrom(userProfile$);

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    await this.prisma.credential.create({
      data: { userId: parseInt(userProfile.id, 10), passwordHash: hashedPassword },
    });

        // inside AuthService.signup in microservice
    const signupResponse = {
      success: true,
      message: 'Signup successful',
      code: 'OK',
      user: userProfile,       // <--- map the actual user here
      error: null,
    };

    return signupResponse;
  } catch (error: unknown) {
    this.logger.error('Signup failed', error);

    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === 'EMAIL_CONFLICT') return BaseResponseDto.fail('Email already registered', 'ALREADY_EXISTS');
      if (code === 'PHONE_CONFLICT') return BaseResponseDto.fail('Phone number already registered', 'ALREADY_EXISTS');
    }

    return BaseResponseDto.fail('Signup failed', 'INTERNAL');

  }
}


  // ------------------ Login ------------------
  async login(
  loginDto: LoginRequestDto,
  clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
): Promise<BaseResponseDto<LoginResponseDto>> {
  // Validate credentials
  const user = await this.validateUser(loginDto.email, loginDto.password);
  if (!user) throw new UnauthorizedException('Invalid credentials');

  // Generate tokens
  const { accessToken, refreshToken } = await this.generateTokens(
    { id: user.id, email: loginDto.email },
    clientInfo,
  );

  // Build email payload
  const payload = {
    to: user.email,
    firstName: user.firstName,
    device: clientInfo?.device || 'Unknown device',
    ipAddress: clientInfo?.ipAddress || 'Unknown IP',
    userAgent: clientInfo?.userAgent || 'Unknown agent',
    os: clientInfo?.os || 'Unknown OS',
    timestamp: new Date().toISOString(),
  };



  // Emit RabbitMQ event for login email
  this.rabbitClient.emit('user.login.email', payload);
  this.logger.debug(`📤 [AuthService] Login email payload: ${JSON.stringify(payload)}`);

  const authUser = { ...user, accessToken, refreshToken };

  const loginResponse =  {
    success: true,
    message: 'Login successful',
    code: 'OK',
    user: authUser,
    error: null,
  }

  return loginResponse;
}


  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<TokenPairDto> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    const user$ = this.userGrpcService.getUserProfileById({ id: payload.sub });
    const user: BaseUserResponseGrpc<UserResponseDto>  = await firstValueFrom(user$);

    // Get all active sessions
    const sessions = await this.prisma.session.findMany({ where: { userId: parseInt(payload.sub), revoked: false } });

    // Find matching hashed token
    const validSession = sessions.find((s) => bcrypt.compareSync(refreshToken, s.hashedToken));
    if (!validSession) throw new UnauthorizedException('Invalid or revoked refresh token');

    return this.generateTokens({ id: user.user.id, email: user.user.email });
  }

  // ------------------ Logout ------------------
  async logout(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // Logout from a single session
      await this.prisma.session.updateMany({ where: { tokenId }, data: { revoked: true } });
    } else {
      // Logout from all sessions
      await this.prisma.session.updateMany({ where: { userId: parseInt(userId) }, data: { revoked: true } });
    }
  }
}
