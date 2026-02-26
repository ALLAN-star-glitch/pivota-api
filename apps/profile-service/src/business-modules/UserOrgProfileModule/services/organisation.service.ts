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
  ContractorProfileResponseDto,
  OnboardOrgProviderGrpcRequestDto,
  AcceptInvitationGrpcRequestDto,
  AcceptInvitationResponseDto,
  CancelInvitationGrpcRequestDto,
  CheckInvitationStatusRequestDto,
  CheckInvitationStatusResponseDto,
  GetOrganizationInvitationsRequestDto,
  InvitationDetailsResponseDto,
  InvitationVerificationResponseDto,
  InviteMemberGrpcRequestDto,
  InviteMemberResponseDto,
  ResendInvitationGrpcRequestDto,
  VerifyInvitationRequestDto,
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

     @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,
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

    // Define what counts as a free plan
    const FREE_PLANS = ['free', 'free-forever', 'free-plan'];
    const isPremium = !FREE_PLANS.includes(targetPlanSlug);

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

  // /* ======================================================
  //    ADD MEMBER
  // ====================================================== */
  // async addMember(
  //   data: AddOrgMemberRequestDto,
  // ): Promise<BaseResponseDto<null>> {
  //   await this.prisma.organizationMember.create({
  //     data: {
  //       organizationUuid: data.orgUuid,
  //       userUuid: data.userUuid,
  //       roleName: data.role,
  //     },
  //   });

  //   return {
  //     success: true,
  //     code: 'CREATED',
  //     message: 'Member added',
  //     data: null,
  //     error: null,
  //   } as BaseResponseDto<null>;
  // }

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


  /**
 * ONBOARD ORGANIZATION SERVICE PROVIDER
 * Upgrades a business entity into a Service Provider (Contractor).
 */
async onboardOrganizationProvider(
  dto: OnboardOrgProviderGrpcRequestDto,
): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
  this.logger.log(`Onboarding organization as provider: ${dto.orgUuid}`);

  try {
    /* ---------- 1. PRE-CHECK ---------- */
    // Fetch the organization to get its Account ID
    const org = await this.prisma.organization.findUnique({
      where: { uuid: dto.orgUuid },
      select: { accountId: true }
    });

    if (!org) {
      return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
    }

    /* ---------- 2. DATABASE TRANSACTION ---------- */
    const result = await this.prisma.$transaction(async (tx) => {
      // Prevent duplicate profiles for this account
      const existing = await tx.contractorProfile.findUnique({
        where: { accountId: org.accountId }
      });

      if (existing) {
        throw new Error('This organization is already registered as a service provider');
      }

      // Create the Contractor Profile linked to the Org Account
      const contractor = await tx.contractorProfile.create({
        data: {
          accountId: org.accountId,
          specialties: dto.specialties,
          serviceAreas: dto.serviceAreas,
          // Organizations typically represent collective experience, default to 0
          yearsExperience: 0, 
          isVerified: false, 
        },
      });

      return contractor;
    });

    /* ---------- 3. RESPONSE MAPPING ---------- */
    const responseData: ContractorProfileResponseDto = {
      uuid: result.uuid,
      accountId: result.accountId,
      specialties: result.specialties,
      serviceAreas: result.serviceAreas,
      yearsExperience: result.yearsExperience ?? 0,
      isVerified: result.isVerified,
      averageRating: result.averageRating,
      totalReviews: result.totalReviews,
      createdAt: result.createdAt.toISOString(),
    };

    return BaseResponseDto.ok(
      responseData, 
      'Organization service provider profile created successfully', 
      'CREATED'
    );

  } catch (err: any) {
    this.logger.error(`Org Onboarding Failure: ${err.message}`);
    return BaseResponseDto.fail(
      err.message || 'Internal failure during organization onboarding', 
      'INTERNAL_ERROR'
    );
  }
}

  /* ======================================================
   INVITE MEMBER - Send email invitation
   ====================================================== */
/**
 * Invite a member to join an organization via email
 * Role is set internally to 'GeneralUser' (like BusinessSystemAdmin in org creation)
 */
