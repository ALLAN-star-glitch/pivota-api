import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsUUID,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeToPlanDto {
  // ======================
  // Subscriber
  // ======================
  @ApiProperty({
    description: 'UUID of the subscriber',
    example: 'cuid_xyz123',
  })
  @IsUUID()
  subscriberUuid!: string;

  // ======================
  // Plan / Entity References
  // ======================
  @ApiPropertyOptional({
    description: 'Plan ID (required when type = PLAN)',
    example: 'cuid_plan123',
  })
  @IsString()
  @IsOptional()
  planId?: string;

  @ApiPropertyOptional({
    description: 'Multiple entity IDs for LISTING_GROUP subscription',
    example: ['listing_1', 'listing_2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  entityIds?: string[];

  // ======================
  // Status & Billing
  // ======================
  @ApiPropertyOptional({
    description: 'Subscription status',
    enum: ['ACTIVE', 'PARTIALLY_PAID', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE',
  })
  @IsIn(['ACTIVE', 'PARTIALLY_PAID', 'CANCELLED', 'EXPIRED'])
  @IsOptional()
  status?: 'ACTIVE' |'PENDING'| 'PARTIALLY_PAID' | 'CANCELLED' | 'EXPIRED' = 'ACTIVE';

  @ApiPropertyOptional({
    description: 'Billing cycle',
    enum: ['monthly', 'quarterly', 'halfYearly', 'annually'],
    default: 'monthly',
  })
  @IsIn(['monthly', 'quarterly', 'halfYearly', 'annually'])
  @IsOptional()
  billingCycle?:
    | 'monthly'
    | 'quarterly'
    | 'halfYearly'
    | 'annually' = 'monthly';

  // ======================
  // Payments
  // ======================
  @ApiPropertyOptional({
    description: 'Total amount required for this subscription',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Amount paid (supports partial payment)',
    example: 400,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'KES',
    default: 'KES',
  })
  @IsString()
  @IsOptional()
  currency? = 'KES';
}
