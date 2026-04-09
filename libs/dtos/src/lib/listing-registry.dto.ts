import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceOfferingResponseDto } from './contractors-response.dto';
import { HouseListingResponseDto } from './housing.responses.dto';
import { JobPostResponseDto } from './jobs-responses.dto';
import { SupportProgramResponseDto } from './social-support-response.dto';
import { IsOptional, IsUUID, IsString, IsIn, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';


/* -------------------------------------------------------------------------- */
/* LISTING REGISTRY DATA WRAPPER                      */
/* -------------------------------------------------------------------------- */

/**
 * The core data structure containing all types of listings.
 * This is used by both Own and Admin flows.
 */
export class ListingRegistryDataDto {
  @ApiProperty({ type: [JobPostResponseDto] })
  jobs: JobPostResponseDto[] = [];

  @ApiProperty({ type: [HouseListingResponseDto] })
  houses: HouseListingResponseDto[] = [];

  @ApiProperty({ type: [ServiceOfferingResponseDto] })
  services: ServiceOfferingResponseDto[] = [];

  @ApiProperty({ type: [SupportProgramResponseDto] })
  support: SupportProgramResponseDto[] = [];

  @ApiProperty({
        description: 'Summary counts for the UI dashboard',
        example: { total: 10, active: 8 }
    })
    metadata!: {
        totalCount: number;
        activeCount?: number;
        appliedFilters?: Record<string, unknown>;
    };
}

/* -------------------------------------------------------------------------- */
/* OWN LISTINGS RESPONSE                           */
/* -------------------------------------------------------------------------- */

export class GetOwnListingsResponseDto {
  @ApiProperty({ example: true })
    success!: boolean;

  @ApiProperty({ example: 'Own listings retrieved successfully' })
    message!: string;

  @ApiProperty({ example: 200 })
    code!: number;

  @ApiProperty({ type: ListingRegistryDataDto })
    data!: ListingRegistryDataDto;

  @ApiProperty({ example: 'OK' })
    status!: string;
}

/* -------------------------------------------------------------------------- */
/* ADMIN LISTINGS RESPONSE                          */
/* -------------------------------------------------------------------------- */

export class GetAdminListingsResponseDto {
  @ApiProperty({ example: true })
    success!: boolean;

  @ApiProperty({ example: 'Admin listings retrieved successfully' })
    message!: string;

  @ApiProperty({ example: 200 })
    code!: number;

  @ApiProperty({ type: ListingRegistryDataDto })
    data!: ListingRegistryDataDto;

  @ApiProperty({ example: 'OK' })
    status!: string;
}

/* -------------------------------------------------------------------------- */
/* REGISTRY REQUEST FILTERS                           */
/* -------------------------------------------------------------------------- */

/**
 * Used for the Admin flow to filter across all verticals.
 */
export class AdminListingFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter by specific Organization or Individual account ID',
    example: '550e8400-e29b-41d4-a716-446655440000' 
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by the unique UUID of the user who created the listing',
    example: 'a123b456-c789-d012-e345-f67890abcdef' 
  })
  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @ApiPropertyOptional({ 
    description: 'The lifecycle status of the listing',
    enum: ['ACTIVE', 'DRAFT', 'PENDING', 'ARCHIVED', 'CLOSED', 'REJECTED'],
    example: 'ACTIVE'
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'DRAFT', 'PENDING', 'ARCHIVED', 'CLOSED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ 
    description: 'The vertical pillar the listing belongs to',
    enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @IsOptional()
  @IsString()
  @IsIn(['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'SERVICES'])
  vertical?: 'JOBS' | 'HOUSING' | 'SOCIAL_SUPPORT' | 'SERVICES';

  // ======================================================
  // NEW HOUSING-SPECIFIC FILTERS
  // ======================================================

  @ApiPropertyOptional({ 
    description: 'Filter housing listings by type (rent or sale)',
    enum: ['RENT', 'SALE'],
    example: 'RENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(['RENT', 'SALE'])
  listingType?: string;

  @ApiPropertyOptional({ 
    description: 'Filter housing listings by property type',
    enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'],
    example: 'APARTMENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'])
  propertyType?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum number of bedrooms for housing listings',
    example: 2,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minBedrooms?: number;

  @ApiPropertyOptional({ 
    description: 'Minimum price for housing listings (in KES)',
    example: 20000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum price for housing listings (in KES)',
    example: 100000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by minimum lease term in months (for rental listings)',
    example: 6,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minLeaseTerm?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by pet friendly status (for rental listings)',
    example: true
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Boolean)
  isPetFriendly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter by utilities included status (for rental listings)',
    example: true
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Boolean)
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter by negotiable price status (for sale listings)',
    example: true
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Boolean)
  isNegotiable?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter by title deed available status (for sale listings)',
    example: true
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Boolean)
  titleDeedAvailable?: boolean;
}