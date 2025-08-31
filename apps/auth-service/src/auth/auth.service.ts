import { Inject, Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { JwtPayload } from './jwt.strategy';
import { UserDto, SignupDto, LoginDto } from '@pivota-api/shared-dtos';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('user.signup');
    this.kafkaClient.subscribeToResponseOf('auth.login');
    this.kafkaClient.subscribeToResponseOf('auth.getUserById');
    await this.kafkaClient.connect();
  }

  private async generateTokens(user: UserDto) {
    const payload = { email: user.email, sub: user.id };
    const access_token = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refresh_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
    return { access_token, refresh_token };
  }

  async signup(signupPayload: SignupDto) {
    try {
      const hashedPassword = await bcrypt.hash(signupPayload.password, 10);

      const user = await firstValueFrom(
        this.kafkaClient.send<UserDto>('user.signup', {
          email: signupPayload.email,
          password: hashedPassword,
          name: signupPayload?.name,
        }).pipe(
          timeout(5000), // 5 seconds max wait
          catchError(err => {
            this.logger.error('Kafka signup error', err);
            return of(null); // Return null on error
          }),
        ),
      );

      if (!user) throw new UnauthorizedException('Signup failed, please try again later');

      const tokens = await this.generateTokens(user);
      return { user, ...tokens };
    } catch (err) {
      this.logger.error('Unexpected signup error', err);
      throw new UnauthorizedException('Signup failed');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await firstValueFrom(
        this.kafkaClient.send<UserDto>('auth.login', loginDto).pipe(
          timeout(5000),
          catchError(err => {
            this.logger.error('Kafka login error', err);
            return of(null);
          }),
        ),
      );

      if (!user) throw new UnauthorizedException('Invalid credentials');

      const tokens = await this.generateTokens(user);
      return { user, ...tokens };
    } catch (err) {
      this.logger.error('Unexpected login error', err);
      throw new UnauthorizedException('Login failed');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

      const user = await firstValueFrom(
        this.kafkaClient.send<UserDto>('auth.getUserById', { id: payload.sub }).pipe(
          timeout(200000),
          catchError(err => {
            this.logger.error('Kafka getUserById error', err);
            return of(null);
          }),
        ),
      );

      if (!user) throw new UnauthorizedException('User no longer exists');

      return this.generateTokens(user);
    } catch (error) {
      this.logger.error('Refresh token error', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
