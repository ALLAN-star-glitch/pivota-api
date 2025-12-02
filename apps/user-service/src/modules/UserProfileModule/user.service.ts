import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BaseResponseDto,
  SignupRequestDto,
  UserResponseDto,
  GetUserByUserUuidDto,
  AssignRoleToUserRequestDto,
  RoleIdResponse,
  UserRoleResponseDto,
  RoleIdRequestDto,
} from '@pivota-api/dtos';
import { User } from '../../../generated/prisma/client';
import { ClientKafka, ClientProxy, RpcException, ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable } from 'rxjs';

interface RbacServiceGrpc {
  AssignRoleToUser(data: AssignRoleToUserRequestDto): Observable<BaseResponseDto<UserRoleResponseDto>>;
  GetRoleIdByType(data: RoleIdRequestDto): Observable<BaseResponseDto<RoleIdResponse>>;
}


@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  private rbacGrpcService: RbacServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
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

    // Initialize gRPC service
    this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
  }

  private getRbacGrpcService(): RbacServiceGrpc {
    if (!this.rbacGrpcService) {
      this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    }
    return this.rbacGrpcService;
  }

  /** ------------------ Helper: Generate Custom User Code ------------------ */
  private generateUserCode(): string {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase(); // X8F4C92A
    return `PVTCNT-${random}`;
  }

  /** ------------------ User Signup ------------------ */
  async createUserProfile(
    signupDto: SignupRequestDto,
  ): Promise<BaseResponseDto<UserResponseDto>> {
    this.logger.log(' Starting user signup', signupDto);

    try {
      // Generate UUID + Custom User Code
      const uuid = randomUUID();
      const userCode = this.generateUserCode();
      this.logger.debug(`Generated UUID: ${uuid}, UserCode: ${userCode}`);

      // Create user record in DB
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
      
      this.logger.debug(`User Profile Created in DB: ${JSON.stringify(user, null, 2)}`);

      // Emit Kafka user.created event (non-critical)
      try {
        this.kafkaClient.emit('user.created', {
          id: user.id,
          uuid: user.uuid,
          userCode: user.userCode,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          createdAt: user.createdAt,
        });
        this.logger.log('📤 Kafka event emitted: user.created');
      } catch (err) {
        this.logger.warn('⚠️ Kafka event emission failed', err);
      }

      // ------------------ Assign default role via gRPC (non-critical) ------------------
      try {
        const rbacGrpcService = this.getRbacGrpcService();
        const roleResponse = await lastValueFrom(
          rbacGrpcService.GetRoleIdByType({ roleType: 'GeneralUser' }),
        );

        this.logger.debug(`gRPC GetRoleIdByType response: ${JSON.stringify(roleResponse, null, 2)}`);

        if (roleResponse.data.roleId) {
          await lastValueFrom(
            rbacGrpcService.AssignRoleToUser({
              userUuid: user.uuid,
              roleId: roleResponse.data.roleId,
            }),
          
          );
          this.logger.log(`✅ Default role assigned to user ${user.uuid} via gRPC`);
        } else {
          this.logger.warn('⚠️ Role ID not found, skipping default role assignment');
        }
      } catch (err) {
        this.logger.error('⚠️ gRPC default role assignment failed', err);
      }

      // Emit RabbitMQ email event (non-critical)
      try {
        this.rabbitClient.emit('user.signup.email', {
          to: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
        this.logger.log('📤 RabbitMQ event emitted: user.signup.email');
      } catch (err) {
        this.logger.warn('⚠️ RabbitMQ email event failed', err);
      }

      // Return success
      const user_profile =  {
        success: true,
        message: 'Signup successful',
        code: 'OK',
        user: this.toUserResponse(user),
        error: null,
      };

      return user_profile;

    } catch (error: unknown) {
      // Handle known errors (e.g., unique constraint violations)
      if (error instanceof Error) {
        const message = (error as any).message || '';
        if (message.includes('Unique constraint failed')) {
          const conflictField = message.includes('email')
            ? 'Email'
            : message.includes('phone')
            ? 'Phone'
            : 'Field';
          this.logger.warn(`⚠️ ${conflictField} already registered`);

          throw new RpcException({
            code: 'ALREADY_EXISTS',
            message: `${conflictField} already registered`,
            details: error,
          });
        }
        this.logger.error(`❌ Unexpected error during signup: ${error.message}`, error.stack);
      } else {
        this.logger.error('❌ Unknown error during signup', JSON.stringify(error));
      }

      throw new RpcException({
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user',
        details: error,
      });
    }
  }

  /** ------------------ Fetch user by UUID ------------------ */
  async getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.prisma.user.findUnique({ where: { uuid: data.userUuid } });

    if (!user) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return BaseResponseDto.ok(this.toUserResponse(user), 'User retrieved successfully', 'OK');
  }

  /** ------------------ Fetch user by email ------------------ */
  async getUserProfileByEmail(data: { email: string }): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return BaseResponseDto.ok(this.toUserResponse(user), 'User retrieved successfully', 'OK');
  }

  /** ------------------ Fetch user by userCode ------------------ */
  async getUserProfileByUserCode(data: { userCode: string }): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.prisma.user.findUnique({ where: { userCode: data.userCode } });

    if (!user) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return BaseResponseDto.ok(this.toUserResponse(user), 'User retrieved successfully', 'OK');
  }

  /** ------------------ Get all users ------------------ */
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const users = await this.prisma.user.findMany();
    return BaseResponseDto.ok(users.map((u) => this.toUserResponse(u)), 'Users retrieved successfully', 'OK');
  }

  /** ------------------ Map User entity to DTO ------------------ */
  private toUserResponse(user: User, extras?: Partial<UserResponseDto>): UserResponseDto {
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
      role: extras?.role,
      currentSubscription: extras?.currentSubscription,
      subscriptionStatus: extras?.subscriptionStatus,
      subscriptionExpiresAt: extras?.subscriptionExpiresAt,
      planId: extras?.planId,
      categoryId: extras?.categoryId,
    };
  }
}
