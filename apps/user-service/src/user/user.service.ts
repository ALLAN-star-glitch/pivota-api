import {
  Injectable,
  Logger,
  Inject,
  ConflictException,
  OnModuleInit,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignupRequestDto,
  SignupResponseDto,
  UserResponseDto,
  AuthUserDto,
  GetUserByEmailDto,
  LoginRequestDto,
  UserCredentialsDto,
} from '@pivota-api/dtos';
import { User } from '../../generated/prisma';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('✅ UserService connected to Kafka');
    } catch (err) {
      this.logger.error('❌ Failed to connect Kafka client', err);
    }

    try {
      await this.rabbitClient.connect();
      this.logger.log('✅ UserService connected to RabbitMQ');
    } catch (err) {
      this.logger.error('❌ Failed to connect RabbitMQ client', err);
    }
  }

  /** Create a new user (signup) */
  async createUser(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          password: signupDto.password, // already hashed in AuthService
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          ...(signupDto.phone ? { phone: signupDto.phone } : {}),
        },
      });

      const response = this.toSignupResponse(user);

      // Kafka event
      this.kafkaClient.emit('user.created', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt,
      });

      // RabbitMQ event
      this.rabbitClient.emit('user.signup.email', {
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      return response;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        if (target.includes('email')) throw new ConflictException('Email already registered');
        if (target.includes('phone')) throw new ConflictException('Phone number already registered');
        throw new ConflictException('Duplicate field detected');
      }
      this.logger.error('❌ Unexpected error during signup', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }


    /** Get user by ID (internal, includes refresh token + password) */
    async getUserByIdInternal({ id }: { id: string }): Promise<UserCredentialsDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(id) },
      include: { refreshTokens: true },
    });
    if (!user) return null;

    return {
      id: user.id.toString(),
      email: user.email,
      password: user.password,
      refreshTokens: user.refreshTokens.map((rt) => ({
        id: rt.id,
        tokenId: rt.tokenId,
        device: rt.device ?? undefined,
        ipAddress: rt.ipAddress ?? undefined,
        userAgent: rt.userAgent ?? undefined,
        createdAt: rt.createdAt,
        expiresAt: rt.expiresAt,
        revoked: rt.revoked,
      })),
    };
  }

  /** Store a new refresh token session */
    async createRefreshToken(data: {
    userId: number;
    hashedToken: string;
    device?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        hashedToken: data.hashedToken,
        userId: data.userId,
        device: data.device,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
  }


  /** Fetch refresh token row by tokenId */
  async getRefreshTokenByTokenId(tokenId: string) {
  return this.prisma.refreshToken.findUnique({
    where: { tokenId },
    select: {
      id: true,
      tokenId: true,
      hashedToken: true,   // include hashed token for verification
      userId: true,
      device: true,
      ipAddress: true,
      userAgent: true,
      revoked: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}


  /** Revoke a refresh token (logout from one device) */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenId },
      data: { revoked: true },
    });
  }

  /** List all active sessions for a user */
  async listUserSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
    });
  }


  /** Get user by ID (safe response) - For Public */
    async getUserById(id: string): Promise<UserResponseDto | null> {
      const user = await this.prisma.user.findUnique({ where: { id: Number(id) } });
      return user ? this.toUserResponse(user) : null;
    }

  /** Get user by Email (safe response) - For Publick */
  async getUserByEmail(dto: GetUserByEmailDto): Promise<AuthUserDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    return user ? this.toAuthUserDto(user) : null;
  }

  /** Get all users (safe response) - For Public */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.toUserResponse(u));
  }

  /** Validate user credentials (used in AuthService.login) */
  async validateUserCredentials(dto: LoginRequestDto): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return this.toAuthUserDto(user);
  }

  // ------------------ Mappers ------------------
  private toSignupResponse(user: User): SignupResponseDto {
    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toAuthUserDto(user: User): AuthUserDto {
    return {
      id: user.id.toString(),
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
