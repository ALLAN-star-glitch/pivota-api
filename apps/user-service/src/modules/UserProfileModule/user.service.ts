import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BaseResponseDto,
  GetUserByUserUuidDto,
  SignupRequestDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { User } from '../../../generated/prisma';
import { ClientKafka, ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
  ) {
    
  }

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

  /** ------------------ Helper: Generate Custom User Code ------------------ */
  private generateUserCode(): string {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const random = Math.random().toString(36).substring(2, 10).toUpperCase(); // X8F4C92A
    return `PVTCNT-${date}-${random}`;
  }

  /** ------------------ User Signup ------------------ */
 async createUserProfile(
  signupDto: SignupRequestDto,
): Promise<BaseResponseDto<UserResponseDto>> {
  this.logger.log('🟢 Starting user signup', signupDto);

  try {
    // 1️⃣ Generate UUID + Custom User Code
    const uuid = randomUUID();
    const userCode = this.generateUserCode();
    this.logger.debug(`Generated UUID: ${uuid}, UserCode: ${userCode}`);

    // 2️⃣ Create user record in DB
    const user = await this.prisma.user.create({
      data: {
        uuid,
        userCode,
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        ...(signupDto.phone ? { phone: signupDto.phone } : {}),
      },
    });

    this.logger.log('✅ User successfully created in DB', user);

    // 3️⃣ Emit Kafka events (user.created + assign.default.role)
    try {
      await Promise.all([
        this.kafkaClient.emit('user.created', {
          id: user.id,
          uuid: user.uuid,
          userCode: user.userCode,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          createdAt: user.createdAt,
        }),
        this.kafkaClient.emit('user.assign.default.role', {
          userUuid: user.uuid,
          defaultRole: 'RegisteredUser',
        }),
      ]);

      this.logger.log('📤 Kafka events emitted successfully');
    } catch (err) {
      this.logger.warn('⚠️ One or more Kafka events failed to emit', err);
      // Do NOT send email if Kafka events fail
      throw new RpcException({
        code: 'KAFKA_EVENT_FAILED',
        message: 'Failed to emit user events',
      });
    }

    // 4️⃣ Only emit RabbitMQ email if everything above succeeds
    try {
      this.rabbitClient.emit('user.signup.email', {
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      this.logger.log('📤 RabbitMQ event emitted: user.signup.email');
    } catch (err) {
      this.logger.warn('⚠️ Failed to emit user.signup.email RabbitMQ event', err);
    }

    // 5️⃣ Return final success response
    const payload = {
      success: true,
      message: 'Signup successful',
      code: 'OK',
      user: this.toUserResponse(user),
      error: null,
    };

    this.logger.log('✅ Signup process completed successfully');
    return payload;

  } catch (error: unknown) {
    // Handle Prisma duplicate entry (email/phone)
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      const conflictField = target.includes('email')
        ? 'Email'
        : target.includes('phone')
        ? 'Phone'
        : 'Field';

      this.logger.warn(`⚠️ ${conflictField} already registered`);
      throw new RpcException({
        code: 'ALREADY_EXISTS',
        message: `${conflictField} already registered`,
      });
    }

    
    // Handle unexpected errors
    if (error instanceof Error) {
      this.logger.error(`❌ Unexpected error during signup: ${error.message}`, error.stack);
    } else {
      this.logger.error('❌ Unknown error during signup', JSON.stringify(error));
    }

    const failedResponse = {
      success: false,
      message: 'Failed to create user',
      code: 'INTERNAL',
      user: null,
      error: { code: 'INTERNAL', message: 'Failed to create user' },
    };

    return failedResponse;
  }
}

  /** ------------------ gRPC-friendly Profile Fetch ------------------ */
  async getUserProfileByEmail(
    data: { email: string },
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    const grpcSuccessBaseResponse = {
      success: true,
      message: 'User retrieved successfully',
      code: 'Ok',
      user: user ? this.toUserResponse(user) : null,
      error: null,
    };

    const grpcErrorBaseResponse = {
      success: false,
      message: 'User not found',
      code: 'NotFound',
      user: null,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    };

    if (!user) {
      return grpcErrorBaseResponse;
    }

    return grpcSuccessBaseResponse;
  }

  /** For external - searching user by custom userCode */
  async getUserProfileByUserCode(
    data: { userCode: string },
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    const user = await this.prisma.user.findUnique({
      where: { userCode: data.userCode },
    });

    const grpcErrorBaseResponse = {
      success: false,
      message: 'User not found',
      code: 'NotFound',
      user: null,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    };

    const grpcSuccessBaseResponse = {
      success: true,
      message: 'User retrieved successfully',
      code: 'Ok',
      user: user ? this.toUserResponse(user) : null,
      error: null,
    };

    if (!user) {
      return grpcErrorBaseResponse;
    }

    return grpcSuccessBaseResponse;
  }

  /** For inter-service - searching user by UUID */
  async getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    const user = await this.prisma.user.findUnique({ where: { uuid: data.userUuid } });

    const grpcSuccessBaseResponse = {
      success: true,
      message: 'User retrieved successfully',
      code: 'Ok',
      user: user ? this.toUserResponse(user) : null,
      error: null,
    };

    const grpcErrorBaseResponse = {
      success: false,
      message: 'User not found',
      code: 'NotFound',
      user: null,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    };

    if (!user) {
      return grpcErrorBaseResponse;
    }

    return grpcSuccessBaseResponse;
  }

  /** ------------------ Get all Users ------------------ */
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const users = await this.prisma.user.findMany();
    const users$ = users.map((u) => this.toUserResponse(u));

    const baseUsersResponse = {
      success: true,
      message: 'Users retrieved successfully',
      code: 'OK',
      users: users$,
      error: null,
    };

    return baseUsersResponse;
  }

  /** ------------------ Mappers ------------------ */
  private toUserResponse(
  user: User,
  extras?: Partial<UserResponseDto>
): UserResponseDto {
  return {
    id: user.id?.toString(),
    uuid: user.uuid,
    userCode: user.userCode,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    profileImage: user.profileImage,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    //  Virtual fields
    role: extras?.role || undefined,
    currentSubscription: extras?.currentSubscription || undefined,
    subscriptionStatus: extras?.subscriptionStatus || undefined,
    subscriptionExpiresAt: extras?.subscriptionExpiresAt || undefined,
    planId: extras?.planId || undefined,
    categoryId: extras?.categoryId || undefined,
  };
}

}
