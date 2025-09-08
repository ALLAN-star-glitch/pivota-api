import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService} from './auth.service';
import {  LoginResponseDto, SignupResponseDto, LoginRequestDto, SignupRequestDto } from '@pivota-api/shared-dtos';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  // ------------------ Signup (Kafka) ------------------
  @MessagePattern('auth.signup')
  async handleSignup(@Payload() signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  // Listen for user.created events from User service
  @MessagePattern('user.created')
  async handleUserCreated(@Payload() payload: { message: string }) {
    this.logger.log('✅ Received user.created message:', payload.message);

    // Optional: call internal method for post-signup logic
    await this.authService.handleUserCreated(payload);
  }

  // ------------------ Login (Kafka) ------------------
  @MessagePattern('auth.login')
async handleLogin(@Payload() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
  try {
    console.log('Login request received:', loginDto);
    const result = await this.authService.login(loginDto);
    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

  // ------------------ Refresh Token (Kafka) ------------------
  @MessagePattern('auth.refresh')
  async handleRefresh(@Payload() payload: { refresh_token: string }): Promise<LoginResponseDto> {
    return this.authService.refreshToken(payload.refresh_token);
  }

  // ------------------ Kafka Health Check ------------------
  @MessagePattern('auth.health')
  async handleHealthCheck(): Promise<unknown> {
    return this.authService.kafkaHealthCheck();
  }
}
