import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { 
  EmployerProfileDataDto, 
  SocialServiceProviderProfileDataDto, 
  PropertyOwnerProfileDataDto, 
  SkilledProfessionalProfileDataDto, 
  IntermediaryAgentProfileDataDto,
  ProfileToCreateDto,
  UpdateSocialServiceProviderProfileRequestDto,
} from './user-request.dto';

import { ACCOUNT_TYPES, AccountType, BUSINESS_TYPES, BusinessType, KENYAN_PHONE_REGEX, ORGANIZATION_PURPOSES, ORGANIZATION_TYPES, OrganizationPurpose, OrganizationType } from '@pivota-api/constants';



/* ======================================================
   BASE ORGANIZATION UPDATE DTO (Shared properties)
====================================================== */

export abstract class BaseUpdateOrganizationDto {
  @ApiPropertyOptional({ 
    description: 'Official company website URL',
    example: 'https://pivotatech.co.ke' 
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'Cover photo URL (banner image for organization profile)',
    example: 'https://cdn.pivota.com/covers/org-banner.jpg'
  })
  @IsOptional()
  @IsUrl()
  coverPhoto?: string;

  @ApiPropertyOptional({ 
    description: 'Government-issued business registration number',
    example: 'PVT-REG-001' 
  })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({ 
    description: 'Kenya Revenue Authority Personal Identification Number (KRA PIN)',
    example: 'P051234567X' 
  })
  @IsOptional()
  @IsString()
  kraPin?: string;

  @ApiPropertyOptional({ 
    description: 'Physical location of the primary business office',
    example: 'Nairobi, Kenya' 
  })
  @IsOptional()
  @IsString()
  physicalAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Update the legal structure',
    enum: ORGANIZATION_TYPES 
  })
  @IsOptional()
  @IsIn(ORGANIZATION_TYPES)
  organizationType?: OrganizationType;

  @ApiPropertyOptional({ 
    description: 'About the organization',
    example: 'Leading tech company in East Africa'
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ 
    description: 'Logo URL',
    example: 'https://cdn.pivota.com/logos/techcorp.png'
  })
  @IsOptional()
  @IsUrl()
  logo?: string;
}

/* ======================================================
   ORGANIZATION SPECIFIC DTOs
====================================================== */

/**
 * Organisation Signup Request (Auth Service)
 * Used for the public-facing signup API.
 * Includes Password but NO adminUserUuid.
 */
