// In your dtos package - create GetAllOfferingsRequestDto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAllOfferingsRequestDto {
  @ApiPropertyOptional({ description: 'Number of records to return', default: 20 })
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of records to skip', default: 0 })
  offset?: number;

  @ApiPropertyOptional({ description: 'Filter by city' })
  city?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  maxPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Sort by option',
    enum: ['recent', 'price_asc', 'price_desc', 'rating'],
    default: 'recent'
  })
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'rating';

  @ApiPropertyOptional({ description: 'Minimum rating filter (1-5)' })
  minRating?: number;

  @ApiPropertyOptional({ description: 'Show only verified professionals' })
  verifiedOnly?: boolean;
}