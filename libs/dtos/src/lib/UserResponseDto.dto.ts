import { ApiProperty } from '@nestjs/swagger';

// Define the Organization shape as a class for Swagger to pick up as a Schema
export class OrganizationContextDto {
  @ApiProperty({ example: '880e8400-e29b-41d4-a716-446655441111', description: 'Unique identifier for the organization' })
  uuid!: string;

  @ApiProperty({ example: 'Pivota Tech Ltd', description: 'Official name of the organization' })
  name!: string;

  @ApiProperty({ example: 'ORG-XYZ987', description: 'Custom external identifier for the organization' })
  orgCode!: string;

  @ApiProperty({ example: 'VERIFIED', description: 'Status of business verification: PENDING, VERIFIED, REJECTED' })
  verificationStatus!: string;
}

export class UserResponseDto {
  // Core user fields
  @ApiProperty({ example: '550e8400-e29b-41d4', description: 'Internal cuid' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Global unique identifier for internal services' })
  uuid!: string;
 
  @ApiProperty({ example: 'PIV-000123', description: 'Custom external identifier for the user' })
  userCode!: string;

  @ApiProperty({ example: '353tete-4675sfgdhjkhjgh', description: 'The account uuid of the user' })
  accountId!: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  email!: string;

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  lastName!: string;

  @ApiProperty({ example: '+254712345678', description: 'User phone number', required: false })
  phone?: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'Profile picture URL', required: false })
  profileImage?: string;

  @ApiProperty({ example: 'active', description: 'User account status: active, banned, pending' })
  status!: string;

  @ApiProperty({ example: '2025-11-05T12:34:56Z', description: 'Account creation timestamp' })
  createdAt!: string;

  @ApiProperty({ example: '2025-11-05T12:34:56Z', description: 'Account last updated timestamp' })
  updatedAt!: string;

  // Dynamic / runtime fields
  @ApiProperty({ example: 'PremiumUser', description: 'Role fetched from admin-service', required: false })
  role?: string;

  @ApiProperty({ example: 'Gold Plan', description: 'Current subscription plan name from payment-service', required: false })
  currentSubscription?: string;

  @ApiProperty({ example: 'active', description: 'Subscription status: active, pending, expired', required: false })
  subscriptionStatus?: string;

  @ApiProperty({ example: '2025-12-31T23:59:59Z', description: 'Subscription expiry date', required: false })
  subscriptionExpiresAt?: string;

  @ApiProperty({ example: 'plan_123', description: 'Subscription plan ID', required: false })
  planId?: string;

  @ApiProperty({ example: 'cat_456', description: 'Service category ID', required: false })
  categoryId?: string;

  // Added Organization Context with proper Swagger Type
  @ApiProperty({ 
    type: () => OrganizationContextDto, 
    required: false, 
    description: 'Only populated if the user is associated with an Organization account' 
  })
  organization?: OrganizationContextDto;
}