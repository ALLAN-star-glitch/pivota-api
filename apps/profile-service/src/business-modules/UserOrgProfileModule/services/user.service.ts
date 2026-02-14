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
import { Account, Organization, ProfileCompletion, User, UserProfile, OrganizationProfile, Prisma } from '../../../../generated/prisma/client';
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
     CREATE INDIVIDUAL PROFILE (UPDATED FOR PREMIUM)
  ====================================================== */
async createUserProfile(
  data: CreateUserRequestDto & { planSlug?: string },
): Promise<BaseResponseDto<UserProfileResponseDto>> {
  this.logger.log(`Initiating individual profile creation: ${data.email} [Plan: ${data.planSlug || 'free-forever'}]`);

  const accountUuid = randomUUID();
  const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const targetPlanSlug = data.planSlug || 'free-forever';

  try {
    /* ---------- 1. PRE-CHECKS: RBAC ROLE & PLAN ---------- */
    const [roleRes, planRes] = await Promise.all([
      lastValueFrom(
        this.rbacGrpc.GetRoleIdByType({ roleType: 'GeneralUser' }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error('RBAC service unavailable')))
        ),
      ).catch(() => null),
      lastValueFrom(
        this.plansGrpc.GetPlanIdBySlug({ slug: targetPlanSlug }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error('Plans service unavailable')))
        ),
      ).catch(() => null),
    ]);

    if (!roleRes?.data?.roleId) {
      return BaseResponseDto.fail('System Role: GeneralUser not found or RBAC service down', 'NOT_FOUND');
    }
    if (!planRes?.data?.planId) {
      return BaseResponseDto.fail(`Plan slug: ${targetPlanSlug} not found or Plans service down`, 'NOT_FOUND');
    }

    const isPremium = targetPlanSlug !== 'free-forever';

    /* ---------- 2. ATOMIC DATABASE TRANSACTION ---------- */
    // Wrap the transaction in a try-catch to handle DB-specific errors like P2002 (Unique Constraint)
    let result: UserProfileAggregate | PrismaUserAggregate;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const accountDisplayName = `${data.firstName} ${data.lastName}`.trim();
        
        const account = await tx.account.create({
          data: {
            uuid: accountUuid,
            accountCode: `ACC-${userCode}`,
            type: 'INDIVIDUAL',
            name: accountDisplayName,
            status: isPremium ? 'PENDING' : 'ACTIVE', 
          },
        });

        const user = await tx.user.create({
          data: {
            uuid: data.userUuid,
            userCode,
            email: data.email,
            phone: data.phone === "" ? null : data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            roleName: 'General User',
            accountId: account.uuid,
            status: isPremium ? 'INACTIVE' : 'ACTIVE',
          },
        });

        const profile = await tx.userProfile.create({
          data: { userUuid: user.uuid },
        });

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
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
    if (dbError.code === 'P2002') {
      // 1. Check the target array
      const targets = (dbError.meta?.target as string | string[]) || '';
      const targetString = Array.isArray(targets) ? targets.join(',').toLowerCase() : targets.toLowerCase();
      
      // 2. Also check the error message (contains index names like 'users_email_key')
      const errorMessage = dbError.message.toLowerCase();
      
      this.logger.warn(`Unique constraint violation. Targets: [${targetString}] | Message: ${errorMessage}`);

      // Check BOTH target array and the full error message for keywords
      if (targetString.includes('email') || errorMessage.includes('email')) {
        return BaseResponseDto.fail('A user with this email address already exists', 'ALREADY_EXISTS');
      }
      
      if (targetString.includes('phone') || errorMessage.includes('phone')) {
        return BaseResponseDto.fail('This phone number is already registered to another account', 'ALREADY_EXISTS');
      }

      if (targetString.includes('uuid') || errorMessage.includes('uuid')) {
        return BaseResponseDto.fail('Identity conflict: User UUID already exists', 'ALREADY_EXISTS');
      }

      return BaseResponseDto.fail('A profile with these unique details already exists', 'ALREADY_EXISTS', dbError.meta);
    }
  }

      const errorMessage = dbError instanceof Error ? dbError.message : 'Database transaction failed';
      return BaseResponseDto.fail(errorMessage, 'INTERNAL_ERROR');
    }

    /* ---------- 3. POST-DB: EXTERNAL SYNCING (WITH ROLLBACK) ---------- */
    try {
      await lastValueFrom(
        this.rbacGrpc.AssignRoleToUser({
          userUuid: data.userUuid,
          roleId: roleRes.data.roleId,
        }),
      );

      if (!isPremium) {
        const subRes = await lastValueFrom(
          this.subscriptionGrpc.SubscribeToPlan({
            subscriberUuid: accountUuid,
            planId: planRes.data.planId,
            billingCycle: null,
            amountPaid: 0,
            currency: 'KES'
          }),
        );

        if (!subRes.success) {
          throw new Error(`Subscription Service Error: ${subRes.message}`);
        }
      }

    } catch (syncError) {
      this.logger.error(`Post-DB Sync failed. Rolling back local records for ${data.email}`);
      
      await this.prisma.$transaction([
        this.prisma.profileCompletion.deleteMany({ where: { userUuid: data.userUuid } }),
        this.prisma.userProfile.deleteMany({ where: { userUuid: data.userUuid } }),
        this.prisma.user.delete({ where: { uuid: data.userUuid } }),
        this.prisma.account.delete({ where: { uuid: accountUuid } }),
      ]);

      return BaseResponseDto.fail(
        `Onboarding failed during external provisioning: ${syncError.message}`, 
        'INTERNAL_ERROR'
      );
    }

    /* ---------- 4. SUCCESS RESPONSE ---------- */
    return BaseResponseDto.ok(
      this.mapToUserProfileResponseDto(result),
      isPremium ? 'Profile created. Payment required.' : 'Individual profile created successfully',
      isPremium ? 'PAYMENT_REQUIRED' : 'CREATED'
    );

  } catch (err) {
    this.logger.error(`Unexpected failure in createUserProfile: ${err.message}`);
    return BaseResponseDto.fail(err.message || 'Internal failure during profile creation', 'INTERNAL_ERROR', err.stack);
  }
}

  /** ------------------ Fetch user by UUID ------------------ */
  async getUserProfileByUuid(
  data: GetUserByUserUuidDto,
): Promise<BaseResponseDto<UserProfileResponseDto>> {
  this.logger.log(`[gRPC] GetUserProfileByUuid triggered for: ${data.userUuid}`);

  try {
    const userAggregate = await this.prisma.user.findUnique({
      where: { uuid: data.userUuid },
      include: {
        account: {
          include: {
            organization: { include: { profile: true } },
          },
        },
        profile: true,
        completion: true,
      },
    });

    // 1. Return a clean failure object instead of throwing an RpcException
    if (!userAggregate) {
      this.logger.warn(`[NOT FOUND] No user record for UUID: ${data.userUuid}`);
      return {
        success: false,
        message: `User with UUID ${data.userUuid} was not found in the system.`,
        code: 'USER_NOT_FOUND',
        data: null,
      };
    }

    const mappedData = this.mapToUserProfileResponseDto(userAggregate as PrismaUserAggregate);

    return {
      success: true,
      message: "User retrieved successfully",
      code: 'OK', 
      data: mappedData,
    };

  } catch (error) {
    this.logger.error(`[ERROR] getUserProfileByUuid failed: ${error.message}`);
    
    // 2. Even on a code crash (like a mapper error), return a valid response
    return {
      success: false,
      message: error.message || 'An internal error occurred during profile retrieval',
      code: 'INTERNAL_ERROR',
      data: null,
    };
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