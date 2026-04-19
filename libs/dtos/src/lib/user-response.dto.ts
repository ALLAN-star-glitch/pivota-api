import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountBaseDto, EmployerProfileResponseDto, OrganizationBaseDto, OrganizationProfileResponseDto, SocialServiceProviderProfileResponseDto } from './organisation-response.dto';
import { ACCOUNT_TYPES, AccountType, AGENT_TYPES, AgentType, BUSINESS_TYPES, JOB_TYPES, JobType, PROFILE_TYPES, ProfileType, PROPERTY_TYPES, PropertyType, SENIORITY_LEVELS, SeniorityLevel, SERVICE_PROVIDER_TYPES, ServiceProviderType, SUPPORT_NEEDS, SupportNeed } from '@pivota-api/constants';

/* ======================================================
   1. PROFILE COMPLETION DTO
   - Matches CompletionResponse in .proto
====================================================== */
export class ProfileCompletionDto {
  @ApiProperty({ example: 80 })
  percentage!: number;

  @ApiProperty({ example: ['nationalId', 'bio'] })
  missingFields!: string[];

  @ApiProperty({ example: false })
  isComplete!: boolean;
}

/* ======================================================
   2. USER BASE DTO (Identity Layer)
   - Matches UserBase in .proto
====================================================== */
export class UserBaseDto {
  @ApiProperty({ example: 'u-1234-uuid-5678' })
  uuid!: string;

  @ApiProperty({ example: 'USR-X8F4C92A' })
  userCode!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@pivota.com' })
  email!: string;

  @ApiProperty({ example: '+254700111222' })
  phone!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'GeneralUser' })
  roleName!: string;
}

/* ======================================================
   3. USER PROFILE METADATA DTO
   - Matches UserProfileMetadata in .proto
====================================================== */
export class UserProfileDataDto {
  @ApiPropertyOptional({ example: 'Software Engineer based in Nairobi.' })
  bio?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  gender?: string;

  @ApiPropertyOptional({ example: '1995-05-15T00:00:00Z' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '32145678' })
  nationalId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/profiles/u123.jpg' })
  profileImage?: string;

   @ApiPropertyOptional({ example: 'Jane\'s Consulting Services' })
  businessName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/logos/jane-consulting.jpg' })
  logo?: string;

  @ApiPropertyOptional({ example: false })
  operatesAsBusiness?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/covers/profile-banner.jpg' })
  coverPhoto?: string;
}

/* ======================================================
   4. INDIVIDUAL PROFILE RESPONSE DTO
====================================================== */
export class IndividualProfileResponseDto extends UserProfileDataDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  accountUuid!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'Jane\'s Consulting Services' })
  override businessName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/logos/jane-consulting.jpg' })
  override logo?: string;

  @ApiPropertyOptional({ example: false })
  override operatesAsBusiness?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/covers/profile-banner.jpg' })
  override coverPhoto?: string;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}


/* ======================================================
   6. JOB SEEKER PROFILE RESPONSE DTO
====================================================== */
export class JobSeekerProfileResponseDto {
  @ApiProperty({ example: 'jobseek_123abc' })
  id!: string;

