import { Controller, Get } from '@nestjs/common';

@Controller({
  path: 'auth', // namespace
  version: '1', // version
})
export class AuthController {
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'auth', version: 'v1' };
  }

  @Get('login')
  login() {
    return { message: 'Login endpoint (v1)' };
  }
}
