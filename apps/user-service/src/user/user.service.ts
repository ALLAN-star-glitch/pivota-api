import {
  Injectable,
  Logger,
  Inject,
  ConflictException,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  GetUserByIdDto,
  SignupRequestDto,
  SignupResponseDto,
  UserResponseDto,
  AuthUserDto,
} from '@pivota-api/dtos';
import { User } from '../../generated/prisma';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';

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
    this.logger.debug('SignupDto received', signupDto);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          password: signupDto.password, // hashed in AuthService
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          ...(signupDto.phone ? { phone: signupDto.phone } : {}),
        },
      });

      const response = this.toSignupResponse(user);

      // Kafka event (for system-wide consumers)
      this.kafkaClient.emit('user.created', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt,
      });

      // RabbitMQ event (notifications, emails, jobs)
      this.rabbitClient.emit('user.signup.email', {
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      return response;
    } catch (error) {
      // Handle known Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('email')) {
            throw new ConflictException('Email already registered');
          }
          if (target.includes('phone')) {
            throw new ConflictException('Phone number already registered');
          }
          throw new ConflictException('Duplicate field detected');
        }
      }

      this.logger.error('❌ Unexpected error during signup', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  /** Get user by ID (safe response) */
  async getUserById(dto: GetUserByIdDto): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
    if (!user) return null;
    return this.toUserResponse(user);
  }

  /** Get user by Email (internal, includes password for AuthService) */
  async getUserByEmail(email: string): Promise<AuthUserDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.toAuthUserDto(user);
  }

  /** Get all users (safe response) */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.toUserResponse(u));
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