  @ApiPropertyOptional({ 
    example: 'Senior Full Stack Developer | NestJS & React',
    description: 'The user’s professional branding statement'
  })
  headline?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Visibility status for recruiters and recommender engines' 
  })
  isActivelySeeking!: boolean;

  @ApiProperty({ 
    example: ['JavaScript', 'TypeScript', 'NestJS', 'React'],
    description: 'Skills used for matching'
  })
  skills!: string[];

  @ApiProperty({ 
    example: ['FinTech', 'HealthTech'],
    description: 'Industries interested in'
  })
  industries!: string[];

  @ApiProperty({ 
    example: ['FULL_TIME', 'CONTRACT'],
    enum: JOB_TYPES,
    description: 'Preferred job types',
    isArray: true
  })
  jobTypes!: JobType[];

  @ApiPropertyOptional({ 
    example: 'SENIOR',
    enum: SENIORITY_LEVELS
  })
  seniorityLevel?: SeniorityLevel;

  @ApiPropertyOptional({ 
    example: '1 month'
  })
  noticePeriod?: string;

  @ApiPropertyOptional({ 
    example: 150000
  })
  expectedSalary?: number;

  @ApiProperty({ 
    example: ['Citizen', 'Work Permit']
  })
  workAuthorization!: string[];

  @ApiPropertyOptional({ 
    example: 'https://storage.pivota.com/cvs/u123/resume.pdf'
  })
  cvUrl?: string;

  @ApiPropertyOptional({ 
    example: '2026-02-26T14:30:00.000Z'
  })
  cvLastUpdated?: string;

  @ApiProperty({ 
    example: ['https://storage.pivota.com/portfolio/img1.jpg']
  })
  portfolioImages!: string[];

  @ApiPropertyOptional({ 
    example: 'https://linkedin.com/in/janedoe'
  })
  linkedInUrl?: string;

  @ApiPropertyOptional({ 
    example: 'https://github.com/janedoe'
  })
  githubUrl?: string;

  @ApiPropertyOptional({ 
    example: 'https://janedoe.dev'
  })
  portfolioUrl?: string;

  @ApiProperty({ 
    example: false
  })
  hasAgent!: boolean;

  @ApiPropertyOptional({ 
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  agentUuid?: string;

  @ApiProperty({ 
    example: 85, 
    description: 'Calculated profile strength for recommendations (0-100)' 
  })
  matchScoreWeight!: number;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   7. SKILLED PROFESSIONAL PROFILE RESPONSE DTO
====================================================== */
export class SkilledProfessionalProfileResponseDto {
  @ApiProperty({ example: 'skilled_123abc' })
  id!: string;

  @ApiProperty({ example: 'skilled-123-abc' })
  uuid!: string;

  @ApiPropertyOptional({ example: 'Master Electrician' })
  title?: string;

  @ApiPropertyOptional({ example: 'ELECTRICIAN' })
  profession?: string;

  @ApiProperty({ example: ['Wiring', 'Solar Installation', 'Security Systems'] })
  specialties!: string[];

  @ApiProperty({ example: ['Nairobi', 'Kiambu', 'Machakos'] })
  serviceAreas!: string[];

  @ApiPropertyOptional({ example: 8 })
  yearsExperience?: number;

  @ApiPropertyOptional({ example: 'EBK/1234/2020' })
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'Covered by APA Insurance, Policy #12345' })
  insuranceInfo?: string;

  @ApiPropertyOptional({ example: 800 })
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 5000 })
  dailyRate?: number;

  @ApiPropertyOptional({ example: 'Hourly, Daily, Fixed' })
  paymentTerms?: string;

  @ApiProperty({ example: false })
  availableToday!: boolean;

  @ApiProperty({ example: true })
  availableWeekends!: boolean;

  @ApiProperty({ example: false })
  emergencyService!: boolean;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ example: 4.8 })
  averageRating!: number;

  @ApiProperty({ example: 27 })
  totalReviews!: number;

  @ApiProperty({ example: 45 })
  completedJobs!: number;

  @ApiPropertyOptional({ example: 95.5 })
  completionRate?: number;

  @ApiProperty({ example: ['https://storage.pivota.com/portfolio/work1.jpg'] })
  portfolioImages!: string[];

  @ApiProperty({ example: ['https://storage.pivota.com/certs/license.pdf'] })
  certifications!: string[];

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   8. HOUSING SEEKER PROFILE RESPONSE DTO
====================================================== */
export class HousingSeekerProfileResponseDto {
  @ApiProperty({ example: 'housing_123abc' })
  id!: string;

  @ApiProperty({ example: 1 })
  minBedrooms!: number;

  @ApiProperty({ example: 3 })
  maxBedrooms!: number;

  @ApiPropertyOptional({ example: 15000 })
  minBudget?: number;

  @ApiPropertyOptional({ example: 45000 })
  maxBudget?: number;

  @ApiProperty({ 
    example: ['APARTMENT', 'HOUSE'],
    enum: PROPERTY_TYPES
  })
  preferredTypes!: PropertyType[];

  @ApiProperty({ example: ['Nairobi', 'Mombasa'] })
  preferredCities!: string[];

  @ApiProperty({ example: ['Kilimani', 'Lavington'] })
  preferredNeighborhoods!: string[];

  @ApiPropertyOptional({ example: '2024-06-01T00:00:00Z' })
  moveInDate?: string;

