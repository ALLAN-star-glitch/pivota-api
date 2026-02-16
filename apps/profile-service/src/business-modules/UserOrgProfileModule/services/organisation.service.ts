/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client'
import {
  BaseResponseDto,
  RoleIdResponse,
  RoleIdRequestDto,
  SubscribeToPlanDto,
  SubscriptionResponseDto,
  PlanIdRequestDto,
  PlanIdDtoResponse,
  AssignRoleToUserRequestDto,
  UserRoleResponseDto,
  AddOrgMemberRequestDto,
  CreateOrganisationRequestDto,
  OrganizationAdminResponseDto,
  OrganizationProfileResponseDto,
  ProfileCompletionResponseDto,
  AccountBaseDto,
  OrganizationOnboardedEventDto,
  InviteMemberRequestDto,
  MemberInviteEventDto,
} from '@pivota-api/dtos';
import { ClientProxy, RpcException, ClientGrpc } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable, catchError, timeout, throwError } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';

interface AdminUserEntity {
  uuid: string;
  userCode: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  phone: string;
}

interface OrganizationProfileAggregate {
  organization: {
    id: string | number;
    uuid: string;
    orgCode: string;
    name: string;
    verificationStatus: string;
    createdAt: Date;
    updatedAt: Date;
  };
  account: {
    uuid: string;
    accountCode: string;
    type: string;
  };
  admin: AdminUserEntity;
  completion?: {
    percentage: number;
    missingFields: string[];
    isComplete: boolean;
  };
}

/* ======================================================
   gRPC INTERFACES
====================================================== */

interface RbacServiceGrpc {
  GetRoleIdByType(
    data: RoleIdRequestDto,
  ): Observable<BaseResponseDto<RoleIdResponse>>;

  AssignRoleToUser(
    data: AssignRoleToUserRequestDto,
  ): Observable<BaseResponseDto<UserRoleResponseDto>>;
}

interface SubscriptionServiceGrpc {
  SubscribeToPlan(
    data: SubscribeToPlanDto,
  ): Observable<BaseSubscriptionResponseGrpc<SubscriptionResponseDto>>;
}

interface PlansServiceGrpc {
  GetPlanIdBySlug(
    data: PlanIdRequestDto,
  ): Observable<BaseResponseDto<PlanIdDtoResponse>>;
}

/* ======================================================
   SERVICE
====================================================== */
@Injectable()
export class OrganisationService  {
  private readonly logger = new Logger(OrganisationService.name);

  private rbacGrpc!: RbacServiceGrpc;
  private subscriptionGrpc!: SubscriptionServiceGrpc;
  private plansGrpc!: PlansServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE')
    private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
  ) {
     this.rbacGrpc = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.subscriptionGrpc =
      this.subscriptionsClient.getService<SubscriptionServiceGrpc>(
        'SubscriptionService',
      );
    this.plansGrpc =
      this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }

  /* ======================================================
     CREATE ORGANIZATION PROFILE
  ====================================================== */
