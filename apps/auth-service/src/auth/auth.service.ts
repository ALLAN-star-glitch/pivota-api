import { Inject, Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { JwtPayload } from './jwt.strategy';
import { 
  SignupRequestDto, 
  SignupResponseDto, 
  LoginRequestDto, 
  LoginResponseDto,
  AuthUserDto
} from '@pivota-api/shared-dtos';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('USER_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      this.kafkaClient.subscribeToResponseOf('auth.signup');
      this.kafkaClient.subscribeToResponseOf('user.getByEmail');
      this.kafkaClient.subscribeToResponseOf('auth.getUserById');
      this.kafkaClient.subscribeToResponseOf('health.check');
      this.kafkaClient.subscribeToResponseOf('user.create');

      await this.kafkaClient.connect();
      this.logger.log('✅ Kafka client connected successfully');

      const testResponse = await firstValueFrom(
        this.kafkaClient.send('health.check', { message: 'ping' }).pipe(
          timeout(5000),
          catchError(err => of({ status: 'error', message: err.message })),
        ),
      );

      this.logger.log('Test message response:', testResponse);
    } catch (err) {
      this.logger.error('❌ Kafka client connection failed', err);
    }
  }

  private async generateTokens(user: Pick<AuthUserDto, 'id' | 'email'>) {
    const payload = { email: user.email, sub: user.id.toString() };
    const access_token = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refresh_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  // ------------------ Signup ------------------
  async signup(signupPayload: SignupRequestDto): Promise<SignupResponseDto> {
    const hashedPassword = await bcrypt.hash(signupPayload.password, 10);

    const user = await firstValueFrom(
      this.kafkaClient.send<AuthUserDto>('user.create', { ...signupPayload, password: hashedPassword }).pipe(
        timeout(10000),
        catchError(err => {
          this.logger.error('Kafka signup error', err);
          throw err;
        }),
      ),
    );

    if (!user) throw new UnauthorizedException('Signup failed');

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async handleUserCreated(payload: { message: string }) {
  // Example: log, send welcome email, or other post-signup actions
    this.logger.log('Processing user.created notification:', payload.message);
  }
  // ------------------ Login ------------------
  async login(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await firstValueFrom(
      this.kafkaClient.send<AuthUserDto>('user.getByEmail', { email: loginDto.email }).pipe(
        timeout(10000),
        catchError(err => {
          this.logger.error('Kafka getByEmail error', err);
          return of(null);
        }),
      ),
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens({ id: user.id, email: user.email });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      ...tokens,
    };
  }

  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

    const user = await firstValueFrom(
      this.kafkaClient.send<AuthUserDto>('auth.getUserById', { id: payload.sub }).pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error('Kafka getUserById error', err);
          return of(null);
        }),
      ),
    );

    if (!user) throw new UnauthorizedException('User no longer exists');

    const tokens = await this.generateTokens({ id: user.id, email: user.email });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      ...tokens,
    };
  }

  // ------------------ Kafka Health Check ------------------
  async kafkaHealthCheck() {
    const testResponse = await firstValueFrom(
      this.kafkaClient.send<{ status: string; message: string }>('health.check', { message: 'ping' }).pipe(
        timeout(5000),
        catchError(err => of({ status: 'error', message: err.message })),
      ),
    );

    this.logger.log('Test message response:', testResponse);
    return testResponse;
  }
}
