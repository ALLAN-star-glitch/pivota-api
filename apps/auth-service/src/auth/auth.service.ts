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
} from '@pivota-api/dtos';
import * as grpc from '@grpc/grpc-js';

// gRPC interface from UserService proto
interface UserServiceGrpc {
  createUser(data: SignupRequestDto): Promise<SignupResponseDto>;
  getUserByEmail(data: { email: string }): Promise<AuthUserDto>;
  getUserById(data: { id: string }): Promise<AuthUserDto>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private userGrpcService: UserServiceGrpc;

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
    const payload = { email: user.email, sub: user.id.toString() };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  // ------------------ Signup ------------------
  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    try {
      const hashedPassword = await bcrypt.hash(signupDto.password, 10);

      // Call UserService via gRPC
      const newUser = await this.userGrpcService.createUser({
        ...signupDto,
        password: hashedPassword,
      });

      return newUser; // UserService emits Kafka & RabbitMQ events
    } catch (err: unknown) {
      // gRPC error handling
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
    const user = await this.userGrpcService.getUserByEmail({ email: loginDto.email });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens({ id: user.id, email: user.email });

    return { ...user, ...tokens };
  }

  // ------------------ Validate User ------------------
  async validateUser(email: string, plainPassword: string): Promise<AuthUserDto | null> {
    const user = await this.userGrpcService.getUserByEmail({ email });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result as AuthUserDto;
  }

  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    const user = await this.userGrpcService.getUserById({ id: payload.sub.toString() });

    if (!user) throw new UnauthorizedException('User no longer exists');

    const tokens = await this.generateTokens({ id: user.id, email: user.email });

    return { ...user, ...tokens };
  }
}
