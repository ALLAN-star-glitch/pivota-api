import { 
  Inject, 
  Injectable,  
  UnauthorizedException, 
  Logger, 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { JwtPayload } from './jwt.strategy';
import { 
  SignupRequestDto, 
  SignupResponseDto,  
  LoginResponseDto,
  AuthUserDto,
  LoginRequestDto
} from '@pivota-api/dtos';

@Injectable()
export class AuthService{
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('USER_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly jwtService: JwtService,
  ) {}

 

  private async generateTokens(user: Pick<AuthUserDto, 'id' | 'email'>) {
  const payload = { email: user.email, sub: user.id.toString() };
  const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
  const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });
  return { accessToken, refreshToken }; // ✅ matches proto definition
}


  // ------------------ Signup ------------------
  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await firstValueFrom(
      this.kafkaClient.send<AuthUserDto>('user.create', { 
        ...signupDto, 
        password: hashedPassword 
      }).pipe(
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

  async handleUserCreated(payload: { message: string }) { // Example: log, send welcome email, or other post-signup actions 
  this.logger.log('Processing user.created notification:', payload.message); }

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

  // Used by LocalStrategy
  async validateUser(email: string, plainPassword: string): Promise<AuthUserDto | null> {
  const user = await firstValueFrom(
    this.kafkaClient.send<AuthUserDto>('user.getByEmail', { email }).pipe(
      timeout(10000),
      catchError(err => {
        this.logger.error('Kafka getByEmail error', err);
        return of(null);
      }),
    ),
  );

  if (!user) return null;

  const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
  if (!isPasswordValid) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...result } = user; // omit password safely
  return result as AuthUserDto;
}


  // ------------------ Refresh Token ------------------
  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
  if (!refreshToken) {
    throw new UnauthorizedException('Refresh token is required');
  }

  const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

  const user = await firstValueFrom(
    this.kafkaClient.send<AuthUserDto>('user.getById', { id: payload.sub }).pipe(
      timeout(5000),
      catchError(err => {
        this.logger.error('Kafka getById error', err);
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