  @ApiPropertyOptional({ example: '1_YEAR' })
  leaseDuration?: string;

  @ApiProperty({ example: 4 })
  householdSize!: number;

  @ApiProperty({ example: false })
  hasPets!: boolean;

  @ApiPropertyOptional({ example: 'One dog, two cats' })
  petDetails?: string;

  @ApiPropertyOptional({ example: -1.286389 })
  latitude?: number;

  @ApiPropertyOptional({ example: 36.817223 })
  longitude?: number;

  @ApiProperty({ example: 10 })
  searchRadiusKm!: number;

  @ApiProperty({ example: false })
  hasAgent!: boolean;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  agentUuid?: string;

  @ApiPropertyOptional({ enum: ['RENT', 'BUY', 'BOTH'], example: 'RENT' })
  searchType?: string;

  @ApiPropertyOptional({ example: true })
  isLookingForRental?: boolean;

  @ApiPropertyOptional({ example: false })
  isLookingToBuy?: boolean;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   9. PROPERTY OWNER PROFILE RESPONSE DTO
====================================================== */
export class PropertyOwnerProfileResponseDto {
  @ApiProperty({ example: 'propown_123abc' })
  id!: string;

  @ApiProperty({ example: false })
  isProfessional!: boolean;

  @ApiPropertyOptional({ example: 'ERB/5678/2021' })
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'Prime Properties Ltd' })
  companyName?: string;

  @ApiPropertyOptional({ example: 5 })
  yearsInBusiness?: number;

  @ApiProperty({ 
    example: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
    enum: PROPERTY_TYPES
  })
  preferredPropertyTypes!: PropertyType[];

  @ApiProperty({ example: ['Nairobi', 'Kiambu'] })
  serviceAreas!: string[];

  @ApiProperty({ example: false })
  isVerifiedOwner!: boolean;

  @ApiProperty({ example: false })
  usesAgent!: boolean;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  managingAgentUuid?: string;

  @ApiPropertyOptional({ enum: ['RENT', 'SALE', 'BOTH'], example: 'RENT' })
  listingType?: string;

  @ApiPropertyOptional({ example: true })
  isListingForRent?: boolean;

  @ApiPropertyOptional({ example: false })
  isListingForSale?: boolean;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   10. SUPPORT BENEFICIARY PROFILE RESPONSE DTO
====================================================== */
export class SupportBeneficiaryProfileResponseDto {
  @ApiProperty({ example: 'benef_123abc' })
  id!: string;

  @ApiProperty({ 
    example: ['FOOD', 'SHELTER', 'MEDICAL'],
    enum: SUPPORT_NEEDS
  })
  needs!: SupportNeed[];

  @ApiProperty({ 
    example: ['FOOD'],
    enum: SUPPORT_NEEDS
  })
  urgentNeeds!: SupportNeed[];

  @ApiPropertyOptional({ example: 4 })
  familySize?: number;

  @ApiPropertyOptional({ example: 3 })
  dependents?: number;

  @ApiPropertyOptional({ example: 'Single mother with 3 children' })
  householdComposition?: string;

  @ApiProperty({ example: ['SINGLE_PARENT', 'UNEMPLOYED'] })
  vulnerabilityFactors!: string[];

  @ApiPropertyOptional({ example: 'Nairobi' })
  city?: string;

  @ApiPropertyOptional({ example: 'Kawangware' })
  neighborhood?: string;

  @ApiPropertyOptional({ example: -1.286389 })
  latitude?: number;

  @ApiPropertyOptional({ example: 36.817223 })
  longitude?: number;

  @ApiPropertyOptional({ example: 'Near the chief\'s office' })
  landmark?: string;

  @ApiProperty({ example: true })
  prefersAnonymity!: boolean;

  @ApiProperty({ example: ['ENGLISH', 'SWAHILI'] })
  languagePreference!: string[];

  @ApiProperty({ example: false })
  consentToShare!: boolean;

  @ApiPropertyOptional({ example: '2026-01-06T10:00:00Z' })
  consentGivenAt?: string;

  @ApiPropertyOptional({ example: 'St. John\'s Church' })
  referredBy?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  referredByUuid?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  caseWorkerUuid?: string;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}



