import { 
  IsString, IsNotEmpty, IsArray, IsOptional, 
  IsNumber, IsIn, Min, ArrayMinSize, ValidateNested, 
  IsUUID,
} from 'class-validator';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayAvailabilityDto } from './AvailabilityDto.dto';
import { PRICE_UNITS } from '@pivota-api/constants';  // REMOVED VERTICALS import

/* ======================================================
   CREATE SERVICE OFFERING (Base DTO)
====================================================== */

export class CreateServiceOfferingDto {
  @ApiProperty({ example: 'Professional House Painting' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'High-quality interior and exterior painting services.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  // REMOVED: verticals field - use category.vertical instead

  @ApiProperty({ 
    description: 'The ID of the COMPLIMENTARY category this service belongs to',
    example: 'cmnboid7w006sarihf05x9txr'
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 5000, description: 'Base price' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({ example: 'PER_HOUR', enum: PRICE_UNITS })
  @IsString()
  @IsIn(PRICE_UNITS)
  priceUnit!: string;

  @ApiPropertyOptional({ example: 'KES', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  // ✅ NEW: Coverage areas where this service is available
  @ApiProperty({ 
    description: 'Cities/neighborhoods where this service is available',
    example: ['Nairobi CBD', 'Westlands', 'Kilimani', 'Karen'],
    type: [String]
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  coverageAreas!: string[];

  // ❌ REMOVED locationCity and locationNeighborhood

  @ApiPropertyOptional({ example: 5, description: 'Years of professional experience.' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    example: 'Please provide own materials or I can buy them at an extra cost.',
    description: 'Specific terms or extra info about the service'
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ type: [DayAvailabilityDto], description: 'Weekly schedule' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  availability?: DayAvailabilityDto[];
}

/* ======================================================
   UPDATE SERVICE OFFERING DTO
====================================================== */

export class UpdateServiceOfferingDto {
  @ApiPropertyOptional({ example: 'Professional House Painting' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'High-quality interior and exterior painting services.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Base price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ example: 'PER_HOUR', enum: PRICE_UNITS })
  @IsOptional()
  @IsString()
  @IsIn(PRICE_UNITS)
  priceUnit?: string;

  // ✅ NEW: Coverage areas for update
  @ApiPropertyOptional({ 
    description: 'Cities/neighborhoods where this service is available',
    example: ['Nairobi CBD', 'Westlands', 'Kilimani'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  coverageAreas?: string[];

  @ApiPropertyOptional({ type: [DayAvailabilityDto], description: 'Weekly schedule' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  availability?: DayAvailabilityDto[];
}

/* ======================================================
   INTERNAL/gRPC VERSION (Identity Pillars)
====================================================== */

export class CreateServiceGrpcOfferingDto extends CreateServiceOfferingDto {
  @ApiProperty({ description: 'UUID of the skilled professional profile' })
  @IsUUID()
  @IsNotEmpty()
  skilledProfessionalId!: string;

  @ApiProperty({ description: 'UUID of the user who created this offering' })
  @IsUUID()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({ description: 'UUID of the account (Individual or Organization)' })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;
}