async inviteMember(
  dto: InviteMemberGrpcRequestDto,
): Promise<BaseResponseDto<InviteMemberResponseDto>> {
  this.logger.log(`[INVITE] ============ STARTING INVITE MEMBER ============`);
  this.logger.log(`[INVITE] Admin ${dto.invitedByUserUuid} inviting ${dto.email} to org ${dto.organizationUuid}`);
  this.logger.log(`[INVITE] Full DTO: ${JSON.stringify(dto)}`);

  try {
    // 1. Verify the inviter exists and is an admin
    this.logger.log(`[INVITE] Step 1: Verifying inviter ${dto.invitedByUserUuid}`);
    const inviter = await this.prisma.user.findUnique({
      where: { uuid: dto.invitedByUserUuid },
      include: {
        memberships: {
          where: {
            organizationUuid: dto.organizationUuid,
            roleName: 'Business System Admin'
          }
        }
      }
    });

    this.logger.log(`[INVITE] Inviter found: ${JSON.stringify(inviter?.email)}`);
    this.logger.log(`[INVITE] Memberships: ${JSON.stringify(inviter?.memberships)}`);

    if (!inviter || inviter.memberships.length === 0) {
      this.logger.error(`[INVITE] Permission denied: User ${dto.invitedByUserUuid} is not an admin of org ${dto.organizationUuid}`);
      return BaseResponseDto.fail(
        'You do not have permission to invite members to this organization',
        'FORBIDDEN'
      );
    }

    // Get inviter's name
    const inviterName = inviter.firstName && inviter.lastName 
      ? `${inviter.firstName} ${inviter.lastName}`.trim()
      : inviter.email;
    this.logger.log(`[INVITE] Inviter name: ${inviterName}`);

    // 2. Get organization details
    this.logger.log(`[INVITE] Step 2: Fetching organization ${dto.organizationUuid}`);
    const organization = await this.prisma.organization.findUnique({
      where: { uuid: dto.organizationUuid },
      include: { account: true }
    });

    if (!organization) {
      this.logger.error(`[INVITE] Organization not found: ${dto.organizationUuid}`);
      return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
    }
    this.logger.log(`[INVITE] Organization found: ${organization.name}`);

    // 3. Check if user already exists
    this.logger.log(`[INVITE] Step 3: Checking if user exists with email ${dto.email}`);
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() }
    });
    this.logger.log(`[INVITE] Existing user: ${existingUser ? existingUser.uuid : 'None'}`);

    // 4. Check if user is already a member
    if (existingUser) {
      this.logger.log(`[INVITE] Step 4: Checking if user is already a member`);
      const existingMember = await this.prisma.organizationMember.findFirst({
        where: {
          organizationUuid: dto.organizationUuid,
          userUuid: existingUser.uuid
        }
      });

      if (existingMember) {
        this.logger.error(`[INVITE] User ${dto.email} is already a member of org ${dto.organizationUuid}`);
        return BaseResponseDto.fail(
          'This user is already a member of your organization',
          'CONFLICT'
        );
      }
    }

    // 5. Check for existing pending invitation
    this.logger.log(`[INVITE] Step 5: Checking for existing pending invitation`);
    const existingInvitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        organizationUuid: dto.organizationUuid,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      this.logger.error(`[INVITE] Pending invitation already exists for ${dto.email}`);
      return BaseResponseDto.fail(
        'An invitation has already been sent to this email',
        'CONFLICT'
      );
    }

    // 6. Generate invitation token and expiry
    this.logger.log(`[INVITE] Step 6: Generating invitation token`);
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    this.logger.log(`[INVITE] Token: ${token}, Expires: ${expiresAt}`);

    // 7. Create invitation record
    this.logger.log(`[INVITE] Step 7: Creating invitation record`);
    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        organizationUuid: dto.organizationUuid,
        token,
        expiresAt,
        status: 'PENDING',
        invitedByUserUuid: dto.invitedByUserUuid,
        roleName: 'GeneralUser',
        message: dto.message
      }
    });
    this.logger.log(`[INVITE] Invitation created with ID: ${invitation.id}`);

    // 8. Emit event for notification service
    this.logger.log(`[INVITE] Step 8: Emitting event to notification service`);
    const eventPattern = existingUser 
      ? 'organization.invitation.sent.existing' 
      : 'organization.invitation.sent.new';

    const eventPayload = {
      email: invitation.email,
      organizationName: organization.name,
      organizationUuid: organization.uuid,
      roleName: 'GeneralUser',
      inviterName: inviterName,
      inviteToken: token,
      message: dto.message,
    };
    
    this.logger.log(`[INVITE] Event pattern: ${eventPattern}`);
    this.logger.log(`[INVITE] Event payload: ${JSON.stringify(eventPayload)}`);
    
    this.notificationBus.emit(eventPattern, eventPayload);

    this.logger.log(`[INVITE] ✅ Invitation created successfully for ${dto.email}`);

    return BaseResponseDto.ok(
      { invitationId: invitation.id },
      existingUser 
        ? 'Invitation sent. User will be added upon acceptance.' 
        : 'Invitation sent. User will need to complete registration.',
      'INVITATION_SENT'
    );

  } catch (error) {
    this.logger.error(`[INVITE] ❌ Failed: ${error.message}`);
    this.logger.error(`[INVITE] Error stack: ${error.stack}`);
    return BaseResponseDto.fail(
      error.message || 'Failed to send invitation',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   VERIFY INVITATION - Check if token is valid
   ====================================================== */
/**
 * Verify if an invitation token is valid
 * Returns organization details and whether user exists
 */
async verifyInvitation(
  dto: VerifyInvitationRequestDto
): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
  this.logger.log(`[INVITE] Verifying token: ${dto.token}`);

  try {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        token: dto.token,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        organization: {
          select: { 
            name: true,
            uuid: true
          }
        }
      }
    });

    if (!invitation) {
      return BaseResponseDto.fail(
        'Invalid or expired invitation',
        'NOT_FOUND'
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: invitation.email }
    });

    return BaseResponseDto.ok(
      {
        isValid: true,
        email: invitation.email,
        phone: existingUser?.phone,
        organizationUuid: invitation.organizationUuid,
        organizationName: invitation.organization.name,
        roleName: 'GeneralUser', // Hard-coded for response
        isExistingUser: !!existingUser
      },
      'Invitation is valid',
      'OK'
    );

  } catch (error) {
    this.logger.error(`[INVITE] Verification failed: ${error.message}`);
    return BaseResponseDto.fail(
      'Failed to verify invitation',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   ACCEPT INVITATION - Complete the invitation flow
   ====================================================== */
/**
 * Accept an invitation and add user to organization
 * For new users: creates user record (password handled by auth service)
 * For existing users: directly adds to organization
 * Follows the same pattern as createOrganizationProfile with pre-checks and post-DB syncing
 */
async acceptInvitation(
  dto: AcceptInvitationGrpcRequestDto
): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
  this.logger.log(`[INVITE] Accepting invitation with token: ${dto.token}`);

  // Helper function to get email from token for error reporting
  const getEmailFromToken = async (token: string): Promise<string> => {
    try {
      const invitation = await this.prisma.organizationInvitation.findFirst({
        where: { token },
        select: { email: true }
      });
      return invitation?.email || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  try {
    // 1. Find and validate invitation
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        token: dto.token,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      include: {
        organization: {
          include: { 
            account: true 
          }
        },
        invitedByUser: true
      }
    });

    if (!invitation) {
      // Get email for error logging
      const email = await getEmailFromToken(dto.token);
      
      this.logger.warn(`[INVITE] Invalid or expired invitation token: ${dto.token} for email: ${email}`);
      
      return BaseResponseDto.fail(
        'Invalid or expired invitation',
        'NOT_FOUND'
      );
    }

    // 2. PRE-CHECKS: Get the role ID for GeneralUser
    const roleRes = await lastValueFrom(
      this.rbacGrpc.GetRoleIdByType({ roleType: 'GeneralUser' }).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.error(`[INVITE] RBAC service error: ${err.message}`);
          return throwError(() => new Error('RBAC service unavailable'));
        })
      )
    ).catch(() => null);

    if (!roleRes?.data?.roleId) {
      this.logger.error(`[INVITE] System Role: GeneralUser not found for invitation ${invitation.email}`);
      return BaseResponseDto.fail('System Role: GeneralUser not found', 'NOT_FOUND');
    }

    // 3. Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: invitation.email }
    });

    // 4. DATABASE TRANSACTION
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        let targetUserUuid: string;
        let isNewUser = false;

        if (existingUser) {
          targetUserUuid = existingUser.uuid;
          this.logger.log(`[INVITE] Existing user found: ${invitation.email} with UUID: ${targetUserUuid}`);
        } else {
          // Validate required fields for new user
          if (!dto.firstName || !dto.lastName || !dto.phone) {
            throw new Error('First name, last name, and phone are required for new users');
          }

          // Create new user
          targetUserUuid = randomUUID();
          isNewUser = true;

          this.logger.log(`[INVITE] Creating new user with UUID: ${targetUserUuid} for email: ${invitation.email}`);

          await tx.user.create({
            data: {
              uuid: targetUserUuid,
              email: invitation.email,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
              userCode: `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              accountId: invitation.organization.accountId,
              status: 'PENDING_PASSWORD',
              roleName: 'GeneralUser',
              profile: {
                create: { 
                  bio: `Member of ${invitation.organization.name}` 
                }
              }
            }
          });

          // Create profile completion tracker
          await tx.profileCompletion.create({
            data: {
              userUuid: targetUserUuid,
              percentage: 60,
              missingFields: { set: ['profileImage', 'nationalId'] },
              isComplete: false
            }
          });
        }

        // Add to organization members (if not already a member)
        const existingMember = await tx.organizationMember.findFirst({
          where: {
            organizationUuid: invitation.organizationUuid,
            userUuid: targetUserUuid
          }
        });

        if (!existingMember) {
          await tx.organizationMember.create({
            data: {
              organizationUuid: invitation.organizationUuid,
              userUuid: targetUserUuid,
              roleName: 'GeneralUser'
            }
          });
          this.logger.log(`[INVITE] Added user ${targetUserUuid} to organization ${invitation.organizationUuid}`);
        }

        // Mark invitation as accepted
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { 
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        });

        return { userUuid: targetUserUuid, isNewUser };
      });
    } catch (dbError) {
      this.logger.error(`[INVITE] Database transaction failed: ${dbError.message}`);
      throw dbError;
    }

    // 5. POST-DB SYNCING - Assign role via RBAC
    try {
      await lastValueFrom(
        this.rbacGrpc.AssignRoleToUser({
          userUuid: result.userUuid,
          roleId: roleRes.data.roleId,
        }),
      );

      this.logger.log(`[INVITE] Role GeneralUser assigned to user ${result.userUuid}`);

    } catch (syncError) {
      // Rollback if RBAC fails
      this.logger.error(`[INVITE] RBAC sync failed, rolling back: ${syncError.message}`);
      
      await this.prisma.$transaction([
        this.prisma.organizationMember.deleteMany({ 
          where: { 
            organizationUuid: invitation.organizationUuid,
            userUuid: result.userUuid 
          } 
        }),
        ...(result.isNewUser ? [
          this.prisma.profileCompletion.deleteMany({ where: { userUuid: result.userUuid } }),
          this.prisma.userProfile.deleteMany({ where: { userUuid: result.userUuid } }),
          this.prisma.user.delete({ where: { uuid: result.userUuid } })
        ] : [])
      ]);

      return BaseResponseDto.fail(
        `Failed to complete invitation acceptance: ${syncError.message}`,
        'INTERNAL_ERROR'
      );
    }

    // 6. Emit events based on user type
    if (result.isNewUser) {
      // Emit for new user - will be picked up by auth service
      this.notificationBus.emit('user.invitation.accepted.new', {
        email: invitation.email,
        userUuid: result.userUuid,
        organizationUuid: invitation.organizationUuid,
        organizationName: invitation.organization.name,
        roleName: 'GeneralUser',
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone
      });
      
      this.logger.log(`[INVITE] Emitted user.invitation.accepted.new event for ${invitation.email}`);
      
    } else {
      // Emit for existing user
      this.notificationBus.emit('user.invitation.accepted.existing', {
        email: invitation.email,
        userUuid: result.userUuid,
        organizationUuid: invitation.organizationUuid,
        organizationName: invitation.organization.name,
        roleName: 'GeneralUser',
        addedByUserUuid: invitation.invitedByUserUuid
      });
      
      this.logger.log(`[INVITE] Emitted user.invitation.accepted.existing event for ${invitation.email}`);
    }

    this.logger.log(`[INVITE] Invitation accepted successfully for ${invitation.email}`);

    return BaseResponseDto.ok(
      { 
        success: true, 
        userUuid: result.userUuid,
        isNewUser: result.isNewUser,
        organizationUuid: invitation.organizationUuid,
        roleName: 'GeneralUser'
      },
      result.isNewUser 
        ? 'Account created and you have been added to the organization. Please check your email to set up your password.' 
        : 'You have successfully joined the organization',
      'ACCEPTED'
    );

  } catch (error) {
    this.logger.error(`[INVITE] Acceptance failed: ${error.message}`);
    
    // Get email from token for better error tracking
    let email = 'unknown';
    try {
      const inv = await this.prisma.organizationInvitation.findFirst({
        where: { token: dto.token },
        select: { email: true }
      });
      if (inv) {
        email = inv.email;
      }
    } catch {
      // Silently fail - we still have the token
    }
    
    // Emit error event for monitoring with complete context
    this.notificationBus.emit('user.invitation.error', {
      originalEvent: 'acceptInvitation',
      error: error.message,
      payload: { 
        token: dto.token,
        email: email,
        hasFirstName: !!dto.firstName,
        hasLastName: !!dto.lastName,
        hasPhone: !!dto.phone,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
    return BaseResponseDto.fail(
      error.message || 'Failed to accept invitation',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   GET ORGANIZATION INVITATIONS - List pending invites
   ====================================================== */
/**
 * Get all pending invitations for an organization
 * Admin only function
 */
async getOrganizationInvitations(
  dto: GetOrganizationInvitationsRequestDto
): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
  this.logger.log(`[INVITE] Fetching invitations for org ${dto.organizationUuid}`);

  try {
    // Verify requester is an admin
    const isAdmin = await this.prisma.organizationMember.findFirst({
      where: {
        organizationUuid: dto.organizationUuid,
        userUuid: dto.requestingUserUuid,
        roleName: 'Business System Admin'
      }
    });

    if (!isAdmin) {
      return BaseResponseDto.fail('Unauthorized', 'FORBIDDEN');
    }

    const invitations = await this.prisma.organizationInvitation.findMany({
      where: {
        organizationUuid: dto.organizationUuid,
        status: 'PENDING'
      },
      include: {
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInvitations = invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      roleName: inv.roleName,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedByUserUuid: inv.invitedByUserUuid,
      invitedByUserName: inv.invitedByUser.firstName 
        ? `${inv.invitedByUser.firstName} ${inv.invitedByUser.lastName || ''}`.trim()
        : inv.invitedByUser.email,
      message: inv.message
    }));

    return BaseResponseDto.ok(
      formattedInvitations,
      'Invitations retrieved successfully',
      'OK'
    );

  } catch (error) {
    this.logger.error(`[INVITE] Failed to fetch invitations: ${error.message}`);
    return BaseResponseDto.fail(
      'Failed to fetch invitations',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   RESEND INVITATION - Generate new token
   ====================================================== */
/**
 * Resend a pending invitation
 * Generates a new token and extends expiry
 */
async resendInvitation(
  dto: ResendInvitationGrpcRequestDto
): Promise<BaseResponseDto<null>> {
  this.logger.log(`[INVITE] Resending invitation ${dto.invitationId}`);

  try {
    // Find the invitation
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        id: dto.invitationId,
        organizationUuid: dto.organizationUuid,
        status: 'PENDING'
      },
      include: {
        organization: {
          select: { name: true }
        }
      }
    });

    if (!invitation) {
      return BaseResponseDto.fail('Invitation not found', 'NOT_FOUND');
    }

    // Verify requester is an admin
    const isAdmin = await this.prisma.organizationMember.findFirst({
      where: {
        organizationUuid: dto.organizationUuid,
        userUuid: dto.requestedByUserUuid,
        roleName: 'Business System Admin'
      }
    });

    if (!isAdmin) {
      return BaseResponseDto.fail('Unauthorized', 'FORBIDDEN');
    }

    // Generate new token and expiry
    const newToken = randomUUID();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    // Update invitation
    await this.prisma.organizationInvitation.update({
      where: { id: dto.invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiry,
        updatedAt: new Date()
      }
    });

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: invitation.email }
    });

    // Emit event for notification service
    this.notificationBus.emit('organization.invitation.resend', {
      email: invitation.email,
      organizationName: invitation.organization.name,
      organizationUuid: dto.organizationUuid,
      roleName: invitation.roleName,
      inviteToken: newToken,
      joinUrl: `${process.env.FRONTEND_URL}/accept-invite?token=${newToken}`,
      invitedByUserUuid: dto.requestedByUserUuid,
      userType: existingUser ? 'EXISTING' : 'NEW'
    });

    return BaseResponseDto.ok(null, 'Invitation resent successfully', 'OK');

  } catch (error) {
    this.logger.error(`[INVITE] Resend failed: ${error.message}`);
    return BaseResponseDto.fail(
      'Failed to resend invitation',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   CANCEL INVITATION - Remove pending invitation
   ====================================================== */
/**
 * Cancel a pending invitation
 */
async cancelInvitation(
  dto: CancelInvitationGrpcRequestDto
): Promise<BaseResponseDto<null>> {
  this.logger.log(`[INVITE] Cancelling invitation ${dto.invitationId}`);

  try {
    // Verify requester is an admin
    const isAdmin = await this.prisma.organizationMember.findFirst({
      where: {
        organizationUuid: dto.organizationUuid,
        userUuid: dto.requestedByUserUuid,
        roleName: 'Business System Admin'
      }
    });

    if (!isAdmin) {
      return BaseResponseDto.fail('Unauthorized', 'FORBIDDEN');
    }

    // Update invitation status to CANCELLED
    await this.prisma.organizationInvitation.update({
      where: { 
        id: dto.invitationId,
        organizationUuid: dto.organizationUuid,
        status: 'PENDING'
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    return BaseResponseDto.ok(null, 'Invitation cancelled successfully', 'OK');

  } catch (error) {
    this.logger.error(`[INVITE] Cancel failed: ${error.message}`);
    return BaseResponseDto.fail(
      'Failed to cancel invitation',
      'INTERNAL_ERROR'
    );
  }
}

/* ======================================================
   CHECK INVITATION STATUS - For admin dashboard
   ====================================================== */
/**
 * Check if an email has a pending invitation for an organization
 */
async checkInvitationStatus(
  dto: CheckInvitationStatusRequestDto
): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
  this.logger.log(`[INVITE] Checking invitation status for ${dto.email} in org ${dto.organizationUuid}`);

  try {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        organizationUuid: dto.organizationUuid,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        expiresAt: true
      }
    });

    return BaseResponseDto.ok(
      {
        hasPendingInvitation: !!invitation,
        invitationId: invitation?.id,
        expiresAt: invitation?.expiresAt
      },
      'Status checked successfully',
      'OK'
    );

  } catch (error) {
    this.logger.error(`[INVITE] Status check failed: ${error.message}`);
    return BaseResponseDto.fail(
      'Failed to check invitation status',
      'INTERNAL_ERROR'
    );
  }
}
  
}
