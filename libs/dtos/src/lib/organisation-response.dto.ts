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