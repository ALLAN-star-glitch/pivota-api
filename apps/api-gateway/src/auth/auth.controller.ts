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
import { ClientInfo } from '../decorators/client-info.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import {
  SignupRequestDto,
  LoginRequestDto,
  UserResponseDto,
  SessionDto,
  LoginResponseDto,
} from '@pivota-api/dtos';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Version('1')
  @Post('signup')
  async signup(@Body() signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log(`📩 Signup request: ${JSON.stringify(signupDto)}`);
    return this.authService.signup(signupDto);
  }

  @Version('1')
  @Post('login')
  async login(
    @Body() loginDto: LoginRequestDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>,
    @Res({ passthrough: true }) res: Response
  ): Promise<LoginResponseDto> {
    this.logger.log(`📩 Login request for email: ${loginDto.email}`);
    return this.authService.login(loginDto, clientInfo, res);
  }

  @Version('1')
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(refreshToken, res);
  }

  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.authService.logout(res);
    return { message: 'Logged out successfully' };
  }
}
