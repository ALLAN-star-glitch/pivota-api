import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignPlanDto {
  @ApiProperty({
    description: 'UUID of the subscriber',
    example: 'cuid_xyz123',
  })
  @IsString()
  subscriberUuid!: string;

  @ApiProperty({
    description: 'ID of the plan to assign',
    example: 'cuid_plan123',
  })
  @IsString()
  planId!: string; // required since we are now assigning by plan ID

  @ApiPropertyOptional({
    description: 'Status of the subscription',
    example: 'active',
    default: 'active',
  })
  @IsString()
  @IsOptional()
  status?: string = 'active';

  @ApiPropertyOptional({
    description: 'Billing cycle for the subscription',
    example: 'monthly',
    enum: ['monthly', 'quarterly', 'halfYearly', 'annually'],
    default: 'monthly',
  })
  @IsString()
  @IsIn(['monthly', 'quarterly', 'halfYearly', 'annually'])
  @IsOptional()
  billingCycle?: 'monthly' | 'quarterly' | 'halfYearly' | 'annually' = 'monthly';
}
