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

  @ApiPropertyOptional({ example: '123 Riverside Drive, Nairobi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Detailed description of the house',
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

  @ApiPropertyOptional({ example: 'KES', default: 'KES' })
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
    description: 'List of amenities',
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

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Kilimani' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

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
 * Admin: Create listing for an organization/account
 */
export class AdminCreateHouseListingDto extends CreateHouseListingDto {

  @ApiPropertyOptional({ description: 'The specific user to attribute the post to' })
  @IsOptional()
  @IsString()
  creatorId?: string;
}

/**
 * Internal/gRPC: Full Identity Context
 */
export class CreateHouseListingGrpcRequestDto extends CreateHouseListingDto {
  @IsString()
  @IsNotEmpty()
  creatorId?: string;

  @IsString()
  @IsNotEmpty()
  accountId?: string;

  @IsOptional()
  @IsString()
  creatorName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;
}

/* ======================================================
   SEARCH & FILTER DTOs
====================================================== */

export class SearchHouseListingsDto {
  @ApiPropertyOptional({ example: 'Nairobi' })
  @IsOptional()
  @IsString()
  city?: string;

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

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string; // Add this line to fix the error
}

/**
 * Dashboard Filtering
 */
export class GetOwnHousingFilterDto {
  @ApiPropertyOptional({ example: 'AVAILABLE', enum: HOUSE_LISTING_STATUSES })
  @IsOptional()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

export class GetAdminHousingFilterDto extends GetOwnHousingFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;
}

/* ======================================================
   UPDATE DTOs
====================================================== */

export class UpdateOwnHouseListingRequestDto {
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

  @ApiPropertyOptional({ enum: HOUSE_LISTING_STATUSES })
  @IsOptional()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

/**
 * Admin: Can update account/creator association
 */
export class UpdateAdminHouseListingRequestDto extends UpdateOwnHouseListingRequestDto {
  @IsOptional()
  @IsString()
  creatorId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class UpdateHouseListingGrpcRequestDto extends UpdateAdminHouseListingRequestDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @IsString()
  @IsNotEmpty()
  callerId!: string;

  @IsString()
  @IsNotEmpty()
  userRole!: string;
}

/* ======================================================
   VIEWINGS & UTILITY
====================================================== */

export class ScheduleViewingDto {
  @ApiProperty({ example: '2026-01-10T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  viewingDate!: string;

  @ApiPropertyOptional()
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

  @IsOptional()
  @IsString()
  targetViewerId?: string;
}

export class ArchiveHouseListingsGrpcRequestDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}

export class GetHouseListingByIdDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

/* ======================================================
   UPDATED: GET LISTINGS BY OWNER (DASHBOARD)
====================================================== */ 

export class GetListingsByOwnerDto {
  @ApiProperty({
    description: 'The Account UUID used as the primary owner (Org ID or Individual Account ID)',
    example: 'eb02ea40-4f17-4040-8885-0029105d9fb2',
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'Filter listings by their current lifecycle status',
    example: 'AVAILABLE',
    enum: HOUSE_LISTING_STATUSES,
  })
  @IsOptional()
  @IsString()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

export class UpdateHouseListingStatusDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(HOUSE_LISTING_STATUSES)
  status!: string;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}