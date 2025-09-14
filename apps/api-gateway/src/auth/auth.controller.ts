import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Post,
  Version,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SignupRequestDto,
  UserResponseDto,
  LoginRequestDto,
  LoginResponseDto,
} from '@pivota-api/dtos';

// 👇 Interface for gRPC methods (must match proto service)
interface AuthServiceGrpc {
  signup(data: SignupRequestDto): Observable<UserResponseDto>;
  login(data: LoginRequestDto): Observable<LoginResponseDto>;
  refresh(data: { refreshToken: string }): Observable<LoginResponseDto>;
  healthCheck(data: { from: string }): Observable<{ status: string; service: string }>;
}

@Controller('auth')
export class AuthController implements OnModuleInit {
  private readonly logger = new Logger(AuthController.name);
  private authService: AuthServiceGrpc;

  constructor(@Inject('AUTH_PACKAGE') private readonly grpcClient: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
    this.logger.log('✅ API Gateway connected to Auth Service (gRPC)');
  }

  // ------------------ Signup ------------------
  @Version('1')
  @Post('signup')
  async signup(@Body() signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log(`📩 Signup request: ${JSON.stringify(signupDto)}`);
    return firstValueFrom(this.authService.signup(signupDto));
  }

  // ------------------ Login ------------------
  @Version('1')
  @Post('login')
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    this.logger.log(`📩 Login request: ${JSON.stringify(loginDto)}`);
    return firstValueFrom(this.authService.login(loginDto));
  }

  // ------------------ Refresh Token ------------------
  @Version('1')
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }): Promise<LoginResponseDto> {
    this.logger.log(`📩 Refresh token request`);
    return firstValueFrom(this.authService.refresh(body));
  }

  // ------------------ Health Check ------------------
  @Version('1')
  @Get('health')
  async healthCheck() {
    this.logger.log(`📩 Health check request`);
    return firstValueFrom(this.authService.healthCheck({ from: 'api-gateway' }));
  }
}
