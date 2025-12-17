import { ApiProperty } from '@nestjs/swagger';

export class UserBasicDto {
  @ApiProperty({ description: 'User UUID', example: 'user_cuid_abc456' })
  id!: string;

  @ApiProperty({ description: 'Full name of the user', example: 'Allan Mathenge' })
  fullName!: string;

  @ApiProperty({ description: 'Email of the user', example: 'allan@example.com' })
  email!: string;
}


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

  @ApiProperty({
    description: 'Name of the assigned plan',
    example: 'Free',
  })
  plan!: string;

  @ApiProperty({
    description: 'Status of the subscription',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({
    description: 'Billing cycle of the subscription',
    example: 'monthly',
  })
  billingCycle!: string;

  @ApiProperty({
    description: 'Expiry date of the subscription',
    example: '2025-12-31T23:59:59.000Z',
    required: false,
    nullable: true,
  })
  expiresAt?: Date;

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

  @ApiProperty({ type: UserBasicDto, description: 'Basic information of the user' })
  user?: UserBasicDto;
}