import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PricingMetadataItemDto {
  @ApiProperty({
    description: 'The pricing unit (e.g., PER_HOUR, PER_ACRE, FIXED)',
    example: 'PER_HOUR',
  })
  unit!: string;

  @ApiProperty({
    description: 'ISO 4217 currency code (e.g., KES, USD)',
    example: 'KES',
  })
  currency!: string; // Added to match .proto

  @ApiPropertyOptional({
    description: 'If this rule is specific to a category, the slug is shown here.',
    example: 'plumbing',
    nullable: true,
  })
  categorySlug!: string | null;

  @ApiPropertyOptional({
    description: 'Minimum price allowed for this unit',
    example: 500,
    nullable: true,
  })
  min!: number | null;

  @ApiPropertyOptional({
    description: 'Maximum price allowed for this unit',
    example: 50000,
    nullable: true,
  })
  max!: number | null;

  @ApiProperty({
    description: 'Whether the provider must provide years of experience',
    example: true,
  })
  experienceRequired!: boolean;

  @ApiProperty({
    description: 'Whether additional notes/details are mandatory for this unit',
    example: false,
  })
  notesRequired!: boolean;
}

/**
 * Matches the gRPC VerticalRuleList message
 */
export class VerticalRuleListDto {
  @ApiProperty({
    type: [PricingMetadataItemDto],
    description: 'List of pricing rules for this vertical',
  })
  rules!: PricingMetadataItemDto[];
}

/**
 * The main response DTO
 */
export class PricingMetadataResponseDto {
  @ApiProperty({
    description: 'Rules grouped by vertical name',
    example: {
      JOBS: {
        rules: [
          { 
            unit: 'PER_HOUR', 
            currency: 'KES', 
            categorySlug: null, 
            min: 500, 
            max: 10000, 
            experienceRequired: true, 
            notesRequired: false 
          }
        ]
      }
    },
    additionalProperties: {
      $ref: '#/components/schemas/VerticalRuleListDto'
    }
  })
  verticals!: Record<string, VerticalRuleListDto>;
}