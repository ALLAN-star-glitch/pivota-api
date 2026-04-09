/* eslint-disable @typescript-eslint/no-unused-vars */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  HOUSE_LISTING_TYPES,
  HOUSE_LISTING_STATUSES,
} from '@pivota-api/constants';
import { Transform, Type } from 'class-transformer';
import { AuthClientInfoDto } from './auth-client-info.dto';

/* ======================================================
   BASE SCHEMA (Shared properties)
====================================================== */

export abstract class BaseHouseListingDto {
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
    description: 'The Sub-Category ID for specific classification (e.g., Studio, Duplex)',
    example: 'sub-clm123id',
  })
  @IsString()
  @IsNotEmpty()
  subCategoryId!: string;

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
  @Type(() => Number)
  price!: number;

  @ApiPropertyOptional({ example: 'KES', default: 'KES' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Total square footage of the property',
    example: 1200,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  squareFootage?: number;

  @ApiPropertyOptional({
    description: 'Year the property was built',
    example: 2015,
    minimum: 1800,
    maximum: new Date().getFullYear()
  })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  @Type(() => Number)
  yearBuilt?: number;

  @ApiPropertyOptional({
    description: 'Type of property',
    example: 'APARTMENT',
    enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO']
  })
  @IsOptional()
  @IsString()
  @IsIn(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'])
  propertyType?: string;

  @ApiPropertyOptional({
    description: 'List of amenities',
    example: ['Parking', 'WiFi'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [value];
      }
    }
    return value;
  })
  amenities?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFurnished?: boolean;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @IsNotEmpty()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Kilimani' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  // ======================================================
  // NEW RENTAL FIELDS
  // ======================================================

  @ApiPropertyOptional({
    description: 'Minimum lease term in months (for rental listings)',
    example: 6,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minimumLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Maximum lease term in months (for rental listings)',
    example: 24,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maximumLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Security deposit amount in KES (for rental listings)',
    example: 50000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Whether pets are allowed (for rental listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPetFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Whether utilities are included in rent (for rental listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({
    description: 'Details about which utilities are included (water, electricity, internet, etc.)',
    example: 'Water and garbage only. Electricity and internet are extra.',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  utilitiesDetails?: string;

  // ======================================================
  // NEW SALE FIELDS
  // ======================================================

  @ApiPropertyOptional({
    description: 'Whether price is negotiable (for sale listings)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNegotiable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether title deed is available (for sale listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  titleDeedAvailable?: boolean;
}

/* ======================================================
   CREATE HOUSE LISTINGS (Public API)
====================================================== */

export class CreateHouseListingDto extends BaseHouseListingDto {}

export class AdminCreateHouseListingDto extends CreateHouseListingDto {
  @ApiPropertyOptional({ description: 'The specific user to attribute the post to' })
  @IsOptional()
  @IsString()
  creatorId?: string;
}

/* ======================================================
   SEARCH CONTEXT DTO
====================================================== */

export class SearchContextDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the search session',
    example: 'search_123'
  })
  @IsOptional()
  @IsString()
  searchId?: string;

  @ApiPropertyOptional({
    description: 'Search query text',
    example: '2 bedroom apartment in Kilimani'
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Position of the listing in search results (1-based)',
    example: 3
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  position?: number;

  @ApiPropertyOptional({
    description: 'Search filters applied',
    example: { minPrice: 20000, maxPrice: 50000, bedrooms: 2 }
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

/* ======================================================
   LISTING VIEW CONTEXT DTO
====================================================== */

export class ListingViewContextDto {
  @ApiProperty({
    description: 'UUID of the house seeker viewing the listing (person looking for housing)',
    example: 'user_123'
  })
  @IsString()
  @IsNotEmpty()
  seekerId!: string;

  @ApiProperty({
    description: 'Session identifier from JWT or generated',
    example: 'sess_123'
  })
  @IsString()
  sessionId!: string;

  @ApiProperty({
    description: 'Client device information - includes rich device details like type, OS version, browser',
    type: AuthClientInfoDto
  })
  @ValidateNested()
  @Type(() => AuthClientInfoDto)
  client!: AuthClientInfoDto;

  @ApiProperty({
    description: 'Platform where the event occurred - derived from device info',
    example: 'WEB',
    enum: ['WEB', 'MOBILE', 'API', 'CLI']
  })
  @IsEnum(['WEB', 'MOBILE', 'API', 'CLI'])
  platform!: 'WEB' | 'MOBILE' | 'API' | 'CLI';

  @ApiProperty({
    description: 'Referrer source',
    example: 'DIRECT'
  })
  @IsString()
  referrer!: string;

  @ApiPropertyOptional({
    description: 'Search context if the view came from search results',
    type: SearchContextDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchContextDto)
  search?: SearchContextDto;

  @ApiPropertyOptional({
    description: 'Time spent viewing the listing in seconds',
    example: 45
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  timeSpent?: number;

  @ApiPropertyOptional({
    description: 'Type of user interaction',
    example: 'CLICK',
    enum: ['CLICK', 'SCROLL', 'DWELL']
  })
  @IsOptional()
  @IsString()
  @IsIn(['CLICK', 'SCROLL', 'DWELL'])
  interactionType?: string;

  @ApiPropertyOptional({
    description: 'How long the view lasted in seconds',
    example: 30
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  viewDuration?: number;

  @ApiPropertyOptional({
    description: 'How far the user scrolled (percentage)',
    example: 75,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  scrollDepth?: number;
}

/* ======================================================
   INTERNAL / gRPC DTOs
====================================================== */

export class CreateHouseListingGrpcRequestDto extends BaseHouseListingDto {
  @ApiPropertyOptional({
    description: 'Supabase URLs generated by the gateway',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsOptional()
  @IsString()
  creatorName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  ownerEmail?: string;

  clientInfo?: AuthClientInfoDto;
}

/* ======================================================
   SEARCH & FILTER DTOs
====================================================== */

export class SearchHouseListingsDto {
  @ApiPropertyOptional({ 
    description: 'Filter listings by city name',
    example: 'Nairobi',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by listing type (rental or sale)',
    enum: HOUSE_LISTING_TYPES,
    enumName: 'HouseListingType',
    example: 'RENTAL'
  })
  @IsOptional()
  @IsString()
  @IsIn(HOUSE_LISTING_TYPES)
  listingType?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum price filter in KES (inclusive)',
    example: 20000,
    minimum: 0,
    maximum: 100000000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum price filter in KES (inclusive)',
    example: 60000,
    minimum: 0,
    maximum: 100000000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Minimum number of bedrooms required',
    example: 2,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Minimum square footage',
    example: 800,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minSquareFootage?: number;

  @ApiPropertyOptional({
    description: 'Maximum square footage',
    example: 2000,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxSquareFootage?: number;

  @ApiPropertyOptional({
    description: 'Filter by property type',
    example: 'APARTMENT',
    enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO']
  })
  @IsOptional()
  @IsString()
  @IsIn(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'])
  propertyType?: string;

  @ApiPropertyOptional({
    description: 'Minimum year built',
    example: 2000,
    minimum: 1800
  })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Type(() => Number)
  minYearBuilt?: number;

  @ApiPropertyOptional({
    description: 'Filter by furnished status',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFurnished?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by required amenities',
    example: ['Parking', 'WiFi'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

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
    description: 'Filter by pet friendly (for rental listings)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPetFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by utilities included (for rental listings)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by negotiable price (for sale listings)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNegotiable?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by title deed available (for sale listings)',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  titleDeedAvailable?: boolean;

  @ApiPropertyOptional({ 
    description: 'Maximum number of results to return (pagination)',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ 
    description: 'Number of results to skip for pagination',
    example: 0,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by main category ID (e.g., apartments, houses)',
    example: 'clm123housingid',
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific sub-category ID (e.g., studio, duplex, bungalow)',
    example: 'sub-clm123id',
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Context information for analytics tracking',
    type: ListingViewContextDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListingViewContextDto)
  context?: ListingViewContextDto;
}

export class GetOwnHousingFilterDto {
  @ApiPropertyOptional({ example: 'AVAILABLE', enum: HOUSE_LISTING_STATUSES })
  @IsOptional()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

export class GetAdminHousingFilterDto extends GetOwnHousingFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter listings by owning account UUID',
    example: '462908a2-0f23-472a-b2d7-54966d004256',
    format: 'uuid'
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter listings by creator/user UUID',
    example: '69a601b6-fdb9-4333-9c01-8895a8b3af45',
    format: 'uuid'
  })
  @IsOptional()
  @IsString()
  creatorId?: string;
}

/* ======================================================
   UPDATE DTOs
====================================================== */

export class UpdateOwnHouseListingRequestDto {
  @ApiPropertyOptional({ 
    description: 'Updated title of the house listing',
    example: 'Spacious 3 Bedroom Apartment with Parking in Kilimani',
    maxLength: 200,
    minLength: 5
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Updated detailed description of the property',
    example: 'Beautiful apartment in the heart of Kilimani...',
    maxLength: 2000,
    minLength: 20
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Updated monthly rent or sale price',
    example: 48000,
    minimum: 0,
    maximum: 100000000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ 
    description: 'Updated listing status',
    enum: HOUSE_LISTING_STATUSES,
    example: 'AVAILABLE'
  })
  @IsOptional()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bathrooms?: number;

  @ApiPropertyOptional({
    description: 'Total square footage of the property',
    example: 1200,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  squareFootage?: number;

  @ApiPropertyOptional({
    description: 'Year the property was built',
    example: 2015,
    minimum: 1800
  })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Type(() => Number)
  yearBuilt?: number;

  @ApiPropertyOptional({
    description: 'Type of property',
    example: 'APARTMENT',
    enum: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO']
  })
  @IsOptional()
  @IsString()
  @IsIn(['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'VILLA', 'STUDIO'])
  propertyType?: string;

  @ApiPropertyOptional({
    description: 'List of amenities',
    example: ['Parking', 'WiFi'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFurnished?: boolean;

  @ApiPropertyOptional({ example: 'Kilimani' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  // ======================================================
  // NEW RENTAL FIELDS FOR UPDATE
  // ======================================================

  @ApiPropertyOptional({
    description: 'Minimum lease term in months (for rental listings)',
    example: 6,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minimumLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Maximum lease term in months (for rental listings)',
    example: 24,
    minimum: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maximumLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Security deposit amount in KES (for rental listings)',
    example: 50000,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Whether pets are allowed (for rental listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPetFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Whether utilities are included in rent (for rental listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({
    description: 'Details about which utilities are included (water, electricity, internet, etc.)',
    example: 'Water and garbage only. Electricity and internet are extra.',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  utilitiesDetails?: string;

  // ======================================================
  // NEW SALE FIELDS FOR UPDATE
  // ======================================================

  @ApiPropertyOptional({
    description: 'Whether price is negotiable (for sale listings)',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isNegotiable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether title deed is available (for sale listings)',
    example: true,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  titleDeedAvailable?: boolean;
}

export class UpdateAdminHouseListingRequestDto extends UpdateOwnHouseListingRequestDto {
  @ApiPropertyOptional({ 
    description: 'Change the creator/owner of the listing',
    example: 'usr_456abc'
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ 
    description: 'Transfer listing to a different account',
    example: 'acc_789xyz'
  })
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
   VIEWING DTOs
====================================================== */

export abstract class BaseViewingDto {
  @ApiProperty({ 
    description: 'Proposed date and time for the viewing (ISO 8601 format)',
    example: '2026-03-15T14:00:00Z',
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  viewingDate!: string;

  @ApiPropertyOptional({ 
    description: 'Additional notes or special requests for the viewing',
    example: 'Please ensure parking is available. I will be bringing my family.',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ScheduleViewingDto extends BaseViewingDto {
  // No attendingUserId - house seeker is always the attendee
}

export class AdminScheduleViewingDto extends BaseViewingDto {
  @ApiProperty({ 
    description: 'UUID of the house seeker who will attend the viewing',
    example: 'user_789abc',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  targetViewerId!: string;

  @ApiPropertyOptional({ 
    description: 'Email of the house seeker who will attend the viewing (will be fetched from profile service if not provided)',
    example: 'viewer@example.com'
  })
  @IsOptional()
  @IsString()
  targetViewerEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Name of the house seeker who will attend the viewing (will be fetched from profile service if not provided)',
    example: 'Jane Doe'
  })
  @IsOptional()
  @IsString()
  targetViewerName?: string;
}

export class BaseViewingGrpcRequestDto extends BaseViewingDto {
  @ApiPropertyOptional({ 
    description: 'ID of the user making the request (from JWT) - optional, will be extracted from authenticated context if not provided',
    example: 'user_123abc'
  })
  @IsOptional()
  @IsString()
  callerId?: string;

  @ApiPropertyOptional({ 
    description: 'Email of the user making the request (from JWT) - optional, will be extracted from authenticated context if not provided',
    example: 'user@example.com'
  })
  @IsOptional()
  @IsString()
  callerEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Name of the user making the request (from JWT) - optional, will be extracted from authenticated context if not provided',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString()
  callerName?: string;

  @ApiProperty({ 
    description: 'ID of the property to view',
    example: 'cmlqzy0zt000mdl7nx18c66bu'
  })
  @IsString()
  @IsNotEmpty()
  houseId!: string;

  @ApiPropertyOptional({ 
    description: 'Role of the user making the request (from JWT) - optional, will be extracted from authenticated context if not provided',
    example: 'GeneralUser'
  })
  @IsOptional()
  @IsString()
  userRole?: string;

  @ApiPropertyOptional({
    description: 'Context information for analytics tracking',
    type: ListingViewContextDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListingViewContextDto)
  context?: ListingViewContextDto;
}

export class ScheduleViewingGrpcRequestDto extends BaseViewingGrpcRequestDto {
  // No attendingUserId - house seeker is always the attendee
}

export class ScheduleAdminViewingGrpcRequestDto extends BaseViewingGrpcRequestDto {
  @ApiProperty({ 
    description: 'ID of the house seeker who will attend the viewing (required for admin)',
    example: 'user_789abc',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  targetViewerId!: string;

  @ApiPropertyOptional({ 
    description: 'Email of the house seeker who will attend the viewing (will be fetched from profile service if not provided)',
    example: 'viewer@example.com'
  })
  @IsOptional()
  @IsString()
  targetViewerEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Name of the house seeker who will attend the viewing (will be fetched from profile service if not provided)',
    example: 'Jane Doe'
  })
  @IsOptional()
  @IsString()
  targetViewerName?: string;

  @ApiPropertyOptional({ 
    description: 'Admin audit metadata for tracking',
    example: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      scheduledAt: '2026-03-04T10:30:00Z',
      isAdminBooking: true
    }
  })
  @IsOptional()
  @IsObject()
  adminMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    scheduledAt: string;
    isAdminBooking: boolean;
  };
}

export class ArchiveHouseListingsGrpcRequestDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}

/* ======================================================
   HOUSING SERVICE API DTOs
====================================================== */

export class GetHouseListingByIdDto {
  @ApiProperty({
    description: 'The unique identifier of the house listing',
    example: 'listing_123'
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiPropertyOptional({
    description: 'Context information for analytics tracking (device, session, etc.)',
    type: () => ListingViewContextDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ListingViewContextDto)
  context?: ListingViewContextDto;
}

export class GetListingsByOwnerDto {
  @ApiProperty({
    description: 'The account ID of the owner',
    example: 'acc_123'
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'Filter listings by status',
    example: 'AVAILABLE',
    enum: HOUSE_LISTING_STATUSES
  })
  @IsOptional()
  @IsString()
  @IsIn(HOUSE_LISTING_STATUSES)
  status?: string;
}

export class UpdateHouseListingStatusDto {
  @ApiProperty({
    description: 'The unique identifier of the listing',
    example: 'listing_123'
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'The new status for the listing',
    example: 'AVAILABLE',
    enum: HOUSE_LISTING_STATUSES
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(HOUSE_LISTING_STATUSES)
  status!: string;

  @ApiProperty({
    description: 'The owner account ID for authorization',
    example: 'acc_123'
  })
  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}