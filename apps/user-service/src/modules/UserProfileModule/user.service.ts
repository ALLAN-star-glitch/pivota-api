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
  SubscriptionResponseDto,
  PlanIdRequestDto,
  PlanIdDtoResponse,
  SubscribeToPlanDto,
} from '@pivota-api/dtos';
import { User } from '../../../generated/prisma/client';
import { ClientKafka, ClientProxy, RpcException, ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';


interface RbacServiceGrpc {
  AssignRoleToUser(data: AssignRoleToUserRequestDto): Observable<BaseResponseDto<UserRoleResponseDto>>;
  GetRoleIdByType(data: RoleIdRequestDto): Observable<BaseResponseDto<RoleIdResponse>>;
}

interface SubscriptionServiceGrpc {
  SubscribeToPlan(
    data: SubscribeToPlanDto,
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;
}

//interface - get plan id by slug
interface PlansServiceGrpc {
  GetPlanIdBySlug(
    data: PlanIdRequestDto,
  ): Observable<BaseResponseDto<PlanIdDtoResponse>>;
}


@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  private rbacGrpcService: RbacServiceGrpc;
  private subscriptionGrpcService: SubscriptionServiceGrpc;
  private plansGrpcService: PlansServiceGrpc;


  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE') private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
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

    this.subscriptionGrpcService = this.subscriptionsClient.getService<SubscriptionServiceGrpc>('SubscriptionService');

    this.plansGrpcService = this.plansClient.getService<PlansServiceGrpc>('PlanService');

    this.logger.log('✅ UserService initialized (gRPC)' 


  );

  }

  private getRbacGrpcService(): RbacServiceGrpc {
    if (!this.rbacGrpcService) {
      this.rbacGrpcService = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    }
    return this.rbacGrpcService;
  }

  private getSubscriptionsGrpcService(): SubscriptionServiceGrpc {
    if (!this.subscriptionGrpcService) {
      this.subscriptionGrpcService = this.subscriptionsClient.getService<SubscriptionServiceGrpc>('SubscriptionService');
    }
    return this.subscriptionGrpcService;
  }

  private getPlansGrpcService(): PlansServiceGrpc {
    if (!this.plansGrpcService) {
      this.plansGrpcService = this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }
  return this.plansGrpcService;
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
  this.logger.log('Starting user signup', signupDto);

  // Generate UUID + Custom User Code
  const uuid = randomUUID();
  const userCode = this.generateUserCode();
  this.logger.debug(`Generated UUID: ${uuid}, UserCode: ${userCode}`);

  let createdUser: User;

  try {
    // 1️ Create user record in DB (atomic)
    createdUser = await this.prisma.user.create({
      data: {
        uuid,
        userCode,
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        ...(signupDto.phone ? { phone: signupDto.phone } : {}),
      },
    });

    this.logger.debug(
      `User profile created: ${JSON.stringify(createdUser, null, 2)}`
    );

    // 2️ Assign default role via gRPC
    const rbacGrpcService = this.getRbacGrpcService();
    const roleIdResponse = await lastValueFrom(
      rbacGrpcService.GetRoleIdByType({ roleType: 'GeneralUser' }),
    );

    if (!roleIdResponse.data.roleId) {
      throw new Error('Default role ID not found');
    }

    await lastValueFrom(
      rbacGrpcService.AssignRoleToUser({
        userUuid: createdUser.uuid,
        roleId: roleIdResponse.data.roleId,
      }),
    );
    this.logger.log(`✅ Default role with Id: ${roleIdResponse.data.roleId} assigned to user ${createdUser.uuid}`);



    const planIdGrpcService = this.getPlansGrpcService();
    const planIdResponse = await lastValueFrom(
      planIdGrpcService.GetPlanIdBySlug({ slug: 'free' }),
    );

    this.logger.debug(`Fetched plan ID response: ${JSON.stringify(planIdResponse, null, 2)}`)

    this.logger.debug(`Fetched Plan Id: ${planIdResponse.data.planId} `)
    
    

    if (!planIdResponse.data?.planId) {
      throw new Error('Default plan ID not found');
    }

    this.logger.debug(`Subscriber UUID: ${createdUser.uuid}`)
    this.logger.debug(`Plan ID: ${planIdResponse.data.planId}`)

    // 3️ Assign default FREE subscription via gRPC
    const subscriptionsGrpcService = this.getSubscriptionsGrpcService();
    const subscriptionResponse = await lastValueFrom(
      subscriptionsGrpcService.SubscribeToPlan({
        subscriberUuid: createdUser.uuid,
        planId: planIdResponse.data.planId || process.env.DEFAULT_PLAN_ID,
      }),
    );

    this.logger.debug(`Subscription response: ${JSON.stringify(subscriptionResponse, null, 2)}`)


    if (!subscriptionResponse.success) {
      throw new Error(
        `Failed to assign default subscription: ${subscriptionResponse.message}`,
      );
    }
    this.logger.log(`✅ Default FREE plan assigned to user ${createdUser.uuid}`);

    // 4️ Emit non-critical events (outside main flow)
    try {
      this.kafkaClient.emit('user.created', {
        id: createdUser.id,
        uuid: createdUser.uuid,
        userCode: createdUser.userCode,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        phone: createdUser.phone,
        createdAt: createdUser.createdAt,
      });
      this.logger.log('📤 Kafka event emitted: user.created');
    } catch (err) {
      this.logger.warn('⚠️ Kafka event emission failed', err);
    }

    try {
      this.rabbitClient.emit('user.signup.email', {
        to: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        planName: 'Free',
        status: subscriptionResponse.subscription?.status || 'active',
        expiresAt: subscriptionResponse.subscription?.expiresAt,
        billingCycle: 'Free Month Trial',
      });
      this.logger.log('📤 RabbitMQ event emitted: user.signup + subscription email');
    } catch (err) {
      this.logger.warn('⚠️ RabbitMQ email event failed', err);
    }

    //  Return success
    const success =  {
      success: true,
      message: 'Signup successful',
      code: 'OK',
      user: this.toUserResponse(createdUser),
      error: null,
    };
    return success
  } catch (error: unknown) {
    // If user was created but role or subscription failed, rollback user
    if (createdUser?.uuid) {
      try {
        await this.prisma.user.delete({ where: { uuid: createdUser.uuid } });
        this.logger.log(`Rolled back user creation due to failure: ${createdUser.uuid}`);
      } catch (rollbackErr) {
        this.logger.error(`Failed to rollback user: ${rollbackErr.message}`, rollbackErr.stack);
      }
    }

    // Handle known errors
    if (error instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const user_profile = {  
      success: true,
      message: "User retrieved successfully",
      code: "OK",
      user: this.toUserResponse(user),
      error: null,
    }

    return user_profile;
  }

  /** ------------------ Fetch user by email ------------------ */
  async getUserProfileByEmail(data: { email: string }): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }


    const user_profile = {
      success: true,
      message: 'User retrieved successfully',
      code: 'OK',
      user: this.toUserResponse(user),
      error: null,
    
    }
    return user_profile;
  }

  /** ------------------ Fetch user by userCode ------------------ */
  async getUserProfileByUserCode(data: { userCode: string }): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.prisma.user.findUnique({ where: { userCode: data.userCode } });

    if (!user) {
      throw new RpcException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }



    const user_profile = {
      success: true,
      message: "User retrieved successfully",
      code: "OK",
      user: this.toUserResponse(user),
      error: null,
      
    }
    return user_profile;
  }

  /** ------------------ Get all users ------------------ */
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const users = await this.prisma.user.findMany();
  
    const userResponse = {
      success: true,
      message: 'Users retrieved successfully',
      code: 'OK',
      users: users.map((u) => this.toUserResponse(u)),
      error: null,  
    }
    return userResponse;
  }

  /** ------------------ Map User entity to DTO ------------------ */
  private toUserResponse(user: User): UserResponseDto {
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
    };
  }

}
