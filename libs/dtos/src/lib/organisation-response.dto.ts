import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileCompletionDto } from './user-response.dto';
import { ACCOUNT_TYPES, AccountType, AGENT_TYPES, AgentType, ORGANIZATION_TYPES, OrganizationType, ProfileType, PropertyType, SERVICE_PROVIDER_TYPES, ServiceProviderType } from '@pivota-api/constants';

/* ======================================================
   SHARED BASE DTOs (PUBLIC-SAFE)
====================================================== */

/* ------------------ Account Base ------------------ */
export class AccountBaseDto {
  @ApiProperty({
    description: 'Global unique identifier for the billing account',
    example: 'acc-uuid-001',
  })
  uuid!: string;

  @ApiProperty({
    description: 'Generated billing code for the account',
    example: 'ACC-ORG-PIVOTA-7A2',
  })
  accountCode!: string;

  @ApiProperty({
    description: 'Type of account entity',
    enum: ACCOUNT_TYPES,
    example: 'ORGANIZATION',
  })
  type!: AccountType;
}

/* ------------------ Organization Base ------------------ */
export class OrganizationBaseDto {
  @ApiProperty({ description: 'Id of the organisation', example: 'org_123456' })
  id!: string;

  @ApiProperty({
    description: 'Global unique identifier for the organization',
    example: 'org-uuid-123',
  })
  uuid!: string;

  @ApiProperty({
    description: 'Registered business name',
    example: 'Pivota Tech Solutions',
  })
  name!: string;

  @ApiProperty({
    description: 'Official organization code',
    example: 'ORG-ABC12345',
  })
  orgCode!: string;

  @ApiProperty({
    description: 'Verification status of the organization',
    example: 'PENDING',
  })
  verificationStatus!: string;

  @ApiPropertyOptional({ 
    description: 'Organization type',
    enum: ORGANIZATION_TYPES,
    example: 'COMPANY' 
  })
  type?: OrganizationType;

  @ApiPropertyOptional({ 
    description: 'Official email address',
    example: 'info@pivotatech.co.ke' 
  })
  officialEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Official phone number',
    example: '+254712345678' 
  })
  officialPhone?: string;

  @ApiPropertyOptional({ 
    description: 'Physical address',
    example: 'Waiyaki Way, Nairobi, Kenya' 
  })
  physicalAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Organization website',
    example: 'https://pivotatech.co.ke' 
  })
  website?: string;

  @ApiPropertyOptional({ 
    description: 'About the organization',
    example: 'Leading tech company in East Africa' 
  })
  about?: string;

  @ApiPropertyOptional({ 
    description: 'Organization logo URL',
    example: 'https://cdn.pivota.com/logos/techcorp.png' 
  })
  logo?: string;

  // Add these missing fields
  @ApiPropertyOptional({ 
    description: 'Government-issued business registration number',
    example: 'PVT-REG-001' 
  })
  registrationNo?: string;

  @ApiPropertyOptional({ 
    description: 'Kenya Revenue Authority Personal Identification Number (KRA PIN)',
    example: 'P051234567X' 
  })
  kraPin?: string;
}

/* ======================================================
   ADMIN USER RESPONSE (PUBLIC-SAFE)
====================================================== */

export class OrganizationAdminResponseDto {
  @ApiProperty({
    description: 'UUID of the admin user',
    example: 'auth-uuid-999-master-admin',
  })
  uuid!: string;

  @ApiProperty({
    description: 'Custom user identifier code',
    example: 'USR-XYZ987',
  })
  userCode!: string;

  @ApiProperty({
    description: 'Email address used for admin login',
    example: 'admin@pivotatech.co.ke',
  })
  email!: string;

  @ApiProperty({
    description: 'Admin personal phone number',
    example: '+254711222333',
  })
  phone!: string;

  @ApiProperty({ description: 'Admin first name', example: 'John' })
  firstName!: string;

  @ApiProperty({ description: 'Admin last name', example: 'Doe' })
  lastName!: string;

