import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { Type } from 'class-transformer';

export class GetOfferingByVerticalRequestDto {
  @ApiProperty({ 
    example: 'HOUSING', 
    description: 'The pillar of life to filter by',
    enum: VERTICALS
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VERTICALS, { message: 'Vertical must be JOBS, HOUSING, or SOCIAL_SUPPORT' })
  vertical!: string;

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Optional city filter for localized discovery' 
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ 
    example: 'cmnboid7w006sarihf05x9txr', 
    description: 'Filter by specific category ID' 
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ 
    example: 500, 
    description: 'Minimum price filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ 
    example: 5000, 
    description: 'Maximum price filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ 
    example: 4, 
    description: 'Minimum rating (1-5)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by verification status' 
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ 
    example: 'rating', 
    description: 'Sort order',
    enum: ['rating', 'price_asc', 'price_desc', 'experience', 'recent']
  })
  @IsOptional()
  @IsString()
  @IsIn(['rating', 'price_asc', 'price_desc', 'experience', 'recent'])
  sortBy?: string;

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  // ========== CACHE CONTROL ==========

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data from database (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache (Cache warming)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 300, 
    description: 'Override cache TTL in seconds (default: 300)',
    default: 300
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(3600)
  cacheTTL?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Read-only mode - don\'t write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}