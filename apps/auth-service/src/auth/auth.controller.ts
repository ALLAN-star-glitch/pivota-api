import { Controller, Logger, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
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
  async handleSignupGrpc(
    signupDto: SignupRequestDto,
  ): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  // ------------------ Login ------------------
  @UseGuards(LocalAuthGuard)
  @GrpcMethod('AuthService', 'Login')
  async handleLoginGrpc(
    loginDto: LoginRequestDto,
  ): Promise<LoginResponseDto> {
    // LocalAuthGuard still validates credentials via validateUser()
    return this.authService.login(loginDto);
  }

  // ------------------ Refresh Token ------------------
  @GrpcMethod('AuthService', 'Refresh')
  async handleRefreshGrpc(
    data: { refreshToken: string },
  ): Promise<LoginResponseDto> {
    return this.authService.refreshToken(data.refreshToken);
  }

}
