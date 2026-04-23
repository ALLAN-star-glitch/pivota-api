import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ACCOUNT_TYPES, AccountType, AGENT_TYPES, AgentType, BUSINESS_TYPES, JOB_TYPES, JobType, KENYAN_PHONE_REGEX, LISTING_TYPES, OrganizationPurpose, PROFILE_TYPES, ProfileType, PROPERTY_TYPES, PropertyType, SEARCH_TYPES, SENIORITY_LEVELS, SeniorityLevel, SERVICE_PROVIDER_TYPES, ServiceProviderType, SUPPORT_NEEDS, SupportNeed } from '@pivota-api/constants';
import { Transform } from 'class-transformer';
import { 
  IsArray, 
  IsBoolean, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsEmail, 
  IsUUID, 
  MinLength,
  IsDateString,
  IsUrl,
  Length,
  Matches,
  ValidateIf,
  IsInt,
  Min,
  IsNumber,
  IsObject,
  Max,
  IsIn
} from 'class-validator';


/* ======================================================
   INDIVIDUAL PURPOSE TYPES (Matching UI Screen 6A)
====================================================== */

/* ======================================================
   INDIVIDUAL PURPOSE TYPES (Matching UI Screen 6A)
====================================================== */

export const INDIVIDUAL_PURPOSES = [
  'FIND_JOB',
  'OFFER_SKILLED_SERVICES',
  'WORK_AS_AGENT',
  'FIND_HOUSING',
  'GET_SOCIAL_SUPPORT',
  'HIRE_EMPLOYEES',
  'LIST_PROPERTIES',
  'JUST_EXPLORING'
] as const;
export type IndividualPurpose = typeof INDIVIDUAL_PURPOSES[number];



/* ======================================================
   HELPER FUNCTIONS
====================================================== */

/**
 * Map individual purpose to profile type
 */
export function mapIndividualPurposeToProfileType(purpose: IndividualPurpose): ProfileType | null {
  const purposeMap: Record<IndividualPurpose, ProfileType | null> = {
    'FIND_JOB': 'JOB_SEEKER',
    'OFFER_SKILLED_SERVICES': 'SKILLED_PROFESSIONAL',
    'WORK_AS_AGENT': 'INTERMEDIARY_AGENT',
    'FIND_HOUSING': 'HOUSING_SEEKER',
    'GET_SOCIAL_SUPPORT': 'SUPPORT_BENEFICIARY',
    'HIRE_EMPLOYEES': 'EMPLOYER',
    'LIST_PROPERTIES': 'PROPERTY_OWNER',
    'JUST_EXPLORING': null,
  };
  return purposeMap[purpose];
}

/**
 * Map organization purpose to profile type
 */
export function mapOrganizationPurposeToProfileType(purpose: OrganizationPurpose): ProfileType {
  const purposeMap: Record<OrganizationPurpose, ProfileType> = {
    'hire_employees': 'EMPLOYER',
    'list_properties': 'PROPERTY_OWNER',
    'offer_skilled_services': 'SKILLED_PROFESSIONAL',
    'provide_social_support': 'SOCIAL_SERVICE_PROVIDER',
    'act_as_agent': 'INTERMEDIARY_AGENT',
  };
  return purposeMap[purpose];
}

/* ======================================================
   BASE SCHEMA (Shared update properties)
====================================================== */

export abstract class BaseUpdateProfileDto {
  @ApiPropertyOptional({ 
    description: 'The first name of the user',
    example: 'Jane' 
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ 
    description: 'The last name of the user',
    example: 'Doe' 
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ 
    description: 'The primary email address',
    example: 'jane.doe@pivota.com' 
  })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== '')  
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Kenyan phone number in international or local format',
    example: '+254712345678' 
  })
  @IsOptional()
  @ValidateIf((o) => o.phone !== '' && o.phone !== null && o.phone !== undefined)
  @Matches(KENYAN_PHONE_REGEX, { 
    message: 'Please provide a valid Kenyan phone number' 
  })
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'A short professional or personal bio',
    example: 'Software Engineer based in Nairobi.' 
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ 
    description: 'The biological gender identity',
    example: 'FEMALE',
    enum: ['MALE', 'FEMALE', 'OTHER']
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ 
    description: 'Date of birth in ISO 8601 format',
    example: '1995-05-15' 
  })
  @IsOptional()
  @ValidateIf((o) => o.dateOfBirth && o.dateOfBirth.trim() !== '')
  @IsDateString({}, { 
    message: 'dateOfBirth must be a valid ISO 8601 date string' 
  })
  dateOfBirth?: string;

  @ApiPropertyOptional({ 
    description: 'Government-issued National ID or Passport number',
    example: '32145678' 
  })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ 
    description: 'Profile image URL',
    example: 'https://cdn.pivota.com/profiles/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  profileImage?: string;
}

/* ======================================================
   PROFILE-SPECIFIC DTOs
====================================================== */

