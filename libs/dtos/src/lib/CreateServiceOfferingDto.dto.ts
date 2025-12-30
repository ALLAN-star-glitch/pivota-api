import { 
  IsString, IsNotEmpty, IsArray, IsOptional, 
  IsNumber, IsIn, Min, ArrayMinSize, ValidateNested 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayAvailabilityDto } from './AvailabilityDto.dto';
import { PRICE_UNITS, VERTICALS } from '@pivota-api/constants';




export class CreateServiceOfferingDto {
  @ApiProperty({ 
    example: 'user_clv123abc', 
    description: 'The UUID of the provider from Identity Service' 
  })
  @IsString()
  @IsOptional()
  providerId?: string; 

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

  @ApiProperty({ example: 5000, description: 'Base price in KES' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({ example: 'FIXED', enum: PRICE_UNITS })
  @IsString()
  @IsIn(PRICE_UNITS)
  priceUnit!: string;

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
    example: 'Includes all materials and cleanup.', 
    description: 'Additional notes.' 
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