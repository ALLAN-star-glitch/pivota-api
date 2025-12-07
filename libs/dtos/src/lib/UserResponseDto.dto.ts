import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  // Core user fields
  @ApiProperty({ example: '1', description: 'Internal numeric ID (stringified)' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Global unique identifier for internal services' })
  uuid!: string;
 
  @ApiProperty({ example: 'PIV-000123', description: 'Custom external identifier for the user' })
  userCode!: string;

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

  // Dynamic / runtime fields (populated from other services)
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
}
