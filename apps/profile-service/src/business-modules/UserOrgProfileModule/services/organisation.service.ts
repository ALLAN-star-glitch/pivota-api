
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
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
  CreateOrganisationRequestDto,
  OrganizationProfileResponseDto,
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
  ProfileCompletionDto,
  EmployerProfileDataDto,
  SocialServiceProviderProfileDataDto,
  PropertyOwnerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  IntermediaryAgentProfileDataDto,
  EmployerProfileResponseDto,
  SocialServiceProviderProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  UpdateOrgProfileRequestDto,
} from '@pivota-api/dtos';

import { 
  EmployerProfile,
  SocialServiceProviderProfile,
  PropertyOwnerProfile,
  SkilledProfessionalProfile,
  IntermediaryAgentProfile,
  OrganizationProfile,
  Account,
  User,
  OrganizationMember,
  OrganizationInvitation,
  IndividualProfile,
} from '../../../../generated/prisma/client';
import { ClientProxy, RpcException, ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable, catchError, timeout, throwError } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';
import { ProfileType, OrganizationPurpose, OrganizationType, AccountType, ServiceProviderType, PropertyType, AgentType } from '@pivota-api/constants';
import { StringUtils, PhoneUtils } from '@pivota-api/utils';
import { createBusinessProfile, BusinessProfileType } from '../../utils/business-profiles-creator.utils';


// ==================== Type Definitions ====================

// At the top of your file, update the type definition:

type OrganizationWithDetails = OrganizationProfile & {
  type: {                   
    slug: string;
    label: string;
    description: string | null;
    order: number;
  } | null;
  account: Account & {
    individualProfile: IndividualProfile | null;
    employerProfile: EmployerProfile | null;
    socialServiceProviderProfile: SocialServiceProviderProfile | null;
    propertyOwnerProfile: PropertyOwnerProfile | null;
    skilledProfessionalProfile: SkilledProfessionalProfile | null;
    intermediaryAgentProfile: IntermediaryAgentProfile | null;
    users: User[];
  };
  members: (OrganizationMember & { 
    user: User & {
      individualProfile?: IndividualProfile | null;
    }
  })[];
};

// ==================== gRPC Interfaces ====================

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

// ==================== Profile Completion Weights ====================

const ORGANIZATION_COMPLETION_WEIGHTS = {
  ORGANIZATION_PROFILE: 20,
  EMPLOYER: {
    BASE: 30,
    WITH_COMPANY_INFO: 40,
    WITH_PREFERENCES: 45,
  },
  SOCIAL_SERVICE_PROVIDER: {
    BASE: 30,
    WITH_SERVICES: 40,
    WITH_VERIFICATION: 50,
  },
  PROPERTY_OWNER: {
    BASE: 30,
    WITH_PROPERTIES: 40,
    WITH_VERIFICATION: 45,
  },
  SKILLED_PROFESSIONAL: {
    BASE: 30,
    WITH_LICENSE: 40,
    WITH_PORTFOLIO: 45,
    WITH_VERIFICATION: 50,
  },
  INTERMEDIARY_AGENT: {
    BASE: 30,
    WITH_LICENSE: 40,
    WITH_SPECIALIZATIONS: 45,
  },
};

// ==================== Service ====================

