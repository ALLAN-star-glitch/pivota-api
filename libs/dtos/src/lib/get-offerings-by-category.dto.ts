// get-offerings-by-category.dto.ts

import { IsOptional, IsNumber, Min, Max, IsBoolean, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetOfferingsByCategoryRequestDto {
@ApiPropertyOptional({ 
    example: 'cmnboid7w006sarihf05x9txr', 
    description: 'Category ID to filter by' 
  })
  @IsOptional()  // ← ADD THIS
  @IsString()    // ← Keep this
  categoryId?: string;  // ← Make optional

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

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Filter by city' 
  })
  @IsOptional()
  @IsString()
  city?: string;

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
    description: 'Override cache TTL in seconds (default: 300, min: 10, max: 3600)',
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
    description: 'Read-only mode - don\'t write to cache (for analytics)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}