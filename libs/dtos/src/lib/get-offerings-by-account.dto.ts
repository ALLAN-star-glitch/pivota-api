// get-offerings-by-account.dto.ts

import { IsOptional, IsNumber, Min, Max, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetOfferingsByAccountRequestDto {
  @ApiProperty({ 
    example: 'account_123', 
    description: 'Account UUID to filter by' 
  })
  @IsUUID()
  accountId!: string;

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
  // Note: Account-specific data is usually NOT cached
  // because it's user-specific and changes frequently

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache',
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
    description: 'Read-only mode - don\'t write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}