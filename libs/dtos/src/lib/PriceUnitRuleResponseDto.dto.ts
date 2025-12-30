import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceUnitRuleResponseDto {
  @ApiProperty({
    description: 'Internal unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'The vertical this rule belongs to',
    example: 'JOBS',
  })
  vertical!: string;

  @ApiProperty({
    description: 'The pricing unit (e.g., PER_HOUR, FIXED)',
    example: 'PER_HOUR',
  })
  unit!: string;

  @ApiProperty({
    description: 'ISO 4217 currency code for the price range',
    example: 'KES',
  })
  currency!: string; // Added to align with .proto index 4

  @ApiPropertyOptional({
    description: 'The specific category this rule applies to. If null, it is a global vertical rule.',
    example: 'plumbing',
    nullable: true,
  })
  categorySlug!: string | null;

  @ApiPropertyOptional({
    description: 'Minimum price allowed for this unit',
    example: 500,
    nullable: true,
  })
  minPrice!: number | null;

  @ApiPropertyOptional({
    description: 'Maximum price allowed for this unit (protection against typos)',
    example: 100000,
    nullable: true,
  })
  maxPrice!: number | null;

  @ApiProperty({
    description: 'If true, the UI must show/require the years of experience field',
    example: true,
  })
  isExperienceRequired!: boolean;

  @ApiProperty({
    description: 'If true, the UI must show/require additional notes',
    example: false,
  })
  isNotesRequired!: boolean;

  @ApiProperty({
    description: 'Whether this rule is active and should be enforced',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'ISO timestamp of rule creation',
    example: '2025-12-29T10:42:00Z',
  })
  createdAt!: Date;
}