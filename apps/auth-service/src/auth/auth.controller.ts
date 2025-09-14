import { Controller, Logger, UseGuards } from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import {
  LoginResponseDto,
  SignupResponseDto,
  SignupRequestDto,
  LoginRequestDto,
} from '@pivota-api/dtos';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  // ------------------ Signup ------------------
  @GrpcMethod('AuthService', 'Signup')
  async handleSignupGrpc(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  // ------------------ User Created Event ------------------
  @MessagePattern('user.created')
  async handleUserCreated(@Payload() payload: { message: string }) {
    this.logger.log('✅ Received user.created message:', payload.message);
    await this.authService.handleUserCreated(payload);
  }

  // ------------------ Login ------------------
  @UseGuards(LocalAuthGuard)
  @GrpcMethod('AuthService', 'Login')
  async handleLoginGrpc(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    // LocalAuthGuard still validates credentials via validateUser()
    return this.authService.login(loginDto);
  }

  // ------------------ Refresh Token ------------------
  @GrpcMethod('AuthService', 'Refresh')
  async handleRefreshGrpc(data: { refreshToken: string }): Promise<LoginResponseDto> {
    return this.authService.refreshToken(data.refreshToken);
  }

  // ------------------ Health Check ------------------
  @GrpcMethod('AuthService', 'HealthCheck')
  async handleHealthCheckGrpc(data: { from: string }): Promise<{ status: string; service: string }> {
    return {
      status: 'ok',
      service: `auth-service (called from ${data.from})`,
    };
  }
}
