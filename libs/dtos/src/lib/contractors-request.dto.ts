import { 
  IsString, IsNotEmpty, IsArray, IsOptional, 
  IsNumber, IsIn, Min, ArrayMinSize, ValidateNested,  
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayAvailabilityDto } from './AvailabilityDto.dto';
import { PRICE_UNITS, VERTICALS } from '@pivota-api/constants';

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

  @ApiProperty({
    example: ['JOBS', 'HOUSING'],
    type: [String],
    description: 'The platform verticals where this service will be visible.'
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(VERTICALS, { each: true })
  @ArrayMinSize(1)
  verticals!: string[];

  @ApiProperty({ description: 'The internal CUID/UUID of the category.' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ description: 'The slug of the category (e.g., painting-services).' })
  @IsString()
  @IsNotEmpty()
  categorySlug!: string;

  @ApiProperty({ example: 5000, description: 'Base price' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({ example: 'FIXED', enum: PRICE_UNITS })
  @IsString()
  @IsIn(PRICE_UNITS)
  priceUnit!: string;

  @ApiPropertyOptional({ example: 'KES', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsString()
  @IsOptional()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: 5, description: 'Years of professional experience.' })
  @IsNumber()
  @IsOptional()
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    example: 'Please provide own materials or I can buy them at an extra cost.',
    description: 'Specific terms or extra info about the service'
  })
  @IsString()
  @IsOptional()
  additionalNotes?: string;

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
/**
 * These fields are marked @IsOptional() so the Gateway Controller
 * can auto-populate them from the JWT if they are missing.
 */
export class CreateServiceGrpcOfferingDto extends CreateServiceOfferingDto {
  @ApiPropertyOptional({ description: 'UUID of the user profile' })
  @IsString()
  @IsOptional() // Changed from @IsNotEmpty() to allow self-listing
  creatorId?: string;

  @ApiPropertyOptional({ description: 'UUID of the account organization/individual' })
  @IsString()
  @IsOptional() // Changed from @IsNotEmpty()
  accountId?: string;
}