export class OrganisationSignupRequestDto {
  @ApiProperty({
    description: 'The registered legal name of the business or organization',
    example: 'Pivota Tech Solutions',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({ 
    description: 'Cover photo URL (banner image for organization profile)',
    example: 'https://cdn.pivota.com/covers/org-banner.jpg'
  })
  @IsOptional()
  @IsUrl()
  coverPhoto?: string;

  @ApiProperty({
    description: 'General contact email for the business entity',
    example: 'info@pivotatech.co.ke',
  })
  @IsEmail()
  @IsNotEmpty()
  officialEmail!: string;

  // --- NEW: Business Status Fields ---
  @ApiPropertyOptional({ 
    description: 'Type of business entity',
    enum: BUSINESS_TYPES,
    example: 'FOR_PROFIT'
  })
  @IsOptional()
  @IsIn(BUSINESS_TYPES)
  businessType?: BusinessType;

  @ApiProperty({
    description: 'General company contact number',
    example: '+254712345678',
  })
  @IsNotEmpty()
  @Matches(KENYAN_PHONE_REGEX, { message: 'Please provide a valid Kenyan phone number' })
  officialPhone!: string;

  @ApiProperty({
    description: 'Physical location or headquarters of the organization',
    example: 'Waiyaki Way, Nairobi, Kenya',
  })
  @IsString()
  @IsNotEmpty()
  physicalAddress!: string;

  @ApiProperty({
    description: 'Login email for the organization admin',
    example: 'admin@pivotatech.co.ke',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Secure password for the admin account',
    example: 'StrongPass@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'Admin phone number',
    example: '+254711222333',
  })
  @IsNotEmpty()
  @Matches(KENYAN_PHONE_REGEX, { message: 'Please provide a valid Kenyan phone number' })
  phone!: string;

  @ApiProperty({ description: 'Admin legal first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({ description: 'Admin legal last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;

  @ApiProperty({
    description: '6-digit OTP verification code sent to the admin email',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'The legal structure of the organization',
    enum: ORGANIZATION_TYPES,
    example: 'COMPANY',
  })
  @IsNotEmpty()
  @IsIn(ORGANIZATION_TYPES)
  organizationType!: OrganizationType;

  @ApiPropertyOptional({
    description: 'Target subscription plan',
    example: 'free-forever',
    default: 'free-forever'
  })
  @IsOptional()
  @IsString()
  planSlug?: string;

  @ApiPropertyOptional({
    description: 'Government-issued business registration number',
    example: 'PVT-REG-001',
  })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({
    description: 'Kenya Revenue Authority Personal Identification Number (KRA PIN)',
    example: 'P051234567X',
  })
  @IsOptional()
  @IsString()
  kraPin?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://pivotatech.co.ke',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'About the organization',
    example: 'Leading tech company in East Africa',
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://cdn.pivota.com/logos/techcorp.png',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  // --- NEW: Organization Purposes (from UI Screen 7) ---
  @ApiPropertyOptional({
    description: 'What the organization will do on the platform',
    enum: ORGANIZATION_PURPOSES,
    example: ['hire_employees', 'list_properties'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(ORGANIZATION_PURPOSES, { each: true })
  purposes?: OrganizationPurpose[];

  // --- NEW: Purpose-specific profile data (from UI Screen 10) ---
  @ApiPropertyOptional({
    description: 'Profile data for each selected purpose',
    example: {
      hire_employees: {
        companyName: 'Tech Corp',
        industry: 'Technology',
        companySize: '50-100',
        preferredSkills: ['JavaScript', 'Python']
      },
      list_properties: {
        companyName: 'Tech Properties',
        preferredPropertyTypes: ['APARTMENT', 'COMMERCIAL']
      }
    },
  })
  @IsOptional()
  @IsObject()
  profileData?: {
    hire_employees?: Partial<EmployerProfileDataDto>;
    list_properties?: Partial<PropertyOwnerProfileDataDto>;
    offer_skilled_services?: Partial<SkilledProfessionalProfileDataDto>;
    provide_social_support?: Partial<SocialServiceProviderProfileDataDto>;
    act_as_agent?: Partial<IntermediaryAgentProfileDataDto>;
  };
}

/**
 * Create Organisation Request (Organisation Service)
 * Used for internal gRPC/Service communication.
 * Includes adminUserUuid but NO Password.
 * This mirrors CreateAccountWithProfilesRequestDto from user-request.dto
 */
// In organisation-request.dto.ts

export class CreateOrganisationRequestDto {
  // --- Account Type (always ORGANIZATION) ---
  @ApiProperty({ 
    description: 'Account type',
    enum: ACCOUNT_TYPES,
    example: 'ORGANIZATION'
  })
  @IsIn(ACCOUNT_TYPES)
  @IsNotEmpty()
  accountType!: AccountType;

  @ApiPropertyOptional({ 
    description: 'Cover photo URL (banner image for organization profile)',
    example: 'https://cdn.pivota.com/covers/org-banner.jpg'
  })
  @IsOptional()
  @IsUrl()
  coverPhoto?: string;

  // --- Admin User Details ---
  @ApiProperty({
    description: 'The UUID pre-generated by Auth Service to anchor identity',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  adminUserUuid!: string;

  @ApiProperty({
    description: 'Login email for the admin (to populate the User table)',
    example: 'admin@pivotatech.co.ke',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ 
    description: 'Admin phone number', 
    example: '+254711222333' 
  })
  @Matches(KENYAN_PHONE_REGEX, { message: 'Please provide a valid Kenyan phone number' })
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Admin first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({ description: 'Admin last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;

  @ApiPropertyOptional({ 
    description: 'Admin profile image URL',
    example: 'https://cdn.pivota.com/profiles/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  adminProfileImage?: string;

   // --- NEW: Business Status Fields ---
  @ApiPropertyOptional({ 
    description: 'Whether this organization operates as a business (always true for organizations)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @ApiPropertyOptional({ 
    description: 'Type of business entity',
    enum: BUSINESS_TYPES,
    example: 'FOR_PROFIT'
  })
  @ValidateIf((o) => o.isBusiness === true)
  @IsIn(BUSINESS_TYPES)
  businessType?: BusinessType;


  // --- Organization Details ---
  @ApiProperty({
    description: 'The registered legal name of the business or organization',
    example: 'Pivota Tech Solutions',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  organizationName!: string;

  @ApiProperty({
    description: 'The type of organization',
    enum: ORGANIZATION_TYPES,
    example: 'COMPANY',
  })
  @IsNotEmpty()
  @IsIn(ORGANIZATION_TYPES)
  organizationType!: OrganizationType;

  @ApiProperty({
    description: 'General contact email for the business entity',
    example: 'info@pivotatech.co.ke',
  })
  @IsEmail()
  @IsNotEmpty()
  officialEmail!: string;

  @ApiProperty({
    description: 'General company contact number',
    example: '+254712345678',
  })
  @IsNotEmpty()
  @Matches(KENYAN_PHONE_REGEX, { message: 'Please provide a valid Kenyan phone number' })
  officialPhone!: string;

  @ApiProperty({
    description: 'Physical location of the primary business office',
    example: 'Waiyaki Way, Nairobi, Kenya',
  })
  @IsString()
  @IsNotEmpty()
  physicalAddress!: string;

  @ApiPropertyOptional({
    description: 'Government-issued business registration number',
    example: 'PVT-REG-001',
  })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({
    description: 'Kenya Revenue Authority Personal Identification Number (KRA PIN)',
    example: 'P051234567X',
  })
  @IsOptional()
  @IsString()
  kraPin?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://pivotatech.co.ke',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'About the organization',
    example: 'Leading tech company in East Africa',
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://cdn.pivota.com/logos/techcorp.png',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    description: 'The subscription plan for the organization',
    example: 'free-forever',
  })
  @IsOptional()
  @IsString()
  planSlug?: string;

  // --- Organization Purposes (from UI Screen 7) ---
  @ApiProperty({
    description: 'What the organization will do (from UI Screen 7)',
    enum: ORGANIZATION_PURPOSES,
    example: ['hire_employees', 'list_properties'],
    isArray: true,
  })
  @IsArray()
  @IsIn(ORGANIZATION_PURPOSES, { each: true })
  @IsNotEmpty()
  purposes!: OrganizationPurpose[];

  // --- Purpose-specific profile data (from UI Screen 10) ---
  @ApiProperty({
    description: 'Profile data for each selected purpose (from UI Screen 10)',
    example: {
      hire_employees: {
        companyName: 'Tech Corp',
        industry: 'Technology',
        companySize: '50-100',
        preferredSkills: ['JavaScript', 'Python']
      },
      list_properties: {
        companyName: 'Tech Properties',
        preferredPropertyTypes: ['APARTMENT', 'COMMERCIAL']
      }
    },
  })
  @IsObject()
  @IsNotEmpty()
  profileData!: {
    hire_employees?: Partial<EmployerProfileDataDto>;
    list_properties?: Partial<PropertyOwnerProfileDataDto>;
    offer_skilled_services?: Partial<SkilledProfessionalProfileDataDto>;
    provide_social_support?: Partial<SocialServiceProviderProfileDataDto>;
    act_as_agent?: Partial<IntermediaryAgentProfileDataDto>;
  };
}



/**
 * Update Organisation Profile Request (Public)
 * Used by the gateway for updating organization profiles
 */
export class UpdateOrgProfileRequestDto extends BaseUpdateOrganizationDto {}

/**
 * Update Organisation Profile GRPC Request (Internal)
 * Used for internal gRPC communication
 */
export class UpdateOrgProfileGrpcRequestDto extends BaseUpdateOrganizationDto {
  @ApiProperty({ description: 'Target organization account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

/**
 * Add Organisation Member Request (Direct Link)
 * Used for directly adding an existing user to an organization
 */
export class AddOrgMemberRequestDto {
  @ApiProperty({
    description: 'Global identifier of the organization',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  orgUuid!: string;

  @ApiProperty({
    description: 'UUID of the user being added to the organization',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  userUuid!: string;
}

/**
 * Invite Member Request (Email-Based Invitation)
 * Public DTO used by the Gateway API
 */
export class InviteMemberRequestDto {
  @ApiProperty({
    description: 'The email address of the person being invited',
    example: 'colleague@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({
    description: 'Optional personal message to include in the invitation email',
    example: 'Please join our team as we expand!',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * Invite Member GRPC Request (Profile Service)
 * Internal gRPC DTO used between Gateway and Profile Service
 */
export class InviteMemberGrpcRequestDto extends InviteMemberRequestDto {
  @ApiProperty({
    description: 'UUID of the organization (extracted from JWT context)',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationUuid!: string;

  @ApiProperty({
    description: 'UUID of the admin sending the invitation (extracted from JWT)',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  invitedByUserUuid!: string;
}

/**
 * Accept Invitation Request
 * Public DTO used when a user clicks the invitation link
 */
export class AcceptInvitationRequestDto {
  @ApiProperty({
    description: 'The unique secret token sent to the users email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiPropertyOptional({
    description: 'First name (required for new users)',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name (required for new users)',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number (required for new users)',
    example: '+254712345678',
  })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX, { message: 'Please provide a valid Kenyan phone number' })
  phone?: string;
}

/**
 * Accept Invitation GRPC Request (Profile Service)
 * Internal gRPC DTO for accepting invitations
 */
export class AcceptInvitationGrpcRequestDto extends AcceptInvitationRequestDto {
  // No additional fields needed - token and user details are sufficient
}

/**
 * Verify Invitation Request
 * Used to check if an invitation token is valid
 */
export class VerifyInvitationRequestDto {
  @ApiProperty({
    description: 'The invitation token to verify',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

/**
 * Resend Invitation Request
 * Public DTO for resending an invitation
 */
export class ResendInvitationRequestDto {
  @ApiProperty({
    description: 'The ID of the invitation to resend',
    example: 'inv_123456',
  })
  @IsString()
  @IsNotEmpty()
  invitationId!: string;
}

/**
 * Resend Invitation GRPC Request (Profile Service)
 * Internal gRPC DTO for resending invitations
 */
export class ResendInvitationGrpcRequestDto extends ResendInvitationRequestDto {
  @ApiProperty({
    description: 'UUID of the admin requesting the resend (extracted from JWT)',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  requestedByUserUuid!: string;

  @ApiProperty({
    description: 'UUID of the organization (extracted from JWT context)',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationUuid!: string;
}

/**
 * Cancel Invitation Request
 * Public DTO for cancelling an invitation
 */
export class CancelInvitationRequestDto {
  @ApiProperty({
    description: 'The ID of the invitation to cancel',
    example: 'inv_123456',
  })
  @IsString()
  @IsNotEmpty()
  invitationId!: string;
}

/**
 * Cancel Invitation GRPC Request (Profile Service)
 * Internal gRPC DTO for cancelling invitations
 */
export class CancelInvitationGrpcRequestDto extends CancelInvitationRequestDto {
  @ApiProperty({
    description: 'UUID of the admin requesting the cancellation (extracted from JWT)',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  requestedByUserUuid!: string;

  @ApiProperty({
    description: 'UUID of the organization (extracted from JWT context)',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationUuid!: string;
}

/**
 * Get Organization Invitations Request
 * Used to fetch pending invitations for an organization
 */
export class GetOrganizationInvitationsRequestDto {
  @ApiProperty({
    description: 'UUID of the organization',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationUuid!: string;

  @ApiProperty({
    description: 'UUID of the admin requesting (for permission check)',
    example: 'a7164466-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  requestingUserUuid!: string;
}

/**
 * Check Invitation Status Request
 * Used to quickly check if an email has a pending invitation
 */
export class CheckInvitationStatusRequestDto {
  @ApiProperty({
    description: 'Email to check',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'UUID of the organization',
    example: 'd9b2b1c0-1234-4a5b-8c9d-0123456789ab',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationUuid!: string;
}

/**
 * Organization Service Provider Onboarding
 * Public Gateway DTO
 */
export class OnboardOrganizationProviderRequestDto {
  @ApiProperty({ 
    description: 'List of professional services the organization offers',
    example: ['Commercial Cleaning', 'Industrial Security', 'Waste Management'] 
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
    description: 'Regions or cities where the organization operates',
    example: ['Nairobi', 'Mombasa', 'Kisumu'] 
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
}

/**
 * Organization Service Provider Onboarding GRPC Request
 * Internal gRPC DTO
 */
export class OnboardOrgProviderGrpcRequestDto extends OnboardOrganizationProviderRequestDto {
  @ApiProperty({ 
    description: 'The unique identifier of the organization becoming a provider' 
  })
  @IsUUID()
  @IsNotEmpty()
  orgUuid!: string;
}

/* ======================================================
   PASSWORD SETUP DTOs
====================================================== */

/**
 * Setup Password Request DTO
 * For users who accepted an invitation to set their password
 */
export class SetupPasswordRequestDto {
  @ApiProperty({
    description: 'The password setup token sent via email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    description: 'New password for the account',
    example: 'StrongPass@123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'Confirm password',
    example: 'StrongPass@123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  confirmPassword!: string;
}

/**
 * Check Password Setup Status Request
 */
export class CheckPasswordSetupStatusRequestDto {
  @ApiProperty({
    description: 'The password setup token',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

/* ======================================================
   MAIN ONBOARDING DTO (Matches UserService pattern)
====================================================== */

/**
 * Create Organization Account With Profiles Request
 * Used for organization signup with multiple profiles
 * This matches the pattern from UserService's CreateAccountWithProfilesRequestDto
 */
export class CreateOrganizationAccountWithProfilesRequestDto {
  @ApiProperty({ 
    description: 'Account type (must be ORGANIZATION)',
    enum: ACCOUNT_TYPES,
    example: 'ORGANIZATION'
  })
  @IsIn(ACCOUNT_TYPES)
  @IsNotEmpty()
  accountType!: AccountType;

  @ApiPropertyOptional({ 
    description: 'Whether this organization operates as a business (always true for organizations)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isBusiness?: boolean;

  @ApiPropertyOptional({ 
    description: 'Type of business entity',
    enum: BUSINESS_TYPES,
    example: 'FOR_PROFIT'
  })
  @ValidateIf((o) => o.isBusiness === true)
  @IsIn(BUSINESS_TYPES)
  businessType?: BusinessType;


  @ApiProperty({ 
    description: 'Email address',
    example: 'admin@techcorp.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ 
    description: 'Password',
    example: 'StrongPass@123',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ 
    description: 'Phone number',
    example: '+254712345678'
  })
  @IsOptional()
  @Matches(KENYAN_PHONE_REGEX)
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Plan slug',
    example: 'free-forever',
    default: 'free-forever'
  })
  @IsOptional()
  @IsString()
  planSlug?: string;

  @ApiProperty({ 
    description: 'OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otpCode!: string;

  // --- Organization Details ---
  @ApiProperty({ 
    description: 'Organization name',
    example: 'Tech Corp Ltd'
  })
  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @ApiProperty({ 
    description: 'Organization type',
    enum: ORGANIZATION_TYPES,
    example: 'COMPANY'
  })
  @IsIn(ORGANIZATION_TYPES)
  @IsNotEmpty()
  organizationType!: OrganizationType;

  @ApiPropertyOptional({ 
    description: 'Registration number',
    example: 'PVT/2023/123456'
  })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({ 
    description: 'KRA PIN',
    example: 'A123456789B'
  })
  @IsOptional()
  @IsString()
  kraPin?: string;

  @ApiProperty({ 
    description: 'Official email',
    example: 'info@techcorp.com'
  })
  @IsEmail()
  @IsNotEmpty()
  officialEmail!: string;

  @ApiProperty({ 
    description: 'Official phone',
    example: '+254712345678'
  })
  @Matches(KENYAN_PHONE_REGEX)
  @IsNotEmpty()
  officialPhone!: string;

  @ApiPropertyOptional({ 
    description: 'Physical address',
    example: '123 Kenyatta Ave, Nairobi'
  })
  @IsOptional()
  @IsString()
  physicalAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Website URL',
    example: 'https://techcorp.com'
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ 
    description: 'About the organization',
    example: 'Leading tech company in East Africa'
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ 
    description: 'Logo URL',
    example: 'https://cdn.pivota.com/logos/techcorp.png'
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  // --- Admin Details ---
  @ApiProperty({ 
    description: 'Admin first name',
    example: 'John'
  })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({ 
    description: 'Admin last name',
    example: 'Smith'
  })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;

  @ApiPropertyOptional({ 
    description: 'Admin profile image URL',
    example: 'https://cdn.pivota.com/profiles/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  adminProfileImage?: string;

  // --- Profiles to create (matches UserService pattern) ---
  @ApiProperty({ 
    description: 'Profiles to create',
    type: [ProfileToCreateDto],
    example: [
      { type: 'EMPLOYER', data: { companyName: 'Tech Corp', industry: 'Technology' } }
    ]
  })
  @IsArray()
  @IsNotEmpty()
  profiles!: ProfileToCreateDto[];
}

/* ======================================================
   ORGANIZATION PROFILE UPDATE DTOs
====================================================== */

export class UpdateEmployerProfileRequestDto extends EmployerProfileDataDto {}


export class UpdateOrganizationPropertyOwnerProfileRequestDto extends PropertyOwnerProfileDataDto {}

export class UpdateOrganizationSkilledProfessionalProfileRequestDto extends SkilledProfessionalProfileDataDto {}

export class UpdateOrganizationIntermediaryAgentProfileRequestDto extends IntermediaryAgentProfileDataDto {}

/* ======================================================
   gRPC VERSIONS (with organization UUID)
====================================================== */

export class UpdateEmployerGrpcRequestDto extends UpdateEmployerProfileRequestDto {
  @ApiProperty({ description: 'Target organization account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateOrganizationPropertyOwnerGrpcRequestDto extends UpdateOrganizationPropertyOwnerProfileRequestDto {
  @ApiProperty({ description: 'Target organization account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateOrganizationSkilledProfessionalGrpcRequestDto extends UpdateOrganizationSkilledProfessionalProfileRequestDto {
  @ApiProperty({ description: 'Target organization account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}

export class UpdateOrganizationIntermediaryAgentGrpcRequestDto extends UpdateOrganizationIntermediaryAgentProfileRequestDto {
  @ApiProperty({ description: 'Target organization account UUID' })
  @IsUUID()
  @IsNotEmpty()
  accountUuid!: string;
}