async createOrganizationProfile(
  data: CreateOrganisationRequestDto & { planSlug?: string },
): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
  /**
   * PIVOTACONNECT KENYA - DATA NORMALIZATION
   * Normalizes Kenyan formats (07..., 01..., 254...) to E.164 (+254...)
   * Applied to both Official Org Phone and Admin Phone.
   */
  const KENYAN_REGEX = /^(?:254|\+254|0)?((?:7|1|2)\d{8})$/;

  // Normalize Official Org Phone
  const rawOrgPhone = data.officialPhone?.trim();
  const normalizedOrgPhone = rawOrgPhone?.match(KENYAN_REGEX) 
    ? `+254${rawOrgPhone.match(KENYAN_REGEX)[1]}` 
    : rawOrgPhone || null;

  // Normalize Admin Phone
  const rawAdminPhone = data.phone?.trim();
  const normalizedAdminPhone = rawAdminPhone?.match(KENYAN_REGEX) 
    ? `+254${rawAdminPhone.match(KENYAN_REGEX)[1]}` 
    : rawAdminPhone || null;

  // Normalize Emails
  const normalizedAdminEmail = data.email.toLowerCase().trim();
  const normalizedOfficialEmail = data.officialEmail.toLowerCase().trim();

  this.logger.log(`Initiating organization creation: ${data.name} (Admin: ${normalizedAdminEmail}) [Plan: ${data.planSlug || 'free'}]`);

  const orgUuid = randomUUID();
  const accountUuid = randomUUID();
  const orgCode = `ORG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const targetPlanSlug = data.planSlug || 'free';

  try {
    /* ---------- 1. PRE-CHECKS ---------- */
    const [roleRes, planRes] = await Promise.all([
      lastValueFrom(
        this.rbacGrpc.GetRoleIdByType({ roleType: 'BusinessSystemAdmin' }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error('RBAC service unavailable')))
        ),
      ).catch(() => null),
      lastValueFrom(
        this.plansGrpc.GetPlanIdBySlug({ slug: targetPlanSlug }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error(`Plan slug: ${targetPlanSlug} not found`)))
        ),
      ).catch(() => null),
    ]);

    if (!roleRes?.data?.roleId) {
      return BaseResponseDto.fail('System Role: BusinessSystemAdmin not found', 'NOT_FOUND');
    }
    if (!planRes?.data?.planId) {
      return BaseResponseDto.fail(`Plan: ${targetPlanSlug} not found`, 'NOT_FOUND');
    }

    const isPremium = targetPlanSlug !== 'free';

    /* ---------- 2. DATABASE TRANSACTION ---------- */
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            uuid: accountUuid,
            accountCode: `ACC-${orgCode}`,
            type: 'ORGANIZATION',
            name: data.name,
            status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          },
        });

        const organization = await tx.organization.create({
          data: {
            uuid: orgUuid,
            orgCode,
            name: data.name,
            accountId: account.uuid,
            verificationStatus: isPremium ? 'PENDING_PAYMENT' : 'PENDING',
            profile: {
              create: {
                officialEmail: normalizedOfficialEmail,
                officialPhone: normalizedOrgPhone,
                physicalAddress: data.physicalAddress,
                typeSlug: data.organizationType || 'PRIVATE_LIMITED',
              },
            },
          },
        });

        const admin = await tx.user.create({
          data: {
            uuid: data.adminUserUuid,
            userCode: `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            email: normalizedAdminEmail,
            phone: normalizedAdminPhone,
            firstName: data.adminFirstName,
            lastName: data.adminLastName,
            roleName: 'Business System Admin',
            accountId: account.uuid,
            status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
            profile: {
              create: { bio: `Administrator for ${data.name}` }
            }
          },
          include: { profile: true } 
        });

        await tx.organizationMember.create({
          data: {
            organizationUuid: organization.uuid,
            userUuid: admin.uuid,
            roleName: 'Business System Admin',
          },
        });

        const completion = await tx.profileCompletion.create({
          data: {
            organizationUuid: organization.uuid,
            percentage: 40, 
            missingFields: { set: ['KRA_PIN', 'REGISTRATION_NO', 'WEBSITE'] },
            isComplete: false,
          },
        });

        return { account, organization, admin, completion };
      });
    } catch (dbError: unknown) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
        const targets = (dbError.meta?.target as string | string[]) || '';
        const targetString = Array.isArray(targets) ? targets.join(',').toLowerCase() : targets.toLowerCase();
        const errorMessage = dbError.message.toLowerCase();

        this.logger.warn(`Org Unique constraint violation. Targets: [${targetString}] | Msg: ${errorMessage}`);

        if (targetString.includes('officialemail') || errorMessage.includes('officialemail')) {
          return BaseResponseDto.fail('This organization email is already registered', 'ALREADY_EXISTS');
        }
        if (targetString.includes('officialphone') || errorMessage.includes('officialphone')) {
          return BaseResponseDto.fail('This organization phone number is already registered', 'ALREADY_EXISTS');
        }
        if (targetString.includes('email') || errorMessage.includes('email')) {
          return BaseResponseDto.fail('Admin email is already registered to another account', 'ALREADY_EXISTS');
        }
        if (targetString.includes('name') || errorMessage.includes('name')) {
          return BaseResponseDto.fail('An organization with this name already exists', 'ALREADY_EXISTS');
        }

        return BaseResponseDto.fail('Organization details already exist in our system', 'ALREADY_EXISTS', dbError.meta);
      }
      const msg = dbError instanceof Error ? dbError.message : 'Database error during Org creation';
      return BaseResponseDto.fail(msg, 'INTERNAL_ERROR');
    }

    /* ---------- 3. POST-DB: SYNCING ---------- */
    try {
      await lastValueFrom(
        this.rbacGrpc.AssignRoleToUser({
          userUuid: data.adminUserUuid,
          roleId: roleRes.data.roleId,
        }),
      );

      if (!isPremium) {
        const subRes = await lastValueFrom(
          this.subscriptionGrpc.SubscribeToPlan({
            subscriberUuid: accountUuid,
            planId: planRes.data.planId,
            billingCycle: null
          }),
        );

        if (!subRes.success) throw new Error(subRes.message);
      }

    } catch (syncError: unknown) {
      const msg = syncError instanceof Error ? syncError.message : 'Sync failed';
      this.logger.error(`Post-DB Sync failed for Org ${data.name}: ${msg}`);
      
      await this.prisma.$transaction([
        this.prisma.profileCompletion.deleteMany({ where: { organizationUuid: orgUuid } }),
        this.prisma.organizationMember.deleteMany({ where: { organizationUuid: orgUuid } }),
        this.prisma.userProfile.deleteMany({ where: { userUuid: data.adminUserUuid } }),
        this.prisma.user.delete({ where: { uuid: data.adminUserUuid } }),
        this.prisma.organizationProfile.deleteMany({ where: { organizationUuid: orgUuid } }),
        this.prisma.organization.delete({ where: { uuid: orgUuid } }),
        this.prisma.account.delete({ where: { uuid: accountUuid } }),
      ]);

      return BaseResponseDto.fail(`Organization provisioning failed: ${msg}`, 'INTERNAL_ERROR');
    }

    /* ---------- 4. SUCCESS RESPONSE ---------- */
    return BaseResponseDto.ok(
      this.mapToOrganizationProfileDto(result),
      isPremium ? 'Organization created. Payment required.' : 'Organization created successfully',
      isPremium ? 'PAYMENT_REQUIRED' : 'CREATED'
    );

  } catch (err: unknown) {
    const finalMsg = err instanceof Error ? err.message : 'Critical organization creation failure';
    this.logger.error(finalMsg);
    return BaseResponseDto.fail(finalMsg, 'INTERNAL_ERROR');
  }
}


  /* ======================================================
     GET ORGANIZATION
  ====================================================== */
  async getOrganisationByUuid(
    orgUuid: string,
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    const org = await this.prisma.organization.findUnique({
      where: { uuid: orgUuid },
      include: {
        account: true,
        completion: true,
        members: {
          where: { roleName: 'BUSINESS_ADMIN' },
          include: { user: true },
          take: 1,
        },
      },
    });

    if (!org)
      throw new RpcException({ code: 5, message: 'Organisation not found' });

    const adminUser = org.members[0]?.user;

    return {
      success: true,
      code: 'OK',
      message: 'Organisation retrieved',
      data: {
        id: org.id,
        uuid: org.uuid,
        orgCode: org.orgCode,
        name: org.name,
        verificationStatus: org.verificationStatus,
        account: org.account as AccountBaseDto,
        admin: adminUser ? this.mapToAdminDto(adminUser) : null,
        completion: org.completion as ProfileCompletionResponseDto,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
    } as unknown as BaseResponseDto<OrganizationProfileResponseDto>;
  }

  /* ======================================================
     ADD MEMBER
  ====================================================== */
  async addMember(
    data: AddOrgMemberRequestDto,
  ): Promise<BaseResponseDto<null>> {
    await this.prisma.organizationMember.create({
      data: {
        organizationUuid: data.orgUuid,
        userUuid: data.userUuid,
        roleName: data.role,
      },
    });

    return {
      success: true,
      code: 'CREATED',
      message: 'Member added',
      data: null,
      error: null,
    } as BaseResponseDto<null>;
  }

  /* ======================================================
   GET ORGANIZATIONS BY TYPE
====================================================== */
async getOrganisationsByType(
  typeSlug: string,
): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
  this.logger.log(`Fetching organizations with type slug: ${typeSlug}`);

  // 1. Fetch organizations filtered by the profile's typeSlug
  const organizations = await this.prisma.organization.findMany({
    where: {
      profile: {
        typeSlug: typeSlug,
      },
    },
    include: {
      account: true,
      completion: true,
      profile: true, // Included to access typeSlug and other metadata
      members: {
        // We look for the primary admin to satisfy the DTO requirement
        where: { roleName: 'Business System Admin' }, 
        include: { user: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. Map the results to the response DTO
  const mappedData = organizations.map((org) => {
    const adminUser = org.members[0]?.user;
    
    // We use a manual aggregate object to fit your existing mapper's signature
    return this.mapToOrganizationProfileDto({
      organization: {
        id: org.id,
        uuid: org.uuid,
        orgCode: org.orgCode,
        name: org.name,
        verificationStatus: org.verificationStatus,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      },
      account: {
        uuid: org.account.uuid,
        accountCode: org.account.accountCode,
        type: org.account.type,
      },
      admin: adminUser ? (adminUser as unknown as AdminUserEntity) : ({} as AdminUserEntity),
      completion: org.completion ? {
        percentage: org.completion.percentage,
        missingFields: org.completion.missingFields,
        isComplete: org.completion.isComplete
      } : undefined
    });
  });

  return {
    success: true,
    code: 'OK',
    message: `Found ${organizations.length} organizations of type ${typeSlug}`,
    data: mappedData,
    error: null,
  } as BaseResponseDto<OrganizationProfileResponseDto[]>;
}

  /* ======================================================
     MAPPERS
  ====================================================== */
  private mapToOrganizationProfileDto(
    data: OrganizationProfileAggregate,
  ): OrganizationProfileResponseDto {
    return {
      id: String(data.organization.id),
      uuid: data.organization.uuid,
      orgCode: data.organization.orgCode,
      name: data.organization.name,
      verificationStatus: data.organization.verificationStatus,
      account: {
        uuid: data.account.uuid,
        accountCode: data.account.accountCode,
        type: (data.account.type ?? 'INDIVIDUAL') as 'INDIVIDUAL' | 'ORGANIZATION',
      },
      admin: this.mapToAdminDto(data.admin),
      completion: data.completion,
      createdAt: data.organization.createdAt,
      updatedAt: data.organization.updatedAt,
    };
  }

  private mapToAdminDto(user: AdminUserEntity): OrganizationAdminResponseDto {
    return {
  uuid: user.uuid,
  userCode: user.userCode,
  email: user.email,
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  roleName: user.roleName,
  phone: user.phone,
};
  }
  
}
