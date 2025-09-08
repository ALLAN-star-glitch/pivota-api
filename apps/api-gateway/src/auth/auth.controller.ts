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
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SignupRequestDto, UserResponseDto, LoginRequestDto, LoginResponseDto } from '@pivota-api/shared-dtos';

@Controller('auth')
export class AuthController implements OnModuleInit {
  private readonly logger = new Logger(AuthController.name);

  constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientKafka) {}

  async onModuleInit() {
    // Subscribe to response topics exposed by Auth Service
    this.authClient.subscribeToResponseOf('auth.signup');
    this.authClient.subscribeToResponseOf('auth.login');
    this.authClient.subscribeToResponseOf('auth.refresh');
    this.authClient.subscribeToResponseOf('health.check');

    await this.authClient.connect();
    this.logger.log('✅ API Gateway connected to Auth Service (Kafka)');
  }

  // ------------------ Signup ------------------
  @Version('1')
  @Post('signup')
  async signup(@Body() signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log(`📩 Signup request: ${JSON.stringify(signupDto)}`);
    return firstValueFrom(
      this.authClient.send<UserResponseDto>('auth.signup', signupDto),
    );
  }

  // ------------------ Login ------------------
  @Version('1')
  @Post('login')
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    this.logger.log(`📩 Login request: ${JSON.stringify(loginDto)}`);
    return firstValueFrom(
      this.authClient.send<LoginResponseDto>('auth.login', loginDto),
    );
  }


  // ------------------ Refresh Token ------------------
  @Version('1')
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }): Promise<LoginResponseDto> {
    this.logger.log(`📩 Refresh token request`);
    return firstValueFrom(
      this.authClient.send<LoginResponseDto>('auth.refresh', { refresh_token: body.refresh_token }),
    );
  }

  // ------------------ Health Check ------------------
  @Version('1')
  @Get('health')
  async healthCheck() {
    this.logger.log(`📩 Health check request`);
    return firstValueFrom(
      this.authClient.send('health.check', { from: 'api-gateway' }),
    );
  }
}
