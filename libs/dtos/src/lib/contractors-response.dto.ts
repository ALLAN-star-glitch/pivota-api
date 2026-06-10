// dtos/src/listings/service-offering.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsBoolean, IsArray, IsNumber, IsDate, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DayAvailabilityDto } from './AvailabilityDto.dto';

export class CreatorBasicDto {
  @ApiProperty({ example: 'usr_123abc' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class AccountBasicDto {
  @ApiProperty({ example: 'acc_456def' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ example: 'ABC Plumbing' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class ServiceOfferingResponseDto {
  @ApiProperty({ example: 'clv123abc', description: 'Internal database ID' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'uuid-456-789', description: 'External public ID' })
  @IsString()
  externalId!: string;

  @ApiProperty({ 
    description: 'UUID of the skilled professional (contractor) - use this for booking',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e'
  })
  skilledProfessionalId!: string;

  /* --- Identity Pillar --- */
  @ApiProperty({ description: 'The human individual who created the offering' })
  @IsObject()
  creator!: CreatorBasicDto;

  @ApiProperty({ description: 'The Brand/Organization account owning this service' })
  @IsObject()
  account!: AccountBasicDto;

  @ApiProperty({ 
    example: 'SKILLED_PROFESSIONAL', 
    description: 'Discriminator: SKILLED_PROFESSIONAL | INTERMEDIARY_AGENT | etc.' 
  })
  @IsString()
  contractorType!: string;

  @ApiProperty({ example: true, description: 'Provider verification status' })
  @IsBoolean()
  isVerified!: boolean;

  /* --- Professional Profile Fields (Enriched from Profile Service) --- */
  @ApiPropertyOptional({ example: 'prof_789ghi', description: 'UUID of the skilled professional profile' })
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Professional display name' })
  @IsOptional()
  @IsString()
  professionalName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/avatars/john.jpg', description: 'Professional avatar URL' })
  @IsOptional()
  @IsString()
  professionalAvatar?: string;

  @ApiPropertyOptional({ example: 8, description: 'Years of professional experience' })
  @IsOptional()
  @IsNumber()
  yearsExperience?: number;

  @ApiPropertyOptional({ 
    example: ['Nairobi CBD', 'Westlands', 'Kilimani'], 
    type: [String], 
    description: 'Cities/neighborhoods where this specific service is available' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageAreas?: string[];

  @ApiPropertyOptional({ example: 800, description: 'Hourly rate from profile' })
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;

  /* --- Listing Details --- */
  @ApiProperty({ example: 'Professional House Painting' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'High-quality painting services...' })
  @IsString()
  description!: string;

  @ApiProperty({ 
    example: ['PROFESSIONAL_SERVICES'], 
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

  @ApiPropertyOptional({ example: 'Plumbing', description: 'Category display name' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ example: 'sub_cat_123', description: 'Sub-category ID' })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiPropertyOptional({ example: 'Pipe Repair', description: 'Sub-category display name' })
  @IsOptional()
  @IsString()
  subCategoryName?: string;

  /* --- Pricing --- */
  @ApiProperty({ example: 5000 })
  @IsNumber()
  basePrice!: number;

  @ApiProperty({ example: 'PER_HOUR', enum: ['FIXED', 'PER_HOUR', 'PER_DAY', 'PER_SESSION'] })
  @IsString()
  priceUnit!: string;

  @ApiProperty({ example: 'KES' })
  @IsString()
  currency!: string;

  // ========== NEW: NEGOTIABLE PRICING FIELDS ==========

  @ApiPropertyOptional({ 
    description: 'Whether the price is negotiable (customer can propose different price)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;

  @ApiPropertyOptional({ 
    description: 'Minimum price professional is willing to accept (if negotiable)',
    example: 3000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  minNegotiablePrice?: number | null;

  @ApiPropertyOptional({ 
    description: 'Maximum price professional will charge (upper limit for negotiation)',
    example: 8000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  maxNegotiablePrice?: number | null;

  /* --- Availability --- */
  @ApiPropertyOptional({ 
    type: [DayAvailabilityDto], 
    description: 'Structured weekly working hours' 
  })
  @IsOptional()
  @IsArray()
  @Type(() => DayAvailabilityDto)
  availability?: DayAvailabilityDto[];

  /* --- Status --- */
  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Auto-archive date' })
  @IsOptional()
  @IsDate()
  expiresAt?: Date | null;

  /* --- Ratings & Reviews --- */
  @ApiProperty({ example: 4.8, description: 'Calculated average rating' })
  @IsNumber()
  averageRating!: number;

  @ApiProperty({ example: 24, description: 'Total number of reviews' })
  @IsNumber()
  reviewCount!: number;

  // ========== BOOKING FEE OVERRIDE FIELDS ==========

  @ApiPropertyOptional({ 
    description: 'Whether this service uses a custom booking fee (overrides profile default)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  useCustomBookingFee?: boolean;

  @ApiPropertyOptional({ 
    description: 'Custom booking fee enabled status for this service',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  customBookingFeeEnabled?: boolean | null;

  @ApiPropertyOptional({ 
    description: 'Custom booking fee amount for this service',
    example: 500
  })
  @IsOptional()
  @IsNumber()
  customBookingFeeAmount?: number | null;

  @ApiPropertyOptional({ 
    description: 'Custom booking fee currency for this service',
    example: 'KES',
    default: 'KES'
  })
  @IsOptional()
  @IsString()
  customBookingFeeCurrency?: string | null;

  @ApiPropertyOptional({ 
    description: 'Custom description for booking fee on this service',
    example: 'Call-out fee covers travel to your location and initial inspection'
  })
  @IsOptional()
  @IsString()
  customBookingFeeDescription?: string | null;

  @ApiPropertyOptional({ 
    description: 'Whether booking fee is refundable on cancellation for this service',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  customBookingFeeRefundable?: boolean | null;

  /* --- Timestamps --- */
  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  @IsDate()
  updatedAt!: Date;
}