  @ApiProperty({
    description: 'Primary role assigned to this admin',
    example: 'BusinessSystemAdmin',
  })
  roleName!: string;
}

/* ======================================================
   ORGANIZATION PROFILE RESPONSE (FULL)
====================================================== */

export class 
OrganizationProfileResponseDto extends OrganizationBaseDto {
  @ApiProperty({ type: AccountBaseDto })
  account!: AccountBaseDto;

  @ApiProperty({ type: OrganizationAdminResponseDto })
  admin!: OrganizationAdminResponseDto;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;

  @ApiProperty({ example: '2026-01-05T12:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-05T15:30:00Z' })
  updatedAt!: Date;
}

/* ======================================================
   ORGANIZATION SIGNUP DATA DTO
====================================================== */

export class OrganizationSignupDataDto {
  @ApiProperty({ type: OrganizationBaseDto })
  organization!: OrganizationBaseDto;

  @ApiProperty({ type: OrganizationAdminResponseDto })
  admin!: OrganizationAdminResponseDto;

  @ApiProperty({ type: AccountBaseDto })
  account!: AccountBaseDto;
}

/* ======================================================
   ORGANIZATION PROFILE TYPES RESPONSE DTOs
====================================================== */

/**
 * Employer Profile Response DTO
 */
export class EmployerProfileResponseDto {
  @ApiProperty({ example: 'employer_123abc' })
  id!: string;

  @ApiPropertyOptional({ example: 'Tech Corp Ltd' })
  companyName?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  industry?: string;

  @ApiPropertyOptional({ example: '51-200' })
  companySize?: string;

  @ApiPropertyOptional({ example: 2015 })
  foundedYear?: number;