/* ======================================================
   12. INTERMEDIARY AGENT PROFILE RESPONSE DTO
====================================================== */
export class IntermediaryAgentProfileResponseDto {
  @ApiProperty({ example: 'agent_123abc' })
  id!: string;

  @ApiProperty({ example: 'agent-123-abc' })
  uuid!: string;

  @ApiProperty({ 
    example: 'HOUSING_AGENT',
    enum: AGENT_TYPES
  })
  agentType!: AgentType;

  @ApiProperty({ example: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY'] })
  specializations!: string[];

  @ApiProperty({ example: ['Nairobi', 'Kiambu', 'Mombasa'] })
  serviceAreas!: string[];

  @ApiPropertyOptional({ example: 'ERB/5678/2021' })
  licenseNumber?: string;

  @ApiPropertyOptional({ example: 'Estate Agents Registration Board' })
  licenseBody?: string;

  @ApiPropertyOptional({ example: 5 })
  yearsExperience?: number;

  @ApiPropertyOptional({ example: 'Prime Properties Agency' })
  agencyName?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  agencyUuid?: string;

  @ApiPropertyOptional({ example: 5.0 })
  commissionRate?: number;

  @ApiPropertyOptional({ example: 'PERCENTAGE' })
  feeStructure?: string;

  @ApiPropertyOptional({ example: 5000 })
  minimumFee?: number;

  @ApiPropertyOptional({ example: '5% of first month\'s rent' })
  typicalFee?: string;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiPropertyOptional({ example: 'GOVERNMENT_BODY' })
  verifiedBy?: string;

  @ApiPropertyOptional({ example: '2026-01-06T10:00:00Z' })
  verifiedAt?: string;

  @ApiProperty({ example: 4.7 })
  averageRating!: number;

  @ApiProperty({ example: 34 })
  totalReviews!: number;

  @ApiProperty({ example: 28 })
  completedDeals!: number;

  @ApiPropertyOptional({ example: 92.5 })
  successRate?: number;

  @ApiPropertyOptional({ example: 'Specializing in luxury apartments in Nairobi' })
  about?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/agents/photo.jpg' })
  profileImage?: string;

  @ApiPropertyOptional({ example: 'agent@example.com' })
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+254712345678' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://agentwebsite.com' })
  website?: string;

  @ApiPropertyOptional({ example: { linkedin: 'https://linkedin.com/in/agent' } })
  socialLinks?: Record<string, string>;

  @ApiProperty({ example: ['LANDLORDS', 'TENANTS', 'EMPLOYERS'] })
  clientTypes!: string[];

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   13. EMPLOYER PROFILE RESPONSE DTO
====================================================== */


/* ======================================================
   14. USER SIGNUP DATA DTO / TRIO
====================================================== */
export class UserSignupDataDto {
  @ApiProperty({ type: AccountBaseDto })
  account!: AccountBaseDto;

  @ApiProperty({ type: UserBaseDto })
  user!: UserBaseDto;

  @ApiPropertyOptional({ type: UserProfileDataDto })
  profile?: UserProfileDataDto;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   15. FULL USER PROFILE RESPONSE
   - Includes timestamps as per UserProfileTrio in .proto
====================================================== */
export class UserProfileResponseDto extends UserSignupDataDto {
  @ApiPropertyOptional({ type: OrganizationBaseDto })
  organization?: OrganizationBaseDto;

  @ApiPropertyOptional({ type: IndividualProfileResponseDto })
  individualProfile?: IndividualProfileResponseDto;

  @ApiPropertyOptional({ type: OrganizationProfileResponseDto })
  organizationProfile?: OrganizationProfileResponseDto;

  @ApiPropertyOptional({ type: JobSeekerProfileResponseDto })
  jobSeekerProfile?: JobSeekerProfileResponseDto;

  @ApiPropertyOptional({ type: SkilledProfessionalProfileResponseDto })
  skilledProfessionalProfile?: SkilledProfessionalProfileResponseDto;

  @ApiPropertyOptional({ type: HousingSeekerProfileResponseDto })
  housingSeekerProfile?: HousingSeekerProfileResponseDto;

  @ApiPropertyOptional({ type: PropertyOwnerProfileResponseDto })
  propertyOwnerProfile?: PropertyOwnerProfileResponseDto;

