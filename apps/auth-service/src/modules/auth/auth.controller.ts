import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  LoginResponseDto,
  LoginRequestDto,
  TokenPairDto,
  BaseResponseDto,
  OrganisationSignupRequestDto, // Import this
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto,     // Import this
} from '@pivota-api/dtos';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /* ======================================================
     ORGANIZATION SIGNUP (NEW)
  ====================================================== */
  @GrpcMethod('AuthService', 'OrganisationSignup')
  async handleOrganisationSignupGrpc(
    dto: OrganisationSignupRequestDto,
  ): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
    this.logger.log(`gRPC: Organisation Signup request for ${dto.name}`);
    
    const response = await this.authService.organisationSignup(dto);

    this.logger.debug(`Org Signup response: ${JSON.stringify(response)}`);
    return response;
  }

  /* ======================================================
     STANDARD SIGNUP
  ====================================================== */
  @GrpcMethod('AuthService', 'Signup')
  async handleSignupGrpc(
    signupDto: UserSignupRequestDto,
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    const response = await this.authService.signup(signupDto);

    this.logger.debug(`Signup successful for email: ${signupDto.email}`);
    return response;
  }

  /* ======================================================
     LOGIN
  ====================================================== */
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

    const clientInfo = loginDto.clientInfo || {
      device: 'Unknown',
      ipAddress: 'Unknown',
      userAgent: 'Unknown',
      os: 'Unknown',
    };

    const result = await this.authService.login(loginDto, clientInfo);
    return result;
  }

  /* ======================================================
   GOOGLE LOGIN (NEW)
====================================================== */
@GrpcMethod('AuthService', 'GoogleLogin')
async handleGoogleLoginGrpc(
  data: { 
    token: string; 
    clientInfo?: { 
      device?: string; 
      ipAddress?: string; 
      userAgent?: string; 
      os?: string 
    } 
  }
): Promise<BaseResponseDto<LoginResponseDto>> {
  this.logger.debug(`gRPC: Google Login attempt`);

  const clientInfo = data.clientInfo || {
    device: 'Unknown',
    ipAddress: 'Unknown',
    userAgent: 'Unknown',
    os: 'Unknown',
  };

  try {
    const result = await this.authService.signInWithGoogle(data.token, clientInfo);
    return result;
  } catch (err) {
    this.logger.error('gRPC Google Login failed', err);
    // Return a structured error response consistent with your API
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Google login failed',
      code: 'UNAUTHORIZED',
      data: null as unknown as LoginResponseDto,
      error: {
        code: 'AUTH_FAILURE',
        message: err instanceof Error ? err.message : 'Unknown error',
      }
    };
  }
}

  /* ======================================================
     REFRESH TOKEN
  ====================================================== */
  @GrpcMethod('AuthService', 'Refresh')
  async handleRefreshGrpc(data: { refreshToken: string }): Promise<BaseResponseDto<TokenPairDto>> {
    if (!data.refreshToken) {
      this.logger.warn('Refresh token not provided in gRPC request');
      throw new Error('Refresh token is required');
    }

    try {
      return await this.authService.refreshToken(data.refreshToken);
    } catch (err) {
      this.logger.error('gRPC refresh token failed', err);
      throw new Error(err instanceof Error ? err.message : 'Refresh failed');
    }
  }

  /* ======================================================
     DEV TOKEN (BYPASS)
  ====================================================== */
  @GrpcMethod('AuthService', 'GenerateDevToken')
  async handleGenerateDevTokenGrpc(data: { 
    userUuid: string; 
    email: string; 
    role: string;
    accountId: string;
  }): Promise<BaseResponseDto<TokenPairDto>> {
    this.logger.warn(`🛠️ gRPC Bypass: Generating tokens for ${data.email} as ${data.role}`);

    const response = await this.authService.generateDevToken(
      data.userUuid, 
      data.email, 
      data.role, 
      data.accountId
    ); 
    
    return response;
  }
}