import { Injectable, Logger, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  GetUserByIdDto, 
  SignupRequestDto, 
  SignupResponseDto, 
  UserResponseDto,
  AuthUserDto,
} from '@pivota-api/dtos';
import { User } from '../../generated/prisma';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUTH_SERVICE') private readonly kafkaClient: ClientKafka, // ✅ inject producer
  ) {}

  /** Create a new user (signup) */
  async createUser(signupDto: SignupRequestDto): Promise<SignupResponseDto | null> {
    this.logger.debug('SignupDto received', signupDto);

    const existing = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });
    if (existing) {
    throw new ConflictException('Email already registered');
  }

    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        password: signupDto.password, // Already hashed from AuthService
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        ...(signupDto.phone ? { phone: signupDto.phone } : {}), // only add if provided
      },
    });

    const response = this.toSignupResponse(user);

    // ------------------ Emit user.created event ------------------
    try {
    await this.kafkaClient.emit('user.created', {
      message: `Signup successful. ${user.firstName}, please proceed to login!`,
    });
    this.logger.debug(`user.created event emitted for user ${user.email}`);
  } catch (error) {
    this.logger.error('Failed to emit user.created event', error);
  }


    return response;
  }

  /** Get user by ID (safe response) */
  async getUserById(dto: GetUserByIdDto): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
    if (!user) return null;
    return this.toUserResponse(user);
  }

  /** Get user by Email (internal, includes password for auth-service) */
  async getUserByEmail(email: string): Promise<AuthUserDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.toAuthUserDto(user);
  }

  /** Get all users (safe response) */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany();
    return users.map(u => this.toUserResponse(u));
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
