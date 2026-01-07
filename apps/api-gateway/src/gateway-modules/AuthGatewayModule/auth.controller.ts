import {
  Body,
  Controller,
  Logger,
  Post,
  Version,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import {
  LoginRequestDto,
  SessionDto,
  LoginResponseDto,
  BaseResponseDto,
  TokenPairDto,
  OrganisationSignupRequestDto,
  OrganizationSignupDataDto,
  UserSignupRequestDto,
  UserSignupDataDto, // ✅ Make sure this is exported from @pivota-api/dtos
} from '@pivota-api/dtos';
import { ClientInfo } from '../../decorators/client-info.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('AuthModule - ((Auth-Service) - MICROSERVICE)') // Group all endpoints under "Auth"
@ApiExtraModels(BaseResponseDto, LoginResponseDto, UserSignupRequestDto, TokenPairDto, OrganizationSignupDataDto)
@Controller('auth-module')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ===================== SIGNUP =====================
  @Version('1')
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserSignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserSignupDataDto) },
          },
        },
      ],
    },
  })
  async signup(
    @Body() signupDto: UserSignupRequestDto  
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log(`📩 Signup request: ${JSON.stringify(signupDto)}`);
    return this.authService.signup(signupDto);
  }

  // ===================== ORGANISATION SIGNUP =====================
@Version('1')
@Post('signup/organisation')
@ApiOperation({ summary: 'Register a new organisation with a master admin' })
@ApiBody({ type: OrganisationSignupRequestDto })
@ApiResponse({
  status: 201,
  description: 'Organisation signed up successfully',
  schema: {
    allOf: [
      { $ref: getSchemaPath(BaseResponseDto) },
      {
        properties: {
          data: { $ref: getSchemaPath(OrganizationSignupDataDto) },
        },
      },
    ],
  },
})
async signupOrganisation(
  @Body() dto: OrganisationSignupRequestDto,
): Promise<BaseResponseDto<OrganizationSignupDataDto>> {
  this.logger.log(
    `🏢 Organisation signup request: ${JSON.stringify(dto)}`,
  );

  return this.authService.signupOrganisation(dto);
}



  // ===================== LOGIN =====================
  @Version('1')
  @Post('login')
  @ApiOperation({ summary: 'Login user and return JWT tokens' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(LoginResponseDto) },
          },
        },
      ],
    },
  })
  async login(
    @Body() loginDto: LoginRequestDto,
    @ClientInfo()
    clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<LoginResponseDto>> {
    this.logger.log(`📩 Login request for email: ${loginDto.email}`);
    return this.authService.login(loginDto, clientInfo, res);
  }

  // ===================== REFRESH TOKEN =====================
  @Version('1')
  @Post('refreshToken')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI...' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenPairDto) },
          },
        },
      ],
    },
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<BaseResponseDto<TokenPairDto>> { 
    this.logger.log(`♻️ Refresh token request received`);
    return this.authService.refresh(refreshToken, res);
  }

  // ===================== LOGOUT =====================
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user and clear JWT cookies' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: { example: { message: 'Logged out successfully' } },
  })
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { message: 'Logged out successfully' };
  }
}
