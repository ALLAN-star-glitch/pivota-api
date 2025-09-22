import {
  Body,
  Controller,
  Inject,
  Logger,
  OnModuleInit,
  Post,
 // UseGuards,
  Version,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  SignupRequestDto,
  UserResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  SessionDto,
} from '@pivota-api/dtos';
import { ClientInfo } from '../decorators/client-info.decorator';
//import { LocalAuthGuard } from './local-auth.guard';

interface AuthServiceGrpc {
  signup(data: SignupRequestDto): Observable<UserResponseDto>;
  login(
    loginDto: LoginRequestDto & {
      clientInfo?: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;
    }
  ): Observable<LoginResponseDto>;
  refresh(data: { refreshToken: string }): Observable<LoginResponseDto>;
}

@Controller('auth')
export class AuthController implements OnModuleInit {
  private readonly logger = new Logger(AuthController.name);
  private authService: AuthServiceGrpc;

  constructor(@Inject('AUTH_PACKAGE') private readonly grpcClient: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.grpcClient.getService<AuthServiceGrpc>('AuthService');
    this.logger.log('API Gateway connected to Auth Service (gRPC)');
  }

  // ------------------ Signup ------------------
  @Version('1')
  @Post('signup')
  async signup(@Body() signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log(`📩 Signup request: ${JSON.stringify(signupDto)}`);
    return firstValueFrom(this.authService.signup(signupDto));
  }

  // ------------------ Login ------------------
  //@UseGuards(LocalAuthGuard) // ✅ only login uses the guard
  @Version('1')
  @Post('login')
  async login(
    @Body() loginDto: LoginRequestDto,
    @ClientInfo() clientInfo: Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>
  ): Promise<LoginResponseDto> {
    this.logger.log(`📩 Login request for email: ${loginDto.email}`);
    this.logger.debug(`🖥 Client Info: ${JSON.stringify(clientInfo)}`);

    const grpcPayload = { ...loginDto, clientInfo };
    return firstValueFrom(this.authService.login(grpcPayload));
  }

  // ------------------ Refresh Token ------------------
  @Version('1')
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }): Promise<LoginResponseDto> {
    this.logger.log(`📩 Refresh token request`);
    return firstValueFrom(this.authService.refresh(body));
  }
}
