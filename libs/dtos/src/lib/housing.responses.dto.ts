import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  HOUSE_LISTING_TYPES, 
  HOUSE_LISTING_STATUSES, 
  HOUSE_VIEWING_STATUSES 
} from '@pivota-api/constants';
import { IsIn, IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsObject, IsDate, IsNotEmpty } from 'class-validator';

/* ======================================================
   SHARED BASIC DTOS (Identity Pillar)
====================================================== */

class UserBasicDto {
  @ApiProperty({ example: 'user_uuid_123', description: 'The UUID of the human creator' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'John Doe', description: 'The First + Last name of the human' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: '+254712345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

class AccountBasicDto {
  @ApiProperty({ example: 'acc_uuid_456', description: 'The UUID of the root account' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Pivota Properties Ltd', description: 'The Brand or Org name' })
  @IsString()
  name!: string;
}

export class NestedCategoryResponseDto {
  @ApiProperty({ example: 'cat_98765' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Apartment' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'apartment' })
  @IsString()
  slug!: string;

  @ApiProperty({ example: 'HOUSING' })
  @IsString()
  vertical!: string;
}

/* ======================================================
   IMAGE RESPONSE
====================================================== */
export class HouseImageResponseDto {
  @ApiProperty({ example: 'img_123abc' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'https://example.com/images/house1.jpg' })
  @IsString()
  url!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isMain!: boolean;
}

/* ======================================================
   HOUSE LISTING RESPONSE (Rich DTO)
====================================================== */
export class HouseListingResponseDto {
  @ApiProperty({ example: 'house_123abc' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'ext_456def' })
  @IsString()
  externalId!: string;

  @ApiProperty({ example: 'Spacious 3 Bedroom Apartment' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'A modern apartment in the city center...' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Detailed category information' })
  @IsObject()
  category!: NestedCategoryResponseDto;

  /* --- Identity Pillar --- */
  @ApiProperty({ description: 'The Human (Agent/Landlord) who created the listing' })
  @IsObject()
  creator!: UserBasicDto;

  @ApiProperty({ description: 'The Brand or Agency account owning this listing' })
  @IsObject()
  account!: AccountBasicDto;
  /* ---------------------- */

  @ApiProperty({
    description: 'Listing type (for sale or rent)',
    enum: HOUSE_LISTING_TYPES,
    example: 'RENTAL',
  })
  @IsString()
  listingType!: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 'KES' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @ApiProperty({
    description: 'List of amenities',
    type: [String],
    example: ['Parking', 'Balcony', 'Gym'],
  })
  @IsArray()
  @IsString({ each: true })
  amenities!: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  isFurnished!: boolean;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: '123 Riverside Drive, Nairobi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    enum: HOUSE_LISTING_STATUSES,
    example: 'ACTIVE',
  })
  @IsString()
  status!: string;

  @ApiProperty({ example: '2025-12-01T12:00:00Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ example: '2025-12-05T15:30:00Z' })
  @IsDate()
  updatedAt!: Date;

  @ApiPropertyOptional({ example: 'https://example.com/images/house1_main.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ type: [HouseImageResponseDto] })
  @IsArray()
  images!: HouseImageResponseDto[];
}

/* ======================================================
   NEW: HOUSE LISTING CREATE RESPONSE (Lean DTO)
====================================================== */
export class HouseListingCreateResponseDto {
  @ApiProperty({ 
    example: 'house_123abc', 
    description: 'The server-generated ID for the new listing' 
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ 
    example: 'ACTIVE', 
    description: 'The initial status of the listing' 
  })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiProperty({ 
    example: '2026-02-07T18:00:00.000Z', 
    description: 'ISO timestamp of creation' 
  })
  @IsString()
  @IsNotEmpty()
  createdAt!: string;
}

/* ======================================================
   HOUSE VIEWING RESPONSE
====================================================== */
export class HouseViewingResponseDto {
  @ApiProperty({ example: 'view_789xyz' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'house_123abc' })
  @IsString()
  houseId!: string;

  @ApiProperty({ example: 'user_456def' })
  @IsString()
  viewerId!: string;

  @ApiProperty({ example: '2026-01-05T14:00:00Z' })
  @IsDate()
  viewingDate!: Date;

  @ApiProperty({
    enum: HOUSE_VIEWING_STATUSES,
    example: 'SCHEDULED',
  })
  @IsIn(HOUSE_VIEWING_STATUSES)
  status!: string;

  @ApiPropertyOptional({ example: 'I will be coming with my spouse' })
  @IsOptional()
  @IsString()
  notes?: string;
}