  @ApiPropertyOptional({ type: SupportBeneficiaryProfileResponseDto })
  supportBeneficiaryProfile?: SupportBeneficiaryProfileResponseDto;

  @ApiPropertyOptional({ type: SocialServiceProviderProfileResponseDto })
  socialServiceProviderProfile?: SocialServiceProviderProfileResponseDto;

  @ApiPropertyOptional({ type: IntermediaryAgentProfileResponseDto })
  intermediaryAgentProfile?: IntermediaryAgentProfileResponseDto;

  @ApiPropertyOptional({ type: EmployerProfileResponseDto })
  employerProfile?: EmployerProfileResponseDto;

  @ApiProperty({ example: '2026-01-06T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-06T12:00:00Z' })
  updatedAt!: string;
}

/* ======================================================
   16. ACCOUNT RESPONSE DTO (Complete Account with all profiles)
====================================================== */
export class AccountResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  uuid!: string;

  @ApiProperty({ example: 'ACC-ABC123' })
  accountCode!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  name?: string;

  @ApiProperty({ 
    enum: ACCOUNT_TYPES, 
    example: 'INDIVIDUAL'
  })
  type!: AccountType;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'GeneralUser' })
  userRole!: string;

  @ApiPropertyOptional({ example: false })
  isBusiness?: boolean;

  @ApiPropertyOptional({ enum: BUSINESS_TYPES, example: 'FOR_PROFIT' })
  businessType?: string;

  @ApiProperty({ 
    example: ['JOB_SEEKER', 'SKILLED_PROFESSIONAL'],
    enum: PROFILE_TYPES
  })
  activeProfiles!: ProfileType[];

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ example: ['IDENTITY'] })
  verifiedFeatures!: string[];

  @ApiPropertyOptional({ type: IndividualProfileResponseDto })
  individualProfile?: IndividualProfileResponseDto;

  @ApiPropertyOptional({ type: OrganizationProfileResponseDto })
  organizationProfile?: OrganizationProfileResponseDto;

  @ApiPropertyOptional({ type: JobSeekerProfileResponseDto })
  jobSeekerProfile?: JobSeekerProfileResponseDto;

  @ApiPropertyOptional({ type: SkilledProfessionalProfileResponseDto })
  skilledProfessionalProfile?: SkilledProfessionalProfileResponseDto;

  @ApiPropertyOptional({ type: HousingSeekerProfileResponseDto })
  housingSeekerProfile?: HousingSeekerProfileResponseDto;

  @ApiPropertyOptional({ type: PropertyOwnerProfileResponseDto })
  propertyOwnerProfile?: PropertyOwnerProfileResponseDto;

  @ApiPropertyOptional({ type: SupportBeneficiaryProfileResponseDto })
  supportBeneficiaryProfile?: SupportBeneficiaryProfileResponseDto;

  @ApiPropertyOptional({ type: SocialServiceProviderProfileResponseDto })
  socialServiceProviderProfile?: SocialServiceProviderProfileResponseDto;

  @ApiPropertyOptional({ type: IntermediaryAgentProfileResponseDto })
  intermediaryAgentProfile?: IntermediaryAgentProfileResponseDto;

  @ApiPropertyOptional({ type: EmployerProfileResponseDto })
  employerProfile?: EmployerProfileResponseDto;

  @ApiPropertyOptional({ type: UserBaseDto })
  user?: UserBaseDto;  // Single user

  @ApiPropertyOptional({ type: [UserBaseDto] })
  users?: UserBaseDto[];  // Array for organizations

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;

  @ApiProperty({ example: '2026-01-06T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-06T12:00:00Z' })
  updatedAt!: string;
}

/* ======================================================
   17. ONBOARDING RESPONSE DTO
====================================================== */
export class OnboardingResponseDto {
  @ApiProperty({ type: AccountResponseDto })
  account!: AccountResponseDto;

  @ApiProperty({ type: UserBaseDto })
  user!: UserBaseDto;

  @ApiPropertyOptional({ example: 'https://payment.pivota.com/redirect?ref=123' })
  redirectUrl?: string;

  @ApiPropertyOptional({ example: 'PAYMENT_REQUIRED' })
  status?: string;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}