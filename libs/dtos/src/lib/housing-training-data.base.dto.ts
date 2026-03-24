// housing-training-data.base.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsDateString, 
  IsInt, 
  IsBoolean, 
  IsArray, 
  IsString, 
  IsNumber, 
  Min, 
  Max,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== BASE REQUEST DTOs (without auth) ====================

export class TrainingDataBaseRequestDto {
  @ApiPropertyOptional({ description: 'Start date for training data (ISO format)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for training data (ISO format)', example: '2026-03-23T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum number of records to return', example: 10000, default: 50000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Include label data in response', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  includeLabels?: boolean;

  @ApiPropertyOptional({ description: 'Only return records with labels (clicked, saved, contacted, etc.)', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  onlyLabeled?: boolean;

  @ApiPropertyOptional({ description: 'Exclude bot traffic from results', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  excludeBots?: boolean;

  @ApiPropertyOptional({ description: 'Filter by specific user UUIDs', example: ['user-123', 'user-456'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: 'Minimum dwell time in seconds', example: 5, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDwellTime?: number;

  @ApiPropertyOptional({ description: 'Include feature importance calculation', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  includeFeatureImportance?: boolean;

  @ApiPropertyOptional({ description: 'Minimum overall match score (0-1)', example: 0.5, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minOverallMatchScore?: number;

  @ApiPropertyOptional({ description: 'Filter by listing types', example: ['RENTAL', 'SALE'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listingTypes?: string[];

  @ApiPropertyOptional({ description: 'Filter by property types', example: ['APARTMENT', 'HOUSE'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyTypes?: string[];
}

export class StatsBaseRequestDto {
  @ApiPropertyOptional({ description: 'Start date for statistics (ISO format)', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for statistics (ISO format)', example: '2026-03-23T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExportBaseRequestDto {
  @ApiProperty({ description: 'Training data parameters', type: TrainingDataBaseRequestDto })
    @ValidateNested()
    @Type(() => TrainingDataBaseRequestDto)
    params!: TrainingDataBaseRequestDto;

  @ApiProperty({ description: 'Export format', example: 'json', enum: ['json', 'csv', 'parquet'] })
    @IsIn(['json', 'csv', 'parquet'])
    format!: 'json' | 'csv' | 'parquet';
}

export class SampleBaseRequestDto {
  @ApiPropertyOptional({ description: 'Number of sample records', example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;

  @ApiPropertyOptional({ description: 'Include label data in samples', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  includeLabels?: boolean;
}