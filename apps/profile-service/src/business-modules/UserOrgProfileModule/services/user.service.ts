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
  UpdatePropertyOwnerGrpcRequestDto,
  UpdateSupportBeneficiaryGrpcRequestDto,
  UpdateHousingSeekerGrpcRequestDto,
  UpdateIntermediaryAgentGrpcRequestDto,
  UpdateSkilledProfessionalGrpcRequestDto,
  UpdateJobSeekerGrpcRequestDto,
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
  Account, 
  BusinessType,
  SearchType,
  ListingType
} from '../../../../generated/prisma/client';
import { RpcException, ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { catchError, lastValueFrom, Observable, throwError, timeout } from 'rxjs';

import { ProfileType, JobType, SeniorityLevel, PropertyType, SupportNeed, AgentType, AccountType } from '@pivota-api/constants';
import { BaseSubscriptionResponseGrpc } from '@pivota-api/interfaces';
import { PhoneUtils, StringUtils } from '@pivota-api/utils';
import { QueueService } from '@pivota-api/shared-redis';
import { StorageService } from '@pivota-api/shared-storage';


// ==================== Type Definitions ====================

type AccountWithIndividualProfiles = Account & {
  individualProfile: IndividualProfile | null;
  jobSeekerProfile: JobSeekerProfile | null;
  skilledProfessionalProfile: SkilledProfessionalProfile | null;
  housingSeekerProfile: HousingSeekerProfile | null;
  propertyOwnerProfile: PropertyOwnerProfile | null;
  supportBeneficiaryProfile: SupportBeneficiaryProfile | null;
  intermediaryAgentProfile: IntermediaryAgentProfile | null;
  users: User[];

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
  private readonly storageService: StorageService;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('RBAC_PACKAGE') private readonly rbacClient: ClientGrpc,
    @Inject('SUBSCRIPTIONS_PACKAGE') private readonly subscriptionsClient: ClientGrpc,
    @Inject('PLANS_PACKAGE') private readonly plansClient: ClientGrpc,
    // For storage events (consuming)
    @Inject('KAFKA_STORAGE_CLIENT') private readonly storageKafkaClient: ClientKafka,
    // For analytics events (producing)
    @Inject('KAFKA_ANALYTICS_CLIENT') private readonly analyticsKafkaClient: ClientKafka,
    private queue: QueueService, 
  ) {
    this.rbacGrpc = this.rbacClient.getService<RbacServiceGrpc>('RbacService');
    this.subscriptionGrpc = this.subscriptionsClient.getService<SubscriptionServiceGrpc>('SubscriptionService');
    this.plansGrpc = this.plansClient.getService<PlansServiceGrpc>('PlanService');
  }

  async onModuleInit() {
    this.storageKafkaClient.subscribeToResponseOf('file.delete_obsolete');
    await this.storageKafkaClient.connect();
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

  const profiles = this.parseJsonField<string[]>(account?.activeProfiles, []) as ProfileType[];
  
  let updatedProfiles: string[];
  if (action === 'add' && !profiles.includes(profileType)) {
    updatedProfiles = [...profiles, profileType];
  } else if (action === 'remove') {
    updatedProfiles = profiles.filter(p => p !== profileType);
  } else {
    updatedProfiles = profiles;
  }

  // UPDATED: Use StringUtils
  await this.prisma.account.update({
    where: { uuid: accountUuid },
    data: { activeProfiles: StringUtils.stringifyJsonField(updatedProfiles) }
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
        if (!housingData.searchType) missing.push('searchType'); 
        break;
      }

      case "PROPERTY_OWNER": {
        const ownerData = data as PropertyOwnerProfileDataDto;
        if (!ownerData.preferredPropertyTypes?.length) missing.push('preferredPropertyTypes');
        if (!ownerData.serviceAreas?.length) missing.push('serviceAreas');
        if (!ownerData.listingType) missing.push('listingType'); 
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
      searchType: profile.searchType ?? undefined,              // ADD THIS
      isLookingForRental: profile.isLookingForRental ?? undefined,  // ADD THIS
      isLookingToBuy: profile.isLookingToBuy ?? undefined,      // ADD THIS
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
    listingType: profile.listingType ?? undefined,            // ADD THIS
    isListingForRent: profile.isListingForRent ?? undefined,  // ADD THIS
    isListingForSale: profile.isListingForSale ?? undefined,  // ADD THIS
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


async createIndividualAccountWithProfiles(
  data: CreateAccountWithProfilesRequestDto
): Promise<BaseResponseDto<AccountResponseDto>> {
  // Log the entire incoming data
  this.logger.log('=========================================');
  this.logger.log('🔍 [PROFILE SERVICE] createIndividualAccountWithProfiles called');
  this.logger.log(`🔍 Email: ${data.email}`);
  this.logger.log(`🔍 FirstName: ${data.firstName}`);
  this.logger.log(`🔍 LastName: ${data.lastName}`);
  this.logger.log(`🔍 Phone: ${data.phone}`);
  this.logger.log(`🔍 PlanSlug: ${data.planSlug || 'free-forever'}`);
  this.logger.log(`🔍 PrimaryPurpose: ${data.primaryPurpose || 'NOT PROVIDED'}`);
  this.logger.log(`🔍 Has jobSeekerData: ${!!data.jobSeekerData}`);
  this.logger.log(`🔍 Has housingSeekerData: ${!!data.housingSeekerData}`);
  this.logger.log(`🔍 Has skilledProfessionalData: ${!!data.skilledProfessionalData}`);
  this.logger.log(`🔍 Has intermediaryAgentData: ${!!data.intermediaryAgentData}`);
  this.logger.log(`🔍 Has supportBeneficiaryData: ${!!data.supportBeneficiaryData}`);
  this.logger.log(`🔍 Has employerData: ${!!data.employerData}`);
  this.logger.log(`🔍 Has propertyOwnerData: ${!!data.propertyOwnerData}`);
  
  if (data.housingSeekerData) {
    this.logger.log(`🔍 HousingSeekerData details: ${JSON.stringify(data.housingSeekerData, null, 2)}`);
  }
  
  this.logger.log('=========================================');

  // Early validation
  if (data.accountType !== "INDIVIDUAL") {
    this.logger.error('❌ Account type is not INDIVIDUAL');
    return BaseResponseDto.fail('This method is for individual accounts only', 'BAD_REQUEST');
  }

  if (!data.firstName) {
    this.logger.error('❌ First name missing');
    return BaseResponseDto.fail('First name is required for individual accounts', 'BAD_REQUEST');
  }
  
  if (data.lastName === undefined || data.lastName === null) {
    data.lastName = '';
  }

  // Determine profile to create
  let profileToCreate: ProfileToCreateDto | null = null;

  if (data.primaryPurpose && data.primaryPurpose !== 'JUST_EXPLORING') {
    const profileType = mapIndividualPurposeToProfileType(data.primaryPurpose);
    
    this.logger.debug(`Mapping primary purpose "${data.primaryPurpose}" to profile type: ${profileType}`);
    
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
      profileToCreate = { type: profileType, data: profileData };
      this.logger.log(`✅ Profile to create: ${profileType}`);
    } else {
      this.logger.warn(`⚠️ No profile to create - profileType: ${profileType}, has profileData: ${!!profileData}`);
    }
  } else {
    this.logger.log(`ℹ️ No profile to create (primaryPurpose: ${data.primaryPurpose || 'not provided'})`);
  }

  // Generate codes
  const userCode = `USR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const accountCode = `ACC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  const normalizedEmail = StringUtils.normalizeEmail(data.email);
  const normalizedPhone = PhoneUtils.normalize(data.phone || '');
  
  const accountUuid = randomUUID();
  const userUuid = randomUUID();
  const targetPlanSlug = data.planSlug || 'free-forever';
  const isPremium = targetPlanSlug !== 'free-forever';
  const roleType = 'Individual';

  this.logger.log(`Creating individual account for: ${normalizedEmail}`);
  this.logger.log(`Account UUID: ${accountUuid}`);
  this.logger.log(`User UUID: ${userUuid}`);

  try {
    // ============ STEP 1: Parallel service calls (both CRITICAL) ============
    this.logger.log('🔍 Calling RBAC service to get Role ID...');
    const [roleRes, planRes] = await Promise.all([
      lastValueFrom(
        this.rbacGrpc.GetRoleIdByType({ roleType }).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(`❌ RBAC service error: ${err.message}`);
            return throwError(() => new Error('Oops! We are experiencing admin system downtime. Please try again later.'));
          })
        )
      ),
      lastValueFrom(
        this.plansGrpc.GetPlanIdBySlug({ slug: targetPlanSlug }).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(`❌ Admin service error: ${err.message}`);
            return throwError(() => new Error('Admin service unavailable'));
          })
        )
      ),
    ]);

    this.logger.log(`✅ Role ID: ${roleRes?.data?.roleId}`);
    this.logger.log(`✅ Plan ID: ${planRes?.data?.planId}`);

    if (!roleRes?.data?.roleId) {
      this.logger.error('❌ Role ID not found');
      return BaseResponseDto.fail(`Role ${roleType} not found`, 'NOT_FOUND');
    }
    if (!planRes?.data?.planId) {
      this.logger.error('❌ Plan ID not found');
      return BaseResponseDto.fail(`Plan ${targetPlanSlug} not found`, 'NOT_FOUND');
    }

    // ============ STEP 2: Database transaction ============
    this.logger.log('🔍 Starting database transaction...');
    await this.prisma.$transaction(async (tx) => {
      this.logger.log('🔍 Creating account...');
      const accountName = data.lastName 
        ? `${data.firstName} ${data.lastName}`.trim()
        : data.firstName;
      const account = await tx.account.create({
        data: {
          uuid: accountUuid,
          accountCode,
          type: "INDIVIDUAL",
          name: accountName,
          status: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
          userRole: roleType,
          activeProfiles: '[]',
          isVerified: false,
          verifiedFeatures: StringUtils.stringifyJsonField([]),
          isBusiness: data.isBusiness ?? false,
          businessType: data.businessType ? (data.businessType as BusinessType) : null,
        },
      });
      this.logger.log(`✅ Account created: ${account.uuid}`);

      this.logger.log('🔍 Creating user and individual profile...');
      await Promise.all([
        tx.user.create({
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
        }),
        tx.individualProfile.create({
          data: {
            accountUuid: account.uuid,
            firstName: data.firstName,
            lastName: data.lastName || '',
            profileImage: data.profileImage,
            businessName: data.businessName ?? null,
            logo: data.logo ?? null,
            operatesAsBusiness: data.isBusiness ?? false,
            coverPhoto: data.coverPhoto ?? null,
          },
        }),
      ]);
      this.logger.log(`✅ User and individual profile created`);
    }, {
      timeout: 15000,
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });
    this.logger.log('✅ Database transaction completed successfully');

    // ============ STEP 3: Assign Role ============
    this.logger.log('🔍 Assigning role to user...');
    const roleAssignment = await lastValueFrom(
      this.rbacGrpc.AssignRoleToUser({
        userUuid: userUuid,
        roleId: roleRes.data.roleId,
      })
    );

    if (!roleAssignment?.success) {
      this.logger.error('❌ Role assignment failed, rolling back account creation');
      await this.prisma.account.delete({ where: { uuid: accountUuid } });
      return BaseResponseDto.fail('Failed to assign user role. Account creation rolled back.', 'INTERNAL_ERROR');
    }

    this.logger.log(`✅ Role assigned successfully for user ${userUuid}`);

    // ============ STEP 4: Handle Subscription ============
    if (!isPremium) {
      this.logger.log('🔍 Creating subscription for free plan...');
      const subscriptionResult = await lastValueFrom(
        this.subscriptionGrpc.SubscribeToPlan({
          subscriberUuid: accountUuid,
          planId: planRes.data.planId,
          billingCycle: null,
          amountPaid: 0,
          currency: 'KES'
        })
      );

      if (!subscriptionResult?.success) {
        this.logger.error('❌ Subscription creation failed, rolling back account creation');
        await this.prisma.account.delete({ where: { uuid: accountUuid } });
        return BaseResponseDto.fail('Failed to create subscription. Account creation rolled back.', 'INTERNAL_ERROR');
      }
      
      this.logger.log(`✅ Subscription created successfully for account ${accountUuid}`);
    }

    // ============ STEP 5: QUEUE BUSINESS PROFILE CREATION ============
    if (profileToCreate && this.isIndividualProfile(profileToCreate.type)) {
      this.logger.log(`🔍 Queueing profile data for ${profileToCreate.type}`);
      this.logger.log(`🔍 Profile data: ${JSON.stringify(profileToCreate.data, null, 2)}`);
      
      await this.queue.addJob(
        'profile-queue',
        'create-business-profile',
        {
          accountUuid: accountUuid,
          profileType: profileToCreate.type,
          profileData: profileToCreate.data,
          userUuid: userUuid,
          isPremium: isPremium,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      this.logger.log(`✅ Queued business profile creation for ${profileToCreate.type}`);
    } else {
      this.logger.log(`ℹ️ No profile to queue (profileToCreate: ${!!profileToCreate}, isIndividual: ${profileToCreate ? this.isIndividualProfile(profileToCreate.type) : 'N/A'})`);
    }

    // ============ STEP 6: EMIT KAFKA EVENT FOR AUTH SERVICE ============

// ============ EMIT KAFKA EVENT FOR AUTH SERVICE ============
// Only emit if NOT skipped
// ============ EMIT KAFKA EVENT FOR AUTH SERVICE ============
// Only emit if NOT skipped
if (!data.skipEventEmission) {
  this.logger.log('📤 Emitting account.created event for Auth Service...');
  
  await this.queue.addJob(
    'profile-queue',
    'emit-account-created-event',
    {
      userUuid: userUuid,
      accountUuid: accountUuid,
      email: normalizedEmail,
      phone: normalizedPhone,
      firstName: data.firstName,
      lastName: data.lastName,
      accountStatus: isPremium ? 'PENDING_PAYMENT' : 'ACTIVE',
      accountType: 'INDIVIDUAL',
      roleName: roleType,
      timestamp: new Date().toISOString(),
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  
  this.logger.log(`✅ Queued account.created event for user: ${userUuid}`);
} else {
  this.logger.log(`ℹ️ Skipping account.created event emission (skipEventEmission=true) for user: ${userUuid}`);
}

    


    // ============ STEP 7: Return success ============
    this.logger.log('🔍 Fetching created account data...');
    const accountData = await this.getAccountByUuid(accountUuid);
    
    this.logger.log(`✅ Successfully created account for ${normalizedEmail}`);
    
    if (isPremium) {
      return BaseResponseDto.ok(
        accountData.data as AccountResponseDto,
        'Account created. Payment required.',
        'PAYMENT_REQUIRED'
      );
    }

    // ============ STEP 8: QUEUE PROFILE PICTURE DOWNLOAD (if provided) ============
    if (data.profileImage && data.profileImage.startsWith('https://lh3.googleusercontent.com/')) {
      this.logger.log(`📸 Queuing profile picture download for user: ${userUuid}`);
      
      await this.queue.addJob(
        'profile-queue',
        'download-profile-picture',
        {
          userUuid: userUuid,
          pictureUrl: data.profileImage,
          email: normalizedEmail,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      this.logger.log(`✅ Queued profile picture download for user: ${userUuid}`);
    }
    
    return BaseResponseDto.ok(
      accountData.data as AccountResponseDto,
      'Account created successfully',
      'CREATED'
    );

  } catch (error) {
    this.logger.error(`❌ Account creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    this.logger.error(`❌ Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`❌ Prisma error code: ${error.code}`);
      this.logger.error(`❌ Prisma error meta: ${JSON.stringify(error.meta)}`);
      
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        this.logger.error(`❌ Unique constraint violation on: ${target?.join(', ')}`);
        if (target?.includes('email')) {
          return BaseResponseDto.fail('Email already exists', 'ALREADY_EXISTS');
        }
        if (target?.includes('phone')) {
          return BaseResponseDto.fail('Phone number already exists', 'ALREADY_EXISTS');
        }
        return BaseResponseDto.fail('Email or phone already exists', 'ALREADY_EXISTS');
      }
    }
    
    try {
      await this.prisma.account.delete({ where: { uuid: accountUuid } });
      this.logger.log(`🧹 Cleaned up account ${accountUuid} after failure`);
    } catch (cleanupError) {
      this.logger.warn(`⚠️ Could not clean up account: ${cleanupError.message}`);
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
        skills: StringUtils.stringifyJsonField(data.skills ?? []),
        industries: StringUtils.stringifyJsonField(data.industries ?? []),
        jobTypes: StringUtils.stringifyJsonField(data.jobTypes ?? []),
        seniorityLevel: data.seniorityLevel,
        expectedSalary: data.expectedSalary,
        workAuthorization: StringUtils.stringifyJsonField(data.workAuthorization ?? []),
        cvUrl: data.cvUrl,
        portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
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
        preferredTypes: StringUtils.stringifyJsonField(data.preferredTypes ?? []),
        preferredCities: StringUtils.stringifyJsonField(data.preferredCities ?? []),
        preferredNeighborhoods: StringUtils.stringifyJsonField(data.preferredNeighborhoods ?? []),
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
        searchType: data.searchType ? (data.searchType as SearchType) : null,                                    // ADD THIS
        isLookingForRental: data.isLookingForRental ?? false,          // ADD THIS
        isLookingToBuy: data.isLookingToBuy ?? false,                  // ADD THIS
      }
    });

    await this.updateActiveProfiles(accountUuid, "HOUSING_SEEKER", 'add');

    // Get userUuid from account
    const account = await this.prisma.account.findUnique({
      where: { uuid: accountUuid },
      include: { users: { take: 1 } }
    });
    
    const userUuid = account?.users[0]?.uuid;
    
    // ADD DEBUG LOGS HERE
    this.logger.log(`🔍 DEBUG: Found userUuid = ${userUuid}`);
    this.logger.log(`🔍 DEBUG: Data = ${JSON.stringify({
      minBudget: data.minBudget,
      maxBudget: data.maxBudget,
      preferredCities: data.preferredCities,
      preferredTypes: data.preferredTypes,
      minBedrooms: data.minBedrooms,
      maxBedrooms: data.maxBedrooms,
      hasPets: data.hasPets,
    })}`);
    
    if (userUuid) {
      this.logger.log(`📤 ABOUT TO EMIT housing preferences event for user ${userUuid}`);
      await this.emitHousingPreferencesEvent(userUuid, data, 'CREATED');
      this.logger.log(`✅ EMISSION COMPLETED for user ${userUuid}`);
    } else {
      this.logger.warn(`⚠️ NO userUuid found for account ${accountUuid}`);
    }

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
        preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
        serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
        isVerifiedOwner: false,
        usesAgent: data.usesAgent ?? false,
        managingAgentUuid: data.managingAgentUuid,
        listingType: data.listingType ? (data.listingType as ListingType) : null,                                // ADD THIS
        isListingForRent: data.isListingForRent ?? false,            // ADD THIS
        isListingForSale: data.isListingForSale ?? false,            // ADD THIS
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
        needs: StringUtils.stringifyJsonField(data.needs ?? []),
        urgentNeeds: StringUtils.stringifyJsonField(data.urgentNeeds ?? []),
        familySize: data.familySize,
        dependents: data.dependents,
        householdComposition: data.householdComposition,
        vulnerabilityFactors: StringUtils.stringifyJsonField(data.vulnerabilityFactors ?? []),
        city: data.city,
        neighborhood: data.neighborhood,
        latitude: data.latitude,
        longitude: data.longitude,
        landmark: data.landmark,
        prefersAnonymity: data.prefersAnonymity ?? true,
        languagePreference: StringUtils.stringifyJsonField(data.languagePreference ?? []),
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
async getAccountByUuid(accountUuid: string): Promise<BaseResponseDto<AccountResponseDto>> {
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
        users: true,  // ← ADD THIS - include the users relation
      },
    });

    if (!account) {
      return BaseResponseDto.fail('Account not found', 'NOT_FOUND');
    }

    // Only return if it's an individual account
    if (account.type !== "INDIVIDUAL") {
      return BaseResponseDto.fail('Account is not an individual account', 'BAD_REQUEST');
    }

    // Debug: Log the number of users found
    this.logger.debug(`[GET ACCOUNT] Found account: uuid=${account.uuid}, accountCode=${account.accountCode}`);
    this.logger.debug(`[GET ACCOUNT] Number of users: ${account.users?.length || 0}`);
    if (account.users && account.users.length > 0) {
      this.logger.debug(`[GET ACCOUNT] First user UUID: ${account.users[0].uuid}`);
      this.logger.debug(`[GET ACCOUNT] First user code: ${account.users[0].userCode}`);
    }

    const mappedResponse = this.mapToAccountResponse(account);
    
    this.logger.debug(`[GET ACCOUNT] Mapped response has accountCode: ${!!mappedResponse.accountCode}`);
    this.logger.debug(`[GET ACCOUNT] Mapped response has user: ${!!mappedResponse.user}`);

    return BaseResponseDto.ok(
      mappedResponse,
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
            users: {
              take: 1,  // Include the users in the account
            },
          },
        },
      },
    });

    if (!user) {
      return BaseResponseDto.fail('User not found', 'NOT_FOUND');
    }

    // Cast to the correct type - the account now includes users
    const userWithAccount = user as unknown as UserWithAccount;

    return BaseResponseDto.ok(
      this.mapToUserProfileResponse(userWithAccount),
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
            users: {
              take: 1,  // Include the users in the account
            },
          },
        }, 
      },
    });

    if (!user) {
      throw new RpcException({ code: 5, message: 'User not found' });
    }

    // Cast to the correct type
    const userWithAccount = user as unknown as UserWithAccount;

    return BaseResponseDto.ok(
      this.mapToUserProfileResponse(userWithAccount),
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
          businessName: dto.businessName,
          logo: dto.logo,
          operatesAsBusiness: dto.operatesAsBusiness,
          coverPhoto: dto.coverPhoto,
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

      if (dto.isBusiness !== undefined || dto.businessType !== undefined) {
      await this.prisma.account.update({
        where: { uuid: user.accountUuid },
        data: {
          isBusiness: dto.isBusiness,
          businessType: dto.businessType ? (dto.businessType as BusinessType) : null,
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
  data: UpdateJobSeekerGrpcRequestDto
): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
  try {
    // Build update object dynamically, excluding undefined values
    const updateData: any = {};

    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.isActivelySeeking !== undefined) updateData.isActivelySeeking = data.isActivelySeeking;
    if (data.skills !== undefined) updateData.skills = StringUtils.stringifyJsonField(data.skills);
    if (data.industries !== undefined) updateData.industries = StringUtils.stringifyJsonField(data.industries);
    if (data.jobTypes !== undefined) updateData.jobTypes = StringUtils.stringifyJsonField(data.jobTypes);
    if (data.seniorityLevel !== undefined) updateData.seniorityLevel = data.seniorityLevel;
    if (data.expectedSalary !== undefined) updateData.expectedSalary = data.expectedSalary;
    if (data.workAuthorization !== undefined) updateData.workAuthorization = StringUtils.stringifyJsonField(data.workAuthorization);
    if (data.cvUrl !== undefined) updateData.cvUrl = data.cvUrl;
    if (data.portfolioImages !== undefined) updateData.portfolioImages = StringUtils.stringifyJsonField(data.portfolioImages);
    if (data.linkedInUrl !== undefined) updateData.linkedInUrl = data.linkedInUrl;
    if (data.githubUrl !== undefined) updateData.githubUrl = data.githubUrl;
    if (data.portfolioUrl !== undefined) updateData.portfolioUrl = data.portfolioUrl;
    if (data.hasAgent !== undefined) updateData.hasAgent = data.hasAgent;
    if (data.agentUuid !== undefined) updateData.agentUuid = data.agentUuid;
    
    // Only update cvLastUpdated if cvUrl is provided and not undefined
    if (data.cvUrl !== undefined) {
      updateData.cvLastUpdated = data.cvUrl ? new Date() : null;
    }

    // Build create object with defaults (use null for optional fields)
    const createData = {
      accountUuid: data.accountUuid,
      headline: data.headline ?? '',
      isActivelySeeking: data.isActivelySeeking ?? true,
      skills: StringUtils.stringifyJsonField(data.skills ?? []),
      industries: StringUtils.stringifyJsonField(data.industries ?? []),
      jobTypes: StringUtils.stringifyJsonField(data.jobTypes ?? []),
      seniorityLevel: data.seniorityLevel ?? null,
      expectedSalary: data.expectedSalary ?? null,
      workAuthorization: StringUtils.stringifyJsonField(data.workAuthorization ?? []),
      cvUrl: data.cvUrl ?? null,
      portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
      linkedInUrl: data.linkedInUrl ?? null,
      githubUrl: data.githubUrl ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      hasAgent: data.hasAgent ?? false,
      agentUuid: data.agentUuid ?? null,
      cvLastUpdated: data.cvUrl ? new Date() : null,
    };

    const profile = await this.prisma.jobSeekerProfile.upsert({
      where: { accountUuid: data.accountUuid },
      update: updateData,
      create: createData,
    });

    await this.updateActiveProfiles(data.accountUuid, "JOB_SEEKER", 'add');

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
  data: UpdateSkilledProfessionalGrpcRequestDto
): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
  try {
    const profile = await this.prisma.skilledProfessionalProfile.upsert({
      where: { accountUuid: data.accountUuid },
      update: {
        title: data.title ? data.title : null,
        profession: data.profession ? data.profession : null,
        specialties: StringUtils.stringifyJsonField(data.specialties ?? []),
        serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
        yearsExperience: data.yearsExperience ? data.yearsExperience : null,
        licenseNumber: data.licenseNumber ? data.licenseNumber : null,
        insuranceInfo: data.insuranceInfo ? data.insuranceInfo : null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        dailyRate: data.dailyRate ? data.dailyRate : null,
        paymentTerms: data.paymentTerms ? data.paymentTerms : null,
        availableToday: data.availableToday ? data.availableToday : null,
        availableWeekends: data.availableWeekends ? data.availableWeekends : null,
        emergencyService: data.emergencyService ? data.emergencyService : null,
        portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
        certifications: StringUtils.stringifyJsonField(data.certifications ?? []),
      },
      create: {
        accountUuid: data.accountUuid,
        uuid: randomUUID(),
        title: data.title ? data.title : null,
        profession: data.profession ? data.profession : null,
        specialties: StringUtils.stringifyJsonField(data.specialties ?? []),
        serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
        yearsExperience: data.yearsExperience ? data.yearsExperience : null,
        licenseNumber: data.licenseNumber ? data.licenseNumber : null,
        insuranceInfo: data.insuranceInfo ? data.insuranceInfo : null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        dailyRate: data.dailyRate ? data.dailyRate : null,
        paymentTerms: data.paymentTerms ? data.paymentTerms : null,
        availableToday: data.availableToday ?? false,
        availableWeekends: data.availableWeekends ?? true,
        emergencyService: data.emergencyService ?? false,
        portfolioImages: StringUtils.stringifyJsonField(data.portfolioImages ?? []),
        certifications: StringUtils.stringifyJsonField(data.certifications ?? []),
      },
    });

    await this.updateActiveProfiles(data.accountUuid, "SKILLED_PROFESSIONAL", 'add');

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
  data: UpdateIntermediaryAgentGrpcRequestDto
): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
  try {
    const profile = await this.prisma.intermediaryAgentProfile.upsert({
      where: { accountUuid: data.accountUuid },
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
        accountUuid: data.accountUuid,
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

    await this.updateActiveProfiles(data.accountUuid, "INTERMEDIARY_AGENT", 'add');

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
  data: UpdateHousingSeekerGrpcRequestDto
): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
  try {
    const profile = await this.prisma.housingSeekerProfile.upsert({
      where: { accountUuid: data.accountUuid },
      update: {
        minBedrooms: data.minBedrooms,
        maxBedrooms: data.maxBedrooms,
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        preferredTypes: StringUtils.stringifyJsonField(data.preferredTypes ?? []),
        preferredCities: StringUtils.stringifyJsonField(data.preferredCities ?? []),
        preferredNeighborhoods: StringUtils.stringifyJsonField(data.preferredNeighborhoods ?? []),
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
        searchType: data.searchType ? (data.searchType as SearchType) : null,                                  // ADD THIS
        isLookingForRental: data.isLookingForRental,                  // ADD THIS
        isLookingToBuy: data.isLookingToBuy,                          // ADD THIS
      },
      create: {
        accountUuid: data.accountUuid,
        minBedrooms: data.minBedrooms ?? 0,
        maxBedrooms: data.maxBedrooms ?? 5,
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        preferredTypes: StringUtils.stringifyJsonField(data.preferredTypes ?? []),
        preferredCities: StringUtils.stringifyJsonField(data.preferredCities ?? []),
        preferredNeighborhoods: StringUtils.stringifyJsonField(data.preferredNeighborhoods ?? []),
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
        searchType: data.searchType ? (data.searchType as SearchType) : null,                                  // ADD THIS
        isLookingForRental: data.isLookingForRental ?? false,        // ADD THIS
        isLookingToBuy: data.isLookingToBuy ?? false,                // ADD THIS
      },
    });

    await this.updateActiveProfiles(data.accountUuid, "HOUSING_SEEKER", 'add');

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
  data: UpdatePropertyOwnerGrpcRequestDto
): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
  try {
    const profile = await this.prisma.propertyOwnerProfile.upsert({
      where: { accountUuid: data.accountUuid },
      update: {
        isProfessional: data.isProfessional,
        licenseNumber: data.licenseNumber,
        companyName: data.companyName,
        yearsInBusiness: data.yearsInBusiness,
        preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
        serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
        usesAgent: data.usesAgent,
        managingAgentUuid: data.managingAgentUuid,
        listingType: data.listingType ? (data.listingType as ListingType) : null,                                // ADD THIS
        isListingForRent: data.isListingForRent,                      // ADD THIS
        isListingForSale: data.isListingForSale,                      // ADD THIS
      },
      create: {
        accountUuid: data.accountUuid,
        isProfessional: data.isProfessional ?? false,
        licenseNumber: data.licenseNumber,
        companyName: data.companyName,
        yearsInBusiness: data.yearsInBusiness,
        preferredPropertyTypes: StringUtils.stringifyJsonField(data.preferredPropertyTypes ?? []),
        serviceAreas: StringUtils.stringifyJsonField(data.serviceAreas ?? []),
        isVerifiedOwner: false,
        usesAgent: data.usesAgent ?? false,
        managingAgentUuid: data.managingAgentUuid,
        listingType: data.listingType ? (data.listingType as ListingType) : null,                                // ADD THIS
        isListingForRent: data.isListingForRent ?? false,            // ADD THIS
        isListingForSale: data.isListingForSale ?? false,            // ADD THIS
      },
    });

    await this.updateActiveProfiles(data.accountUuid, "PROPERTY_OWNER", 'add');

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
  data: UpdateSupportBeneficiaryGrpcRequestDto
): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
  try {
    const profile = await this.prisma.supportBeneficiaryProfile.upsert({
      where: { accountUuid: data.accountUuid },
      update: {
        needs: StringUtils.stringifyJsonField(data.needs ?? []),
        urgentNeeds: StringUtils.stringifyJsonField(data.urgentNeeds ?? []),
        familySize: data.familySize,
        dependents: data.dependents,
        householdComposition: data.householdComposition,
        vulnerabilityFactors: StringUtils.stringifyJsonField(data.vulnerabilityFactors ?? []),
        city: data.city,
        neighborhood: data.neighborhood,
        latitude: data.latitude,
        longitude: data.longitude,
        landmark: data.landmark,
        prefersAnonymity: data.prefersAnonymity,
        languagePreference: StringUtils.stringifyJsonField(data.languagePreference ?? []),
        consentToShare: data.consentToShare,
        referredBy: data.referredBy,
        referredByUuid: data.referredByUuid,
        caseWorkerUuid: data.caseWorkerUuid,
      },
      create: {
        accountUuid: data.accountUuid,
        needs: StringUtils.stringifyJsonField(data.needs ?? []),
        urgentNeeds: StringUtils.stringifyJsonField(data.urgentNeeds ?? []),
        familySize: data.familySize,
        dependents: data.dependents,
        householdComposition: data.householdComposition,
        vulnerabilityFactors: StringUtils.stringifyJsonField(data.vulnerabilityFactors ?? []),
        city: data.city,
        neighborhood: data.neighborhood,
        latitude: data.latitude,
        longitude: data.longitude,
        landmark: data.landmark,
        prefersAnonymity: data.prefersAnonymity ?? true,
        languagePreference: StringUtils.stringifyJsonField(data.languagePreference ?? []),
        consentToShare: data.consentToShare ?? false,
        consentGivenAt: data.consentToShare ? new Date() : null,
        referredBy: data.referredBy,
        referredByUuid: data.referredByUuid,
        caseWorkerUuid: data.caseWorkerUuid,
      },
    });

    await this.updateActiveProfiles(data.accountUuid, "SUPPORT_BENEFICIARY", 'add');

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

  // Delete account (and all associated profiles/users) - for testing purposes only
  async deleteAccount(accountUuid: string): Promise<BaseResponseDto<null>> {
    try {
      await this.prisma.account.delete({ where: { uuid: accountUuid } });
      return BaseResponseDto.ok(null, 'Account deleted successfully', 'OK');
    } catch (error) {
      this.logger.error(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Map users to UserBaseDto array - get firstName/lastName from individualProfile
  const users = account.users?.map(user => ({
    uuid: user.uuid,
    userCode: user.userCode,
    firstName: account.individualProfile?.firstName ?? '',  // Get from individualProfile
    lastName: account.individualProfile?.lastName ?? '',    // Get from individualProfile
    email: user.email,
    phone: user.phone || '',
    status: user.status,
    roleName: user.roleName,
  })) || [];

  // Get the first user (for convenience)
  const firstUser = users[0];

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

    isBusiness: account.isBusiness ?? false,
    businessType: account.businessType as BusinessType | undefined,
    
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

    // Include the users array
    users: users,
    
    // For backward compatibility/single user access
    user: firstUser,

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
  // Get the account response which contains all profiles
  const accountResponse = this.mapToAccountResponse(user.account);

  return {
    // Account info from UserSignupDataDto
    account: {
      uuid: accountResponse.uuid,
      accountCode: accountResponse.accountCode,
      type: accountResponse.type,
      isBusiness: accountResponse.isBusiness,  // ADD THIS
      businessType: accountResponse.businessType,  // ADD THIS
    },
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

      businessName: user.account.individualProfile?.businessName ?? undefined,
      logo: user.account.individualProfile?.logo ?? undefined,
      operatesAsBusiness: user.account.individualProfile?.operatesAsBusiness ?? false,
      coverPhoto: user.account.individualProfile?.coverPhoto ?? undefined,
    },
    completion: accountResponse.completion,
    
    // FLATTEN THE PROFILES - move them from account to top level
    jobSeekerProfile: accountResponse.jobSeekerProfile,
    skilledProfessionalProfile: accountResponse.skilledProfessionalProfile,
    housingSeekerProfile: accountResponse.housingSeekerProfile,
    propertyOwnerProfile: accountResponse.propertyOwnerProfile,
    supportBeneficiaryProfile: accountResponse.supportBeneficiaryProfile,
    intermediaryAgentProfile: accountResponse.intermediaryAgentProfile,
    
    // Organization related (if any)
    organization: accountResponse.organizationProfile,
    organizationProfile: accountResponse.organizationProfile,
    individualProfile: accountResponse.individualProfile,
    
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
      headline: profile.headline ?? null,
      isActivelySeeking: profile.isActivelySeeking,
      skills: this.parseJsonField<string[]>(profile.skills, []),
      industries: this.parseJsonField<string[]>(profile.industries, []),
      jobTypes: this.parseJsonField<JobType[]>(profile.jobTypes, []),
      seniorityLevel: profile.seniorityLevel as SeniorityLevel | undefined,
      noticePeriod: profile.noticePeriod ?? null,
      expectedSalary: profile.expectedSalary ?? null,
      workAuthorization: this.parseJsonField<string[]>(profile.workAuthorization, []),
      cvUrl: profile.cvUrl ?? undefined,
      cvLastUpdated: profile.cvLastUpdated?.toISOString(),
      portfolioImages: this.parseJsonField<string[]>(profile.portfolioImages, []),
      linkedInUrl: profile.linkedInUrl ?? null,
      githubUrl: profile.githubUrl ?? null,
      portfolioUrl: profile.portfolioUrl ?? null,
      hasAgent: profile.hasAgent,
      agentUuid: profile.agentUuid ?? null,
      matchScoreWeight: profile.cvUrl ? 100 : 50,
      completion: completion ? {
        percentage: completion,
        missingFields: missingFields || [],
        isComplete: (completion || 0) >= 80,
      } : null,
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
      title: profile.title ?? null,
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
    this.storageKafkaClient.emit('file.delete_obsolete', { url: imageUrl });
  }


  // apps/profile-service/src/modules/user/user.service.ts

// Add this method to emit housing preferences
private async emitHousingPreferencesEvent(
  userUuid: string,
  profileData: HousingSeekerProfileDataDto,
  action: 'CREATED' | 'UPDATED'
): Promise<void> {
  this.logger.log(`📤 EMIT: Preparing to emit event for user ${userUuid}`);
  
  try {
    const preferences = {
      userUuid,
      timestamp: new Date().toISOString(),
      action,
      data: {
        minBudget: profileData.minBudget,
        maxBudget: profileData.maxBudget,
        budgetMidpoint: profileData.minBudget && profileData.maxBudget 
          ? (profileData.minBudget + profileData.maxBudget) / 2 
          : null,
        preferredLocations: profileData.preferredCities,
        preferredNeighborhoods: profileData.preferredNeighborhoods,
        preferredPropertyTypes: profileData.preferredTypes,
        minBedrooms: profileData.minBedrooms,
        maxBedrooms: profileData.maxBedrooms,
        moveInDate: profileData.moveInDate,
        hasPets: profileData.hasPets,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        searchRadiusKm: profileData.searchRadiusKm,
        searchType: profileData.searchType,                    // ADD THIS
        isLookingForRental: profileData.isLookingForRental,    // ADD THIS
        isLookingToBuy: profileData.isLookingToBuy,            // ADD THIS
      }
    };

    this.logger.log(`📤 EMIT: Emitting housing.preferences.updated for user ${userUuid}`);
    this.logger.debug(`📤 EMIT: Payload = ${JSON.stringify(preferences)}`);
    
    await this.analyticsKafkaClient.emit('housing.preferences.updated', preferences);
    
    this.logger.log(`✅ EMIT: Successfully emitted for user ${userUuid}`);
  } catch (error) {
    this.logger.error(`❌ EMIT: Failed to emit housing preferences event: ${error.message}`);
    this.logger.error(error.stack);
  }
}
}