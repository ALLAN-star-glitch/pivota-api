import { Controller, Get, Version } from '@nestjs/common';

@Controller('auth')
export class AuthController {

  @Version('1')
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'auth', version: 'v1' };
  }

  @Version('1')
  @Get('login')
  login() {
    return { message: 'Login endpoint (v1)' };
  }

  @Version('2')
  @Get('login')
  loginV2(){
    return {message: 'Login endpoint (v2)'}
  }
}
