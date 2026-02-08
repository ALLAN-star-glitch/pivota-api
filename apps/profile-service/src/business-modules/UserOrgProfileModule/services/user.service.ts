import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BaseResponseDto,
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
  UpdateFullUserProfileDto,
} from '@pivota-api/dtos';
import { Account, Organization, ProfileCompletion, User, UserProfile, OrganizationProfile } from '../../../../generated/prisma/client';
import {  RpcException, ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { catchError, lastValueFrom, Observable, throwError, timeout } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

// 1. Define Organization with its Profile relation
type OrganizationWithProfile = Organization & { 
  profile?: OrganizationProfile | null 
};

// 2. Define Account with the updated Organization
type AccountWithOrg = Account & { 
  organization?: OrganizationWithProfile | null 
};

interface UserProfileAggregate {
  user: User;
  account: AccountWithOrg; 
  profile: UserProfile | null;
  completion: ProfileCompletion | null;
}

type PrismaUserAggregate = User & {
  account: AccountWithOrg; 
  profile: UserProfile | null;
  completion: ProfileCompletion | null;
};

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
        this.plansGrpc.GetPlanIdBySlug({ slug: 'free-forever' }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error('Plans service unavailable')))
        ),
      ),
    ]);

    if (!roleRes?.data?.roleId) throw new Error('System Role: GeneralUser not found');
    if (!planRes?.data?.planId) throw new Error('Default Plan: free not found');

    /* ---------- 2. ATOMIC DATABASE TRANSACTION ---------- */
    const result = await this.prisma.$transaction(async (tx) => {
      // Construct the display name for the account
      const accountDisplayName = `${data.firstName} ${data.lastName}`.trim();
      // A. Create Root Individual Account
      const account = await tx.account.create({
        data: {
          uuid: accountUuid,
          accountCode: `ACC-${userCode}`,
          type: 'INDIVIDUAL',
          name: accountDisplayName, 
        },
      });

      // B. Create User Identity
      const user = await tx.user.create({
        data: {
          uuid: data.userUuid,
          userCode,
          email: data.email,
          // THE FIX: If phone is an empty string, save it as null
          phone: data.phone === "" ? null : data.phone,
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

    /* ---------- 3. POST-DB: EXTERNAL SYNCING (WITH ROLLBACK) ---------- */
    try {
      // Assign the role in the RBAC service
      await lastValueFrom(
        this.rbacGrpc.AssignRoleToUser({
          userUuid: data.userUuid,
          roleId: roleRes.data.roleId,
        }),
      );

      // Initialize the subscription
      const subRes = await lastValueFrom(
        this.subscriptionGrpc.SubscribeToPlan({
          subscriberUuid: accountUuid,
          planId: planRes.data.planId,
          billingCycle: null, // The service explicitly sets this to null for free plans anyway
          amountPaid: 0,
          currency: 'KES'
        }),
      );

      if (!subRes.success) {
        throw new Error(`Subscription Service Error: ${subRes.message}`);
      }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (syncError: any) {
      this.logger.error(`Post-DB Sync failed. Rolling back local records for ${data.email}`);
      
      // COMPENSATING ACTION: Manual Rollback
      await this.prisma.$transaction([
        this.prisma.profileCompletion.deleteMany({ where: { userUuid: data.userUuid } }),
        this.prisma.userProfile.deleteMany({ where: { userUuid: data.userUuid } }),
        this.prisma.user.delete({ where: { uuid: data.userUuid } }),
        this.prisma.account.delete({ where: { uuid: accountUuid } }),
      ]);

      throw new Error(`Onboarding failed during external provisioning: ${syncError.message}`);
    }

    /* ---------- 4. MAPPED RESPONSE ---------- */
    return {
      success: true,
      code: 'CREATED',
      message: 'Individual profile created successfully',
      data: this.mapToUserProfileResponseDto(result),
      error: null,
    } as BaseResponseDto<UserProfileResponseDto>;

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
): Promise<BaseResponseDto<UserProfileResponseDto>> {
  this.logger.log(`[gRPC] GetUserProfileByUuid triggered for: ${data.userUuid}`);

  try {
    // 1. Fetch from DB
        const userAggregate = await this.prisma.user.findUnique({
        where: { uuid: data.userUuid },
        include: {
          account: {
            include: {
              organization: {
                include: {
                  profile: true
                }
              },
            },
          },
          profile: true,
          completion: true,
        },
      });
    // 2. Log Raw Prisma Output
    if (userAggregate) {
      this.logger.debug(`[DB RESULT] User found. Keys returned: ${Object.keys(userAggregate).join(', ')}`);
      this.logger.debug(`[DB DETAIL] Account Object present: ${!!userAggregate.account}`);
      this.logger.debug(`[DB DETAIL] Profile Object present: ${!!userAggregate.profile}`);
      
      // Specifically check for the field causing the crash
      if (!userAggregate.account) {
        this.logger.error(`[CRITICAL] Account relation is missing in DB for user: ${data.userUuid}`);
      }
    }

    if (!userAggregate) {
      this.logger.warn(`[NOT FOUND] No user record for UUID: ${data.userUuid}`);
      throw new RpcException({ code: 5, message: 'User not found' });
    }

    // 3. Log Mapping Attempt
    this.logger.log(`[MAPPER] Attempting to map userAggregate to UserProfileResponseDto...`);
    
    // We cast to any first to log exactly what is being sent to the mapper
    const mappedData = this.mapToUserProfileResponseDto(userAggregate as PrismaUserAggregate);

    this.logger.log(`[SUCCESS] Mapping complete for: ${data.userUuid}`);

    this.logger.log(`Organisation Email For the User: ${mappedData.organization?.officialEmail ?? 'N/A'}`);
    return {
      success: true,
      message: "User retrieved successfully",
      code: 'OK', 
      data: mappedData,
      error: null,
    } as BaseResponseDto<UserProfileResponseDto>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    this.logger.error(`[ERROR] getUserProfileByUuid failed: ${err.message}`);
    
    // If it's a TypeError, it's likely the mapper crashing
    if (err instanceof TypeError) {
      this.logger.error(`[MAPPER CRASH] Detailed stack: ${err.stack}`);
    }

    throw new RpcException({
      code: err.code || 13, // Internal
      message: err.message || 'Internal server error',
    });
  }
}

  /** ------------------ Fetch user by email ------------------ */
  async getUserProfileByEmail(data: { email: string }): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const userAggregate = await this.prisma.user.findUnique({
      where: { email: data.email },
      include: {
        account: {include: {organization:true}},
        profile: true,
        completion: true,
      }
    });

    if (!userAggregate) {
      throw new RpcException({ code: 5, message: 'User not found' });
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      code: 'OK',
      data: this.mapToUserProfileResponseDto(userAggregate as PrismaUserAggregate),
      error: null,
    } as BaseResponseDto<UserProfileResponseDto>;
  }

  /** ------------------ Fetch user by userCode ------------------ */
  async getUserProfileByUserCode(
    data: { userCode: string }
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Fetching profile for User Code: ${data.userCode}`);

    // 1. Fetch the full aggregate (The Trio + Completion)
    const userAggregate = await this.prisma.user.findUnique({ 
      where: { userCode: data.userCode },
      include: {
        account: {include: {organization: true}},
        profile: true,
        completion: true,
      }
    });

    // 2. Handle Not Found
    if (!userAggregate) {
      this.logger.warn(`User Code not found: ${data.userCode}`);
      throw new RpcException({ 
        code: 5, // gRPC NOT_FOUND
        message: 'User profile not found' 
      });
    }

    // 3. Return aligned with UserProfileResponse proto message
    return {
      success: true,
      message: "User retrieved successfully",
      code: 'OK',
      // Map the aggregate and place it in the 'data' key as per proto
      data: this.mapToUserProfileResponseDto(userAggregate as PrismaUserAggregate),
      error: null,
    }   as BaseResponseDto<UserProfileResponseDto>;
  }

  /** ------------------ Get all users ------------------ */
  async getAllUsers(): Promise<BaseResponseDto<UserProfileResponseDto[]>> {
    const users = await this.prisma.user.findMany({
      include: {
        account: {include: {organization: true}},
        profile: true,
        completion: true,
      }
    });
  
    return {
      success: true,
      message: 'Users retrieved successfully',
      code: 'OK',
      data: users.map((u) => this.mapToUserProfileResponseDto(u  as PrismaUserAggregate)),
      error: null,  
    } as BaseResponseDto<UserProfileResponseDto[]>;
  }

/* ======================================================
     MAPPER: PRISMA AGGREGATE TO USER PROFILE DTO
  ====================================================== */
  private mapToUserProfileResponseDto(
    data: UserProfileAggregate | PrismaUserAggregate,
  ): UserProfileResponseDto {
    
    const isNested = (input: UserProfileAggregate | PrismaUserAggregate): input is UserProfileAggregate => {
      return 'user' in input;
    };

    const user = isNested(data) ? data.user : data;
    const account = data.account;
    const profile = data.profile;
    const completion = data.completion;
    
    // Extract organization from the nested account object
    const orgData = account?.organization;

    return {
      // 1. Account Layer
      account: {
        uuid: account?.uuid ?? '',
        accountCode: account?.accountCode ?? '',
        type: (account?.type ?? 'INDIVIDUAL') as 'INDIVIDUAL' | 'ORGANIZATION',
      },

      // 2. Identity Layer (User)
      user: {
        uuid: user.uuid,
        userCode: user.userCode,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email,
        phone: user.phone ?? '',
        status: user.status,
        roleName: user.roleName,
      },

      // 3. Organization Layer (New)
      // Only returns data if the account type is ORGANIZATION and record exists
      organization: orgData ? {
        id: orgData.id,
        uuid: orgData.uuid,
        name: orgData.name,
        orgCode: orgData.orgCode,
        officialEmail: orgData.profile?.officialEmail ?? undefined,
        verificationStatus: orgData.verificationStatus,
      } : undefined,

      // 4. Metadata Layer (Profile)
      profile: profile ? {
        bio: profile.bio ?? undefined,
        gender: profile.gender ?? undefined,
        dateOfBirth: profile.dateOfBirth?.toISOString(),
        nationalId: profile.nationalId ?? undefined,
        profileImage: profile.profileImage ?? undefined,
      } : undefined,

      // 5. Onboarding Layer (Completion)
      completion: completion ? {
        percentage: completion.percentage,
        missingFields: completion.missingFields,
        isComplete: completion.isComplete,
      } : undefined,

      // 6. Chronological Metadata
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateFullProfile(dto: UpdateFullUserProfileDto): Promise<BaseResponseDto<UserProfileResponseDto>> {
  this.logger.log(`[gRPC] Full profile update initiated for: ${dto.userUuid}`);

  try {
    const updatedAggregate = await this.prisma.$transaction(async (tx) => {
      // 1. Update Core Identity (User Table)
      const user = await tx.user.update({
        where: { uuid: dto.userUuid },
        data: {
          firstName: dto.firstName ?? undefined,
          lastName: dto.lastName ?? undefined,
          email: dto.email ?? undefined,
          phone: dto.phone === "" ? null : (dto.phone ?? undefined),
        },
      });

      // 2. Update/Create Metadata (UserProfile Table)
      await tx.userProfile.upsert({
        where: { userUuid: dto.userUuid },
        create: {
          userUuid: dto.userUuid,
          bio: dto.bio,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          nationalId: dto.nationalId,
          profileImage: dto.profileImage,
        },
        update: {
          bio: dto.bio ?? undefined,
          gender: dto.gender ?? undefined,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationalId: dto.nationalId ?? undefined,
          profileImage: dto.profileImage ?? undefined,
        },
      });

      // 3. Root Account Name Sync
      // If the human name changes, the account display name must reflect it.
      if (dto.firstName || dto.lastName) {
        await tx.account.update({
          where: { uuid: user.accountId },
          data: { name: `${user.firstName} ${user.lastName}`.trim() }
        });
      }

      // 4. Fetch the final state with all relations included for the mapper
      return tx.user.findUnique({
        where: { uuid: dto.userUuid },
        include: {
          account: {
            include: {
              organization: {
                include: { profile: true }
              },
            },
          },
          profile: true,
          completion: true,
        },
      });
    });

    if (!updatedAggregate) {
      throw new RpcException({ code: 5, message: 'User not found after update' });
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      code: 'OK',
      data: this.mapToUserProfileResponseDto(updatedAggregate as PrismaUserAggregate),
      error: null,
    } as BaseResponseDto<UserProfileResponseDto>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    this.logger.error(`Update failed: ${err.message}`);

    // Handle Unique Constraint (Email/Phone/NationalID)
    if (err.code === 'P2002') {
      const target = err.meta?.target || [];
      const field = target.includes('email') ? 'Email' : target.includes('phone') ? 'Phone' : 'National ID';
      throw new RpcException({
        code: 6, // ALREADY_EXISTS
        message: `${field} is already in use by another user.`,
      });
    }

    throw new RpcException({
      code: err.code || 13, // Internal
      message: err.message || 'Internal server error during profile update',
    });
  }
}

}