@Injectable()
export class OrganisationService implements OnModuleInit {
  private readonly logger = new Logger(OrganisationService.name);
  private rbacGrpc: RbacServiceGrpc;
  private subscriptionGrpc: SubscriptionServiceGrpc;
  private plansGrpc: PlansServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE')
    private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
    @Inject('NOTIFICATION_EVENT_BUS') private readonly notificationBus: ClientProxy,
    // For storage events (consuming)
    @Inject('KAFKA_STORAGE_CLIENT') private readonly storageKafkaClient: ClientKafka,
    // For analytics events (producing)
    @Inject('KAFKA_ANALYTICS_CLIENT') private readonly analyticsKafkaClient: ClientKafka,
  ) {
    this.rbacGrpc = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.subscriptionGrpc =
      this.subscriptionsClient.getService<SubscriptionServiceGrpc>(
        'SubscriptionService',
      );
    this.plansGrpc =
      this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }

  async onModuleInit() {
    this.storageKafkaClient.subscribeToResponseOf('file.delete_obsolete');
    await this.storageKafkaClient.connect();
  }

  // ======================================================
  // HELPER METHODS
  // ======================================================

  /**
   * Parse JSON field safely
   */
  private parseJsonField<T>(field: Prisma.JsonValue | null | undefined, defaultValue: T): T {
    if (!field) return defaultValue;
    try {
      if (typeof field === 'string') {
        return JSON.parse(field) as T;
      }
      if (typeof field === 'object' && field !== null) {
        return field as unknown as T;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Update account's activeProfiles JSON array (with transaction to prevent race conditions)
   */
  private async updateActiveProfiles(
    accountUuid: string,
    profileType: ProfileType,
    action: 'add' | 'remove'
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { uuid: accountUuid },
        select: { activeProfiles: true }
      });

      const profiles = this.parseJsonField<string[]>(account?.activeProfiles, []) as ProfileType[];
      
      let updatedProfiles: string[];
      if (action === 'add' && !profiles.includes(profileType)) {
        updatedProfiles = [...profiles, profileType];
      } else if (action === 'remove') {
        updatedProfiles = profiles.filter(p => p !== profileType);
      } else {
        updatedProfiles = profiles;
      }

      await tx.account.update({
        where: { uuid: accountUuid },
        data: { activeProfiles: StringUtils.stringifyJsonField(updatedProfiles) }
      });
    });
  }

  /**
   * Calculate profile completion percentage based on filled fields
   */
  private calculateProfileCompletion(
    profileType: ProfileType,
    data: EmployerProfileDataDto | SocialServiceProviderProfileDataDto | 
          PropertyOwnerProfileDataDto | SkilledProfessionalProfileDataDto | 
          IntermediaryAgentProfileDataDto
  ): number {
    let baseScore = 0;
    let maxScore = 0;

    switch (profileType) {
      case 'EMPLOYER': {
        const employerData = data as EmployerProfileDataDto;
        baseScore = ORGANIZATION_COMPLETION_WEIGHTS.EMPLOYER.BASE;
        maxScore = ORGANIZATION_COMPLETION_WEIGHTS.EMPLOYER.WITH_PREFERENCES;
        
        if (employerData.companyName && employerData.industry) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.EMPLOYER.WITH_COMPANY_INFO);
        if (employerData.preferredSkills?.length) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.EMPLOYER.WITH_PREFERENCES);
        break;
      }

      case 'SOCIAL_SERVICE_PROVIDER': {
        const providerData = data as SocialServiceProviderProfileDataDto;
        baseScore = ORGANIZATION_COMPLETION_WEIGHTS.SOCIAL_SERVICE_PROVIDER.BASE;
        maxScore = ORGANIZATION_COMPLETION_WEIGHTS.SOCIAL_SERVICE_PROVIDER.WITH_VERIFICATION;
        
        if (providerData.servicesOffered?.length) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.SOCIAL_SERVICE_PROVIDER.WITH_SERVICES);
        break;
      }

      case 'PROPERTY_OWNER': {
        const ownerData = data as PropertyOwnerProfileDataDto;
        baseScore = ORGANIZATION_COMPLETION_WEIGHTS.PROPERTY_OWNER.BASE;
        maxScore = ORGANIZATION_COMPLETION_WEIGHTS.PROPERTY_OWNER.WITH_VERIFICATION;
        
        if (ownerData.preferredPropertyTypes?.length) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.PROPERTY_OWNER.WITH_PROPERTIES);
        break;
      }

      case 'SKILLED_PROFESSIONAL': {
        const profData = data as SkilledProfessionalProfileDataDto;
        baseScore = ORGANIZATION_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.BASE;
        maxScore = ORGANIZATION_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_VERIFICATION;
        
        if (profData.licenseNumber) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_LICENSE);
        if (profData.portfolioImages?.length) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_PORTFOLIO);
        break;
      }

      case 'INTERMEDIARY_AGENT': {
        const agentData = data as IntermediaryAgentProfileDataDto;
        baseScore = ORGANIZATION_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.BASE;
        maxScore = ORGANIZATION_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_SPECIALIZATIONS;
        
        if (agentData.licenseNumber) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_LICENSE);
        if (agentData.specializations?.length) 
          baseScore = Math.max(baseScore, ORGANIZATION_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_SPECIALIZATIONS);
        break;
      }
    }

    return Math.min(Math.round((baseScore / maxScore) * 100), 100);
  }

  /**
   * Get missing fields for profile completion
   */
  private getMissingFields(
    profileType: ProfileType,
    data: EmployerProfileDataDto | SocialServiceProviderProfileDataDto | 
          PropertyOwnerProfileDataDto | SkilledProfessionalProfileDataDto | 
          IntermediaryAgentProfileDataDto
  ): string[] {
    const missing: string[] = [];

    switch (profileType) {
      case 'EMPLOYER': {
        const employerData = data as EmployerProfileDataDto;
        if (!employerData.companyName) missing.push('companyName');
        if (!employerData.industry) missing.push('industry');
        if (!employerData.preferredSkills?.length) missing.push('preferredSkills');
        break;
      }

      case 'SOCIAL_SERVICE_PROVIDER': {
        const providerData = data as SocialServiceProviderProfileDataDto;
        if (!providerData.providerType) missing.push('providerType');
        if (!providerData.servicesOffered?.length) missing.push('servicesOffered');
        if (!providerData.serviceAreas?.length) missing.push('serviceAreas');
        break;
      }

      case 'PROPERTY_OWNER': {
        const ownerData = data as PropertyOwnerProfileDataDto;
        if (!ownerData.preferredPropertyTypes?.length) missing.push('preferredPropertyTypes');
        if (!ownerData.serviceAreas?.length) missing.push('serviceAreas');
        break;
      }

      case 'SKILLED_PROFESSIONAL': {
        const profData = data as SkilledProfessionalProfileDataDto;
        if (!profData.title) missing.push('title');
        if (!profData.profession) missing.push('profession');
        if (!profData.specialties?.length) missing.push('specialties');
        if (!profData.licenseNumber) missing.push('licenseNumber');
        break;
      }

      case 'INTERMEDIARY_AGENT': {
        const agentData = data as IntermediaryAgentProfileDataDto;
        if (!agentData.agentType) missing.push('agentType');
        if (!agentData.specializations?.length) missing.push('specializations');
        if (!agentData.licenseNumber) missing.push('licenseNumber');
        break;
      }
    }

    return missing;
  }

  /**
   * Collect files for deletion when removing a profile
   */
  private async collectProfileFilesForDeletion(
    accountUuid: string,
    profileType: ProfileType
  ): Promise<string[]> {
    const filesToDelete: string[] = [];

    switch (profileType) {
      case 'EMPLOYER': {
        const profile = await this.prisma.employerProfile.findUnique({
          where: { accountUuid },
          select: { logo: true }
        });
        if (profile?.logo) filesToDelete.push(profile.logo);
        break;
      }

      case 'SOCIAL_SERVICE_PROVIDER': {
        const profile = await this.prisma.socialServiceProviderProfile.findUnique({
          where: { accountUuid },
          select: { verificationDocument: true }
        });
        if (profile?.verificationDocument) filesToDelete.push(profile.verificationDocument);
        break;
      }

      case 'SKILLED_PROFESSIONAL': {
        const profile = await this.prisma.skilledProfessionalProfile.findUnique({
          where: { accountUuid },
          select: { portfolioImages: true }
        });
        if (profile?.portfolioImages) {
          filesToDelete.push(...this.parseJsonField<string[]>(profile.portfolioImages, []));
        }
        break;
      }

      case 'INTERMEDIARY_AGENT': {
        const profile = await this.prisma.intermediaryAgentProfile.findUnique({
          where: { accountUuid },
          select: { profileImage: true }
        });
        if (profile?.profileImage) filesToDelete.push(profile.profileImage);
        break;
      }
    }

    return filesToDelete;
  }

  /**
   * Emit file deletion events
   */
  private emitFileDeletionEvents(files: string[]): void {
    files.forEach(url => {
      if (!url.includes('default-avatar') && !url.includes('default-logo')) {
        this.logger.log(`Emitting Kafka event to delete: ${url}`);
        this.storageKafkaClient.emit('file.delete_obsolete', { url });
      }
    });
  }

  /**
   * Handle old image deletion (same as UserService)
   */
  private handleOldImageDeletion(imageUrl: string): void {
    if (imageUrl.includes('default-avatar') || imageUrl.includes('default-logo')) return;
    this.logger.log(`Emitting Kafka event to delete: ${imageUrl}`);
    this.storageKafkaClient.emit('file.delete_obsolete', { url: imageUrl });
  }

  /**
   * Check if profile type is valid for organizations
   */
  private isOrganizationProfile(profileType: ProfileType): boolean {
    const organizationProfiles = [
      'EMPLOYER',
      'SOCIAL_SERVICE_PROVIDER',
      'PROPERTY_OWNER',
      'SKILLED_PROFESSIONAL',
      'INTERMEDIARY_AGENT',
    ];
    return organizationProfiles.includes(profileType as string);
  }

  /**
   * Map UI purpose to profile type
   */
  private mapPurposeToProfileType(purpose: OrganizationPurpose): ProfileType {
    const purposeMap: Record<OrganizationPurpose, ProfileType> = {
      'hire_employees': 'EMPLOYER',
      'list_properties': 'PROPERTY_OWNER',
      'offer_skilled_services': 'SKILLED_PROFESSIONAL',
      'provide_social_support': 'SOCIAL_SERVICE_PROVIDER',
      'act_as_agent': 'INTERMEDIARY_AGENT',
    };
    
    const mappedType = purposeMap[purpose];
    
    if (!mappedType) {
      this.logger.warn(`Unknown purpose: ${purpose}, defaulting to EMPLOYER`);
      return 'EMPLOYER';
    }
    
    return mappedType;
  }

  // ======================================================
  // MAIN ONBOARDING - CREATE ORGANIZATION ACCOUNT WITH PROFILES
  // ======================================================

  async createOrganizationAccountWithProfiles(
    data: CreateOrganisationRequestDto
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    // Ensure this is for organization accounts only
    if (data.accountType !== "ORGANIZATION") {
      return BaseResponseDto.fail('This method is for organization accounts only', 'BAD_REQUEST');
    }

    // Validate required fields
    if (!data.organizationName || !data.adminFirstName || !data.adminLastName) {
      return BaseResponseDto.fail('Organization name, admin first name, and last name are required', 'BAD_REQUEST');
    }

    // Generate codes
    const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const accountCode = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    const normalizedEmail = StringUtils.normalizeEmail(data.email);
    const normalizedPhone = PhoneUtils.normalize(data.phone || '');
    const normalizedOfficialEmail = StringUtils.normalizeEmail(data.officialEmail);
    const normalizedOfficialPhone = PhoneUtils.normalize(data.officialPhone || '');
    
    // Convert purposes to profiles
    const profilesToCreate = data.purposes.map(purpose => ({
      type: this.mapPurposeToProfileType(purpose),
      data: data.profileData?.[purpose] || {}
    }));
    
    this.logger.log(`Creating organization account for: ${normalizedEmail} with ${profilesToCreate.length} profiles`);

    const accountUuid = randomUUID();
    const userUuid = randomUUID();
    const targetPlanSlug = data.planSlug || 'free-forever';

    try {
      // 1. PRE-CHECKS: RBAC Role & Plan
      const roleType = 'Admin';
      
      const [roleRes, planRes] = await Promise.all([
        lastValueFrom(
          this.rbacGrpc.GetRoleIdByType({ roleType }).pipe(
            timeout(5000),
            catchError(() => throwError(() => new Error('RBAC service unavailable')))
          )
        ).catch(() => null),
        lastValueFrom(
          this.plansGrpc.GetPlanIdBySlug({ slug: targetPlanSlug }).pipe(
            timeout(5000),
            catchError(() => throwError(() => new Error('Plans service unavailable')))
          )
        ).catch(() => null),
      ]);

      if (!roleRes?.data?.roleId) {
        return BaseResponseDto.fail(`Role ${roleType} not found`, 'NOT_FOUND');
      }
      if (!planRes?.data?.planId) {
        return BaseResponseDto.fail(`Plan ${targetPlanSlug} not found`, 'NOT_FOUND');
      }

      const isPremium = targetPlanSlug !== 'free-forever';

      // 2. ATOMIC TRANSACTION - Create Account, Organization, Admin, and Profiles
      await this.prisma.$transaction(async (tx) => {
        // Create Account
        const account = await tx.account.create({
          data: {
            uuid: accountUuid,
            accountCode,
            type: "ORGANIZATION",
            name: data.organizationName,
            status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
            userRole: roleType,
            activeProfiles: StringUtils.stringifyJsonField([
              'ORGANIZATION_PROFILE',
              ...(profilesToCreate.map(p => p.type))
            ]),
            isVerified: false,
            verifiedFeatures: StringUtils.stringifyJsonField([]),
          },
        });

        // Create User (login credentials for admin)
        const user = await tx.user.create({
          data: {
            uuid: userUuid,
            userCode,
            email: normalizedEmail,
            phone: normalizedPhone,
            accountUuid: account.uuid,
            roleName: roleType,
            status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
            profileImage: data.adminProfileImage,
          },
        });

        // Create Individual Profile for Admin
        await tx.individualProfile.create({
          data: {
            accountUuid: account.uuid,
            firstName: data.adminFirstName,
            lastName: data.adminLastName,
            profileImage: data.adminProfileImage,
          },
        });

        const organizationType = await tx.organizationType.upsert({
          where: { slug: data.organizationType || 'COMPANY' },
          update: {},
          create: {
            slug: data.organizationType || 'COMPANY',
            label: data.organizationType || 'Company',
            description: `${data.organizationType || 'Company'} organization type`,
            order: 10,
          },
        });

        // Create Organization Profile
      await tx.organizationProfile.create({
        data: {
          accountUuid: account.uuid,
          name: data.organizationName,
          typeSlug: organizationType.slug,  
          registrationNo: data.registrationNo,
          kraPin: data.kraPin,
          officialEmail: normalizedOfficialEmail,
          officialPhone: normalizedOfficialPhone,
          physicalAddress: data.physicalAddress,
          website: data.website,
          about: data.about,
          logo: data.logo,
          orgCode: `ORG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          verificationStatus: 'PENDING',
        },
      });

        // Add Admin as Organization Member
        await tx.organizationMember.create({
          data: {
            userUuid: user.uuid,
            organizationUuid: account.uuid,
            roleName: 'ADMIN',
          },
        });

        // Create each selected profile using shared utility
        for (const profile of profilesToCreate) {
          await createBusinessProfile(
            tx, 
            account.uuid, 
            profile.type as BusinessProfileType, 
            profile.data
          );
        }
      });

      // 3. POST-DB: External Syncing (RBAC, Subscription)
      try {
        await lastValueFrom(
          this.rbacGrpc.AssignRoleToUser({
            userUuid: userUuid,
            roleId: roleRes.data.roleId,
          })
        );

        if (!isPremium) {
          const subRes = await lastValueFrom(
            this.subscriptionGrpc.SubscribeToPlan({
              subscriberUuid: accountUuid,
              planId: planRes.data.planId,
              billingCycle: null,
              amountPaid: 0,
              currency: 'KES'
            })
          );

          if (!subRes.success) {
            throw new Error(`Subscription Error: ${subRes.message}`);
          }
        }
      } catch (syncError) {
        // Rollback on sync failure
        this.logger.error(`Post-DB sync failed, rolling back: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`);
        await this.prisma.$transaction(async (tx) => {
          await tx.user.delete({ where: { uuid: userUuid } });
          await tx.account.delete({ where: { uuid: accountUuid } });
        });
        throw syncError;
      }

      // 4. Return Success Response
      const organizationData = await this.getOrganizationByAccountUuid(accountUuid);
      return BaseResponseDto.ok(
        organizationData.data as OrganizationProfileResponseDto,
        isPremium ? 'Organization created. Payment required.' : 'Organization created successfully',
        isPremium ? 'PAYMENT_REQUIRED' : 'CREATED'
      );

    } catch (error) {
      this.logger.error(`Organization creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('email')) {
            return BaseResponseDto.fail('Email already exists', 'ALREADY_EXISTS');
          }
          if (target?.includes('phone')) {
            return BaseResponseDto.fail('Phone number already exists', 'ALREADY_EXISTS');
          }
          if (target?.includes('officialEmail')) {
            return BaseResponseDto.fail('Organization email already exists', 'ALREADY_EXISTS');
          }
          if (target?.includes('officialPhone')) {
            return BaseResponseDto.fail('Organization phone already exists', 'ALREADY_EXISTS');
          }
          if (target?.includes('name')) {
            return BaseResponseDto.fail('Organization name already exists', 'ALREADY_EXISTS');
          }
          if (target?.includes('userCode')) {
            return BaseResponseDto.fail('User code generation conflict, please retry', 'CONFLICT');
          }
          if (target?.includes('accountCode')) {
            return BaseResponseDto.fail('Account code generation conflict, please retry', 'CONFLICT');
          }
          if (target?.includes('orgCode')) {
            return BaseResponseDto.fail('Organization code generation conflict, please retry', 'CONFLICT');
          }
          return BaseResponseDto.fail('Email or phone already exists', 'ALREADY_EXISTS');
        }
      }
      
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // ORGANIZATION PROFILE CREATION METHODS
  // ======================================================

  async createEmployerProfile(
    accountUuid: string,
    data: EmployerProfileDataDto
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    try {
      const profile = await this.prisma.employerProfile.create({
        data: {
          accountUuid,
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          foundedYear: data.foundedYear,
          description: data.description,
          logo: data.logo,
          preferredSkills: StringUtils.stringifyJsonField(data.preferredSkills ?? []),
          remotePolicy: data.remotePolicy,
          isVerifiedEmployer: false,
          worksWithAgents: data.worksWithAgents ?? false,
          preferredAgents: StringUtils.stringifyJsonField(data.preferredAgents ?? []),
        }
      });

      await this.updateActiveProfiles(accountUuid, 'EMPLOYER', 'add');

      const completion = this.calculateProfileCompletion('EMPLOYER', data);
      const missingFields = this.getMissingFields('EMPLOYER', data);

      return BaseResponseDto.ok(
        this.mapToEmployerResponse(profile, completion, missingFields),
        'Employer profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create employer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createSocialServiceProviderProfile(
    accountUuid: string,
    data: SocialServiceProviderProfileDataDto
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    try {
      const profile = await this.prisma.socialServiceProviderProfile.create({
        data: {
          accountUuid,
          providerType: data.providerType,
          servicesOffered: StringUtils.stringifyJsonField(data.servicesOffered ?? []),
          targetBeneficiaries: StringUtils.stringifyJsonField(data.targetBeneficiaries ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          isVerified: false,
          about: data.about,
          website: data.website,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          officeHours: data.officeHours,
          physicalAddress: data.physicalAddress,
          peopleServed: data.peopleServed,
          yearEstablished: data.yearEstablished,
          acceptsDonations: data.acceptsDonations ?? false,
          needsVolunteers: data.needsVolunteers ?? false,
          donationInfo: data.donationInfo,
          volunteerNeeds: data.volunteerNeeds,
        }
      });

      await this.updateActiveProfiles(accountUuid, 'SOCIAL_SERVICE_PROVIDER', 'add');

      const completion = this.calculateProfileCompletion('SOCIAL_SERVICE_PROVIDER', data);
      const missingFields = this.getMissingFields('SOCIAL_SERVICE_PROVIDER', data);

      return BaseResponseDto.ok(
        this.mapToSocialServiceProviderResponse(profile, completion, missingFields),
        'Social service provider profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create social service provider profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createOrganizationPropertyOwnerProfile(
    accountUuid: string,
    data: PropertyOwnerProfileDataDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    try {
      const profile = await this.prisma.propertyOwnerProfile.create({
        data: {
          accountUuid,
          isProfessional: data.isProfessional ?? false,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          yearsInBusiness: data.yearsInBusiness,
          preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: data.usesAgent ?? false,
          managingAgentUuid: data.managingAgentUuid,
        }
      });

      await this.updateActiveProfiles(accountUuid, 'PROPERTY_OWNER', 'add');

      const completion = this.calculateProfileCompletion('PROPERTY_OWNER', data);
      const missingFields = this.getMissingFields('PROPERTY_OWNER', data);

      return BaseResponseDto.ok(
        this.mapToPropertyOwnerResponse(profile, completion, missingFields),
        'Organization property owner profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create property owner profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createOrganizationSkilledProfessionalProfile(
    accountUuid: string,
    data: SkilledProfessionalProfileDataDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    try {
      const profile = await this.prisma.skilledProfessionalProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          title: data.title,
          profession: data.profession,
          specialties: StringUtils.stringifyJsonField(data.specialties ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday ?? false,
          availableWeekends: data.availableWeekends ?? true,
          emergencyService: data.emergencyService ?? false,
          portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
          certifications: StringUtils.stringifyJsonField(data.certifications ?? []),
        }
      });

      await this.updateActiveProfiles(accountUuid, 'SKILLED_PROFESSIONAL', 'add');

      const completion = this.calculateProfileCompletion('SKILLED_PROFESSIONAL', data);
      const missingFields = this.getMissingFields('SKILLED_PROFESSIONAL', data);

      return BaseResponseDto.ok(
        this.mapToSkilledProfessionalResponse(profile, completion, missingFields),
        'Organization skilled professional profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create skilled professional profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createOrganizationIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    try {
      const profile = await this.prisma.intermediaryAgentProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          agentType: data.agentType,
          specializations: StringUtils.stringifyJsonField(data.specializations ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          licenseNumber: data.licenseNumber,
          licenseBody: data.licenseBody,
          yearsExperience: data.yearsExperience,
          agencyName: data.agencyName,
          agencyUuid: data.agencyUuid,
          commissionRate: data.commissionRate,
          feeStructure: data.feeStructure,
          minimumFee: data.minimumFee,
          typicalFee: data.typicalFee,
          isVerified: false,
          about: data.about,
          profileImage: data.profileImage,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          website: data.website,
          socialLinks: StringUtils.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: StringUtils.stringifyJsonField(data.clientTypes ?? []),
        }
      });

      await this.updateActiveProfiles(accountUuid, 'INTERMEDIARY_AGENT', 'add');

      const completion = this.calculateProfileCompletion('INTERMEDIARY_AGENT', data);
      const missingFields = this.getMissingFields('INTERMEDIARY_AGENT', data);

      return BaseResponseDto.ok(
        this.mapToIntermediaryAgentResponse(profile, completion, missingFields),
        'Organization agent profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create agent profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // FETCH METHODS
  // ======================================================

  async getOrganizationByUuid(
    orgUuid: string
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    try {
      const organization = await this.prisma.organizationProfile.findUnique({
        where: { uuid: orgUuid },
        include: {
          account: {
            include: {
              individualProfile: true,
              employerProfile: true,
              socialServiceProviderProfile: true,
              propertyOwnerProfile: true,
              skilledProfessionalProfile: true,
              intermediaryAgentProfile: true,
              users: true,
            }
          },
          members: {
            include: { user: true },
            where: { roleName: 'ADMIN' },
            take: 1,
          },
        },
      });

      if (!organization) {
        return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
      }

      return BaseResponseDto.ok(
        this.mapToOrganizationProfileResponse(organization as OrganizationWithDetails),
        'Organization retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async getOrganizationByAccountUuid(
    accountUuid: string
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
    try {
      const organization = await this.prisma.organizationProfile.findFirst({
        where: { accountUuid },
        include: {
          account: {
            include: {
              individualProfile: true,
              employerProfile: true,
              socialServiceProviderProfile: true,
              propertyOwnerProfile: true,
              skilledProfessionalProfile: true,
              intermediaryAgentProfile: true,
              users: true,
            }
          },
          members: {
            include: { user: true },
            where: { roleName: 'ADMIN' },
            take: 1,
          },
        },
      });

      if (!organization) {
        return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
      }

      return BaseResponseDto.ok(
        this.mapToOrganizationProfileResponse(organization as OrganizationWithDetails),
        'Organization retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get organization by account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

 async getOrganizationsByType(
    typeSlug: string
  ): Promise<BaseResponseDto<OrganizationProfileResponseDto[]>> {
    try {
      const organizations = await this.prisma.organizationProfile.findMany({
        where: {
          typeSlug: typeSlug,  
        },
        include: {
          type: true,  
          account: {
            include: {
              individualProfile: true,
              employerProfile: true,
              socialServiceProviderProfile: true,
              propertyOwnerProfile: true,
              skilledProfessionalProfile: true,
              intermediaryAgentProfile: true,
              users: true,
            }
          },
          members: {
            include: { user: true },
            where: { roleName: 'ADMIN' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return BaseResponseDto.ok(
        organizations.map(org => this.mapToOrganizationProfileResponse(org as OrganizationWithDetails)),
        `Found ${organizations.length} organizations`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get organizations by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // UPDATE METHODS
  // ======================================================

 async updateOrganizationProfile(
  accountUuid: string,
  data: UpdateOrgProfileRequestDto
): Promise<BaseResponseDto<OrganizationProfileResponseDto>> {
  try {
    const updateData: {
      website?: string;
      registrationNo?: string;
      kraPin?: string;
      physicalAddress?: string;
      typeSlug?: string;  // ✅ Change from 'type' to 'typeSlug'
      about?: string;
      logo?: string;
    } = {};
    
    if (data.website !== undefined) updateData.website = data.website;
    if (data.registrationNo !== undefined) updateData.registrationNo = data.registrationNo;
    if (data.kraPin !== undefined) updateData.kraPin = data.kraPin;
    if (data.physicalAddress !== undefined) updateData.physicalAddress = data.physicalAddress;
    if (data.organizationType !== undefined) updateData.typeSlug = data.organizationType;  // ✅ Use typeSlug
    if (data.about !== undefined) updateData.about = data.about;
    if (data.logo !== undefined) updateData.logo = data.logo;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.organizationProfile.update({
        where: { accountUuid },
        data: updateData,
      });
    }

    const organization = await this.prisma.organizationProfile.findFirst({
      where: { accountUuid },
      include: {
        type: true,  // ✅ Include the related OrganizationType
        account: {
          include: {
            individualProfile: true,
            users: true,
            employerProfile: true,
            socialServiceProviderProfile: true,
            propertyOwnerProfile: true,
            skilledProfessionalProfile: true,
            intermediaryAgentProfile: true,
          },
        },
        members: {
          include: { user: true },
          where: { roleName: 'ADMIN' },
          take: 1,
        },
      },
    });

    if (!organization) {
      return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
    }

    return BaseResponseDto.ok(
      this.mapToOrganizationProfileResponse(organization as OrganizationWithDetails),
      'Organization profile updated',
      'OK'
    );
  } catch (error) {
    this.logger.error(`Failed to update organization profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('registrationNo')) {
          return BaseResponseDto.fail('Registration number already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('kraPin')) {
          return BaseResponseDto.fail('KRA PIN already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('officialEmail')) {
          return BaseResponseDto.fail('Official email already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('officialPhone')) {
          return BaseResponseDto.fail('Official phone already exists', 'ALREADY_EXISTS');
        }
      }
    }
    
    return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
  }
}

  async updateEmployerProfile(
    accountUuid: string,
    data: EmployerProfileDataDto
  ): Promise<BaseResponseDto<EmployerProfileResponseDto>> {
    try {
      const profile = await this.prisma.employerProfile.upsert({
        where: { accountUuid },
        update: {
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          foundedYear: data.foundedYear,
          description: data.description,
          logo: data.logo,
          preferredSkills: StringUtils.stringifyJsonField(data.preferredSkills ?? []),
          remotePolicy: data.remotePolicy,
          worksWithAgents: data.worksWithAgents,
          preferredAgents: StringUtils.stringifyJsonField(data.preferredAgents ?? []),
        },
        create: {
          accountUuid,
          companyName: data.companyName,
          industry: data.industry,
          companySize: data.companySize,
          foundedYear: data.foundedYear,
          description: data.description,
          logo: data.logo,
          preferredSkills: StringUtils.stringifyJsonField(data.preferredSkills ?? []),
          remotePolicy: data.remotePolicy,
          isVerifiedEmployer: false,
          worksWithAgents: data.worksWithAgents ?? false,
          preferredAgents: StringUtils.stringifyJsonField(data.preferredAgents ?? []),
        },
      });

      await this.updateActiveProfiles(accountUuid, 'EMPLOYER', 'add');

      const completion = this.calculateProfileCompletion('EMPLOYER', data);
      const missingFields = this.getMissingFields('EMPLOYER', data);

      return BaseResponseDto.ok(
        this.mapToEmployerResponse(profile, completion, missingFields),
        'Employer profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update employer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updateSocialServiceProviderProfile(
    accountUuid: string,
    data: SocialServiceProviderProfileDataDto
  ): Promise<BaseResponseDto<SocialServiceProviderProfileResponseDto>> {
    try {
      const profile = await this.prisma.socialServiceProviderProfile.upsert({
        where: { accountUuid },
        update: {
          providerType: data.providerType,
          servicesOffered: StringUtils.stringifyJsonField(data.servicesOffered ?? []),
          targetBeneficiaries: StringUtils.stringifyJsonField(data.targetBeneficiaries ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          about: data.about,
          website: data.website,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          officeHours: data.officeHours,
          physicalAddress: data.physicalAddress,
          peopleServed: data.peopleServed,
          yearEstablished: data.yearEstablished,
          acceptsDonations: data.acceptsDonations,
          needsVolunteers: data.needsVolunteers,
          donationInfo: data.donationInfo,
          volunteerNeeds: data.volunteerNeeds,
        },
        create: {
          accountUuid,
          providerType: data.providerType,
          servicesOffered: StringUtils.stringifyJsonField(data.servicesOffered ?? []),
          targetBeneficiaries: StringUtils.stringifyJsonField(data.targetBeneficiaries ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          isVerified: false,
          about: data.about,
          website: data.website,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          officeHours: data.officeHours,
          physicalAddress: data.physicalAddress,
          peopleServed: data.peopleServed,
          yearEstablished: data.yearEstablished,
          acceptsDonations: data.acceptsDonations ?? false,
          needsVolunteers: data.needsVolunteers ?? false,
          donationInfo: data.donationInfo,
          volunteerNeeds: data.volunteerNeeds,
        },
      });

      await this.updateActiveProfiles(accountUuid, 'SOCIAL_SERVICE_PROVIDER', 'add');

      const completion = this.calculateProfileCompletion('SOCIAL_SERVICE_PROVIDER', data);
      const missingFields = this.getMissingFields('SOCIAL_SERVICE_PROVIDER', data);

      return BaseResponseDto.ok(
        this.mapToSocialServiceProviderResponse(profile, completion, missingFields),
        'Social service provider profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update social service provider profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updateOrganizationPropertyOwnerProfile(
    accountUuid: string,
    data: PropertyOwnerProfileDataDto
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    try {
      const profile = await this.prisma.propertyOwnerProfile.upsert({
        where: { accountUuid },
        update: {
          isProfessional: data.isProfessional,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          yearsInBusiness: data.yearsInBusiness,
          preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          usesAgent: data.usesAgent,
          managingAgentUuid: data.managingAgentUuid,
        },
        create: {
          accountUuid,
          isProfessional: data.isProfessional ?? false,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          yearsInBusiness: data.yearsInBusiness,
          preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: data.usesAgent ?? false,
          managingAgentUuid: data.managingAgentUuid,
        },
      });

      await this.updateActiveProfiles(accountUuid, 'PROPERTY_OWNER', 'add');

      const completion = this.calculateProfileCompletion('PROPERTY_OWNER', data);
      const missingFields = this.getMissingFields('PROPERTY_OWNER', data);

      return BaseResponseDto.ok(
        this.mapToPropertyOwnerResponse(profile, completion, missingFields),
        'Property owner profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update property owner profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updateOrganizationSkilledProfessionalProfile(
    accountUuid: string,
    data: SkilledProfessionalProfileDataDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    try {
      const profile = await this.prisma.skilledProfessionalProfile.upsert({
        where: { accountUuid },
        update: {
          title: data.title,
          profession: data.profession,
          specialties: StringUtils.stringifyJsonField(data.specialties ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday,
          availableWeekends: data.availableWeekends,
          emergencyService: data.emergencyService,
          portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
          certifications: StringUtils.stringifyJsonField(data.certifications ?? []),
        },
        create: {
          accountUuid,
          uuid: randomUUID(),
          title: data.title,
          profession: data.profession,
          specialties: StringUtils.stringifyJsonField(data.specialties ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday ?? false,
          availableWeekends: data.availableWeekends ?? true,
          emergencyService: data.emergencyService ?? false,
          portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
          certifications: StringUtils.stringifyJsonField(data.certifications ?? []),
        },
      });

      await this.updateActiveProfiles(accountUuid, 'SKILLED_PROFESSIONAL', 'add');

      const completion = this.calculateProfileCompletion('SKILLED_PROFESSIONAL', data);
      const missingFields = this.getMissingFields('SKILLED_PROFESSIONAL', data);

      return BaseResponseDto.ok(
        this.mapToSkilledProfessionalResponse(profile, completion, missingFields),
        'Skilled professional profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update skilled professional profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updateOrganizationIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    try {
      const profile = await this.prisma.intermediaryAgentProfile.upsert({
        where: { accountUuid },
        update: {
          agentType: data.agentType,
          specializations: StringUtils.stringifyJsonField(data.specializations ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          licenseNumber: data.licenseNumber,
          licenseBody: data.licenseBody,
          yearsExperience: data.yearsExperience,
          agencyName: data.agencyName,
          agencyUuid: data.agencyUuid,
          commissionRate: data.commissionRate,
          feeStructure: data.feeStructure,
          minimumFee: data.minimumFee,
          typicalFee: data.typicalFee,
          about: data.about,
          profileImage: data.profileImage,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          website: data.website,
          socialLinks: StringUtils.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: StringUtils.stringifyJsonField(data.clientTypes ?? []),
        },
        create: {
          accountUuid,
          uuid: randomUUID(),
          agentType: data.agentType,
          specializations: StringUtils.stringifyJsonField(data.specializations ?? []),
          serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
          licenseNumber: data.licenseNumber,
          licenseBody: data.licenseBody,
          yearsExperience: data.yearsExperience,
          agencyName: data.agencyName,
          agencyUuid: data.agencyUuid,
          commissionRate: data.commissionRate,
          feeStructure: data.feeStructure,
          minimumFee: data.minimumFee,
          typicalFee: data.typicalFee,
          isVerified: false,
          about: data.about,
          profileImage: data.profileImage,
          contactEmail: data.contactEmail,
          contactPhone: PhoneUtils.normalize(data.contactPhone || ''),
          website: data.website,
          socialLinks: StringUtils.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: StringUtils.stringifyJsonField(data.clientTypes ?? []),
        },
      });

      await this.updateActiveProfiles(accountUuid, 'INTERMEDIARY_AGENT', 'add');

      const completion = this.calculateProfileCompletion('INTERMEDIARY_AGENT', data);
      const missingFields = this.getMissingFields('INTERMEDIARY_AGENT', data);

      return BaseResponseDto.ok(
        this.mapToIntermediaryAgentResponse(profile, completion, missingFields),
        'Agent profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update agent profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

// ======================================================
  // TEAM MANAGEMENT METHODS (All invitation methods)
  // ======================================================

 async inviteMember(
  dto: InviteMemberGrpcRequestDto
): Promise<BaseResponseDto<InviteMemberResponseDto>> {
  this.logger.log(`Inviting ${dto.email} to org ${dto.organizationUuid}`);

  try {
    // Get the inviter with their organization memberships
    const inviter = await this.prisma.user.findUnique({
      where: { uuid: dto.invitedByUserUuid },
      include: {
        organizationMemberships: {
          where: {
            organizationUuid: dto.organizationUuid,
            roleName: 'Admin',  
          }
        }
      }
    });

    if (!inviter || inviter.organizationMemberships.length === 0) {
      return BaseResponseDto.fail('You do not have permission to invite members', 'FORBIDDEN');
    }

    // Get the inviter's individual profile for their name
    const inviterIndividualProfile = await this.prisma.individualProfile.findFirst({
      where: { accountUuid: inviter.accountUuid }
    });

    const organization = await this.prisma.organizationProfile.findUnique({
      where: { uuid: dto.organizationUuid },
      include: { account: true }
    });

    if (!organization) {
      return BaseResponseDto.fail('Organization not found', 'NOT_FOUND');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() }
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findFirst({
        where: {
          organizationUuid: dto.organizationUuid,
          userUuid: existingUser.uuid
        }
      });

      if (existingMember) {
        return BaseResponseDto.fail('User is already a member', 'CONFLICT');
      }
    }

    const existingInvitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        organizationUuid: dto.organizationUuid,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return BaseResponseDto.fail('Invitation already sent', 'CONFLICT');
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        organizationUuid: dto.organizationUuid,
        token,
        expiresAt,
        status: 'PENDING',
        invitedByUserUuid: dto.invitedByUserUuid,
        roleName: 'Member',
        message: dto.message
      }
    });

    const eventPattern = existingUser 
      ? 'organization.invitation.sent.existing' 
      : 'organization.invitation.sent.new';

    // Get inviter's name from individual profile
    const inviterName = inviterIndividualProfile 
      ? `${inviterIndividualProfile.firstName || ''} ${inviterIndividualProfile.lastName || ''}`.trim()
      : inviter.email;

    this.notificationBus.emit(eventPattern, {
      email: invitation.email,
      organizationName: organization.name,
      organizationUuid: organization.uuid,
      roleName: 'Member',
      inviterName: inviterName,
      inviteToken: token,
      message: dto.message,
    });

    return BaseResponseDto.ok(
      { invitationId: invitation.id },
      existingUser 
        ? 'Invitation sent. User will be added upon acceptance.' 
        : 'Invitation sent. User will need to complete registration.',
      'INVITATION_SENT'
    );

  } catch (error) {
    this.logger.error(`Failed to invite member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
  }
}

  async verifyInvitation(
    dto: VerifyInvitationRequestDto
  ): Promise<BaseResponseDto<InvitationVerificationResponseDto>> {
    try {
      const invitation = await this.prisma.organizationInvitation.findFirst({
        where: {
          token: dto.token,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        include: {
          organization: {
            select: { name: true, uuid: true }
          }
        }
      });

      if (!invitation) {
        return BaseResponseDto.fail('Invalid or expired invitation', 'NOT_FOUND');
      }

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
          roleName: invitation.roleName,
          isExistingUser: !!existingUser
        },
        'Invitation is valid',
        'OK'
      );

    } catch (error) {
      this.logger.error(`Failed to verify invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async acceptInvitation(
    dto: AcceptInvitationGrpcRequestDto
  ): Promise<BaseResponseDto<AcceptInvitationResponseDto>> {
    this.logger.log(`Accepting invitation with token: ${dto.token}`);

    try {
      const invitation = await this.prisma.organizationInvitation.findFirst({
        where: {
          token: dto.token,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        include: {
          organization: {
            include: { account: true }
          },
          invitedByUser: true
        }
      });

      if (!invitation) {
        return BaseResponseDto.fail('Invalid or expired invitation', 'NOT_FOUND');
      }

      const roleRes = await lastValueFrom(
        this.rbacGrpc.GetRoleIdByType({ roleType: 'Member' }).pipe(
          timeout(5000),
          catchError(() => throwError(() => new Error('RBAC service unavailable')))
        )
      ).catch(() => null);

      if (!roleRes?.data?.roleId) {
        return BaseResponseDto.fail('System Role: Member not found', 'NOT_FOUND');
      }

      const existingUser = await this.prisma.user.findFirst({
        where: { email: invitation.email }
      });

      let result: { userUuid: string; isNewUser: boolean };

      try {
        result = await this.prisma.$transaction(async (tx) => {
          let targetUserUuid: string;
          let isNewUser = false;

          if (existingUser) {
            targetUserUuid = existingUser.uuid;
          } else {
            if (!dto.firstName || !dto.lastName || !dto.phone) {
              throw new Error('First name, last name, and phone are required for new users');
            }

            targetUserUuid = randomUUID();
            isNewUser = true;

            const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            await tx.user.create({
              data: {
                uuid: targetUserUuid,
                userCode,
                email: invitation.email,
                phone: dto.phone,
                accountUuid: invitation.organization.account.uuid,
                roleName: 'Member',
                status: 'ACTIVE',
              },
            });

            await tx.individualProfile.create({
              data: {
                accountUuid: invitation.organization.account.uuid,
                firstName: dto.firstName,
                lastName: dto.lastName,
              },
            });
          }

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
                roleName: 'MEMBER',
              }
            });
          }

          await tx.organizationInvitation.update({
            where: { id: invitation.id },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date(),
              acceptedByUserUuid: targetUserUuid,
            }
          });

          return { userUuid: targetUserUuid, isNewUser };
        });
      } catch (dbError) {
        this.logger.error(`Database transaction failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
        throw dbError;
      }

      try {
        await lastValueFrom(
          this.rbacGrpc.AssignRoleToUser({
            userUuid: result.userUuid,
            roleId: roleRes.data.roleId,
          })
        );
      } catch (syncError) {
        this.logger.error(`RBAC sync failed, rolling back: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`);
        
        await this.prisma.$transaction(async (tx) => {
          await tx.organizationMember.deleteMany({
            where: {
              organizationUuid: invitation.organizationUuid,
              userUuid: result.userUuid
            }
          });
          
          if (result.isNewUser) {
            await tx.individualProfile.deleteMany({ 
              where: { accountUuid: invitation.organization.account.uuid } 
            });
            await tx.user.delete({ where: { uuid: result.userUuid } });
          }
        });

        return BaseResponseDto.fail(
          `Failed to complete invitation acceptance: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
          'INTERNAL_ERROR'
        );
      }

      const eventPattern = result.isNewUser 
        ? 'user.invitation.accepted.new' 
        : 'user.invitation.accepted.existing';

      this.notificationBus.emit(eventPattern, {
        email: invitation.email,
        userUuid: result.userUuid,
        organizationUuid: invitation.organizationUuid,
        organizationName: invitation.organization.name,
        roleName: 'Member',
        ...(result.isNewUser && {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone
        }),
        ...(!result.isNewUser && {
          addedByUserUuid: invitation.invitedByUserUuid
        })
      });

      return BaseResponseDto.ok(
        {
          success: true,
          userUuid: result.userUuid,
          isNewUser: result.isNewUser,
          organizationUuid: invitation.organizationUuid,
          roleName: 'Member'
        },
        result.isNewUser 
          ? 'Account created and you have been added to the organization.' 
          : 'You have successfully joined the organization',
        'ACCEPTED'
      );

    } catch (error) {
      this.logger.error(`Invitation acceptance failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async getOrganizationInvitations(
  dto: GetOrganizationInvitationsRequestDto
): Promise<BaseResponseDto<InvitationDetailsResponseDto[]>> {
  try {
    const isAdmin = await this.prisma.organizationMember.findFirst({
      where: {
        organizationUuid: dto.organizationUuid,
        userUuid: dto.requestingUserUuid,
        roleName: 'Admin'
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
          include: {
            account: {
              include: {
                individualProfile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedInvitations = invitations.map(inv => {
      const inviter = inv.invitedByUser;
      const inviterProfile = inviter?.account?.individualProfile;
      
      return {
        id: inv.id,
        email: inv.email,
        roleName: inv.roleName,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedByUserUuid: inv.invitedByUserUuid,
        invitedByUserName: inviterProfile?.firstName 
          ? `${inviterProfile.firstName} ${inviterProfile.lastName || ''}`.trim()
          : inviter?.email || 'Unknown User',
        message: inv.message
      };
    });

    return BaseResponseDto.ok(formattedInvitations, 'Invitations retrieved', 'OK');

  } catch (error) {
    this.logger.error(`Failed to get invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
  }
}

  async resendInvitation(
    dto: ResendInvitationGrpcRequestDto
  ): Promise<BaseResponseDto<null>> {
    try {
      const invitation = await this.prisma.organizationInvitation.findFirst({
        where: {
          id: dto.invitationId,
          organizationUuid: dto.organizationUuid,
          status: 'PENDING'
        },
        include: { organization: { select: { name: true } } }
      });

      if (!invitation) {
        return BaseResponseDto.fail('Invitation not found', 'NOT_FOUND');
      }

      const isAdmin = await this.prisma.organizationMember.findFirst({
        where: {
          organizationUuid: dto.organizationUuid,
          userUuid: dto.requestedByUserUuid,
          roleName: 'ADMIN'
        }
      });

      if (!isAdmin) {
        return BaseResponseDto.fail('Unauthorized', 'FORBIDDEN');
      }

      const newToken = randomUUID();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      await this.prisma.organizationInvitation.update({
        where: { id: dto.invitationId },
        data: {
          token: newToken,
          expiresAt: newExpiry,
        }
      });

      const existingUser = await this.prisma.user.findFirst({
        where: { email: invitation.email }
      });

      this.notificationBus.emit('organization.invitation.resend', {
        email: invitation.email,
        organizationName: invitation.organization.name,
        organizationUuid: dto.organizationUuid,
        roleName: invitation.roleName,
        inviteToken: newToken,
        invitedByUserUuid: dto.requestedByUserUuid,
        userType: existingUser ? 'EXISTING' : 'NEW'
      });

      return BaseResponseDto.ok(null, 'Invitation resent successfully', 'OK');

    } catch (error) {
      this.logger.error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async cancelInvitation(
    dto: CancelInvitationGrpcRequestDto
  ): Promise<BaseResponseDto<null>> {
    try {
      const isAdmin = await this.prisma.organizationMember.findFirst({
        where: {
          organizationUuid: dto.organizationUuid,
          userUuid: dto.requestedByUserUuid,
          roleName: 'ADMIN'
        }
      });

      if (!isAdmin) {
        return BaseResponseDto.fail('Unauthorized', 'FORBIDDEN');
      }

      await this.prisma.organizationInvitation.update({
        where: {
          id: dto.invitationId,
          organizationUuid: dto.organizationUuid,
          status: 'PENDING'
        },
        data: { status: 'CANCELLED' }
      });

      return BaseResponseDto.ok(null, 'Invitation cancelled successfully', 'OK');

    } catch (error) {
      this.logger.error(`Failed to cancel invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async checkInvitationStatus(
    dto: CheckInvitationStatusRequestDto
  ): Promise<BaseResponseDto<CheckInvitationStatusResponseDto>> {
    try {
      const invitation = await this.prisma.organizationInvitation.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          organizationUuid: dto.organizationUuid,
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        select: { id: true, expiresAt: true }
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
      this.logger.error(`Failed to check invitation status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }


  // ======================================================
  // DELETE / REMOVE METHODS
  // ======================================================

  async removeProfile(
    accountUuid: string,
    profileType: ProfileType
  ): Promise<BaseResponseDto<null>> {
    try {
      const filesToDelete = await this.collectProfileFilesForDeletion(accountUuid, profileType);

      switch (profileType) {
        case 'EMPLOYER':
          await this.prisma.employerProfile.delete({ where: { accountUuid } });
          break;
        case 'SOCIAL_SERVICE_PROVIDER':
          await this.prisma.socialServiceProviderProfile.delete({ where: { accountUuid } });
          break;
        case 'PROPERTY_OWNER':
          await this.prisma.propertyOwnerProfile.delete({ where: { accountUuid } });
          break;
        case 'SKILLED_PROFESSIONAL':
          await this.prisma.skilledProfessionalProfile.delete({ where: { accountUuid } });
          break;
        case 'INTERMEDIARY_AGENT':
          await this.prisma.intermediaryAgentProfile.delete({ where: { accountUuid } });
          break;
        default:
          return BaseResponseDto.fail('Unsupported profile type', 'BAD_REQUEST');
      }

      await this.updateActiveProfiles(accountUuid, profileType, 'remove');
      this.emitFileDeletionEvents(filesToDelete);

      return BaseResponseDto.ok(null, 'Profile removed successfully', 'OK');
    } catch (error) {
      this.logger.error(`Failed to remove profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }



  // ======================================================
  // MAPPER METHODS (Same pattern as UserService)
  // ======================================================

private mapToOrganizationProfileResponse(
  org: OrganizationWithDetails
): OrganizationProfileResponseDto {
  const adminMember = org.members[0];
  const adminUser = adminMember?.user;
  const adminIndividualProfile = adminUser?.individualProfile;

  return {
    id: org.id,
    uuid: org.uuid,
    orgCode: org.orgCode ?? undefined,
    name: org.name,
    type: org.type?.slug as OrganizationType, 
    registrationNo: org.registrationNo ?? undefined,
    kraPin: org.kraPin ?? undefined,
    officialEmail: org.officialEmail ?? undefined,
    officialPhone: org.officialPhone ?? undefined,
    website: org.website ?? undefined,
    about: org.about ?? undefined,
    logo: org.logo ?? undefined,
    physicalAddress: org.physicalAddress ?? undefined,
    verificationStatus: org.verificationStatus,
    account: {
      uuid: org.account.uuid,
      accountCode: org.account.accountCode,
      type: org.account.type as AccountType,
    },
    admin: adminUser ? {
      uuid: adminUser.uuid,
      userCode: adminUser.userCode,
      email: adminUser.email,
      firstName: adminIndividualProfile?.firstName ?? '',
      lastName: adminIndividualProfile?.lastName ?? '',
      roleName: adminUser.roleName,
      phone: adminUser.phone ?? '',
    } : undefined,
    completion: this.calculateOrganizationCompletion(org),
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}
  private mapToEmployerResponse(
    profile: EmployerProfile,
    completion?: number,
    missingFields?: string[]
  ): EmployerProfileResponseDto {
    return {
      id: profile.id,
      companyName: profile.companyName ?? undefined,
      industry: profile.industry ?? undefined,
      companySize: profile.companySize ?? undefined,
      foundedYear: profile.foundedYear ?? undefined,
      description: profile.description ?? undefined,
      logo: profile.logo ?? undefined,
      preferredSkills: this.parseJsonField<string[]>(profile.preferredSkills, []),
      remotePolicy: profile.remotePolicy ?? undefined,
      isVerifiedEmployer: profile.isVerifiedEmployer,
      worksWithAgents: profile.worksWithAgents,
      preferredAgents: this.parseJsonField<string[]>(profile.preferredAgents, []),
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private mapToSocialServiceProviderResponse(
    profile: SocialServiceProviderProfile,
    completion?: number,
    missingFields?: string[]
  ): SocialServiceProviderProfileResponseDto {
    return {
      id: profile.id,
      providerType: profile.providerType as ServiceProviderType,
      servicesOffered: this.parseJsonField<string[]>(profile.servicesOffered, []),
      targetBeneficiaries: this.parseJsonField<string[]>(profile.targetBeneficiaries, []),
      serviceAreas: this.parseJsonField<string[]>(profile.serviceAreas, []),
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy ?? undefined,
      verificationDocument: profile.verificationDocument ?? undefined,
      about: profile.about ?? undefined,
      website: profile.website ?? undefined,
      contactEmail: profile.contactEmail ?? undefined,
      contactPhone: profile.contactPhone ?? undefined,
      officeHours: profile.officeHours ?? undefined,
      physicalAddress: profile.physicalAddress ?? undefined,
      peopleServed: profile.peopleServed ?? undefined,
      yearEstablished: profile.yearEstablished ?? undefined,
      acceptsDonations: profile.acceptsDonations,
      needsVolunteers: profile.needsVolunteers,
      donationInfo: profile.donationInfo ?? undefined,
      volunteerNeeds: profile.volunteerNeeds ?? undefined,
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private mapToPropertyOwnerResponse(
    profile: PropertyOwnerProfile,
    completion?: number,
    missingFields?: string[]
  ): PropertyOwnerProfileResponseDto {
    return {
      id: profile.id,
      isProfessional: profile.isProfessional,
      licenseNumber: profile.licenseNumber ?? undefined,
      companyName: profile.companyName ?? undefined,
      yearsInBusiness: profile.yearsInBusiness ?? undefined,
      preferredPropertyTypes: this.parseJsonField<PropertyType[]>(profile.preferredPropertyTypes, []),
      serviceAreas: this.parseJsonField<string[]>(profile.serviceAreas, []),
      isVerifiedOwner: profile.isVerifiedOwner,
      usesAgent: profile.usesAgent,
      managingAgentUuid: profile.managingAgentUuid ?? undefined,
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private mapToSkilledProfessionalResponse(
    profile: SkilledProfessionalProfile,
    completion?: number,
    missingFields?: string[]
  ): SkilledProfessionalProfileResponseDto {
    return {
      id: profile.id,
      uuid: profile.uuid,
      title: profile.title ?? undefined,
      profession: profile.profession ?? undefined,
      specialties: this.parseJsonField<string[]>(profile.specialties, []),
      serviceAreas: this.parseJsonField<string[]>(profile.serviceAreas, []),
      yearsExperience: profile.yearsExperience ?? undefined,
      licenseNumber: profile.licenseNumber ?? undefined,
      insuranceInfo: profile.insuranceInfo ?? undefined,
      hourlyRate: profile.hourlyRate ?? undefined,
      dailyRate: profile.dailyRate ?? undefined,
      paymentTerms: profile.paymentTerms ?? undefined,
      availableToday: profile.availableToday ?? undefined,
      availableWeekends: profile.availableWeekends ?? undefined,
      emergencyService: profile.emergencyService ?? undefined,
      isVerified: profile.isVerified,
      averageRating: profile.averageRating,
      totalReviews: profile.totalReviews,
      completedJobs: profile.completedJobs,
      completionRate: profile.completionRate ?? undefined,
      portfolioImages: this.parseJsonField<string[]>(profile.portfolioImages, []),
      certifications: this.parseJsonField<string[]>(profile.certifications, []),
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private mapToIntermediaryAgentResponse(
    profile: IntermediaryAgentProfile,
    completion?: number,
    missingFields?: string[]
  ): IntermediaryAgentProfileResponseDto {
    return {
      id: profile.id,
      uuid: profile.uuid,
      agentType: profile.agentType as AgentType,
      specializations: this.parseJsonField<string[]>(profile.specializations, []),
      serviceAreas: this.parseJsonField<string[]>(profile.serviceAreas, []),
      licenseNumber: profile.licenseNumber ?? undefined,
      licenseBody: profile.licenseBody ?? undefined,
      yearsExperience: profile.yearsExperience ?? undefined,
      agencyName: profile.agencyName ?? undefined,
      agencyUuid: profile.agencyUuid ?? undefined,
      commissionRate: profile.commissionRate ?? undefined,
      feeStructure: profile.feeStructure ?? undefined,
      minimumFee: profile.minimumFee ?? undefined,
      typicalFee: profile.typicalFee ?? undefined,
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy ?? undefined,
      verifiedAt: profile.verifiedAt?.toISOString(),
      averageRating: profile.averageRating,
      totalReviews: profile.totalReviews,
      completedDeals: profile.completedDeals,
      successRate: profile.successRate ?? undefined,
      about: profile.about ?? undefined,
      profileImage: profile.profileImage ?? undefined,
      contactEmail: profile.contactEmail ?? undefined,
      contactPhone: profile.contactPhone ?? undefined,
      website: profile.website ?? undefined,
      socialLinks: this.parseJsonField<Record<string, string>>(profile.socialLinks, {}),
      clientTypes: this.parseJsonField<string[]>(profile.clientTypes, []),
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private calculateOrganizationCompletion(org: OrganizationWithDetails): ProfileCompletionDto {
    let totalScore = 0;
    let profileCount = 0;
    const missingFields: string[] = [];

    if (org) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.ORGANIZATION_PROFILE;
      profileCount++;
    } else {
      missingFields.push('organizationProfile');
    }

    if (org.account.employerProfile) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.EMPLOYER.BASE;
      profileCount++;
    }
    if (org.account.socialServiceProviderProfile) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.SOCIAL_SERVICE_PROVIDER.BASE;
      profileCount++;
    }
    if (org.account.propertyOwnerProfile) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.PROPERTY_OWNER.BASE;
      profileCount++;
    }
    if (org.account.skilledProfessionalProfile) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.BASE;
      profileCount++;
    }
    if (org.account.intermediaryAgentProfile) {
      totalScore += ORGANIZATION_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.BASE;
      profileCount++;
    }

    const percentage = profileCount > 0 ? Math.min(Math.round(totalScore / profileCount), 100) : 0;

    return {
      percentage,
      missingFields,
      isComplete: percentage >= 80,
    };
  }
}