  @ApiPropertyOptional({ example: 'Leading fintech company in East Africa' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/logos/techcorp.png' })
  logo?: string;

  @ApiProperty({ example: ['JavaScript', 'Python', 'Project Management'] })
  preferredSkills!: string[];

  @ApiPropertyOptional({ example: 'HYBRID' })
  remotePolicy?: string;

  @ApiProperty({ example: false })
  isVerifiedEmployer!: boolean;

  @ApiProperty({ example: false })
  worksWithAgents!: boolean;

  @ApiProperty({ example: ['550e8400-e29b-41d4-a716-446655440000'] })
  preferredAgents!: string[];

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/**
 * Social Service Provider Profile Response DTO
 */
export class SocialServiceProviderProfileResponseDto {
  @ApiProperty({ example: 'socserv_123abc' })
  id!: string;

  @ApiProperty({ 
    enum: SERVICE_PROVIDER_TYPES,
    example: 'NGO' 
  })
  providerType!: ServiceProviderType;

  @ApiProperty({ example: ['FOOD_AID', 'CASH_GRANTS', 'COUNSELING'] })
  servicesOffered!: string[];

  @ApiProperty({ example: ['YOUTH', 'WOMEN', 'DISABLED'] })
  targetBeneficiaries!: string[];

  @ApiProperty({ example: ['Nairobi', 'Kibera', 'Mathare'] })
  serviceAreas!: string[];

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiPropertyOptional({ example: 'NGOS_BOARD' })
  verifiedBy?: string;

  @ApiPropertyOptional({ example: 'https://storage.pivota.com/verification/ngo-cert.pdf' })
  verificationDocument?: string;

  @ApiPropertyOptional({ example: 'We provide food and shelter to street families' })
  about?: string;

  @ApiPropertyOptional({ example: 'https://example-ngo.org' })
  website?: string;

  @ApiPropertyOptional({ example: 'info@example-ngo.org' })
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+254712345678' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Mon-Fri 9am-5pm' })
  officeHours?: string;

  @ApiPropertyOptional({ example: '123 Kenyatta Ave, Nairobi' })
  physicalAddress?: string;

  @ApiPropertyOptional({ example: 5000 })
  peopleServed?: number;

  @ApiPropertyOptional({ example: 2010 })
  yearEstablished?: number;

  @ApiProperty({ example: true })
  acceptsDonations!: boolean;

  @ApiProperty({ example: true })
  needsVolunteers!: boolean;

  @ApiPropertyOptional({ example: 'Paybill 123456, Account 789012' })
  donationInfo?: string;

  @ApiPropertyOptional({ example: 'We need cooks and servers on weekends' })
  volunteerNeeds?: string;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/**
 * Organization Property Owner Profile Response DTO
 */
export class OrganizationPropertyOwnerProfileResponseDto {
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

  @ApiProperty({ example: ['APARTMENT', 'HOUSE', 'COMMERCIAL'] })
  preferredPropertyTypes!: PropertyType[];

  @ApiProperty({ example: ['Nairobi', 'Kiambu'] })
  serviceAreas!: string[];

  @ApiProperty({ example: false })
  isVerifiedOwner!: boolean;

  @ApiProperty({ example: false })
  usesAgent!: boolean;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  managingAgentUuid?: string;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/**
 * Organization Skilled Professional Profile Response DTO
 */
export class OrganizationSkilledProfessionalProfileResponseDto {
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

/**
 * Organization Intermediary Agent Profile Response DTO
 */
export class OrganizationIntermediaryAgentProfileResponseDto {
  @ApiProperty({ example: 'agent_123abc' })
  id!: string;

  @ApiProperty({ example: 'agent-123-abc' })
  uuid!: string;

  @ApiProperty({ 
    enum: AGENT_TYPES,
    example: 'HOUSING_AGENT' 
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
   COMPLETE ORGANIZATION ACCOUNT RESPONSE DTO
====================================================== */

export class OrganizationAccountResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  uuid!: string;

  @ApiProperty({ example: 'ACC-ABC123' })
  accountCode!: string;

  @ApiPropertyOptional({ example: 'Tech Corp Ltd' })
  name?: string;

  @ApiProperty({ enum: ACCOUNT_TYPES, example: 'ORGANIZATION' })
  type!: AccountType;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'BusinessSystemAdmin' })
  userRole!: string;

  @ApiProperty({ example: ['EMPLOYER', 'SOCIAL_SERVICE_PROVIDER'] })
  activeProfiles!: ProfileType[];

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ example: ['BUSINESS'] })
  verifiedFeatures!: string[];

  @ApiPropertyOptional({ type: OrganizationProfileResponseDto })
  organizationProfile?: OrganizationProfileResponseDto;

  @ApiPropertyOptional({ type: EmployerProfileResponseDto })
  employerProfile?: EmployerProfileResponseDto;

  @ApiPropertyOptional({ type: SocialServiceProviderProfileResponseDto })
  socialServiceProviderProfile?: SocialServiceProviderProfileResponseDto;

  @ApiPropertyOptional({ type: OrganizationPropertyOwnerProfileResponseDto })
  propertyOwnerProfile?: OrganizationPropertyOwnerProfileResponseDto;

  @ApiPropertyOptional({ type: OrganizationSkilledProfessionalProfileResponseDto })
  skilledProfessionalProfile?: OrganizationSkilledProfessionalProfileResponseDto;

  @ApiPropertyOptional({ type: OrganizationIntermediaryAgentProfileResponseDto })
  intermediaryAgentProfile?: OrganizationIntermediaryAgentProfileResponseDto;

  @ApiPropertyOptional({ type: [OrganizationAdminResponseDto] })
  users?: OrganizationAdminResponseDto[];

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;

  @ApiProperty({ example: '2026-01-06T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-06T12:00:00Z' })
  updatedAt!: string;
}

/* ======================================================
   INVITATION RESPONSE DTOS
====================================================== */

/**
 * Invite Member Response
 */
export class InviteMemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the created invitation',
    example: 'inv_123456789',
  })
  invitationId!: string;
}

/**
 * Invitation Details Response
 */
