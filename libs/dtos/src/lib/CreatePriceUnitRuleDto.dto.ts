import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  Min, 
  IsIn,
  Length
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VERTICAL_TYPES = ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT'];

export class CreatePriceUnitRuleDto {
  @ApiProperty({ 
    example: 'JOBS', 
    enum: VERTICAL_TYPES,
    description: 'The platform pillar this rule applies to' 
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VERTICAL_TYPES)
  vertical!: string;

  @ApiProperty({ 
    example: 'PER_HOUR', 
    description: 'The billing unit (e.g., FIXED, PER_HOUR, PER_DAY, PER_MONTH)' 
  })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ 
    example: 'KES', 
    description: 'ISO 4217 currency code. Required to distinguish price ranges by market.' 
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3) // ISO codes are always 3 characters
  currency!: string;

  @ApiPropertyOptional({ 
    example: 'plumbing', 
    description: 'Specific category slug for this rule. If null, this acts as the global fallback for the vertical/unit.' 
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ 
    example: 200, 
    description: 'Minimum allowed price in the specified currency.' 
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ 
    example: 50000, 
    description: 'Maximum allowed price in the specified currency.' 
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'If true, the provider MUST provide years of experience for this category.' 
  })
  @IsBoolean()
  @IsOptional()
  isExperienceRequired?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'If true, the provider MUST provide a price description or notes.' 
  })
  @IsBoolean()
  @IsOptional()
  isNotesRequired?: boolean;

  @ApiPropertyOptional({ 
    example: true, 
    default: true,
    description: 'Whether this pricing rule is currently active and selectable.' 
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}