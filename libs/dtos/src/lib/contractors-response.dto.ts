import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsArray, IsObject, IsDate } from 'class-validator';
import { DayAvailabilityDto } from './AvailabilityDto.dto';

/* --- Shared Identity DTOs (Internal to this file or imported from shared) --- */
class CreatorBasicDto {
  @ApiProperty({ example: 'user_uuid_123' })
  id!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  fullName?: string;
}

class AccountBasicDto {
  @ApiProperty({ example: 'acc_uuid_456' })
  id!: string;

  @ApiProperty({ example: 'Pivota Tech Ltd' })
  name!: string;
}

/* ======================================================
   SERVICE OFFERING RESPONSE
====================================================== */
export class ServiceOfferingResponseDto {
  @ApiProperty({ example: 'clv123abc', description: 'Internal database ID' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'uuid-456-789', description: 'External public ID' })
  @IsString()
  externalId!: string;

  /* --- Identity Pillar --- */
  @ApiProperty({ description: 'The human individual who created the offering' })
  @IsObject()
  creator!: CreatorBasicDto;

  @ApiProperty({ description: 'The Brand/Organization account owning this service' })
  @IsObject()
  account!: AccountBasicDto;

  @ApiProperty({ 
    example: 'INDIVIDUAL', 
    description: 'Discriminator: INDIVIDUAL | ORGANIZATION' 
  })
  @IsString()
  contractorType!: string;

  @ApiProperty({ example: true, description: 'Provider verification status' })
  @IsBoolean()
  isVerified!: boolean;
  /* ---------------------- */

  @ApiProperty({ example: 'Professional House Painting' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'High-quality painting services...' })
  @IsString()
  description!: string;

  @ApiProperty({ 
    example: ['JOBS', 'HOUSING'], 
    type: [String], 
    description: 'PivotaConnect verticals this service belongs to' 
  })
  @IsArray()
  verticals!: string[];

  @ApiProperty({ 
    example: 'cl3k1n4fj0000xyz', 
    description: 'The ID of the category this service belongs to' 
  })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  basePrice!: number;

  @ApiProperty({ example: 'FIXED' })
  @IsString()
  priceUnit!: string;

  @ApiProperty({ example: 'KES' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ 
    type: [DayAvailabilityDto], 
    description: 'Structured weekly working hours' 
  })
  @IsArray()
  availability?: DayAvailabilityDto[];

  @ApiProperty({ example: 4.8, description: 'Calculated average rating' })
  @IsNumber()
  averageRating!: number;

  @ApiProperty({ example: 24, description: 'Total number of reviews' })
  @IsNumber()
  reviewCount!: number;

  @ApiPropertyOptional({ example: 5, description: 'Years of professional experience' })
  @IsNumber()
  yearsExperience?: number;

  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  @IsDate()
  updatedAt!: Date;
}