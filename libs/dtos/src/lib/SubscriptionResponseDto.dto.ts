import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserBasicDto } from './BasicUserDto.dto';


export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'Unique ID of the subscription',
    example: 'cuid_xyz123',
  })
  id!: string;

  @ApiProperty({
    description: 'UUID of the user this subscription belongs to',
    example: 'user_cuid_abc456',
  })
  userUuid!: string;

  // ======================
  // Subscription Type
  // ======================
  @ApiProperty({
    description: 'Type of subscription',
    enum: ['PLAN', 'LISTING', 'LISTING_GROUP', 'MODULE'],
    example: 'PLAN',
  })
  type!: 'PLAN' | 'PAYGO';

  // ======================
  // Plan / Entity Info
  // ======================
  @ApiPropertyOptional({
    description: 'Name of the assigned plan (only for PLAN subscriptions)',
    example: 'Premium',
    nullable: true,
  })
  plan?: string;

  @ApiPropertyOptional({
    description: 'Multiple entity IDs for LISTING_GROUP subscriptions',
    example: ['listing_1', 'listing_2'],
    type: [String],
    nullable: true,
  })
  entityIds?: string[];

  // ======================
  // Billing & Payments
  // ======================
  @ApiProperty({
    description: 'Billing cycle of the subscription',
    example: 'monthly',
  })
  billingCycle!: 'monthly' | 'quarterly' | 'halfYearly' | 'annually';

  @ApiPropertyOptional({
    description: 'Total amount required for this subscription',
    example: 1000,
    nullable: true,
  })
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Amount paid so far (supports partial payment)',
    example: 400,
    nullable: true,
  })
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'KES',
    default: 'KES',
  })
  currency?: string;

  // ======================
  // Status & Dates
  // ======================
  @ApiProperty({
    description: 'Status of the subscription',
    enum: ['ACTIVE', 'PARTIALLY_PAID', 'CANCELLED', 'EXPIRED'],
    example: 'PARTIALLY_PAID',
  })
  status!: 'ACTIVE' | 'PARTIALLY_PAID' | 'CANCELLED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: 'Start date of the subscription',
    example: '2025-12-01T10:00:00.000Z',
    nullable: true,
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Expiry date of the subscription',
    example: '2025-12-31T23:59:59.000Z',
    nullable: true,
  })
  expiresAt?: Date;

  // ======================
  // Audit Fields
  // ======================
  @ApiProperty({
    description: 'Date when the subscription was created',
    example: '2025-12-14T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date when the subscription was last updated',
    example: '2025-12-14T10:00:00.000Z',
  })
  updatedAt!: Date;

  // ======================
  // Relations
  // ======================
  @ApiPropertyOptional({
    type: UserBasicDto,
    description: 'Basic information of the user',
  })
  user?: UserBasicDto;
}
