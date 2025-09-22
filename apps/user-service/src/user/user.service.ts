import {
  Injectable,
  Logger,
  Inject,
  ConflictException,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SignupRequestDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { User } from '../../generated/prisma';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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

  /** ------------------ User Signup ------------------ */
  async createUserProfile(signupDto: SignupRequestDto): Promise<UserResponseDto> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          ...(signupDto.phone ? { phone: signupDto.phone } : {}),
        },
      });

      const response = this.toUserResponse(user);

      // Kafka event
      this.kafkaClient.emit('user.created', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        createdAt: user.createdAt,
      });

      // RabbitMQ event for welcome email
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

/** ------------------ gRPC-friendly Profile Fetch ------------------ */
  async getUserProfileByEmail(data: { email: string }): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    return user ? this.toUserResponse(user) : null;
  }

  async getUserProfileById(data: { id: string }): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: Number(data.id) } });
    return user ? this.toUserResponse(user) : null;
  }


  /** Get all Users **/

  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.toUserResponse(u));
  }

  /** ------------------ Mappers ------------------ */
  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
