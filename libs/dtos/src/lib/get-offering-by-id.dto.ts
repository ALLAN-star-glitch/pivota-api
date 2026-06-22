

import { IsOptional, IsBoolean, IsNumber, Min, Max, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetOfferingByIdRequestDto {
  @ApiProperty({ 
    example: 'offering_123', 
    description: 'Service offering ID' 
  })
  @IsString()
  id!: string;

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
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 600, 
    description: 'Override cache TTL in seconds (default: 600, min: 10, max: 3600)',
    default: 600
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

    @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache',
    default: false
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    skipCache?: boolean;
}