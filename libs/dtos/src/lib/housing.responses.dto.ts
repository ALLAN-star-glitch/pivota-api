import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HOUSE_LISTING_TYPES, HOUSE_LISTING_STATUSES, HOUSE_VIEWING_STATUSES } from '@pivota-api/constants';
import { IsIn } from 'class-validator';
import { CategoryResponseDto } from './CategoryResponseDto.dto';

/* ======================================================
   IMAGE RESPONSE
====================================================== */
export class HouseImageResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the house image',
    example: 'img_123abc',
  })
  id!: string;

  @ApiProperty({
    description: 'URL of the house image',
    example: 'https://example.com/images/house1.jpg',
  })
  url!: string;

  @ApiProperty({
    description: 'Indicates if this image is the main display image',
    example: true,
  })
  isMain!: boolean;
}

/* ======================================================
   OWNER RESPONSE
====================================================== */
export class HouseOwnerResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the owner',
    example: 'user_987xyz',
  })
  id!: string;

  @ApiProperty({
    description: 'Full name of the house owner',
    example: 'John Doe',
  })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Phone number of the owner, if available',
    example: '+254712345678',
  })
  phone?: string;
}

/* ======================================================
   NESTED CATEGORY RESPONSE
====================================================== */ 

export class NestedCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  vertical!: string;
}

/* ======================================================
   HOUSE LISTING RESPONSE
====================================================== */
export class HouseListingResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the house listing',
    example: 'house_123abc',
  })
  id!: string;

  @ApiProperty({
    description: 'External identifier for public use or third-party integrations',
    example: 'ext_456def',
  })
  externalId!: string;

  @ApiProperty({
    description: 'Title of the house listing',
    example: 'Spacious 3 Bedroom Apartment',
  })
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the house',
    example: 'A modern apartment in the city center with a balcony and parking',
  })
  description!: string;

  // UPDATED: Rich Category data (Name, Slug, etc.)
  @ApiPropertyOptional({ 
    description: 'Detailed category information from the unified system',
    type: () => CategoryResponseDto 
  })
  category?: NestedCategoryResponseDto;


  @ApiProperty({
    description: 'Listing type (for sale or rent)',
    enum: HOUSE_LISTING_TYPES,
    example: 'RENT',
  })
  listingType!: string;

  @ApiProperty({
    description: 'Price of the house',
    example: 1500000,
  })
  price!: number;

  @ApiProperty({
    description: 'Currency of the price',
    example: 'KES',
  })
  currency!: string;

  @ApiPropertyOptional({
    description: 'Number of bedrooms',
    example: 3,
  })
  bedrooms?: number;

  @ApiPropertyOptional({
    description: 'Number of bathrooms',
    example: 2,
  })
  bathrooms?: number;

  @ApiProperty({
    description: 'List of amenities available in the house',
    type: [String],
    example: ['Parking', 'Balcony', 'Gym'],
  })
  amenities!: string[];

  @ApiProperty({
    description: 'Indicates whether the house is furnished',
    example: true,
  })
  isFurnished!: boolean;

  @ApiProperty({
    description: 'City where the house is located',
    example: 'Nairobi',
  })
  locationCity!: string;

  @ApiPropertyOptional({
    description: 'Neighborhood or suburb of the house',
    example: 'Westlands',
  })
  locationNeighborhood?: string;

  @ApiPropertyOptional({
    description: 'Full address of the house',
    example: '123 Riverside Drive, Nairobi',
  })
  address?: string;

  @ApiProperty({
    description: 'Current status of the listing',
    enum: HOUSE_LISTING_STATUSES,
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({
    description: 'Date and time the listing was created',
    example: '2025-12-01T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date and time the listing was last updated',
    example: '2025-12-05T15:30:00Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Primary image URL for the listing',
    example: 'https://example.com/images/house1_main.jpg',
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'List of all images for this house',
    type: [HouseImageResponseDto],
  })
  images!: HouseImageResponseDto[];

  @ApiProperty({
    description: 'Information about the owner of the house',
    type: HouseOwnerResponseDto,
  })
  owner!: HouseOwnerResponseDto;
}

/* ======================================================
   HOUSE VIEWING RESPONSE
====================================================== */
export class HouseViewingResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the house viewing record',
    example: 'view_789xyz',
  })
  id!: string;

  @ApiProperty({
    description: 'Identifier of the house being viewed',
    example: 'house_123abc',
  })
  houseId!: string;

  @ApiProperty({
    description: 'Identifier of the user viewing the house',
    example: 'user_456def',
  })
  viewerId!: string;

  @ApiProperty({
    description: 'Scheduled date and time of the viewing',
    example: '2026-01-05T14:00:00Z',
  })
  viewingDate!: Date;

  @ApiProperty({
    description: 'Status of the house viewing',
    enum: HOUSE_VIEWING_STATUSES,
    example: 'SCHEDULED',
  })
  @IsIn(HOUSE_VIEWING_STATUSES)
  status!: string;
}
