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

  const userUuid = randomUUID();
  const accountUuid = randomUUID();
  const userCode = this.generateUserCode();

  try {
    /**
     * 1️⃣ PRE-SIGNUP VALIDATION (External Services)
     * Check if services are up and data exists BEFORE touching our DB.
     */
    const [roleResponse, planResponse] = await Promise.all([
      lastValueFrom(this.getRbacGrpcService().GetRoleIdByType({ roleType: 'GeneralUser' })),
      lastValueFrom(this.getPlansGrpcService().GetPlanIdBySlug({ slug: 'free' }))
    ]);

    if (!roleResponse?.data?.roleId) throw new Error('RBAC: Default role not found');
    if (!planResponse?.data?.planId) throw new Error('Billing: Default plan not found');

    /**
     * 2️⃣ ATOMIC DB TRANSACTION
     * Creates Account, User, and Tracker. 
     * If this fails, Prisma handles the rollback.
     */
    const createdUser = await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          uuid: accountUuid,
          accountCode: `ACC-${userCode}`,
          type: 'INDIVIDUAL',
          userId: userUuid,
        },
      });

      const user = await tx.user.create({
        data: {
          uuid: userUuid,
          userCode,
          email: signupDto.email,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          ...(signupDto.phone ? { phone: signupDto.phone } : {}),
          accountId: account.uuid,
          roleName: 'GeneralUser',
        },
      });

      await tx.profileCompletion.create({
        data: {
          userUuid: user.uuid,
          percentage: 20,
          missingFields: ['BIO', 'NATIONAL_ID', 'GENDER', 'LOCATION'],
          isComplete: false,
        },
      });

      return user;
    });

    this.logger.log(`✅ DB entities created successfully: ${createdUser.uuid}`);

    /**
     * 3️⃣ EXTERNAL SERVICE ACTIVATION (With Manual Cleanup)
     * These happen after the DB commit. If they fail, we must clean up 
     * the DB to prevent "Zombie Users" (users with no roles/plans).
     */
    try {
      // Assign Role
      await lastValueFrom(
        this.getRbacGrpcService().AssignRoleToUser({
          userUuid: createdUser.uuid,
          roleId: roleResponse.data.roleId,
        }),
      );
      // Assign Subscription
      const subResponse = await lastValueFrom(
        this.getSubscriptionsGrpcService().SubscribeToPlan({
          subscriberUuid: accountUuid,
          planId: planResponse.data.planId,
        }),
      );

      if (!subResponse.success) {
        throw new Error(`Subscription failed: ${subResponse.message}`);
      }

      /**
       * 4️⃣ NON-BLOCKING EVENTS
       */
      this.kafkaClient.emit('user.created', {
        uuid: createdUser.uuid,
        accountUuid: accountUuid,
        email: createdUser.email,
        role: createdUser.roleName,
      });

      this.rabbitClient.emit('user.signup.email', {
        to: createdUser.email,
        firstName: createdUser.firstName,
        planName: 'Free',
        status: subResponse.subscription?.status ?? 'ACTIVE',
      });

      const success =  {
        success: true,
        code: 'OK',
        message: 'Signup successful',
        user: this.toUserResponse(createdUser),
        error: null,
      };
      return success;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (externalError: any) {
      /**
       * 🔁 COMPENSATING TRANSACTION
       * The DB was already committed in step 2. We must manually delete
       * to maintain system-wide integrity after a gRPC failure.
       */
      this.logger.error(`🚨 External service failure. Rolling back DB entries...`, externalError.message);
      
      await this.prisma.$transaction([
        this.prisma.profileCompletion.delete({ where: { userUuid: userUuid } }),
        this.prisma.user.delete({ where: { uuid: userUuid } }),
        this.prisma.account.delete({ where: { uuid: accountUuid } }),
      ]).catch((cleanupErr) => this.logger.error('Critical: Cleanup failed!', cleanupErr));

      throw externalError;
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    this.logger.error('❌ Signup failed', error);

    if (error.code === 'P2002') {
      throw new RpcException({
        code: 'ALREADY_EXISTS',
        message: 'Email or phone already registered',
      });
    }

    throw new RpcException({
      code: 'INTERNAL_ERROR',
      message: error.message || 'Failed to complete signup process',
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
      accountId: user.accountId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

}
