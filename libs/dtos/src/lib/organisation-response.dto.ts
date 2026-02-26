import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    example: 'ORGANIZATION',
  })
  type!: 'ORGANIZATION' | 'INDIVIDUAL';
}

/* ------------------ Organization Base ------------------ */
export class OrganizationBaseDto {
  @ApiProperty({ description: 'Id of the organisation' })
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

  // --- Added Contact Details ---
  @ApiPropertyOptional({ example: 'info@pivotatech.co.ke' })
  officialEmail?: string;

  @ApiPropertyOptional({ example: '+254201234567' })
  officialPhone?: string;

  @ApiPropertyOptional({ example: 'Waiyaki Way, Nairobi, Kenya' })
  physicalAddress?: string;
  
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
    example: 'Business System Admin',
  })
  roleName!: string;
}

/* ======================================================
   PROFILE COMPLETION RESPONSE
====================================================== */
export class ProfileCompletionResponseDto {
  @ApiProperty({
    description: 'Completion percentage of the organization profile',
    example: 40,
  })
  percentage!: number;

  @ApiProperty({
    description: 'List of fields required to reach full completion',
    type: [String],
    example: ['KRA_PIN', 'REGISTRATION_NO'],
  })
  missingFields!: string[];

  @ApiProperty({
    description: 'Indicates if the organization has met all profile requirements',
    example: false,
  })
  isComplete!: boolean;
}

/* ======================================================
   ORGANIZATION PROFILE RESPONSE (FULL)
====================================================== */
export class OrganizationProfileResponseDto extends OrganizationBaseDto {
  @ApiProperty({ type: AccountBaseDto })
  account!: AccountBaseDto;

  @ApiProperty({ type: OrganizationAdminResponseDto })
  admin!: OrganizationAdminResponseDto;

  @ApiPropertyOptional({ type: ProfileCompletionResponseDto })
  completion?: ProfileCompletionResponseDto;

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
   INVITATION RESPONSE DTOS
====================================================== */

/* ------------------ Invite Member Response ------------------ */
export class InviteMemberResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the created invitation',
    example: 'inv_123456789',
  })
  invitationId!: string;
}

/* ------------------ Invitation Details Response ------------------ */
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

/* ------------------ Invitation Verification Response ------------------ */
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

/* ------------------ Accept Invitation Response ------------------ */
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

/* ------------------ Check Invitation Status Response ------------------ */
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

/* ------------------ Invitations List Response ------------------ */
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
   NEW: CONTRACTOR PROFILE DATA (SHARED)
====================================================== */
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

/* ======================================================
   CONTRACTOR PROFILE RESPONSE DTO
====================================================== */
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