import { Body, Controller, Post, Get, Version, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RequestWithUser } from './types/request-with-user.type';
import { SignupDto, LoginDto } from '@pivota-api/shared-dtos';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔹 Signup Endpoint
  @Version('1')
  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  // 🔹 Login Endpoint
  @Version('1')
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 🔹 Refresh Token Endpoint
  @Version('1')
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // 🔹 Profile Endpoint (JWT-protected)
  @Version('1')
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req: RequestWithUser) {
    // req.user is injected by JwtStrategy.validate()
    return req.user;
  }
}
