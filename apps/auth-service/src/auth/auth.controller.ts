import { Controller, Logger,  } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
//import { LocalAuthGuard } from './local-auth.guard';
import {
  LoginResponseDto,
  SignupRequestDto,
  LoginRequestDto,
  TokenPairDto,
  UserResponseDto,
  BaseResponseDto,
} from '@pivota-api/dtos';

  @Controller()
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private readonly logger = new Logger(AuthController.name);

    // ------------------ Signup ------------------
   @GrpcMethod('AuthService', 'Signup')
    async handleSignupGrpc(
      signupDto: SignupRequestDto,
    ): Promise<BaseResponseDto<UserResponseDto>> {
      return this.authService.signup(signupDto);
    }


    // ------------------ Login ------------------
    @GrpcMethod('AuthService', 'Login')
  async handleLoginGrpc(
    loginDto: LoginRequestDto & { 
      clientInfo?: { 
        device?: string; 
        ipAddress?: string;
        userAgent?: string; 
        os?: string 
      } 
    }
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.debug(`Login attempt for email: ${loginDto.email}`);

    // Provide default values if clientInfo is missing
    const clientInfo = loginDto.clientInfo || {
      device: 'Unknown',
      ipAddress: 'Unknown',
      userAgent: 'Unknown',
      os: 'Unknown',
    };
    this.logger.debug(`Client Info: ${JSON.stringify(clientInfo)}`);

    // Pass clientInfo to AuthService.login
    const result = await this.authService.login(loginDto, clientInfo);

    this.logger.debug(`Login successful for email: ${loginDto.email}`);
    return result;
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


  @GrpcMethod('AuthService', 'ValidateUser')
async validateUser(data: { email: string; password: string }): Promise<UserResponseDto | null> {
  const user = await this.authService.validateUser(data.email, data.password);
  if (!user) return null;
  return user;
}


}
