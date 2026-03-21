import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
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
  CreateAccountWithProfilesRequestDto,
  UpdateFullUserProfileDto,
  JobSeekerProfileResponseDto,
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  JobSeekerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  HousingSeekerProfileDataDto,
  PropertyOwnerProfileDataDto,
  SupportBeneficiaryProfileDataDto,
  IntermediaryAgentProfileDataDto,
  AccountResponseDto,
  ProfileCompletionDto,
  mapIndividualPurposeToProfileType,
  ProfileToCreateDto,
  EmployerProfileDataDto,
  SocialServiceProviderProfileDataDto,
} from '@pivota-api/dtos';
import { 
  Prisma,
  JobSeekerProfile,
  SkilledProfessionalProfile,
  HousingSeekerProfile,
  PropertyOwnerProfile,
  SupportBeneficiaryProfile,
  IntermediaryAgentProfile,
  IndividualProfile,
  User,
  Account 
} from '../../../../generated/prisma/client';
import { RpcException, ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { catchError, lastValueFrom, Observable, throwError, timeout } from 'rxjs';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';
import { ProfileType, JobType, SeniorityLevel, PropertyType, SupportNeed, AgentType, AccountType } from '@pivota-api/constants';

// ==================== Type Definitions ====================

type AccountWithIndividualProfiles = Account & {
  individualProfile: IndividualProfile | null;
  jobSeekerProfile: JobSeekerProfile | null;
  skilledProfessionalProfile: SkilledProfessionalProfile | null;
  housingSeekerProfile: HousingSeekerProfile | null;
  propertyOwnerProfile: PropertyOwnerProfile | null;
  supportBeneficiaryProfile: SupportBeneficiaryProfile | null;
  intermediaryAgentProfile: IntermediaryAgentProfile | null;

};

type UserWithAccount = User & {
  account: AccountWithIndividualProfiles;
};

// ==================== gRPC Interfaces ====================

interface RbacServiceGrpc {
  AssignRoleToUser(data: AssignRoleToUserRequestDto): Observable<BaseResponseDto<UserRoleResponseDto>>;
  GetRoleIdByType(data: RoleIdRequestDto): Observable<BaseResponseDto<RoleIdResponse>>;
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

const PROFILE_COMPLETION_WEIGHTS = {
  INDIVIDUAL_PROFILE: 20,
  JOB_SEEKER: {
    BASE: 30,
    WITH_CV: 40,
    WITH_SKILLS: 45,
    WITH_PREFERENCES: 50,
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
  HOUSING_SEEKER: {
    BASE: 30,
    WITH_PREFERENCES: 40,
    WITH_BUDGET: 45,
  },
  PROPERTY_OWNER: {
    BASE: 30,
    WITH_PROPERTIES: 40,
    WITH_VERIFICATION: 45,
  },
  SUPPORT_BENEFICIARY: {
    BASE: 30,
    WITH_NEEDS: 40,
    WITH_CONSENT: 45,
  },
};

// ==================== Service ====================

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  private rbacGrpc: RbacServiceGrpc;
  private subscriptionGrpc: SubscriptionServiceGrpc;
  private plansGrpc: PlansServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE') private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    this.rbacGrpc = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.subscriptionGrpc = this.subscriptionsClient.getService<SubscriptionServiceGrpc>('SubscriptionService');
    this.plansGrpc = this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('file.delete_obsolete');
    await this.kafkaClient.connect();
  }

  // ======================================================
  // HELPER METHODS
  // ======================================================

  /**
   * Kenyan phone number normalization
   */
  private normalizeKenyanPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const KENYAN_REGEX = /^(?:254|\+254|0)?((?:7|1|2)\d{8})$/;
    const match = phone.trim().match(KENYAN_REGEX);
    return match ? `+254${match[1]}` : phone;
  }

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
   * Stringify JSON field safely
   */
  private stringifyJsonField(data: unknown, defaultValue = '[]'): string {
    if (!data) return defaultValue;
    try {
      return typeof data === 'string' ? data : JSON.stringify(data);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Update account's activeProfiles JSON array
   */
  private async updateActiveProfiles(
  accountUuid: string,
  profileType: ProfileType,
  action: 'add' | 'remove'
): Promise<void> {
  const account = await this.prisma.account.findUnique({
    where: { uuid: accountUuid },
    select: { activeProfiles: true }
  });

  // Parse as string[], then cast to ProfileType[] after validation
  const profiles = this.parseJsonField<string[]>(account?.activeProfiles, []) as ProfileType[];
  
  let updatedProfiles: string[];
  if (action === 'add' && !profiles.includes(profileType)) {
    updatedProfiles = [...profiles, profileType];
  } else if (action === 'remove') {
    updatedProfiles = profiles.filter(p => p !== profileType);
  } else {
    updatedProfiles = profiles;
  }

  await this.prisma.account.update({
    where: { uuid: accountUuid },
    data: { activeProfiles: this.stringifyJsonField(updatedProfiles) }
  });
}

  /**
   * Calculate profile completion percentage based on filled fields
   */
  private calculateProfileCompletion(
    profileType: ProfileType,
    data: JobSeekerProfileDataDto | SkilledProfessionalProfileDataDto | 
          HousingSeekerProfileDataDto | PropertyOwnerProfileDataDto | 
          SupportBeneficiaryProfileDataDto | IntermediaryAgentProfileDataDto
  ): number {
    let baseScore = 0;
    let maxScore = 0;

    switch (profileType) {
      case "JOB_SEEKER": {
        const jobData = data as JobSeekerProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.WITH_PREFERENCES;
        
        if (jobData.cvUrl) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.WITH_CV);
        if (jobData.skills?.length) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.WITH_SKILLS);
        if (jobData.jobTypes?.length && jobData.expectedSalary) 
          baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.WITH_PREFERENCES);
        break;
      }

      case "SKILLED_PROFESSIONAL": {
        const profData = data as SkilledProfessionalProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_VERIFICATION;
        
        if (profData.licenseNumber) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_LICENSE);
        if (profData.portfolioImages?.length) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.WITH_PORTFOLIO);
        break;
      }

      case "INTERMEDIARY_AGENT": {
        const agentData = data as IntermediaryAgentProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_SPECIALIZATIONS;
        
        if (agentData.licenseNumber) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_LICENSE);
        if (agentData.specializations?.length) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.WITH_SPECIALIZATIONS);
        break;
      }

      case "HOUSING_SEEKER": {
        const housingData = data as HousingSeekerProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.HOUSING_SEEKER.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.HOUSING_SEEKER.WITH_BUDGET;
        
        if (housingData.preferredTypes?.length || housingData.preferredCities?.length) 
          baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.HOUSING_SEEKER.WITH_PREFERENCES);
        if (housingData.minBudget && housingData.maxBudget) 
          baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.HOUSING_SEEKER.WITH_BUDGET);
        break;
      }

      case "PROPERTY_OWNER": {
        const ownerData = data as PropertyOwnerProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.PROPERTY_OWNER.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.PROPERTY_OWNER.WITH_VERIFICATION;
        
        if (ownerData.preferredPropertyTypes?.length) 
          baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.PROPERTY_OWNER.WITH_PROPERTIES);
        break;
      }

      case "SUPPORT_BENEFICIARY": {
        const beneficiaryData = data as SupportBeneficiaryProfileDataDto;
        baseScore = PROFILE_COMPLETION_WEIGHTS.SUPPORT_BENEFICIARY.BASE;
        maxScore = PROFILE_COMPLETION_WEIGHTS.SUPPORT_BENEFICIARY.WITH_CONSENT;
        
        if (beneficiaryData.needs?.length) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.SUPPORT_BENEFICIARY.WITH_NEEDS);
        if (beneficiaryData.consentToShare) baseScore = Math.max(baseScore, PROFILE_COMPLETION_WEIGHTS.SUPPORT_BENEFICIARY.WITH_CONSENT);
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
    data: JobSeekerProfileDataDto | SkilledProfessionalProfileDataDto | 
          HousingSeekerProfileDataDto | PropertyOwnerProfileDataDto | 
          SupportBeneficiaryProfileDataDto | IntermediaryAgentProfileDataDto
  ): string[] {
    const missing: string[] = [];

    switch (profileType) {
      case "JOB_SEEKER": {
        const jobData = data as JobSeekerProfileDataDto;
        if (!jobData.headline) missing.push('headline');
        if (!jobData.skills?.length) missing.push('skills');
        if (!jobData.jobTypes?.length) missing.push('jobTypes');
        if (!jobData.expectedSalary) missing.push('expectedSalary');
        break;
      }

      case "SKILLED_PROFESSIONAL": {
        const profData = data as SkilledProfessionalProfileDataDto;
        if (!profData.title) missing.push('title');
        if (!profData.profession) missing.push('profession');
        if (!profData.specialties?.length) missing.push('specialties');
        if (!profData.licenseNumber) missing.push('licenseNumber');
        break;
      }

      case "INTERMEDIARY_AGENT": {
        const agentData = data as IntermediaryAgentProfileDataDto;
        if (!agentData.agentType) missing.push('agentType');
        if (!agentData.specializations?.length) missing.push('specializations');
        if (!agentData.licenseNumber) missing.push('licenseNumber');
        break;
      }

      case "HOUSING_SEEKER": {
        const housingData = data as HousingSeekerProfileDataDto;
        if (!housingData.preferredTypes?.length) missing.push('preferredTypes');
        if (!housingData.preferredCities?.length) missing.push('preferredCities');
        if (!housingData.minBudget || !housingData.maxBudget) missing.push('budget');
        break;
      }

      case "PROPERTY_OWNER": {
        const ownerData = data as PropertyOwnerProfileDataDto;
        if (!ownerData.preferredPropertyTypes?.length) missing.push('preferredPropertyTypes');
        if (!ownerData.serviceAreas?.length) missing.push('serviceAreas');
        break;
      }

      case "SUPPORT_BENEFICIARY": {
        const beneficiaryData = data as SupportBeneficiaryProfileDataDto;
        if (!beneficiaryData.needs?.length) missing.push('needs');
        if (!beneficiaryData.city && !beneficiaryData.latitude) missing.push('location');
        break;
      }
    }

    return missing;
  }

  // ======================================================
  // CONVERTER METHODS (Prisma to DTO)
  // ======================================================

  /**
   * Convert Prisma JobSeekerProfile to JobSeekerProfileDataDto
   */
  private jobSeekerProfileToDataDto(profile: JobSeekerProfile): JobSeekerProfileDataDto {
    return {
      headline: profile.headline ?? undefined,
      isActivelySeeking: profile.isActivelySeeking,
      skills: this.parseJsonField<string[]>(profile.skills, []),
      industries: this.parseJsonField<string[]>(profile.industries, []),
      jobTypes: this.parseJsonField<JobType[]>(profile.jobTypes, []),
      seniorityLevel: profile.seniorityLevel as SeniorityLevel | undefined,
      noticePeriod: profile.noticePeriod ?? undefined,
      expectedSalary: profile.expectedSalary ?? undefined,
      workAuthorization: this.parseJsonField<string[]>(profile.workAuthorization, []),
      cvUrl: profile.cvUrl ?? undefined,
      portfolioImages: this.parseJsonField<string[]>(profile.portfolioImages, []),
      linkedInUrl: profile.linkedInUrl ?? undefined,
      githubUrl: profile.githubUrl ?? undefined,
      portfolioUrl: profile.portfolioUrl ?? undefined,
      hasAgent: profile.hasAgent,
      agentUuid: profile.agentUuid ?? undefined,
    };
  }

  /**
   * Convert Prisma SkilledProfessionalProfile to SkilledProfessionalProfileDataDto
   */
  private skilledProfessionalProfileToDataDto(profile: SkilledProfessionalProfile): SkilledProfessionalProfileDataDto {
    return {
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
      portfolioImages: this.parseJsonField<string[]>(profile.portfolioImages, []),
      certifications: this.parseJsonField<string[]>(profile.certifications, []),
    };
  }

  /**
   * Convert Prisma HousingSeekerProfile to HousingSeekerProfileDataDto
   */
  private housingSeekerProfileToDataDto(profile: HousingSeekerProfile): HousingSeekerProfileDataDto {
    return {
      minBedrooms: profile.minBedrooms,
      maxBedrooms: profile.maxBedrooms,
      minBudget: profile.minBudget ?? undefined,
      maxBudget: profile.maxBudget ?? undefined,
      preferredTypes: this.parseJsonField<PropertyType[]>(profile.preferredTypes, []),
      preferredCities: this.parseJsonField<string[]>(profile.preferredCities, []),
      preferredNeighborhoods: this.parseJsonField<string[]>(profile.preferredNeighborhoods, []),
      moveInDate: profile.moveInDate?.toISOString(),
      leaseDuration: profile.leaseDuration ?? undefined,
      householdSize: profile.householdSize ?? undefined,
      hasPets: profile.hasPets ?? undefined,
      petDetails: profile.petDetails ?? undefined,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      searchRadiusKm: profile.searchRadiusKm ?? undefined,
      hasAgent: profile.hasAgent,
      agentUuid: profile.agentUuid ?? undefined,
    };
  }

  /**
   * Convert Prisma PropertyOwnerProfile to PropertyOwnerProfileDataDto
   */
  private propertyOwnerProfileToDataDto(profile: PropertyOwnerProfile): PropertyOwnerProfileDataDto {
  return {
    isProfessional: profile.isProfessional,
    licenseNumber: profile.licenseNumber ?? undefined,
    companyName: profile.companyName ?? undefined,
    yearsInBusiness: profile.yearsInBusiness ?? undefined,
    preferredPropertyTypes: this.parseJsonField<PropertyType[]>(profile.preferredPropertyTypes, []),
    serviceAreas: this.parseJsonField<string[]>(profile.serviceAreas, []),
    usesAgent: profile.usesAgent,
    managingAgentUuid: profile.managingAgentUuid ?? undefined,
  };
}

  /**
   * Convert Prisma SupportBeneficiaryProfile to SupportBeneficiaryProfileDataDto
   */
  private supportBeneficiaryProfileToDataDto(profile: SupportBeneficiaryProfile): SupportBeneficiaryProfileDataDto {
    return {
      needs: this.parseJsonField<SupportNeed[]>(profile.needs, []),
      urgentNeeds: this.parseJsonField<SupportNeed[]>(profile.urgentNeeds, []),
      familySize: profile.familySize ?? undefined,
      dependents: profile.dependents ?? undefined,
      householdComposition: profile.householdComposition ?? undefined,
      vulnerabilityFactors: this.parseJsonField<string[]>(profile.vulnerabilityFactors, []),
      city: profile.city ?? undefined,
      neighborhood: profile.neighborhood ?? undefined,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      landmark: profile.landmark ?? undefined,
      prefersAnonymity: profile.prefersAnonymity,
      languagePreference: this.parseJsonField<string[]>(profile.languagePreference, []),
      consentToShare: profile.consentToShare,
      referredBy: profile.referredBy ?? undefined,
      referredByUuid: profile.referredByUuid ?? undefined,
      caseWorkerUuid: profile.caseWorkerUuid ?? undefined,
    };
  }

  /**
   * Convert Prisma IntermediaryAgentProfile to IntermediaryAgentProfileDataDto
   */
  private intermediaryAgentProfileToDataDto(profile: IntermediaryAgentProfile): IntermediaryAgentProfileDataDto {
    return {
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
      about: profile.about ?? undefined,
      profileImage: profile.profileImage ?? undefined,
      contactEmail: profile.contactEmail ?? undefined,
      contactPhone: profile.contactPhone ?? undefined,
      website: profile.website ?? undefined,
      socialLinks: this.parseJsonField<Record<string, string>>(profile.socialLinks, {}),
      clientTypes: this.parseJsonField<string[]>(profile.clientTypes, []),
    };
  }


 // ======================================================
