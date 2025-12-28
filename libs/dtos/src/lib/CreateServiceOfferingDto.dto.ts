import { 
  IsString, 
  IsNotEmpty, 
  IsArray, 
  IsOptional, 
  IsNumber, 
  IsIn, 
  Min, 
  ArrayMinSize, 
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayAvailabilityDto } from './AvailabilityDto.dto';
import { Type } from 'class-transformer';

// Define valid values as constants for reuse
const VERTICAL_TYPES = ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT'];
const PRICE_UNITS = ['FIXED', 'PER_HOUR', 'PER_DAY', 'PER_VISIT', 'PER_SQFT'];

export class CreateServiceOfferingDto {
  @ApiProperty({ example: '7b2a...', description: 'UUID of the provider (User) from Identity Service' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({ example: 'Professional House Painting', description: 'Title of the service offering' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'High-quality interior and exterior painting using premium materials.', description: 'Detailed service description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: ['JOBS', 'HOUSING'],
    type: [String],
    description: 'The platform verticals where this service will be visible. Options: JOBS, HOUSING, SOCIAL_SUPPORT'
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(VERTICAL_TYPES, { each: true })
  @ArrayMinSize(1)
  verticals!: string[];

  @ApiProperty({ 
    example: 'Painter & Decorator', 
    description: 'A professional badge or label describing the role. Replaces rigid category IDs for cross-vertical flexibility.' 
  })
  @IsString()
  @IsNotEmpty()
  categoryLabel!: string;

  @ApiProperty({ example: 5000, description: 'Base price for the service in local currency (KES)' })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({
    example: 'FIXED',
    description: 'Pricing model. Options: FIXED, PER_HOUR, PER_DAY, PER_VISIT, PER_SQFT'
  })
  @IsString()
  @IsIn(PRICE_UNITS)
  priceUnit!: string;

  @ApiProperty({ example: 'Nairobi', description: 'City where the service is offered' })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands', description: 'Specific neighborhood or estate' })
  @IsString()
  @IsOptional()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: 5, description: 'Years of professional experience in this field' })
  @IsNumber()
  @IsOptional()
  yearsExperience?: number;

  @ApiPropertyOptional({ example: 'Available on weekends only. Tools included.', description: 'Additional notes for clients' })
  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @ApiProperty({ type: [DayAvailabilityDto], description: 'Weekly schedule' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  availability?: DayAvailabilityDto[];
}