export class JobSeekerProfileDataDto {
  @ApiPropertyOptional({ 
    description: 'Professional headline',
    example: 'Senior Full Stack Developer | 8 years experience'
  })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiProperty({ 
    description: 'Whether actively seeking opportunities',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActivelySeeking?: boolean;

  @ApiPropertyOptional({ 
    description: 'Skills',
    example: ['JavaScript', 'TypeScript', 'NestJS', 'React'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  skills?: string[];

  @ApiPropertyOptional({ 
    description: 'Industries interested in',
    example: ['FinTech', 'HealthTech', 'E-commerce'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  industries?: string[];

  @ApiPropertyOptional({ 
    description: 'Preferred job types',
    example: ['FULL_TIME', 'CONTRACT'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsIn(JOB_TYPES, { each: true })
  jobTypes?: JobType[];

  @ApiPropertyOptional({ 
    description: 'Seniority level',
    example: 'SENIOR'
  })
  @IsOptional()
  @IsIn(SENIORITY_LEVELS)
  seniorityLevel?: SeniorityLevel;

  @ApiPropertyOptional({ 
    description: 'Notice period',
    example: '1 month'
  })
  @IsOptional()
  @IsString()
  noticePeriod?: string;

  @ApiPropertyOptional({ 
    description: 'Expected minimum salary',
    example: 150000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional({ 
    description: 'Work authorization status',
    example: ['Citizen', 'Work Permit'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workAuthorization?: string[];

  @ApiPropertyOptional({ 
    description: 'CV document URL',
    example: 'https://storage.pivota.com/cvs/user-123.pdf'
  })
  @IsOptional()
  @IsUrl()
  cvUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Portfolio image URLs',
    example: ['https://storage.pivota.com/portfolio/img1.jpg'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  portfolioImages?: string[];

  @ApiPropertyOptional({ 
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/janedoe'
  })
  @IsOptional()
  @IsUrl()
  linkedInUrl?: string;

  @ApiPropertyOptional({ 
    description: 'GitHub profile URL',
    example: 'https://github.com/janedoe'
  })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Portfolio website URL',
    example: 'https://janedoe.dev'
  })
  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @ApiPropertyOptional({ 
    description: 'Whether working with an agent',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  hasAgent?: boolean;

  @ApiPropertyOptional({ 
    description: 'Agent UUID if represented',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  agentUuid?: string;
}

export class SkilledProfessionalProfileDataDto {
  @ApiPropertyOptional({ 
    description: 'Professional title',
    example: 'Master Electrician'
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Profession category',
    example: 'ELECTRICIAN'
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ 
    description: 'Specialties',
    example: ['Wiring', 'Solar Installation', 'Security Systems'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  specialties?: string[];

  @ApiPropertyOptional({ 
    description: 'Service areas',
    example: ['Nairobi', 'Kiambu', 'Machakos'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  serviceAreas?: string[];

  @ApiPropertyOptional({ 
    description: 'Years of experience',
    example: 8
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    description: 'Professional license number',
    example: 'EBK/1234/2020'
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Insurance information',
    example: 'Covered by APA Insurance, Policy #12345'
  })
  @IsOptional()
  @IsString()
  insuranceInfo?: string;

  @ApiPropertyOptional({ 
    description: 'Hourly rate in KES',
    example: 800
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ 
    description: 'Daily rate in KES',
    example: 5000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @ApiPropertyOptional({ 
    description: 'Payment terms',
    example: 'Hourly, Daily, Fixed'
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ 
    description: 'Available today for emergency',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  availableToday?: boolean;

  @ApiPropertyOptional({ 
    description: 'Available on weekends',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  availableWeekends?: boolean;

  @ApiPropertyOptional({ 
    description: 'Offers emergency service',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  emergencyService?: boolean;

  @ApiPropertyOptional({ 
    description: 'Portfolio image URLs',
    example: ['https://storage.pivota.com/portfolio/work1.jpg'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  portfolioImages?: string[];

  @ApiPropertyOptional({ 
    description: 'Certificate/document URLs',
    example: ['https://storage.pivota.com/certs/license.pdf'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  certifications?: string[];
}

export class HousingSeekerProfileDataDto {
  // NEW FIELDS FOR RENTAL VS PURCHASE
  @ApiPropertyOptional({ 
    description: 'Type of housing search',
    example: 'RENT',
    enum:  SEARCH_TYPES
  })
  @IsOptional()
  @IsString()
  @IsIn(SEARCH_TYPES)
  searchType?: string; // RENT, BUY, or BOTH

  @ApiPropertyOptional({ 
    description: 'Whether specifically looking for rental properties',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isLookingForRental?: boolean;

  @ApiPropertyOptional({ 
    description: 'Whether specifically looking to buy property',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isLookingToBuy?: boolean;

  // Existing fields below
  @ApiPropertyOptional({ 
    description: 'Minimum bedrooms',
    example: 1,
    default: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minBedrooms?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum bedrooms',
    example: 3,
    default: 5
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBedrooms?: number;

  @ApiPropertyOptional({ 
    description: 'Minimum budget in KES',
    example: 15000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBudget?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum budget in KES',
    example: 45000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional({ 
    description: 'Preferred property types',
    example: ['APARTMENT', 'HOUSE'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsIn(PROPERTY_TYPES, { each: true })
  preferredTypes?: PropertyType[];

  @ApiPropertyOptional({ 
    description: 'Preferred cities',
    example: ['Nairobi', 'Mombasa'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  preferredCities?: string[];

  @ApiPropertyOptional({ 
    description: 'Preferred neighborhoods',
    example: ['Kilimani', 'Lavington', 'Westlands'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  preferredNeighborhoods?: string[];

  @ApiPropertyOptional({ 
    description: 'Move-in date',
    example: '2024-06-01'
  })
  @IsOptional()
  @IsDateString()
  moveInDate?: string;

  @ApiPropertyOptional({ 
    description: 'Lease duration preference',
    example: '1_YEAR'
  })
  @IsOptional()
  @IsString()
  leaseDuration?: string;

  @ApiPropertyOptional({ 
    description: 'Household size',
    example: 4,
    default: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  householdSize?: number;

  @ApiPropertyOptional({ 
    description: 'Whether household has pets',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @ApiPropertyOptional({ 
    description: 'Pet details',
    example: 'One dog, two cats'
  })
  @IsOptional()
  @IsString()
  petDetails?: string;

  @ApiPropertyOptional({ 
    description: 'Latitude for location-based search',
    example: -1.286389
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Longitude for location-based search',
    example: 36.817223
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Search radius in kilometers',
    example: 10,
    default: 10
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  searchRadiusKm?: number;

  @ApiPropertyOptional({ 
    description: 'Whether working with an agent',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  hasAgent?: boolean;

  @ApiPropertyOptional({ 
    description: 'Agent UUID if represented',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  agentUuid?: string;
}

export class PropertyOwnerProfileDataDto {
  @ApiPropertyOptional({ 
    description: 'Whether a licensed professional',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isProfessional?: boolean;

  // NEW FIELDS FOR RENTAL VS SALE LISTINGS
  @ApiPropertyOptional({ 
    description: 'Type of property listings',
    example: 'RENT',
    enum: LISTING_TYPES
  })
  @IsOptional()
  @IsString()
  @IsIn(LISTING_TYPES)
  listingType?: string;

  @ApiPropertyOptional({ 
    description: 'Whether listing properties for rent',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isListingForRent?: boolean;

  @ApiPropertyOptional({ 
    description: 'Whether listing properties for sale',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isListingForSale?: boolean;

  // For ORGANIZATION accounts: required if isProfessional is true
  @ApiPropertyOptional({ 
    description: 'Professional license number (required for organizations if isProfessional is true)',
    example: 'ERB/5678/2021'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION' && o.isProfessional === true)
  @IsNotEmpty({ message: 'License number is required for professional organizations' })
  @IsString()
  licenseNumber?: string;

  // For ORGANIZATION accounts: required if they are professional
  @ApiPropertyOptional({ 
    description: 'Property management company name (required for organizations)',
    example: 'Prime Properties Ltd'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION')
  @IsNotEmpty({ message: 'Company name is required for organizations' })
  @IsString()
  companyName?: string;

  // For ORGANIZATION accounts: required
  @ApiPropertyOptional({ 
    description: 'Years in business (required for organizations)',
    example: 5
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION')
  @IsNotEmpty({ message: 'Years in business is required for organizations' })
  @IsInt()
  @Min(0)
  yearsInBusiness?: number;

  @ApiPropertyOptional({ 
    description: 'Preferred property types to list',
    example: ['APARTMENT', 'HOUSE', 'COMMERCIAL'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsIn(PROPERTY_TYPES, { each: true })
  preferredPropertyTypes?: PropertyType[];

  @ApiPropertyOptional({ 
    description: 'Service areas',
    example: ['Nairobi', 'Kiambu'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  serviceAreas?: string[];

  @ApiPropertyOptional({ 
    description: 'Whether using an agent to manage properties',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  usesAgent?: boolean;

  @ApiPropertyOptional({ 
    description: 'Managing agent UUID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ValidateIf((o) => o.usesAgent === true)
  @IsNotEmpty({ message: 'Managing agent UUID is required when using an agent' })
  @IsUUID()
  managingAgentUuid?: string;

  // --- Fields for INDIVIDUAL accounts ---
  @ApiPropertyOptional({ 
    description: 'Number of properties owned (recommended for individuals)',
    example: 3,
    minimum: 0
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsInt()
  @Min(0)
  propertyCount?: number;

  @ApiPropertyOptional({ 
    description: 'Property types owned (recommended for individuals)',
    example: ['APARTMENT', 'HOUSE'],
    type: [String]
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyTypes?: string[];

  @ApiPropertyOptional({ 
    description: 'Whether this is primary residence or investment',
    example: 'INVESTMENT',
    enum: ['PRIMARY', 'INVESTMENT', 'BOTH']
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsString()
  propertyPurpose?: string;
}

export class SupportBeneficiaryProfileDataDto {
  @ApiPropertyOptional({ 
    description: 'Needs',
    example: ['FOOD', 'SHELTER', 'MEDICAL'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsIn(SUPPORT_NEEDS, { each: true })
  needs?: SupportNeed[];

  @ApiPropertyOptional({ 
    description: 'Urgent needs',
    example: ['FOOD'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsIn(SUPPORT_NEEDS, { each: true })
  urgentNeeds?: SupportNeed[];

  @ApiPropertyOptional({ 
    description: 'Family size',
    example: 4
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  familySize?: number;

  @ApiPropertyOptional({ 
    description: 'Number of dependents',
    example: 3
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  dependents?: number;

  @ApiPropertyOptional({ 
    description: 'Household composition',
    example: 'Single mother with 3 children'
  })
  @IsOptional()
  @IsString()
  householdComposition?: string;

  @ApiPropertyOptional({ 
    description: 'Vulnerability factors',
    example: ['SINGLE_PARENT', 'UNEMPLOYED'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vulnerabilityFactors?: string[];

  @ApiPropertyOptional({ 
    description: 'City',
    example: 'Nairobi'
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Neighborhood',
    example: 'Kawangware'
  })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ 
    description: 'Latitude',
    example: -1.286389
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Longitude',
    example: 36.817223
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Landmark for easy identification',
    example: 'Near the chief\'s office'
  })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ 
    description: 'Prefer to remain anonymous',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  prefersAnonymity?: boolean;

  @ApiPropertyOptional({ 
    description: 'Language preferences',
    example: ['ENGLISH', 'SWAHILI'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagePreference?: string[];

  @ApiPropertyOptional({ 
    description: 'Consent to share data with partners',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  consentToShare?: boolean;

  @ApiPropertyOptional({ 
    description: 'Who referred this person',
    example: 'St. John\'s Church'
  })
  @IsOptional()
  @IsString()
  referredBy?: string;

  @ApiPropertyOptional({ 
    description: 'Referring organization UUID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  referredByUuid?: string;

  @ApiPropertyOptional({ 
    description: 'Assigned case worker UUID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  caseWorkerUuid?: string;
}

export class SocialServiceProviderProfileDataDto {
  @ApiProperty({ 
    description: 'Provider type',
    example: 'NGO',
    enum: SERVICE_PROVIDER_TYPES
  })
  @IsIn(SERVICE_PROVIDER_TYPES)
  @IsNotEmpty()
  providerType!: ServiceProviderType;

  @ApiPropertyOptional({ 
    description: 'Services offered',
    example: ['FOOD_AID', 'CASH_GRANTS', 'COUNSELING'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  servicesOffered?: string[];

  @ApiPropertyOptional({ 
    description: 'Target beneficiaries',
    example: ['YOUTH', 'WOMEN', 'DISABLED'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  targetBeneficiaries?: string[];

  @ApiPropertyOptional({ 
    description: 'Service areas',
    example: ['Nairobi', 'Kibera', 'Mathare'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  serviceAreas?: string[];

  // For ORGANIZATION accounts: required if providerType is not 'INDIVIDUAL'
  @ApiPropertyOptional({ 
    description: 'About the organization (required for organizations)',
    example: 'We provide food and shelter to street families'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION' && o.providerType !== 'INDIVIDUAL')
  @IsNotEmpty({ message: 'About section is required for organizations' })
  @IsString()
  about?: string;

  @ApiPropertyOptional({ 
    description: 'Website URL',
    example: 'https://example-ngo.org'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION' && o.providerType !== 'INDIVIDUAL')
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Contact email',
    example: 'info@example-ngo.org'
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Contact phone',
    example: '+254712345678'
  })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  contactPhone?: string;

  // For ORGANIZATION accounts: required if providerType is not 'INDIVIDUAL'
  @ApiPropertyOptional({ 
    description: 'Office hours (required for organizations)',
    example: 'Mon-Fri 9am-5pm'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION' && o.providerType !== 'INDIVIDUAL')
  @IsNotEmpty({ message: 'Office hours are required for organizations' })
  @IsString()
  officeHours?: string;

  @ApiPropertyOptional({ 
    description: 'Physical address',
    example: '123 Kenyatta Ave, Nairobi'
  })
  @IsOptional()
  @IsString()
  physicalAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Number of people served',
    example: 5000
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  peopleServed?: number;

  // For ORGANIZATION accounts: required if providerType is not 'INDIVIDUAL'
  @ApiPropertyOptional({ 
    description: 'Year established (required for organizations)',
    example: 2010
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION' && o.providerType !== 'INDIVIDUAL')
  @IsNotEmpty({ message: 'Year established is required for organizations' })
  @IsInt()
  @Min(1800)
  yearEstablished?: number;

  @ApiPropertyOptional({ 
    description: 'Accepts donations',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  acceptsDonations?: boolean;

  @ApiPropertyOptional({ 
    description: 'Needs volunteers',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  needsVolunteers?: boolean;

  @ApiPropertyOptional({ 
    description: 'Donation information',
    example: 'Paybill 123456, Account 789012'
  })
  @ValidateIf((o) => o.acceptsDonations === true)
  @IsNotEmpty({ message: 'Donation info is required when accepting donations' })
  @IsString()
  donationInfo?: string;

  @ApiPropertyOptional({ 
    description: 'Volunteer needs description',
    example: 'We need cooks and servers on weekends'
  })
  @ValidateIf((o) => o.needsVolunteers === true)
  @IsNotEmpty({ message: 'Volunteer needs description is required when needing volunteers' })
  @IsString()
  volunteerNeeds?: string;

  // --- Fields for INDIVIDUAL accounts ---
  @ApiPropertyOptional({ 
    description: 'Operating name (for individuals)',
    example: 'Jane\'s Counseling Services'
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsString()
  operatingName?: string;

  @ApiPropertyOptional({ 
    description: 'Years of experience (for individuals)',
    example: 5,
    minimum: 0
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    description: 'Qualifications or certifications (for individuals)',
    example: ['Certified Counselor', 'Social Work Degree'],
    type: [String]
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifications?: string[];

  @ApiPropertyOptional({ 
    description: 'Availability schedule (for individuals)',
    example: 'Weekends only, 2pm-6pm'
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsString()
  availability?: string;
}

export class IntermediaryAgentProfileDataDto {
  @ApiProperty({ 
    description: 'Agent type',
    example: 'HOUSING_AGENT'
  })
  @IsIn(AGENT_TYPES)
  @IsNotEmpty()
  agentType!: AgentType;

  @ApiPropertyOptional({ 
    description: 'Specializations',
    example: ['RESIDENTIAL', 'COMMERCIAL', 'LUXURY'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  specializations?: string[];

  @ApiPropertyOptional({ 
    description: 'Service areas',
    example: ['Nairobi', 'Kiambu', 'Mombasa'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  serviceAreas?: string[];

  @ApiPropertyOptional({ 
    description: 'License number',
    example: 'ERB/5678/2021'
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Licensing body',
    example: 'Estate Agents Registration Board'
  })
  @IsOptional()
  @IsString()
  licenseBody?: string;

  @ApiPropertyOptional({ 
    description: 'Years of experience',
    example: 5
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    description: 'Agency name',
    example: 'Prime Properties Agency'
  })
  @IsOptional()
  @IsString()
  agencyName?: string;

  @ApiPropertyOptional({ 
    description: 'Agency UUID if part of an organization',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  agencyUuid?: string;

  @ApiPropertyOptional({ 
    description: 'Commission rate (percentage)',
    example: 5.0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ 
    description: 'Fee structure',
    example: 'PERCENTAGE'
  })
  @IsOptional()
  @IsString()
  feeStructure?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum fee in KES',
    example: 5000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFee?: number;

  @ApiPropertyOptional({ 
    description: 'Typical fee description',
    example: '5% of first month\'s rent'
  })
  @IsOptional()
  @IsString()
  typicalFee?: string;

  @ApiPropertyOptional({ 
    description: 'About the agent',
    example: 'Specializing in luxury apartments in Nairobi'
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ 
    description: 'Profile image URL',
    example: 'https://cdn.pivota.com/agents/photo.jpg'
  })
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({ 
    description: 'Contact email',
    example: 'agent@example.com'
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Contact phone',
    example: '+254712345678'
  })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  contactPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Website URL',
    example: 'https://agentwebsite.com'
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Social media links',
    example: { linkedin: 'https://linkedin.com/in/agent', twitter: 'https://twitter.com/agent' }
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ 
    description: 'Types of clients represented',
    example: ['LANDLORDS', 'TENANTS', 'EMPLOYERS'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clientTypes?: string[];
}

export class EmployerProfileDataDto {
  // For ORGANIZATION accounts: required
  @ApiPropertyOptional({ 
    description: 'Company name (required for organizations)',
    example: 'Tech Corp Ltd'
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION')
  @IsNotEmpty({ message: 'Company name is required for organizations' })
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ 
    description: 'Industry sector',
    example: 'Technology'
  })
  @IsOptional()
  @IsString()
  industry?: string;

  // For ORGANIZATION accounts: required
  @ApiPropertyOptional({ 
    description: 'Company size (required for organizations)',
    example: '51-200',
    enum: ['Sole Proprietor', '1-10', '11-50', '51-200', '200+']
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION')
  @IsNotEmpty({ message: 'Company size is required for organizations' })
  @IsString()
  companySize?: string;

  // For ORGANIZATION accounts: required
  @ApiPropertyOptional({ 
    description: 'Year founded (required for organizations)',
    example: 2020
  })
  @ValidateIf((o) => o.accountType === 'ORGANIZATION')
  @IsNotEmpty({ message: 'Year founded is required for organizations' })
  @IsInt()
  @Min(1900)
  foundedYear?: number;

  @ApiPropertyOptional({ 
    description: 'Company description or services offered',
    example: 'Leading tech company in East Africa'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Logo URL (company logo or personal avatar)',
    example: 'https://cdn.pivota.com/logos/techcorp.png'
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({ 
    description: 'Skills typically hired for',
    example: ['JavaScript', 'Python', 'Project Management'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  preferredSkills?: string[];

  @ApiPropertyOptional({ 
    description: 'Work policy (remote, hybrid, onsite)',
    example: 'HYBRID',
    enum: ['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE']
  })
  @IsOptional()
  @IsString()
  remotePolicy?: string;

  @ApiPropertyOptional({ 
    description: 'Whether working with recruitment agents',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  worksWithAgents?: boolean;

  @ApiPropertyOptional({ 
    description: 'Preferred agent UUIDs',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String]
  })
  @ValidateIf((o) => o.worksWithAgents === true)
  @IsArray()
  @IsUUID('4', { each: true })
  preferredAgents?: string[];

  // --- Fields for INDIVIDUAL accounts ---
  @ApiPropertyOptional({ 
    description: 'Business name (for individuals)',
    example: 'John\'s Freelance Services'
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ 
    description: 'Whether this is a registered business (for individuals)',
    example: false,
    default: false
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsBoolean()
  isRegistered?: boolean;

  @ApiPropertyOptional({ 
    description: 'Years of experience (for individuals)',
    example: 8,
    minimum: 0
  })
  @ValidateIf((o) => o.accountType === 'INDIVIDUAL')
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;
}

/* ======================================================
   PUBLIC GATEWAY DTOs (Own vs Admin)
====================================================== */

export class UpdateOwnProfileRequestDto extends BaseUpdateProfileDto {}

export class UpdateAdminProfileRequestDto extends BaseUpdateProfileDto {
  @ApiProperty({ 
    description: 'The unique system identifier (UUID) of the user to update',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string;
}

/* ======================================================
   INTERNAL / gRPC DTOs
====================================================== */

export class UpdateFullUserProfileDto extends BaseUpdateProfileDto {
  @ApiProperty({ 
    description: 'The unique system identifier (UUID) of the target user',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string;

  @ApiPropertyOptional({
    description: 'The public URL for the uploaded profile avatar generated by the gateway',
    example: 'https://cdn.pivota.com/profiles/u123/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  override profileImage?: string;

  @ApiPropertyOptional({
    description: 'The old profile image URL to delete',
    example: 'https://cdn.pivota.com/profiles/u123/old-avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  oldImageUrl?: string;  

  // NEW FIELDS
  @ApiPropertyOptional({ description: 'Whether the account operates as a business' })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @ApiPropertyOptional({ description: 'Type of business', enum: BUSINESS_TYPES })
  @IsOptional()
  @IsIn(BUSINESS_TYPES)
  businessType?: string;

  @ApiPropertyOptional({ description: 'Business name for sole proprietors' })
  @IsOptional()
  @IsString()
  businessName?: string;

   @ApiPropertyOptional({ description: 'Business logo URL' })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({ description: 'Cover photo URL' })
  @IsOptional()
  @IsUrl()
  coverPhoto?: string;

  @ApiPropertyOptional({ description: 'Whether the individual operates as a business' })
  @IsOptional()
  @IsBoolean()
  operatesAsBusiness?: boolean;
}

/* ======================================================
   MAIN ONBOARDING DTOs (Updated for UI Flow)
====================================================== */

export class ProfileToCreateDto {
  @ApiProperty({ 
    description: 'Type of profile to create',
    enum: PROFILE_TYPES,
    example: 'JOB_SEEKER'
  })
  @IsIn(PROFILE_TYPES)
  @IsNotEmpty()
  type!: ProfileType;

  @ApiProperty({ 
    description: 'Profile data based on type',
    example: { headline: 'Software Developer', skills: ['JavaScript'] }
  })
  @IsObject()
  @IsNotEmpty()
  data!: unknown;
}

export class CreateAccountWithProfilesRequestDto {
  @ApiProperty({ enum: ACCOUNT_TYPES })
  @IsIn(ACCOUNT_TYPES)
  @IsNotEmpty()
  accountType!: AccountType;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planSlug?: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otpCode!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({ 
    description: 'Whether this account operates as a business',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @ApiPropertyOptional({ 
    description: 'Type of business',
    enum: BUSINESS_TYPES,
    example: 'FOR_PROFIT'
  })
  @ValidateIf((o) => o.isBusiness === true)
  @IsIn(BUSINESS_TYPES)
  businessType?: string;

  @ApiPropertyOptional({ 
    description: 'Business name (for sole proprietors/freelancers)',
    example: 'John\'s Plumbing Services'
  })
  @ValidateIf((o) => o.isBusiness === true)
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ 
    description: 'Business logo URL',
    example: 'https://cdn.pivota.com/logos/john-plumbing.jpg'
  })
  @ValidateIf((o) => o.isBusiness === true)
  @IsOptional()
  @IsUrl()
  logo?: string;

    @ApiPropertyOptional({ description: 'Cover photo URL' })
  @IsOptional()
  @IsUrl()
  coverPhoto?: string;

  @ApiPropertyOptional({ enum: INDIVIDUAL_PURPOSES })
  @IsOptional()
  @IsIn(INDIVIDUAL_PURPOSES)
  primaryPurpose?: IndividualPurpose;

  // ========== THESE ARE THE ONEOF FIELDS ==========
  // Only one of these will be present based on primaryPurpose
  
  @ApiPropertyOptional({ type: JobSeekerProfileDataDto })
  @IsOptional()
  @IsObject()
  jobSeekerData?: JobSeekerProfileDataDto;

  @ApiPropertyOptional({ type: SkilledProfessionalProfileDataDto })
  @IsOptional()
  @IsObject()
  skilledProfessionalData?: SkilledProfessionalProfileDataDto;

  @ApiPropertyOptional({ type: IntermediaryAgentProfileDataDto })
  @IsOptional()
  @IsObject()
  intermediaryAgentData?: IntermediaryAgentProfileDataDto;

  @ApiPropertyOptional({ type: HousingSeekerProfileDataDto })
  @IsOptional()
  @IsObject()
  housingSeekerData?: HousingSeekerProfileDataDto;

  @ApiPropertyOptional({ type: SupportBeneficiaryProfileDataDto })
  @IsOptional()
  @IsObject()
  supportBeneficiaryData?: SupportBeneficiaryProfileDataDto;

  @ApiPropertyOptional({ type: EmployerProfileDataDto })
  @IsOptional()
  @IsObject()
  employerData?: EmployerProfileDataDto;

  @ApiPropertyOptional({ type: PropertyOwnerProfileDataDto })
  @IsOptional()
  @IsObject()
  propertyOwnerData?: PropertyOwnerProfileDataDto;

  // Keep for backward compatibility
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profiles?: ProfileToCreateDto[];

  skipEventEmission?: boolean;  // When true, Profile Service won't emit account.created event
}

/* ======================================================
   INDIVIDUAL PROFILE UPDATE DTOs
====================================================== */

export class UpdateJobSeekerProfileRequestDto extends JobSeekerProfileDataDto {
  @ApiPropertyOptional({ 
    description: 'CV document URL',
    example: 'https://storage.pivota.com/cvs/user-123.pdf'
  })
  @IsOptional()
  @IsUrl()
  override cvUrl?: string;
}

export class UpdateSkilledProfessionalProfileRequestDto extends SkilledProfessionalProfileDataDto {}

export class UpdateHousingSeekerProfileRequestDto extends HousingSeekerProfileDataDto {}

export class UpdatePropertyOwnerProfileRequestDto extends PropertyOwnerProfileDataDto {}

export class UpdateSupportBeneficiaryProfileRequestDto extends SupportBeneficiaryProfileDataDto {}

export class UpdateSocialServiceProviderProfileRequestDto extends SocialServiceProviderProfileDataDto {}

export class UpdateIntermediaryAgentProfileRequestDto extends IntermediaryAgentProfileDataDto {}



/* ======================================================
   gRPC VERSIONS (with user/account UUID)
====================================================== */

export class UpdateJobSeekerGrpcRequestDto extends UpdateJobSeekerProfileRequestDto {
  @ApiProperty({ description: 'Target user UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateSkilledProfessionalGrpcRequestDto extends UpdateSkilledProfessionalProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateHousingSeekerGrpcRequestDto extends UpdateHousingSeekerProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdatePropertyOwnerGrpcRequestDto extends UpdatePropertyOwnerProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateSupportBeneficiaryGrpcRequestDto extends UpdateSupportBeneficiaryProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateSocialServiceProviderGrpcRequestDto extends UpdateSocialServiceProviderProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateIntermediaryAgentGrpcRequestDto extends UpdateIntermediaryAgentProfileRequestDto {
  @ApiProperty({ description: 'Target account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

/* ======================================================
   DEPRECATED - Keep for backward compatibility
====================================================== */
export class UserSignupRequestDto {
  @ApiProperty({ description: 'Legal first name', example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Legal last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ description: 'Unique email address for login', example: 'jane.doe@pivota.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Valid Kenyan mobile number', example: '0712345678' })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  phone?: string;

 @ApiProperty({
    example: 'SecurePass123!',
    description: 'The password for the account. Must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])/, { 
    message: 'Password must contain at least one lowercase letter (a-z)' 
  })
  @Matches(/^(?=.*[A-Z])/, { 
    message: 'Password must contain at least one uppercase letter (A-Z)' 
  })
  @Matches(/^(?=.*\d)/, {  
    message: 'Password must contain at least one number (0-9)' 
  })
  @Matches(/^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, { 
    message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};:\'",.<>/?|)' 
  })
  @Matches(/^[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/, {
    message: 'Password contains invalid characters'
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Subscription plan slug', example: 'free-forever' })
  @IsString()
  @IsOptional()
  planSlug?: string;

  @ApiProperty({ description: '6-digit OTP code', example: '123456' })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ 
    description: 'Profile image URL',
    example: 'https://cdn.pivota.com/profiles/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({ 
    description: 'Primary purpose for using the platform',
    enum: INDIVIDUAL_PURPOSES,
    example: 'FIND_JOB'
  })
  @IsOptional()
  @IsIn(INDIVIDUAL_PURPOSES)
  primaryPurpose?: IndividualPurpose;

  // ========== ONEOF FIELDS - Only one will be present based on primaryPurpose ==========
  
  @ApiPropertyOptional({ 
    description: 'Job seeker profile data (when primaryPurpose is FIND_JOB)',
    type: JobSeekerProfileDataDto
  })
  @IsOptional()
  @IsObject()
  jobSeekerData?: JobSeekerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Skilled professional profile data (when primaryPurpose is OFFER_SKILLED_SERVICES)',
    type: SkilledProfessionalProfileDataDto
  })
  @IsOptional()
  @IsObject()
  skilledProfessionalData?: SkilledProfessionalProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Intermediary agent profile data (when primaryPurpose is WORK_AS_AGENT)',
    type: IntermediaryAgentProfileDataDto
  })
  @IsOptional()
  @IsObject()
  intermediaryAgentData?: IntermediaryAgentProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Housing seeker profile data (when primaryPurpose is FIND_HOUSING)',
    type: HousingSeekerProfileDataDto
  })
  @IsOptional()
  @IsObject()
  housingSeekerData?: HousingSeekerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Support beneficiary profile data (when primaryPurpose is GET_SOCIAL_SUPPORT)',
    type: SupportBeneficiaryProfileDataDto
  })
  @IsOptional()
  @IsObject()
  supportBeneficiaryData?: SupportBeneficiaryProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Employer profile data (when primaryPurpose is HIRE_EMPLOYEES)',
    type: EmployerProfileDataDto
  })
  @IsOptional()
  @IsObject()
  employerData?: EmployerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Property owner profile data (when primaryPurpose is LIST_PROPERTIES)',
    type: PropertyOwnerProfileDataDto
  })
  @IsOptional()
  @IsObject()
  propertyOwnerData?: PropertyOwnerProfileDataDto;

  // Deprecated - kept for backward compatibility but will be removed
  /**
   * @deprecated Use the specific oneof fields instead (jobSeekerData, skilledProfessionalData, etc.)
   */
  @ApiPropertyOptional({ 
    description: 'Profile data based on primary purpose (deprecated - use specific fields)',
    example: { headline: 'Software Developer', skills: ['JavaScript'] }
  })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
}

/**
 * @deprecated Use CreateAccountWithProfilesRequestDto instead
 */
export class CreateUserRequestDto {
  @ApiProperty({ description: 'UUID from Auth Service' })
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@pivota.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  phone?: string;

  @ApiProperty({ example: 'free-forever' })
  @IsString()
  @IsNotEmpty()
  planSlug!: string;

  @ApiPropertyOptional({ 
    description: 'Profile image URL',
    example: 'https://cdn.pivota.com/profiles/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({ 
    description: 'Primary purpose for using the platform',
    enum: INDIVIDUAL_PURPOSES,
    example: 'FIND_JOB'
  })
  @IsOptional()
  @IsIn(INDIVIDUAL_PURPOSES)
  primaryPurpose?: IndividualPurpose;

  @ApiPropertyOptional({ 
    description: 'Profile data based on primary purpose',
    example: { headline: 'Software Developer', skills: ['JavaScript'] }
  })
  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
}

/**
 * @deprecated Use UpdateSkilledProfessionalGrpcRequestDto instead
 */
export class OnboardProviderGrpcRequestDto {
  @ApiProperty({ 
    description: 'Professional specialties',
    example: ['Plumbing', 'Electrical'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  specialties!: string[];

  @ApiProperty({ 
    description: 'Areas served',
    example: ['Nairobi West', 'Langata'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  serviceAreas!: string[];

  @ApiProperty({ description: 'Years of professional experience', example: 5 })
  @IsInt()
  @Min(0)
  yearsExperience!: number;

  @ApiProperty({ description: 'Target user UUID' })
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string;
}

/**
 * @deprecated Use UpdateJobSeekerProfileRequestDto instead
 */
export class UpdateJobSeekerRequestDto {
  @ApiPropertyOptional({ 
    description: 'Professional headline',
    example: 'Senior Full Stack Developer' 
  })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiProperty({ 
    description: 'Whether actively seeking opportunities',
    example: true 
  })
  @IsNotEmpty()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActivelySeeking!: boolean;

  @ApiPropertyOptional({ 
    description: 'Skills',
    example: ['Node.js', 'PostgreSQL'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ 
    description: 'Industries',
    example: ['FinTech', 'Real Estate'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({ 
    description: 'Seniority level',
    example: 'SENIOR'
  })
  @IsOptional()
  @IsIn(SENIORITY_LEVELS)
  seniorityLevel?: SeniorityLevel;

  @ApiPropertyOptional({ 
    description: 'Preferred job types',
    example: ['FULL_TIME', 'CONTRACT'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim());
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  jobTypes?: string[];
}