// MAIN ONBOARDING - CREATE INDIVIDUAL ACCOUNT WITH PROFILES
// ======================================================

/**
 * Creates an individual account with multiple profiles based on user selection
 */
/**
 * Creates an individual account with multiple profiles based on user selection
 */
async createIndividualAccountWithProfiles(
  data: CreateAccountWithProfilesRequestDto
): Promise<BaseResponseDto<AccountResponseDto>> {
  // Ensure this is for individual accounts only
  if (data.accountType !== "INDIVIDUAL") {
    return BaseResponseDto.fail('This method is for individual accounts only', 'BAD_REQUEST');
  }

  if (!data.firstName || !data.lastName) {
    return BaseResponseDto.fail('First name and last name are required for individual accounts', 'BAD_REQUEST');
  }

  // Determine which profiles to create - ALWAYS use primaryPurpose + profileData from oneof
  let profilesToCreate: ProfileToCreateDto[] = [];

  // Use primaryPurpose + oneof data from UI flow
  if (data.primaryPurpose && data.primaryPurpose !== 'JUST_EXPLORING') {
    const profileType = mapIndividualPurposeToProfileType(data.primaryPurpose);
    
    this.logger.debug(`Mapping primary purpose "${data.primaryPurpose}" to profile type: ${profileType}`);
    
    // Extract profile data from the appropriate oneof field
    let profileData: any = null;
    
    switch (data.primaryPurpose) {
      case 'FIND_JOB':
        profileData = data.jobSeekerData;
        this.logger.debug(`Using jobSeekerData: ${JSON.stringify(profileData)}`);
        break;
      case 'OFFER_SKILLED_SERVICES':
        profileData = data.skilledProfessionalData;
        this.logger.debug(`Using skilledProfessionalData: ${JSON.stringify(profileData)}`);
        break;
      case 'WORK_AS_AGENT':
        profileData = data.intermediaryAgentData;
        this.logger.debug(`Using intermediaryAgentData: ${JSON.stringify(profileData)}`);
        break;
      case 'FIND_HOUSING':
        profileData = data.housingSeekerData;
        this.logger.debug(`Using housingSeekerData: ${JSON.stringify(profileData)}`);
        break;
      case 'GET_SOCIAL_SUPPORT':
        profileData = data.supportBeneficiaryData;
        this.logger.debug(`Using supportBeneficiaryData: ${JSON.stringify(profileData)}`);
        break;
      case 'HIRE_EMPLOYEES':
        profileData = data.employerData;
        this.logger.debug(`Using employerData: ${JSON.stringify(profileData)}`);
        break;
      case 'LIST_PROPERTIES':
        profileData = data.propertyOwnerData;
        this.logger.debug(`Using propertyOwnerData: ${JSON.stringify(profileData)}`);
        break;
      default:
        this.logger.warn(`Unknown primary purpose: ${data.primaryPurpose}`);
    }
    
    if (profileType && profileData) {
      profilesToCreate = [{
        type: profileType,
        data: profileData
      }];
      this.logger.debug(`Created profile to create: ${profileType}`);
    } else if (profileType && !profileData) {
      this.logger.warn(`Primary purpose ${data.primaryPurpose} mapped to ${profileType} but no profile data provided`);
    }
  } else if (data.primaryPurpose === 'JUST_EXPLORING') {
    this.logger.debug(`User selected JUST_EXPLORING - no profiles will be created`);
  } else {
    this.logger.debug(`No primary purpose provided - no profiles will be created`);
  }

  // Generate codes
  const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const accountCode = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  const normalizedEmail = data.email.toLowerCase().trim();
  const normalizedPhone = this.normalizeKenyanPhone(data.phone);
  
  this.logger.log(`Creating individual account for: ${normalizedEmail} with ${profilesToCreate.length} profiles`);

  const accountUuid = randomUUID();
  const userUuid = randomUUID();
  const targetPlanSlug = data.planSlug || 'free-forever';

  try {
    // 1. PRE-CHECKS: RBAC Role & Plan
    const roleType = 'GeneralUser'; // Individuals always get GeneralUser role
    
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

    // 2. ATOMIC TRANSACTION - Create Account, User, and Profiles
    let createdAccount;
    let createdUser;
    
    await this.prisma.$transaction(async (tx) => {
      // Create Account
      const account = await tx.account.create({
        data: {
          uuid: accountUuid,
          accountCode,
          type: "INDIVIDUAL",
          name: `${data.firstName} ${data.lastName}`.trim(),
          status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          userRole: roleType,
          activeProfiles: this.stringifyJsonField(profilesToCreate.map(p => p.type)),
          isVerified: false,
          verifiedFeatures: this.stringifyJsonField([]),
        },
      });
      createdAccount = account;

      // Create User (login credentials)
      const user = await tx.user.create({
        data: {
          uuid: userUuid,
          userCode,
          email: normalizedEmail,
          phone: normalizedPhone,
          accountUuid: account.uuid,
          roleName: roleType,
          status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          profileImage: data.profileImage,
        },
      });
      createdUser = user;

      // Create Individual Base Profile
      await tx.individualProfile.create({
        data: {
          accountUuid: account.uuid,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImage: data.profileImage,
        },
      });

      // Create each selected profile
      const individualProfiles = profilesToCreate.filter(p => 
        this.isIndividualProfile(p.type)
      );
      
      this.logger.debug(`Creating ${individualProfiles.length} individual profiles`);
      
      for (const profile of individualProfiles) {
        this.logger.debug(`Creating profile type: ${profile.type} with data keys: ${Object.keys(profile.data as object).join(', ')}`);
        
        await this.createProfileInTransaction(
          tx, 
          account.uuid, 
          profile.type, 
          profile.data as 
        | JobSeekerProfileDataDto 
        | SkilledProfessionalProfileDataDto 
        | HousingSeekerProfileDataDto 
        | PropertyOwnerProfileDataDto 
        | SupportBeneficiaryProfileDataDto 
        | IntermediaryAgentProfileDataDto
        );
      }

      return { account, user };
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
      await this.prisma.$transaction([
        this.prisma.user.delete({ where: { uuid: userUuid } }),
        this.prisma.account.delete({ where: { uuid: accountUuid } }),
      ]);
      throw syncError;
    }

    // 4. Return Success Response
    const accountData = await this.getAccountByUuid(accountUuid);
    
    this.logger.log(`Successfully created account for ${normalizedEmail} with profiles: ${profilesToCreate.map(p => p.type).join(', ') || 'none'}`);
    
    return BaseResponseDto.ok(
      accountData.data as AccountResponseDto,
      isPremium ? 'Account created. Payment required.' : 'Account created successfully',
      isPremium ? 'PAYMENT_REQUIRED' : 'CREATED'
    );

  } catch (error) {
    this.logger.error(`Account creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Check which unique constraint was violated
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          return BaseResponseDto.fail('Email already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('phone')) {
          return BaseResponseDto.fail('Phone number already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('userCode')) {
          // Retry with new userCode (rare, but handle gracefully)
          return BaseResponseDto.fail('User code generation conflict, please retry', 'CONFLICT');
        }
        if (target?.includes('accountCode')) {
          // Retry with new accountCode (rare, but handle gracefully)
          return BaseResponseDto.fail('Account code generation conflict, please retry', 'CONFLICT');
        }
        return BaseResponseDto.fail('Email or phone already exists', 'ALREADY_EXISTS');
      }
    }
    
    return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
  }
}

  /**
 * Check if profile type is valid for individuals
 */
private isIndividualProfile(profileType: ProfileType): boolean {
  const individualProfiles = [
    'JOB_SEEKER',
    'SKILLED_PROFESSIONAL',
    'HOUSING_SEEKER',
    'PROPERTY_OWNER',
    'SUPPORT_BENEFICIARY',
    'INTERMEDIARY_AGENT',
    'EMPLOYER',        // Add this
    'SOCIAL_SERVICE_PROVIDER',  // Add this (individuals can be social service providers too)
  ];
  return individualProfiles.includes(profileType as string);
}

 /**
 * Helper to create profile within transaction
 */
private async createProfileInTransaction(
  tx: Prisma.TransactionClient,
  accountUuid: string,
  profileType: ProfileType,
  data: JobSeekerProfileDataDto | SkilledProfessionalProfileDataDto | 
        HousingSeekerProfileDataDto | PropertyOwnerProfileDataDto | 
        SupportBeneficiaryProfileDataDto | IntermediaryAgentProfileDataDto |
        EmployerProfileDataDto | SocialServiceProviderProfileDataDto
): Promise<void> {
  switch (profileType) {
    case 'JOB_SEEKER': {
      const jobData = data as JobSeekerProfileDataDto;
      await tx.jobSeekerProfile.create({
        data: {
          accountUuid,
          headline: jobData.headline,
          isActivelySeeking: jobData.isActivelySeeking ?? true,
          skills: this.stringifyJsonField(jobData.skills ?? []),
          industries: this.stringifyJsonField(jobData.industries ?? []),
          jobTypes: this.stringifyJsonField(jobData.jobTypes ?? []),
          seniorityLevel: jobData.seniorityLevel,
          expectedSalary: jobData.expectedSalary,
          noticePeriod: jobData.noticePeriod,
          workAuthorization: this.stringifyJsonField(jobData.workAuthorization ?? []),
          cvUrl: jobData.cvUrl,
          cvLastUpdated: jobData.cvUrl ? new Date() : undefined,
          portfolioImages: this.stringifyJsonField(jobData.portfolioImages ?? []),
          linkedInUrl: jobData.linkedInUrl,
          githubUrl: jobData.githubUrl,
          portfolioUrl: jobData.portfolioUrl,
          hasAgent: jobData.hasAgent ?? false,
          agentUuid: jobData.agentUuid,
        },
      });
      break;
    }

    case "SKILLED_PROFESSIONAL": {
      const profData = data as SkilledProfessionalProfileDataDto;
      await tx.skilledProfessionalProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          title: profData.title,
          profession: profData.profession,
          specialties: this.stringifyJsonField(profData.specialties ?? []),
          serviceAreas: this.stringifyJsonField(profData.serviceAreas ?? []),
          yearsExperience: profData.yearsExperience,
          licenseNumber: profData.licenseNumber,
          insuranceInfo: profData.insuranceInfo,
          hourlyRate: profData.hourlyRate,
          dailyRate: profData.dailyRate,
          paymentTerms: profData.paymentTerms,
          availableToday: profData.availableToday ?? false,
          availableWeekends: profData.availableWeekends ?? true,
          emergencyService: profData.emergencyService ?? false,
          portfolioImages: this.stringifyJsonField(profData.portfolioImages ?? []),
          certifications: this.stringifyJsonField(profData.certifications ?? []),
        },
      });
      break;
    }

    case "HOUSING_SEEKER": {
      const housingData = data as HousingSeekerProfileDataDto;
      await tx.housingSeekerProfile.create({
        data: {
          accountUuid,
          minBedrooms: housingData.minBedrooms ?? 0,
          maxBedrooms: housingData.maxBedrooms ?? 5,
          minBudget: housingData.minBudget,
          maxBudget: housingData.maxBudget,
          preferredTypes: this.stringifyJsonField(housingData.preferredTypes ?? []),
          preferredCities: this.stringifyJsonField(housingData.preferredCities ?? []),
          preferredNeighborhoods: this.stringifyJsonField(housingData.preferredNeighborhoods ?? []),
          moveInDate: housingData.moveInDate ? new Date(housingData.moveInDate) : null,
          leaseDuration: housingData.leaseDuration,
          householdSize: housingData.householdSize ?? 1,
          hasPets: housingData.hasPets ?? false,
          petDetails: housingData.petDetails,
          latitude: housingData.latitude,
          longitude: housingData.longitude,
          searchRadiusKm: housingData.searchRadiusKm ?? 10,
          hasAgent: housingData.hasAgent ?? false,
          agentUuid: housingData.agentUuid,
        },
      });
      break;
    }

    case "PROPERTY_OWNER": {
      const ownerData = data as PropertyOwnerProfileDataDto;
      await tx.propertyOwnerProfile.create({
        data: {
          accountUuid,
          isProfessional: ownerData.isProfessional ?? false,
          licenseNumber: ownerData.licenseNumber,
          companyName: ownerData.companyName,
          yearsInBusiness: ownerData.yearsInBusiness,
          preferredPropertyTypes: this.stringifyJsonField(ownerData.preferredPropertyTypes ?? []),
          serviceAreas: this.stringifyJsonField(ownerData.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: ownerData.usesAgent ?? false,
          managingAgentUuid: ownerData.managingAgentUuid,
          // Individual fields
          propertyCount: ownerData.propertyCount,
          propertyTypes: this.stringifyJsonField(ownerData.propertyTypes ?? []),
          propertyPurpose: ownerData.propertyPurpose,
        },
      });
      break;
    }

    case "SUPPORT_BENEFICIARY": {
      const beneficiaryData = data as SupportBeneficiaryProfileDataDto;
      await tx.supportBeneficiaryProfile.create({
        data: {
          accountUuid,
          needs: this.stringifyJsonField(beneficiaryData.needs ?? []),
          urgentNeeds: this.stringifyJsonField(beneficiaryData.urgentNeeds ?? []),
          familySize: beneficiaryData.familySize,
          dependents: beneficiaryData.dependents,
          householdComposition: beneficiaryData.householdComposition,
          vulnerabilityFactors: this.stringifyJsonField(beneficiaryData.vulnerabilityFactors ?? []),
          city: beneficiaryData.city,
          neighborhood: beneficiaryData.neighborhood,
          latitude: beneficiaryData.latitude,
          longitude: beneficiaryData.longitude,
          landmark: beneficiaryData.landmark,
          prefersAnonymity: beneficiaryData.prefersAnonymity ?? true,
          languagePreference: this.stringifyJsonField(beneficiaryData.languagePreference ?? []),
          consentToShare: beneficiaryData.consentToShare ?? false,
          consentGivenAt: beneficiaryData.consentToShare ? new Date() : null,
          referredBy: beneficiaryData.referredBy,
          referredByUuid: beneficiaryData.referredByUuid,
          caseWorkerUuid: beneficiaryData.caseWorkerUuid,
        },
      });
      break;
    }

    case "INTERMEDIARY_AGENT": {
      const agentData = data as IntermediaryAgentProfileDataDto;
      await tx.intermediaryAgentProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          agentType: agentData.agentType,
          specializations: this.stringifyJsonField(agentData.specializations ?? []),
          serviceAreas: this.stringifyJsonField(agentData.serviceAreas ?? []),
          licenseNumber: agentData.licenseNumber,
          licenseBody: agentData.licenseBody,
          yearsExperience: agentData.yearsExperience,
          agencyName: agentData.agencyName,
          agencyUuid: agentData.agencyUuid,
          commissionRate: agentData.commissionRate,
          feeStructure: agentData.feeStructure,
          minimumFee: agentData.minimumFee,
          typicalFee: agentData.typicalFee,
          isVerified: false,
          about: agentData.about,
          profileImage: agentData.profileImage,
          contactEmail: agentData.contactEmail,
          contactPhone: this.normalizeKenyanPhone(agentData.contactPhone),
          website: agentData.website,
          socialLinks: this.stringifyJsonField(agentData.socialLinks ?? {}),
          clientTypes: this.stringifyJsonField(agentData.clientTypes ?? []),
        },
      });
      break;
    }

    case "EMPLOYER": {
      const employerData = data as EmployerProfileDataDto;
      await tx.employerProfile.create({
        data: {
          accountUuid,
          companyName: employerData.companyName,
          industry: employerData.industry,
          companySize: employerData.companySize,
          foundedYear: employerData.foundedYear,
          description: employerData.description,
          logo: employerData.logo,
          preferredSkills: this.stringifyJsonField(employerData.preferredSkills ?? []),
          remotePolicy: employerData.remotePolicy,
          isVerifiedEmployer: false,
          worksWithAgents: employerData.worksWithAgents ?? false,
          preferredAgents: this.stringifyJsonField(employerData.preferredAgents ?? []),
          // Individual fields
          businessName: employerData.businessName,
          isRegistered: employerData.isRegistered,
          yearsExperience: employerData.yearsExperience,
        },
      });
      break;
    }

    case "SOCIAL_SERVICE_PROVIDER": {
      const providerData = data as SocialServiceProviderProfileDataDto;
      await tx.socialServiceProviderProfile.create({
        data: {
          accountUuid,
          providerType: providerData.providerType,
          servicesOffered: this.stringifyJsonField(providerData.servicesOffered ?? []),
          targetBeneficiaries: this.stringifyJsonField(providerData.targetBeneficiaries ?? []),
          serviceAreas: this.stringifyJsonField(providerData.serviceAreas ?? []),
          isVerified: false,
          about: providerData.about,
          website: providerData.website,
          contactEmail: providerData.contactEmail,
          contactPhone: this.normalizeKenyanPhone(providerData.contactPhone),
          officeHours: providerData.officeHours,
          physicalAddress: providerData.physicalAddress,
          peopleServed: providerData.peopleServed,
          yearEstablished: providerData.yearEstablished,
          acceptsDonations: providerData.acceptsDonations ?? false,
          needsVolunteers: providerData.needsVolunteers ?? false,
          donationInfo: providerData.donationInfo,
          volunteerNeeds: providerData.volunteerNeeds,
          // Individual fields
          operatingName: providerData.operatingName,
          yearsExperience: providerData.yearsExperience,
          qualifications: this.stringifyJsonField(providerData.qualifications ?? []),
          availability: providerData.availability,
        },
      });
      break;
    }

    default:
      this.logger.warn(`Unknown profile type for individual: ${profileType}`);
  }
}

  // ======================================================
  // INDIVIDUAL PROFILE CREATION METHODS
  // ======================================================

  async createJobSeekerProfile(
    accountUuid: string,
    data: JobSeekerProfileDataDto
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    try {
      const profile = await this.prisma.jobSeekerProfile.create({
        data: {
          accountUuid,
          headline: data.headline,
          isActivelySeeking: data.isActivelySeeking ?? true,
          skills: this.stringifyJsonField(data.skills ?? []),
          industries: this.stringifyJsonField(data.industries ?? []),
          jobTypes: this.stringifyJsonField(data.jobTypes ?? []),
          seniorityLevel: data.seniorityLevel,
          expectedSalary: data.expectedSalary,
          workAuthorization: this.stringifyJsonField(data.workAuthorization ?? []),
          cvUrl: data.cvUrl,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          linkedInUrl: data.linkedInUrl,
          githubUrl: data.githubUrl,
          portfolioUrl: data.portfolioUrl,
          hasAgent: data.hasAgent ?? false,
          agentUuid: data.agentUuid,
        }
      });

      await this.updateActiveProfiles(accountUuid, "JOB_SEEKER", 'add');

      const completion = this.calculateProfileCompletion("JOB_SEEKER", data);
      const missingFields = this.getMissingFields("JOB_SEEKER", data);

      return BaseResponseDto.ok(
        this.mapToJobSeekerResponse(profile, completion, missingFields),
        'Job seeker profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create job seeker profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createSkilledProfessionalProfile(
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
          specialties: this.stringifyJsonField(data.specialties ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday ?? false,
          availableWeekends: data.availableWeekends ?? true,
          emergencyService: data.emergencyService ?? false,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          certifications: this.stringifyJsonField(data.certifications ?? []),
        }
      });

      await this.updateActiveProfiles(accountUuid, "SKILLED_PROFESSIONAL", 'add');

      const completion = this.calculateProfileCompletion("SKILLED_PROFESSIONAL", data);
      const missingFields = this.getMissingFields("SKILLED_PROFESSIONAL", data);

      return BaseResponseDto.ok(
        this.mapToSkilledProfessionalResponse(profile, completion, missingFields),
        'Skilled professional profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create skilled professional profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    try {
      const profile = await this.prisma.intermediaryAgentProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          agentType: data.agentType,
          specializations: this.stringifyJsonField(data.specializations ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
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
          contactPhone: this.normalizeKenyanPhone(data.contactPhone),
          website: data.website,
          socialLinks: this.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: this.stringifyJsonField(data.clientTypes ?? []),
        }
      });

      await this.updateActiveProfiles(accountUuid, "INTERMEDIARY_AGENT", 'add');

      const completion = this.calculateProfileCompletion("INTERMEDIARY_AGENT", data);
      const missingFields = this.getMissingFields("INTERMEDIARY_AGENT", data);

      return BaseResponseDto.ok(
        this.mapToIntermediaryAgentResponse(profile, completion, missingFields),
        'Agent profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create agent profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createHousingSeekerProfile(
    accountUuid: string,
    data: HousingSeekerProfileDataDto
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    try {
      const profile = await this.prisma.housingSeekerProfile.create({
        data: {
          accountUuid,
          minBedrooms: data.minBedrooms ?? 0,
          maxBedrooms: data.maxBedrooms ?? 5,
          minBudget: data.minBudget,
          maxBudget: data.maxBudget,
          preferredTypes: this.stringifyJsonField(data.preferredTypes ?? []),
          preferredCities: this.stringifyJsonField(data.preferredCities ?? []),
          preferredNeighborhoods: this.stringifyJsonField(data.preferredNeighborhoods ?? []),
          moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
          leaseDuration: data.leaseDuration,
          householdSize: data.householdSize ?? 1,
          hasPets: data.hasPets ?? false,
          petDetails: data.petDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          searchRadiusKm: data.searchRadiusKm ?? 10,
          hasAgent: data.hasAgent ?? false,
          agentUuid: data.agentUuid,
        }
      });

      await this.updateActiveProfiles(accountUuid, "HOUSING_SEEKER", 'add');

      const completion = this.calculateProfileCompletion("HOUSING_SEEKER", data);
      const missingFields = this.getMissingFields("HOUSING_SEEKER", data);

      return BaseResponseDto.ok(
        this.mapToHousingSeekerResponse(profile, completion, missingFields),
        'Housing seeker profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create housing seeker profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createPropertyOwnerProfile(
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
          preferredPropertyTypes: this.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: data.usesAgent ?? false,
          managingAgentUuid: data.managingAgentUuid,
        }
      });

      await this.updateActiveProfiles(accountUuid, "PROPERTY_OWNER", 'add');

      const completion = this.calculateProfileCompletion("PROPERTY_OWNER", data);
      const missingFields = this.getMissingFields("PROPERTY_OWNER", data);

      return BaseResponseDto.ok(
        this.mapToPropertyOwnerResponse(profile, completion, missingFields),
        'Property owner profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create property owner profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async createSupportBeneficiaryProfile(
    accountUuid: string,
    data: SupportBeneficiaryProfileDataDto
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    try {
      const profile = await this.prisma.supportBeneficiaryProfile.create({
        data: {
          accountUuid,
          needs: this.stringifyJsonField(data.needs ?? []),
          urgentNeeds: this.stringifyJsonField(data.urgentNeeds ?? []),
          familySize: data.familySize,
          dependents: data.dependents,
          householdComposition: data.householdComposition,
          vulnerabilityFactors: this.stringifyJsonField(data.vulnerabilityFactors ?? []),
          city: data.city,
          neighborhood: data.neighborhood,
          latitude: data.latitude,
          longitude: data.longitude,
          landmark: data.landmark,
          prefersAnonymity: data.prefersAnonymity ?? true,
          languagePreference: this.stringifyJsonField(data.languagePreference ?? []),
          consentToShare: data.consentToShare ?? false,
          consentGivenAt: data.consentToShare ? new Date() : null,
          referredBy: data.referredBy,
          referredByUuid: data.referredByUuid,
          caseWorkerUuid: data.caseWorkerUuid,
        }
      });

      await this.updateActiveProfiles(accountUuid, "SUPPORT_BENEFICIARY", 'add');

      const completion = this.calculateProfileCompletion("SUPPORT_BENEFICIARY", data);
      const missingFields = this.getMissingFields("SUPPORT_BENEFICIARY", data);

      return BaseResponseDto.ok(
        this.mapToSupportBeneficiaryResponse(profile, completion, missingFields),
        'Beneficiary profile created',
        'CREATED'
      );
    } catch (error) {
      this.logger.error(`Failed to create beneficiary profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // FETCH METHODS
  // ======================================================

  /**
   * Get account by UUID with individual profiles
   */
  async getAccountByUuid(
    accountUuid: string
  ): Promise<BaseResponseDto<AccountResponseDto>> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { uuid: accountUuid },
        include: {
          individualProfile: true,
          jobSeekerProfile: true,
          skilledProfessionalProfile: true,
          housingSeekerProfile: true,
          propertyOwnerProfile: true,
          supportBeneficiaryProfile: true,
          intermediaryAgentProfile: true,
          users: true,
        },
      });

      if (!account) {
        return BaseResponseDto.fail('Account not found', 'NOT_FOUND');
      }

      // Only return if it's an individual account
      if (account.type !== "INDIVIDUAL") {
        return BaseResponseDto.fail('Account is not an individual account', 'BAD_REQUEST');
      }

      return BaseResponseDto.ok(
        this.mapToAccountResponse(account),
        'Account retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get user by UUID with all profiles
   */
  async getUserProfileByUuid(
    data: GetUserByUserUuidDto
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Fetching user profile for: ${data.userUuid}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { uuid: data.userUuid },
        include: {
          account: {
            include: {
              individualProfile: true,
              jobSeekerProfile: true,
              skilledProfessionalProfile: true,
              housingSeekerProfile: true,
              propertyOwnerProfile: true,
              supportBeneficiaryProfile: true,
              intermediaryAgentProfile: true,
            },
          },
        },
      });

      if (!user) {
        return BaseResponseDto.fail('User not found', 'NOT_FOUND');
      }

      return BaseResponseDto.ok(
        this.mapToUserProfileResponse(user),
        'User retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Error fetching user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get user by email
   */
  async getUserProfileByEmail(
    data: { email: string }
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
        include: {
          account: {
            include: {
              individualProfile: true,
              jobSeekerProfile: true,
              skilledProfessionalProfile: true,
              housingSeekerProfile: true,
              propertyOwnerProfile: true,
              supportBeneficiaryProfile: true,
              intermediaryAgentProfile: true,
            },
          },
        },
      });

      if (!user) {
        throw new RpcException({ code: 5, message: 'User not found' });
      }

      return BaseResponseDto.ok(
        this.mapToUserProfileResponse(user),
        'User retrieved',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Error fetching user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new RpcException({ code: 13, message: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Get my profile (for authenticated user)
   */
  async getMyProfile(
    userUuid: string
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    return this.getUserProfileByUuid({ userUuid });
  }

  // ======================================================
  // UPDATE METHODS
  // ======================================================

  /**
   * Update user profile information
   */
  async updateProfile(
    dto: UpdateFullUserProfileDto
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Updating profile for user: ${dto.userUuid}`);

    try {
      const user = await this.prisma.user.findUnique({
        where: { uuid: dto.userUuid },
        include: { account: true },
      });

      if (!user) {
        return BaseResponseDto.fail('User not found', 'NOT_FOUND');
      }

      // Update individual profile
      await this.prisma.individualProfile.update({
        where: { accountUuid: user.accountUuid },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          bio: dto.bio,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          nationalId: dto.nationalId,
          profileImage: dto.profileImage,
        },
      });

      // Update account name
      if (dto.firstName || dto.lastName) {
        await this.prisma.account.update({
          where: { uuid: user.accountUuid },
          data: {
            name: `${dto.firstName || ''} ${dto.lastName || ''}`.trim(),
          },
        });
      }

      // Handle old image deletion if needed
      if (dto.profileImage && dto.oldImageUrl && dto.oldImageUrl !== dto.profileImage) {
        this.handleOldImageDeletion(dto.oldImageUrl);
      }

      // Return updated profile
      return this.getUserProfileByUuid({ userUuid: dto.userUuid });

    } catch (error) {
      this.logger.error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  /**
   * Update job seeker profile
   */
  async updateJobSeekerProfile(
    accountUuid: string,
    data: JobSeekerProfileDataDto
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    try {
      const profile = await this.prisma.jobSeekerProfile.upsert({
        where: { accountUuid },
        update: {
          headline: data.headline,
          isActivelySeeking: data.isActivelySeeking,
          skills: this.stringifyJsonField(data.skills ?? []),
          industries: this.stringifyJsonField(data.industries ?? []),
          jobTypes: this.stringifyJsonField(data.jobTypes ?? []),
          seniorityLevel: data.seniorityLevel,
          expectedSalary: data.expectedSalary,
          workAuthorization: this.stringifyJsonField(data.workAuthorization ?? []),
          cvUrl: data.cvUrl,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          linkedInUrl: data.linkedInUrl,
          githubUrl: data.githubUrl,
          portfolioUrl: data.portfolioUrl,
          hasAgent: data.hasAgent,
          agentUuid: data.agentUuid,
          cvLastUpdated: data.cvUrl ? new Date() : undefined,
        },
        create: {
          accountUuid,
          headline: data.headline,
          isActivelySeeking: data.isActivelySeeking ?? true,
          skills: this.stringifyJsonField(data.skills ?? []),
          industries: this.stringifyJsonField(data.industries ?? []),
          jobTypes: this.stringifyJsonField(data.jobTypes ?? []),
          seniorityLevel: data.seniorityLevel,
          expectedSalary: data.expectedSalary,
          workAuthorization: this.stringifyJsonField(data.workAuthorization ?? []),
          cvUrl: data.cvUrl,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          linkedInUrl: data.linkedInUrl,
          githubUrl: data.githubUrl,
          portfolioUrl: data.portfolioUrl,
          hasAgent: data.hasAgent ?? false,
          agentUuid: data.agentUuid,
          cvLastUpdated: data.cvUrl ? new Date() : undefined,
        },
      });

      await this.updateActiveProfiles(accountUuid, "JOB_SEEKER", 'add');

      const completion = this.calculateProfileCompletion("JOB_SEEKER", data);
      const missingFields = this.getMissingFields("JOB_SEEKER", data);

      return BaseResponseDto.ok(
        this.mapToJobSeekerResponse(profile, completion, missingFields),
        'Job seeker profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update job seeker profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updateSkilledProfessionalProfile(
    accountUuid: string,
    data: SkilledProfessionalProfileDataDto
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    try {
      const profile = await this.prisma.skilledProfessionalProfile.upsert({
        where: { accountUuid },
        update: {
          title: data.title,
          profession: data.profession,
          specialties: this.stringifyJsonField(data.specialties ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday,
          availableWeekends: data.availableWeekends,
          emergencyService: data.emergencyService,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          certifications: this.stringifyJsonField(data.certifications ?? []),
        },
        create: {
          accountUuid,
          uuid: randomUUID(),
          title: data.title,
          profession: data.profession,
          specialties: this.stringifyJsonField(data.specialties ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          yearsExperience: data.yearsExperience,
          licenseNumber: data.licenseNumber,
          insuranceInfo: data.insuranceInfo,
          hourlyRate: data.hourlyRate,
          dailyRate: data.dailyRate,
          paymentTerms: data.paymentTerms,
          availableToday: data.availableToday ?? false,
          availableWeekends: data.availableWeekends ?? true,
          emergencyService: data.emergencyService ?? false,
          portfolioImages: this.stringifyJsonField(data.portfolioImages ?? []),
          certifications: this.stringifyJsonField(data.certifications ?? []),
        },
      });

      await this.updateActiveProfiles(accountUuid, "SKILLED_PROFESSIONAL", 'add');

      const completion = this.calculateProfileCompletion("SKILLED_PROFESSIONAL", data);
      const missingFields = this.getMissingFields("SKILLED_PROFESSIONAL", data);

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

  async updateIntermediaryAgentProfile(
    accountUuid: string,
    data: IntermediaryAgentProfileDataDto
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    try {
      const profile = await this.prisma.intermediaryAgentProfile.upsert({
        where: { accountUuid },
        update: {
          agentType: data.agentType,
          specializations: this.stringifyJsonField(data.specializations ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
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
          contactPhone: this.normalizeKenyanPhone(data.contactPhone),
          website: data.website,
          socialLinks: this.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: this.stringifyJsonField(data.clientTypes ?? []),
        },
        create: {
          accountUuid,
          uuid: randomUUID(),
          agentType: data.agentType,
          specializations: this.stringifyJsonField(data.specializations ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
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
          contactPhone: this.normalizeKenyanPhone(data.contactPhone),
          website: data.website,
          socialLinks: this.stringifyJsonField(data.socialLinks ?? {}),
          clientTypes: this.stringifyJsonField(data.clientTypes ?? []),
        },
      });

      await this.updateActiveProfiles(accountUuid, "INTERMEDIARY_AGENT", 'add');

      const completion = this.calculateProfileCompletion("INTERMEDIARY_AGENT", data);
      const missingFields = this.getMissingFields("INTERMEDIARY_AGENT", data);

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

  async updateHousingSeekerProfile(
    accountUuid: string,
    data: HousingSeekerProfileDataDto
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    try {
      const profile = await this.prisma.housingSeekerProfile.upsert({
        where: { accountUuid },
        update: {
          minBedrooms: data.minBedrooms,
          maxBedrooms: data.maxBedrooms,
          minBudget: data.minBudget,
          maxBudget: data.maxBudget,
          preferredTypes: this.stringifyJsonField(data.preferredTypes ?? []),
          preferredCities: this.stringifyJsonField(data.preferredCities ?? []),
          preferredNeighborhoods: this.stringifyJsonField(data.preferredNeighborhoods ?? []),
          moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
          leaseDuration: data.leaseDuration,
          householdSize: data.householdSize,
          hasPets: data.hasPets,
          petDetails: data.petDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          searchRadiusKm: data.searchRadiusKm,
          hasAgent: data.hasAgent,
          agentUuid: data.agentUuid,
        },
        create: {
          accountUuid,
          minBedrooms: data.minBedrooms ?? 0,
          maxBedrooms: data.maxBedrooms ?? 5,
          minBudget: data.minBudget,
          maxBudget: data.maxBudget,
          preferredTypes: this.stringifyJsonField(data.preferredTypes ?? []),
          preferredCities: this.stringifyJsonField(data.preferredCities ?? []),
          preferredNeighborhoods: this.stringifyJsonField(data.preferredNeighborhoods ?? []),
          moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
          leaseDuration: data.leaseDuration,
          householdSize: data.householdSize ?? 1,
          hasPets: data.hasPets ?? false,
          petDetails: data.petDetails,
          latitude: data.latitude,
          longitude: data.longitude,
          searchRadiusKm: data.searchRadiusKm ?? 10,
          hasAgent: data.hasAgent ?? false,
          agentUuid: data.agentUuid,
        },
      });

      await this.updateActiveProfiles(accountUuid, "HOUSING_SEEKER", 'add');

      const completion = this.calculateProfileCompletion("HOUSING_SEEKER", data);
      const missingFields = this.getMissingFields("HOUSING_SEEKER", data);

      return BaseResponseDto.ok(
        this.mapToHousingSeekerResponse(profile, completion, missingFields),
        'Housing seeker profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update housing seeker profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  async updatePropertyOwnerProfile(
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
          preferredPropertyTypes: this.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          usesAgent: data.usesAgent,
          managingAgentUuid: data.managingAgentUuid,
        },
        create: {
          accountUuid,
          isProfessional: data.isProfessional ?? false,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          yearsInBusiness: data.yearsInBusiness,
          preferredPropertyTypes: this.stringifyJsonField(data.preferredPropertyTypes ?? []),
          serviceAreas: this.stringifyJsonField(data.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: data.usesAgent ?? false,
          managingAgentUuid: data.managingAgentUuid,
        },
      });

      await this.updateActiveProfiles(accountUuid, "PROPERTY_OWNER", 'add');

      const completion = this.calculateProfileCompletion("PROPERTY_OWNER", data);
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

  async updateSupportBeneficiaryProfile(
    accountUuid: string,
    data: SupportBeneficiaryProfileDataDto
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    try {
      const profile = await this.prisma.supportBeneficiaryProfile.upsert({
        where: { accountUuid },
        update: {
          needs: this.stringifyJsonField(data.needs ?? []),
          urgentNeeds: this.stringifyJsonField(data.urgentNeeds ?? []),
          familySize: data.familySize,
          dependents: data.dependents,
          householdComposition: data.householdComposition,
          vulnerabilityFactors: this.stringifyJsonField(data.vulnerabilityFactors ?? []),
          city: data.city,
          neighborhood: data.neighborhood,
          latitude: data.latitude,
          longitude: data.longitude,
          landmark: data.landmark,
          prefersAnonymity: data.prefersAnonymity,
          languagePreference: this.stringifyJsonField(data.languagePreference ?? []),
          consentToShare: data.consentToShare,
          referredBy: data.referredBy,
          referredByUuid: data.referredByUuid,
          caseWorkerUuid: data.caseWorkerUuid,
        },
        create: {
          accountUuid,
          needs: this.stringifyJsonField(data.needs ?? []),
          urgentNeeds: this.stringifyJsonField(data.urgentNeeds ?? []),
          familySize: data.familySize,
          dependents: data.dependents,
          householdComposition: data.householdComposition,
          vulnerabilityFactors: this.stringifyJsonField(data.vulnerabilityFactors ?? []),
          city: data.city,
          neighborhood: data.neighborhood,
          latitude: data.latitude,
          longitude: data.longitude,
          landmark: data.landmark,
          prefersAnonymity: data.prefersAnonymity ?? true,
          languagePreference: this.stringifyJsonField(data.languagePreference ?? []),
          consentToShare: data.consentToShare ?? false,
          consentGivenAt: data.consentToShare ? new Date() : null,
          referredBy: data.referredBy,
          referredByUuid: data.referredByUuid,
          caseWorkerUuid: data.caseWorkerUuid,
        },
      });

      await this.updateActiveProfiles(accountUuid, "SUPPORT_BENEFICIARY", 'add');

      const completion = this.calculateProfileCompletion("SUPPORT_BENEFICIARY", data);
      const missingFields = this.getMissingFields("SUPPORT_BENEFICIARY", data);

      return BaseResponseDto.ok(
        this.mapToSupportBeneficiaryResponse(profile, completion, missingFields),
        'Beneficiary profile updated',
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update beneficiary profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // DELETE / REMOVE METHODS
  // ======================================================

  /**
   * Remove a profile from an account
   */
  async removeProfile(
    accountUuid: string,
    profileType: ProfileType
  ): Promise<BaseResponseDto<null>> {
    try {
      switch (profileType) {
        case 'JOB_SEEKER':
    await this.prisma.jobSeekerProfile.delete({ where: { accountUuid } });
    break;
    case 'SKILLED_PROFESSIONAL':
      await this.prisma.skilledProfessionalProfile.delete({ where: { accountUuid } });
      break;
    case 'HOUSING_SEEKER':
      await this.prisma.housingSeekerProfile.delete({ where: { accountUuid } });
      break;
    case 'PROPERTY_OWNER':
      await this.prisma.propertyOwnerProfile.delete({ where: { accountUuid } });
      break;
    case 'SUPPORT_BENEFICIARY':
      await this.prisma.supportBeneficiaryProfile.delete({ where: { accountUuid } });
      break;
    case 'INTERMEDIARY_AGENT':
    await this.prisma.intermediaryAgentProfile.delete({ where: { accountUuid } });
    break;

      }

      await this.updateActiveProfiles(accountUuid, profileType, 'remove');

      return BaseResponseDto.ok(null, 'Profile removed successfully', 'OK');
    } catch (error) {
      this.logger.error(`Failed to remove profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return BaseResponseDto.fail(error instanceof Error ? error.message : 'Unknown error', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // MAPPER METHODS (to Response DTOs)
  // ======================================================

private mapToAccountResponse(account: AccountWithIndividualProfiles): AccountResponseDto {
  // Parse JSON fields
  const activeProfiles = this.parseJsonField<ProfileType[]>(account.activeProfiles, []);
  const verifiedFeatures = this.parseJsonField<string[]>(account.verifiedFeatures, []);

  // Calculate account completion
  const completion = this.calculateAccountCompletion(account);

  return {
    uuid: account.uuid,
    accountCode: account.accountCode,
    name: account.name ?? undefined,
    type: account.type as AccountType,
    status: account.status,
    userRole: account.userRole,
    activeProfiles: activeProfiles,
    isVerified: account.isVerified,
    verifiedFeatures: verifiedFeatures,
    
    individualProfile: account.individualProfile ? {
      accountUuid: account.individualProfile.accountUuid,
      firstName: account.individualProfile.firstName ?? '',
      lastName: account.individualProfile.lastName ?? '',
      bio: account.individualProfile.bio ?? undefined,
      gender: account.individualProfile.gender ?? undefined,
      dateOfBirth: account.individualProfile.dateOfBirth?.toISOString(),
      nationalId: account.individualProfile.nationalId ?? undefined,
      profileImage: account.individualProfile.profileImage ?? undefined,
      completion: undefined,
    } : undefined,

    organizationProfile: undefined,
    employerProfile: undefined,
    socialServiceProviderProfile: undefined,

    jobSeekerProfile: account.jobSeekerProfile ? 
      this.mapToJobSeekerResponse(
        account.jobSeekerProfile,
        this.calculateProfileCompletion(
          'JOB_SEEKER', 
          this.jobSeekerProfileToDataDto(account.jobSeekerProfile)
        ),
        this.getMissingFields(
          'JOB_SEEKER', 
          this.jobSeekerProfileToDataDto(account.jobSeekerProfile)
        )
      ) : undefined,

    skilledProfessionalProfile: account.skilledProfessionalProfile ?
      this.mapToSkilledProfessionalResponse(
        account.skilledProfessionalProfile,
        this.calculateProfileCompletion(
          'SKILLED_PROFESSIONAL', 
          this.skilledProfessionalProfileToDataDto(account.skilledProfessionalProfile)
        ),
        this.getMissingFields(
          'SKILLED_PROFESSIONAL', 
          this.skilledProfessionalProfileToDataDto(account.skilledProfessionalProfile)
        )
      ) : undefined,

    housingSeekerProfile: account.housingSeekerProfile ?
      this.mapToHousingSeekerResponse(
        account.housingSeekerProfile,
        this.calculateProfileCompletion(
          'HOUSING_SEEKER', 
          this.housingSeekerProfileToDataDto(account.housingSeekerProfile)
        ),
        this.getMissingFields(
          'HOUSING_SEEKER', 
          this.housingSeekerProfileToDataDto(account.housingSeekerProfile)
        )
      ) : undefined,

    propertyOwnerProfile: account.propertyOwnerProfile ?
      this.mapToPropertyOwnerResponse(
        account.propertyOwnerProfile,
        this.calculateProfileCompletion(
          'PROPERTY_OWNER', 
          this.propertyOwnerProfileToDataDto(account.propertyOwnerProfile)
        ),
        this.getMissingFields(
          'PROPERTY_OWNER', 
          this.propertyOwnerProfileToDataDto(account.propertyOwnerProfile)
        )
      ) : undefined,

    supportBeneficiaryProfile: account.supportBeneficiaryProfile ?
      this.mapToSupportBeneficiaryResponse(
        account.supportBeneficiaryProfile,
        this.calculateProfileCompletion(
          'SUPPORT_BENEFICIARY', 
          this.supportBeneficiaryProfileToDataDto(account.supportBeneficiaryProfile)
        ),
        this.getMissingFields(
          'SUPPORT_BENEFICIARY', 
          this.supportBeneficiaryProfileToDataDto(account.supportBeneficiaryProfile)
        )
      ) : undefined,

    intermediaryAgentProfile: account.intermediaryAgentProfile ?
      this.mapToIntermediaryAgentResponse(
        account.intermediaryAgentProfile,
        this.calculateProfileCompletion(
          'INTERMEDIARY_AGENT', 
          this.intermediaryAgentProfileToDataDto(account.intermediaryAgentProfile)
        ),
        this.getMissingFields(
          'INTERMEDIARY_AGENT', 
          this.intermediaryAgentProfileToDataDto(account.intermediaryAgentProfile)
        )
      ) : undefined,

    // Remove the users array - not needed for individual accounts
    // users: [],

    completion: {
      percentage: completion.percentage,
      missingFields: completion.missingFields,
      isComplete: completion.isComplete,
    },

    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

private mapToUserProfileResponse(user: UserWithAccount): UserProfileResponseDto {
  const accountResponse = this.mapToAccountResponse(user.account);

  return {
    account: accountResponse,
    user: {
      uuid: user.uuid,
      userCode: user.userCode,  
      firstName: user.account.individualProfile?.firstName ?? '',
      lastName: user.account.individualProfile?.lastName ?? '',
      email: user.email,
      phone: user.phone ?? '',
      status: user.status,
      roleName: user.roleName,
    },
    profile: {
      bio: user.account.individualProfile?.bio ?? undefined,
      gender: user.account.individualProfile?.gender ?? undefined,
      dateOfBirth: user.account.individualProfile?.dateOfBirth?.toISOString(),
      nationalId: user.account.individualProfile?.nationalId ?? undefined,
      profileImage: user.account.individualProfile?.profileImage ?? undefined,
    },
    completion: accountResponse.completion,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
  private mapToJobSeekerResponse(
    profile: JobSeekerProfile, 
    completion?: number, 
    missingFields?: string[]
  ): JobSeekerProfileResponseDto {
    return {
      id: profile.id,
      headline: profile.headline ?? undefined,
      isActivelySeeking: profile.isActivelySeeking,
      skills: this.parseJsonField<string[]>(profile.skills, []),
      industries: this.parseJsonField<string[]>(profile.industries, []),
      jobTypes: this.parseJsonField<JobType[]>(profile.jobTypes, []),
      seniorityLevel: profile.seniorityLevel as SeniorityLevel | undefined,
      noticePeriod: profile.noticePeriod ?? undefined,
      expectedSalary: profile.expectedSalary ?? undefined,
      workAuthorization: this.parseJsonField<string[]>(profile.workAuthorization, []),
      cvUrl: profile.cvUrl ?? undefined,
      cvLastUpdated: profile.cvLastUpdated?.toISOString(),
      portfolioImages: this.parseJsonField<string[]>(profile.portfolioImages, []),
      linkedInUrl: profile.linkedInUrl ?? undefined,
      githubUrl: profile.githubUrl ?? undefined,
      portfolioUrl: profile.portfolioUrl ?? undefined,
      hasAgent: profile.hasAgent,
      agentUuid: profile.agentUuid ?? undefined,
      matchScoreWeight: profile.cvUrl ? 100 : 50,
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

  private mapToHousingSeekerResponse(
    profile: HousingSeekerProfile,
    completion?: number,
    missingFields?: string[]
  ): HousingSeekerProfileResponseDto {
    return {
      id: profile.id,
      minBedrooms: profile.minBedrooms,
      maxBedrooms: profile.maxBedrooms,
      minBudget: profile.minBudget ?? undefined,
      maxBudget: profile.maxBudget ?? undefined,
      preferredTypes: this.parseJsonField<PropertyType[]>(profile.preferredTypes, []),
      preferredCities: this.parseJsonField<string[]>(profile.preferredCities, []),
      preferredNeighborhoods: this.parseJsonField<string[]>(profile.preferredNeighborhoods, []),
      moveInDate: profile.moveInDate?.toISOString(),
      leaseDuration: profile.leaseDuration ?? undefined,
      householdSize: profile.householdSize ?? undefined,
      hasPets: profile.hasPets ?? undefined,
      petDetails: profile.petDetails ?? undefined,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      searchRadiusKm: profile.searchRadiusKm ?? undefined,
      hasAgent: profile.hasAgent,
      agentUuid: profile.agentUuid ?? undefined,
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

  private mapToSupportBeneficiaryResponse(
    profile: SupportBeneficiaryProfile,
    completion?: number,
    missingFields?: string[]
  ): SupportBeneficiaryProfileResponseDto {
    return {
      id: profile.id,
      needs: this.parseJsonField<SupportNeed[]>(profile.needs, []),
      urgentNeeds: this.parseJsonField<SupportNeed[]>(profile.urgentNeeds, []),
      familySize: profile.familySize ?? undefined,
      dependents: profile.dependents ?? undefined,
      householdComposition: profile.householdComposition ?? undefined,
      vulnerabilityFactors: this.parseJsonField<string[]>(profile.vulnerabilityFactors, []),
      city: profile.city ?? undefined,
      neighborhood: profile.neighborhood ?? undefined,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      landmark: profile.landmark ?? undefined,
      prefersAnonymity: profile.prefersAnonymity,
      languagePreference: this.parseJsonField<string[]>(profile.languagePreference, []),
      consentToShare: profile.consentToShare,
      consentGivenAt: profile.consentGivenAt?.toISOString(),
      referredBy: profile.referredBy ?? undefined,
      referredByUuid: profile.referredByUuid ?? undefined,
      caseWorkerUuid: profile.caseWorkerUuid ?? undefined,
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : undefined,
    };
  }

  private calculateAccountCompletion(account: AccountWithIndividualProfiles): ProfileCompletionDto {
    let totalScore = 0;
    let profileCount = 0;
    const missingFields: string[] = [];

    if (account.individualProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.INDIVIDUAL_PROFILE;
      profileCount++;
    } else {
      missingFields.push('individualProfile');
    }

    if (account.jobSeekerProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.JOB_SEEKER.BASE;
      profileCount++;
    }
    if (account.skilledProfessionalProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.SKILLED_PROFESSIONAL.BASE;
      profileCount++;
    }
    if (account.housingSeekerProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.HOUSING_SEEKER.BASE;
      profileCount++;
    }
    if (account.propertyOwnerProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.PROPERTY_OWNER.BASE;
      profileCount++;
    }
    if (account.supportBeneficiaryProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.SUPPORT_BENEFICIARY.BASE;
      profileCount++;
    }
    if (account.intermediaryAgentProfile) {
      totalScore += PROFILE_COMPLETION_WEIGHTS.INTERMEDIARY_AGENT.BASE;
      profileCount++;
    }

    const percentage = profileCount > 0 ? Math.min(Math.round(totalScore / profileCount), 100) : 0;

    return {
      percentage,
      missingFields,
      isComplete: percentage >= 80,
    };
  }

  // ======================================================
  // UTILITY METHODS
  // ======================================================

  private handleOldImageDeletion(imageUrl: string): void {
    if (imageUrl.includes('default-avatar')) return;
    this.logger.log(`Emitting Kafka event to delete: ${imageUrl}`);
    this.kafkaClient.emit('file.delete_obsolete', { url: imageUrl });
  }
}