export class InvitationDetailsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the invitation',
    example: 'inv_123456789',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address of the invited person',
    example: 'colleague@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Role that will be assigned (always GeneralUser for invitations)',
    example: 'GeneralUser',
  })
  roleName!: string;

  @ApiProperty({
    description: 'Current status of the invitation',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED']
  })
  status!: string;

  @ApiProperty({
    description: 'When the invitation expires',
    example: '2026-03-01T12:00:00Z',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'When the invitation was created',
    example: '2026-02-23T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'UUID of the admin who sent the invitation',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  invitedByUserUuid!: string;

  @ApiPropertyOptional({
    description: 'Name of the admin who sent the invitation',
    example: 'John Doe',
  })
  invitedByUserName?: string;

  @ApiPropertyOptional({
    description: 'Optional message from the inviter',
    example: 'Please join our team as we expand!',
  })
  message?: string;
}

/**
 * Invitation Verification Response
 */
export class InvitationVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the invitation token is valid',
    example: true,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'Email address associated with the invitation',
    example: 'colleague@example.com',
  })
  email!: string;

  @ApiPropertyOptional({
    description: 'Phone number if user already exists',
    example: '+254712345678',
  })
  phone?: string;

  @ApiProperty({
    description: 'UUID of the organization',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  organizationUuid!: string;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'Acme Corporation',
  })
  organizationName!: string;

  @ApiProperty({
    description: 'Role that will be assigned (always GeneralUser)',
    example: 'GeneralUser',
  })
  roleName!: string;

  @ApiProperty({
    description: 'Whether the user already exists in the system',
    example: false,
  })
  isExistingUser!: boolean;
}

/**
 * Accept Invitation Response
 */
export class AcceptInvitationResponseDto {
  @ApiProperty({
    description: 'Whether the acceptance was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'UUID of the user (new or existing)',
    example: 'user-789-012-345',
  })
  userUuid!: string;

  @ApiProperty({
    description: 'Whether this was a new user creation',
    example: true,
  })
  isNewUser!: boolean;

  @ApiProperty({
    description: 'UUID of the organization',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  organizationUuid!: string;

  @ApiProperty({
    description: 'Role assigned to the user',
    example: 'GeneralUser',
  })
  roleName!: string;
}

/**
 * Check Invitation Status Response
 */
export class CheckInvitationStatusResponseDto {
  @ApiProperty({
    description: 'Whether there is a pending invitation for this email',
    example: true,
  })
  hasPendingInvitation!: boolean;

  @ApiPropertyOptional({
    description: 'The ID of the pending invitation (if any)',
    example: 'inv_123456789',
  })
  invitationId?: string;

  @ApiPropertyOptional({
    description: 'When the pending invitation expires',
    example: '2026-03-01T12:00:00Z',
  })
  expiresAt?: Date;
}

/**
 * Invitations List Response
 */
export class InvitationsListResponseDto {
  @ApiProperty({
    description: 'List of pending invitations',
    type: [InvitationDetailsResponseDto],
  })
  invitations!: InvitationDetailsResponseDto[];

  @ApiProperty({
    description: 'Total count of pending invitations',
    example: 5,
  })
  totalCount!: number;
}

/* ======================================================
   DEPRECATED - Keep for backward compatibility
====================================================== */

/**
 * @deprecated Use OrganizationAccountResponseDto instead
 */
export class ContractorProfileDataDto {
  @ApiProperty()
  uuid!: string;

  @ApiProperty({ type: [String] })
  specialties!: string[];

  @ApiProperty({ type: [String] })
  serviceAreas!: string[];

  @ApiProperty()
  isVerified!: boolean;

  @ApiProperty()
  averageRating!: number;

  @ApiProperty()
  totalReviews!: number;
}

/**
 * @deprecated Use OrganizationAccountResponseDto instead
 */
export class ContractorProfileResponseDto extends ContractorProfileDataDto {
  @ApiProperty({
    description: 'UUID of the associated account',
    example: 'acc-123-456-789',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Years of experience',
    example: 5,
  })
  yearsExperience!: number;

  @ApiProperty({
    description: 'When the contractor profile was created',
    example: '2026-01-05T12:00:00Z',
  })
  createdAt!: string;
}