import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  HOUSE_LISTING_TYPES,
  HOUSE_LISTING_STATUSES,
} from '@pivota-api/constants';
import { Type } from 'class-transformer';

/* ======================================================
   CREATE HOUSE LISTING
====================================================== */
export class CreateHouseListingDto {
  @ApiProperty({
    description: 'Public-facing title of the house listing',
    example: 'Modern 2 Bedroom Apartment in Kilimani',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the house, amenities, and rules',
    example: 'Spacious apartment with parking, backup power, and security.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'The Category ID for this housing unit',
    example: 'clm123housingid',
  })
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @ApiProperty({
    description: 'Whether the house is for rent or sale',
    example: 'RENTAL',
    enum: HOUSE_LISTING_TYPES,
  })
  @IsIn(HOUSE_LISTING_TYPES)
  listingType!: string;

  @ApiProperty({
    description: 'Listing price (monthly rent or sale price)',
    example: 45000,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    description: 'Currency used for pricing',
    example: 'KES',
    default: 'KES',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'List of amenities included in the house',
    example: ['Parking', 'WiFi'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiProperty({
    description: 'City or town where the house is located',
    example: 'Nairobi',
  })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Kilimani' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: 'Near Yaya Centre' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Image URLs of the house',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

/**
 * UPDATED: The Internal/gRPC version using Identity Pillars
 */
export class CreateHouseListingGrpcRequestDto extends CreateHouseListingDto {
  @ApiProperty({ description: 'The unique UUID of the human creator' })
  @IsString()
  @IsNotEmpty()
  creatorId?: string;


  @ApiProperty({ description: 'The unique UUID of the root account (Individual or Org)' })
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}

/* ======================================================
   SEARCH & UPDATES (Consolidated)
====================================================== */

export class SearchHouseListingsDto {
  @ApiPropertyOptional({ example: 'Nairobi' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'cat_housing_001' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'RENTAL' })
  @IsOptional()
  @IsString()
  listingType?: string;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  // --- ADD THIS SECTION ---
  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number) // Important for query params (strings) to be cast to numbers
  bedrooms?: number;
  // -------------------------

  @ApiPropertyOptional({ example: 10, default: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;
}

export class UpdateHouseListingDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 48000 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'AVAILABLE', enum: HOUSE_LISTING_STATUSES })
  @IsOptional()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

export class UpdateHouseListingRequestDto {
  @ApiProperty({ type: UpdateHouseListingDto })
  @IsNotEmpty()
  data!: UpdateHouseListingDto;
}

export class UpdateHouseListingGrpcRequestDto extends UpdateHouseListingRequestDto {
  @IsString()
  @IsNotEmpty()
  callerId!: string;

  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @IsString()
  @IsNotEmpty()
  userRole!: string;
}

/* ======================================================
   VIEWINGS & ARCHIVE
====================================================== */

export class ScheduleViewingDto {
  @ApiProperty({ example: '2026-01-10T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  viewingDate!: string;

  @IsOptional()
  @IsString()
  targetViewerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ScheduleViewingGrpcRequestDto extends ScheduleViewingDto {
  @IsString()
  @IsNotEmpty()
  callerId!: string;

  @IsString()
  @IsNotEmpty()
  houseId!: string;

  @IsString()
  @IsNotEmpty()
  userRole!: string;
}

export class ArchiveHouseListingDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class ArchiveHouseListingsGrpcRequestDto extends ArchiveHouseListingDto {
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}

/* ======================================================
   UPDATE LISTING STATUS
====================================================== */
export class UpdateHouseListingStatusDto {
  @ApiProperty({
    description: 'The unique ID (CUID/UUID) of the house listing',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'The target status for the listing',
    example: 'RENTED',
    enum: HOUSE_LISTING_STATUSES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(HOUSE_LISTING_STATUSES)
  status!: string;

  @ApiProperty({
    description: 'The ID of the owner/creator authorized to perform this status change',
    example: 'user-123-xyz',
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}

/* ======================================================
    GET HOUSE LISTING BY ID
====================================================== */ 
export class GetHouseListingByIdDto {
  @ApiProperty({
    description: 'The unique internal ID (CUID/UUID) of the house listing',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/* ======================================================
   GET LISTINGS BY OWNER (DASHBOARD)
====================================================== */ 
export class GetListingsByOwnerDto {
  @ApiProperty({
    description: 'The unique UUID of the owner (matches creatorId or accountId)',
    example: 'user-uuid-12345',
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}