import { Controller, Logger,  } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
//import { LocalAuthGuard } from './local-auth.guard';
import {
  LoginResponseDto,
  SignupResponseDto,
  SignupRequestDto,
  LoginRequestDto,
  TokenPairDto,
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
  //@UseGuards(LocalAuthGuard)
  @GrpcMethod('AuthService', 'Login')
  async handleLoginGrpc(
    loginDto: LoginRequestDto,
  ): Promise<LoginResponseDto> {
    // LocalAuthGuard still validates credentials via validateUser()
    return this.authService.login(loginDto);
  }

  // ------------------ Refresh Token ------------------
  // ------------------ Refresh Token ------------------
  @GrpcMethod('AuthService', 'Refresh')
  async handleRefreshGrpc(data: { refreshToken: string }): Promise<TokenPairDto> {
    if (!data.refreshToken) {
      this.logger.warn('Refresh token not provided in gRPC request');
      throw new Error('Refresh token is required');
    }

    try {
      const tokens = await this.authService.refreshToken(data.refreshToken);
      return tokens; // LoginResponseDto includes new accessToken and refreshToken
    } catch (err) {
      this.logger.error('gRPC refresh token failed', err);
      throw new Error(err instanceof Error ? err.message : 'Refresh failed');
    }
  }

}
