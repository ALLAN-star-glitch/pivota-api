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
  IsUUID,
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

  // UPDATED: Now points to the Category ID in the HOUSING vertical
  @ApiProperty({
    description: 'The Category ID for this housing unit (e.g., Apartment, Studio, Office)',
    example: 'clm123housingid',
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

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

  @ApiPropertyOptional({
    description: 'Number of bedrooms available',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms available',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'List of amenities included in the house',
    example: ['Parking', 'WiFi', 'Backup Generator'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'Whether the house is fully furnished',
    example: true,
  })
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

  @ApiPropertyOptional({
    description: 'Estate, neighborhood, or area name',
    example: 'Kilimani',
  })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({
    description: 'Exact address or nearby landmark',
    example: 'Near Yaya Centre',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Image URLs of the house (first image becomes the main image)',
    example: [
      'https://cdn.pivotaconnect.com/houses/house-1.jpg',
      'https://cdn.pivotaconnect.com/houses/house-2.jpg',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}

export class CreateHouseListingGrpcRequestDto extends CreateHouseListingDto {
   @ApiProperty({
    description: 'UUID of the user creating the house listing (owner/agent)',
    example: '99bfc4c5-b83b-40b2-8fbb-eddf7431af41',
  })
  @IsUUID()
  ownerId!: string;
}

/* ======================================================
   UPDATE HOUSE LISTING
====================================================== */
export class UpdateHouseListingDto {
  @ApiPropertyOptional({
    description: 'Updated listing title',
    example: 'Renovated 2 Bedroom Apartment in Kilimani',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the house',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated price',
    example: 48000,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  bathrooms?: number;

  @ApiPropertyOptional({
    example: ['Parking', 'Balcony'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFurnished?: boolean;

  @ApiPropertyOptional({ example: 'Nairobi' })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: 'Near Sarit Centre' })
  @IsOptional()
  @IsString()
  address?: string;
}

/* ======================================================
   UPDATE LISTING STATUS
====================================================== */
export class UpdateHouseListingStatusDto {
  @ApiProperty({
    description: 'House listing ID',
    example: 'cml9x9p4x00012a9b3g6v3r2w',
  })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description: 'Owner UUID (authorization check)',
    example: '99bfc4c5-b83b-40b2-8fbb-eddf7431af41',
  })
  @IsUUID()
  ownerId!: string;

  @ApiProperty({
    description: 'New status of the listing',
    example: 'ARCHIVED',
    enum: HOUSE_LISTING_STATUSES,
  })
  @IsIn(HOUSE_LISTING_STATUSES)
  status!: string;
}

/* ======================================================
   SEARCH HOUSE LISTINGS
====================================================== */
export class SearchHouseListingsDto {
  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Nairobi',
  })
  @IsOptional()
  @IsString()
  city?: string;

  // UPDATED: Replaced 'type' with 'categoryId'
  @ApiPropertyOptional({
    description: 'Filter by category ID (from the unified Category system)',
    example: 'cat_housing_001',
  })
  @IsOptional()
  @IsString() // Use @IsUUID() if you use UUIDs
  categoryId?: string;

  // NEW: Filter by Listing Type (Intent)
  @ApiPropertyOptional({
    description: 'Filter by listing type',
    example: 'RENTAL',
    // You can use your HOUSE_LISTING_TYPES enum here
  })
  @IsOptional()
  @IsString()
  listingType?: string;

  @ApiPropertyOptional({
    description: 'Minimum price',
    example: 20000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number) // Ensures query params are cast to numbers
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price',
    example: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    example: 10,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Pagination offset',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;
}

/* ======================================================
   SCHEDULE HOUSE VIEWING
====================================================== */
export class ScheduleViewingDto {
  @ApiProperty({
    description: 'Requested viewing date and time (ISO 8601)',
    example: '2026-01-10T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  viewingDate!: string;

  @ApiPropertyOptional({ description: 'Specific user to schedule for (Admin only)' })
  @IsOptional()
  @IsUUID()
  targetViewerId?: string;

  @ApiPropertyOptional({
    description: 'Optional message to the agent/owner',
    example: 'I would like to see the balcony specifically.',
  })
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


/* ======================================================
    GET HOUSE LISTING BY ID
  ====================================================== */ 
export class GetHouseListingByIdDto {
  @ApiProperty({
    description: 'The unique ID of the house listing',
    example: 'cml9x9p4x00012a9b3g6v3r2w',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/* ======================================================
   GET LISTINGS BY OWNER
====================================================== */ 

export class GetListingsByOwnerDto {
  @ApiProperty({
    description: 'The UUID of the owner (from Identity Service)',
    example: '99bfc4c5-b83b-40b2-8fbb-eddf7431af41',
  })
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;
}

/* ======================================================
   ARCHIVE HOUSE LISTING
====================================================== */ 

export class ArchiveHouseListingDto {
  @ApiProperty({
    description: 'The ID of the house listing to archive',
    example: 'cml9x9p4x00012a9b3g6v3r2w',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

}


export class ArchiveHouseListingsGrpcRequestDto extends ArchiveHouseListingDto {
  @ApiProperty({
    description: 'The UUID of the owner performing the archive action',
    example: '99bfc4c5-b83b-40b2-8fbb-eddf7431af41',
  })
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;
}


/* ======================================================     
    UPDATE HOUSE LISTING REQUEST DTO
====================================================== */

export class UpdateHouseListingRequestDto {
  @ApiProperty({
    description: 'The updated data for the listing',
    type: UpdateHouseListingDto,
  })
  @IsNotEmpty()
  data!: UpdateHouseListingDto;
}


// The "Internal/gRPC" version of the Update DTO
export class UpdateHouseListingGrpcRequestDto extends UpdateHouseListingRequestDto {
  @IsString()
  @IsNotEmpty()
  callerId!: string;

  @IsUUID() // Enforces CUID format specifically
  @IsNotEmpty()
  listingId!: string;

  @IsString()
  @IsNotEmpty()
  userRole!: string;
}


