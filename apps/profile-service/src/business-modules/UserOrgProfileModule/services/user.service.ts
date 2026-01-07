import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BaseResponseDto,
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
  UserProfileResponseDto,
  CreateUserRequestDto,
} from '@pivota-api/dtos';
import { Account, ProfileCompletion, User, UserProfile } from '../../../../generated/prisma/client';
import { ClientKafka, ClientProxy, RpcException, ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { catchError, lastValueFrom, Observable, throwError, timeout } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

interface UserProfileAggregate {
  user: User;
  account: Account;
  profile: UserProfile;
  completion: ProfileCompletion;
}

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
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private rbacGrpc: RbacServiceGrpc;
  private subscriptionGrpc: SubscriptionServiceGrpc;
  private plansGrpc: PlansServiceGrpc;


  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_KAFKA') private readonly kafkaClient: ClientKafka,
    @Inject('USER_RMQ') private readonly rabbitClient: ClientProxy,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE') private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
  ) {
    this.rbacGrpc = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.subscriptionGrpc = this.subscriptionsClient.getService<SubscriptionServiceGrpc>('SubscriptionService');
    this.plansGrpc = this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }

  
/* ======================================================
     CREATE INDIVIDUAL PROFILE (Refactored)
  ====================================================== */
 /* ======================================================
     CREATE INDIVIDUAL PROFILE (FULL UPDATE)
  ====================================================== */
  async createUserProfile(
    data: CreateUserRequestDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Initiating individual profile creation: ${data.email}`);

    const accountUuid = randomUUID();
    const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
      /* ---------- 1. PRE-CHECKS: RBAC ROLE & PLAN ---------- */
      const [roleRes, planRes] = await Promise.all([
        lastValueFrom(
          this.rbacGrpc.GetRoleIdByType({ roleType: 'GeneralUser' }).pipe(
            timeout(5000),
            catchError(() => throwError(() => new Error('RBAC service unavailable')))
          ),
        ),
        lastValueFrom(
          this.plansGrpc.GetPlanIdBySlug({ slug: 'free' }).pipe(
            timeout(5000),
            catchError(() => throwError(() => new Error('Plans service unavailable')))
          ),
        ),
      ]);

      if (!roleRes?.data?.roleId) throw new Error('System Role: GeneralUser not found');
      if (!planRes?.data?.planId) throw new Error('Default Plan: free not found');

      /* ---------- 2. ATOMIC DATABASE TRANSACTION ---------- */
      const result = await this.prisma.$transaction(async (tx) => {
        // A. Create Root Individual Account
        const account = await tx.account.create({
          data: {
            uuid: accountUuid,
            accountCode: `ACC-${userCode}`,
            type: 'INDIVIDUAL',
          },
        });

        // B. Create User Identity
        const user = await tx.user.create({
          data: {
            uuid: data.userUuid,
            userCode,
            email: data.email,
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            roleName: 'General User',
            accountId: account.uuid,
          },
        });

        // C. Initialize Empty User Profile (Metadata)
        const profile = await tx.userProfile.create({
          data: {
            userUuid: user.uuid,
          },
        });

        // D. Initialize Tracker (25% completion for basic identity)
        const completion = await tx.profileCompletion.create({
          data: {
            userUuid: user.uuid,
            percentage: 25,
            missingFields: { set: ['BIO', 'NATIONAL_ID', 'GENDER', 'DATE_OF_BIRTH', 'PROFILE_IMAGE'] },
            isComplete: false,
          },
        });

        return { user, account, profile, completion };
      });

      /* ---------- 3. POST-DB: EXTERNAL SYNCING ---------- */
      // Assign the role in the RBAC service
      await lastValueFrom(
        this.rbacGrpc.AssignRoleToUser({
          userUuid: data.userUuid,
          roleId: roleRes.data.roleId,
        }),
      );

      // Initialize the subscription (Handled subRes to satisfy ESLint)
      const subRes = await lastValueFrom(
        this.subscriptionGrpc.SubscribeToPlan({
          subscriberUuid: accountUuid,
          planId: planRes.data.planId,
        }),
      );

      if (!subRes.success) {
        this.logger.warn(`Subscription failed for account ${accountUuid}: ${subRes.message}`);
      }

      /* ---------- 4. ASYNC EVENTS ---------- */
      this.rabbitClient.emit('individual.onboarded', {
        userUuid: data.userUuid,
        email: data.email,
        accountUuid,
      });

      /* ---------- 5. MAPPED RESPONSE ---------- */
      return {
        success: true,
        code: 'CREATED',
        message: 'Individual profile created successfully',
        data: this.mapToUserProfileResponseDto(result),
        error: null,
      };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      this.logger.error(`Individual profile creation failed: ${err.message}`);
      
      throw new RpcException({
        code: err.code === 'P2002' ? 6 : 13, // 6 = ALREADY_EXISTS, 13 = INTERNAL
        message: err.message || 'Internal failure during profile creation',
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

  /* ======================================================
     MAPPER: PRISMA AGGREGATE TO USER PROFILE DTO
  ====================================================== */
  private mapToUserProfileResponseDto(data: UserProfileAggregate): UserProfileResponseDto {
  return {
    // 1. Account Layer
    account: {
      uuid: data.account.uuid,
      accountCode: data.account.accountCode,
      type: data.account.type,
    },

    // 2. Identity Layer (User)
    user: {
      uuid: data.user.uuid,
      userCode: data.user.userCode,
      firstName: data.user.firstName ?? '', // Handle optional firstName
      lastName: data.user.lastName ?? '',   // Handle optional lastName
      email: data.user.email,
      phone: data.user.phone ?? '',
      status: data.user.status,
      roleName: data.user.roleName,
    },

    // 3. Metadata Layer (Profile)
    profile: data.profile ? {
      bio: data.profile.bio ?? undefined,
      gender: data.profile.gender ?? undefined,
      dateOfBirth: data.profile.dateOfBirth?.toISOString(),
      nationalId: data.profile.nationalId ?? undefined,
      profileImage: data.profile.profileImage ?? undefined,
    } : undefined,

    // 4. Onboarding Layer (Completion)
    completion: data.completion ? {
      percentage: data.completion.percentage,
      missingFields: data.completion.missingFields,
      isComplete: data.completion.isComplete,
    } : undefined,

    // 5. Chronological Metadata
    createdAt: data.user.createdAt.toISOString(),
    updatedAt: data.user.updatedAt.toISOString(),
  };
}

}
