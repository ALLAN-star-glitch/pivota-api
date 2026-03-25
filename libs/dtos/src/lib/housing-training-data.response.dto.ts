/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-training-data.response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== RESPONSE DTOs ====================

export class DateRangeDto {
  @ApiProperty({ description: 'Start date', example: '2026-01-01T00:00:00Z' })
    from!: string;

  @ApiProperty({ description: 'End date', example: '2026-03-23T23:59:59Z' })
    to!: string;
}

export class MetadataDto {
  @ApiProperty({ description: 'Export timestamp', example: '2026-03-23T10:00:00Z' })
    exportedAt!: string;

  @ApiProperty({ description: 'Total number of records', example: 15423 })
    totalRecords!: number;

  @ApiProperty({ description: 'Date range of data', type: DateRangeDto })
    dateRange!: DateRangeDto;

  @ApiProperty({ description: 'Dataset version', example: '2.0.0' })
    version!: string;

  @ApiProperty({ description: 'Filters applied to dataset', type: Object })
    filters!: Record<string, any>;
}

export class FeatureSetDto {
  @ApiProperty({ description: 'Feature names', type: [String] })
    names!: string[];

  @ApiProperty({ description: 'Feature types (numeric, categorical, boolean, datetime)', type: Object })
    types!: Record<string, 'numeric' | 'categorical' | 'boolean' | 'datetime'>;

  @ApiProperty({ description: 'Feature descriptions', type: Object })
    description!: Record<string, string>;

  @ApiProperty({ description: 'Feature data array', type: [Object] })
    data!: any[];
}

export class LabelSetDto {
  @ApiProperty({ description: 'Label names', type: [String] })
    names!: string[];

  @ApiProperty({ description: 'Label types (binary, continuous, multiclass)', type: Object })
    types!: Record<string, 'binary' | 'continuous' | 'multiclass'>;

  @ApiProperty({ description: 'Label descriptions', type: Object })
    description!: Record<string, string>;

  @ApiProperty({ description: 'Label data array', type: [Object] })
    data!: any[];
}

export class TrainingSampleDto {
  @ApiProperty({ description: 'Sample ID', example: 'cm123...' })
    id!: string;

  @ApiProperty({ description: 'User UUID', example: 'user-123' })
    userUuid!: string;

  @ApiProperty({ description: 'Listing ID', example: 'listing-456' })
    listingId!: string;

  @ApiProperty({ description: 'Timestamp', example: '2026-03-23T10:00:00Z' })
    timestamp!: string;

  @ApiProperty({ description: 'Feature values', type: Object })
    features!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Label values', type: Object })
  labels?: Record<string, any>;
}

export class TrainingDatasetResponseDto {
  @ApiProperty({ description: 'Dataset metadata', type: MetadataDto })
    metadata!: MetadataDto;

  @ApiProperty({ description: 'Feature set', type: FeatureSetDto })
    features!: FeatureSetDto;

  @ApiProperty({ description: 'Label set', type: LabelSetDto })
    labels!: LabelSetDto;

  @ApiProperty({ description: 'Training samples', type: [TrainingSampleDto] })
    samples!: TrainingSampleDto[];

  @ApiPropertyOptional({ description: 'Feature importance scores', type: Object })
  featureImportance?: Record<string, number>;
}

// ==================== STATS RESPONSE DTOs ====================

export class LabelDistributionDto {
  @ApiProperty({ description: 'Number of clicked events', example: 234 })
    clicked!: number;

  @ApiProperty({ description: 'Number of saved events', example: 123 })
    saved!: number;

  @ApiProperty({ description: 'Number of contacted events', example: 89 })
    contacted!: number;

  @ApiProperty({ description: 'Number of scheduled viewings', example: 45 })
    scheduledViewing!: number;

  @ApiProperty({ description: 'Number of completed viewings', example: 32 })
    completedViewing!: number;

  @ApiProperty({ description: 'Number of any interaction events', example: 446 })
    anyInteraction!: number;
}

export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price', example: 5000 })
    min!: number;

  @ApiProperty({ description: 'Maximum price', example: 150000 })
    max!: number;

  @ApiProperty({ description: 'Average price', example: 35000 })
    avg!: number;
}

export class MatchScoresDto {
  @ApiProperty({ description: 'Average overall match score', example: 0.65 })
    avgOverallMatchScore!: number;

  @ApiProperty({ description: 'Average price to budget ratio', example: 0.82 })
    avgPriceToBudgetRatio!: number;

  @ApiProperty({ description: 'Average location distance (km)', example: 3.2 })
    avgLocationDistance!: number;
}

export class DatasetStatsResponseDto {
  @ApiProperty({ description: 'Total number of events', example: 15423 })
    totalEvents!: number;

  @ApiProperty({ description: 'Date range of data', type: DateRangeDto })
    dateRange!: DateRangeDto;

  @ApiProperty({ description: 'Number of unique users', example: 2341 })
    uniqueUsers!: number;

  @ApiProperty({ description: 'Number of unique listings', example: 543 })
    uniqueListings!: number;

  @ApiProperty({ description: 'Label distribution', type: LabelDistributionDto })
    labelDistribution!: LabelDistributionDto;

  @ApiProperty({ description: 'Number of bot events', example: 123 })
    botTraffic!: number;

  @ApiProperty({ description: 'Average dwell time (seconds)', example: 12.5 })
    averageDwellTime!: number;

  @ApiProperty({ description: 'Price range statistics', type: PriceRangeDto })
    priceRange!: PriceRangeDto;

  @ApiProperty({ description: 'Match scores statistics', type: MatchScoresDto })
    matchScores!: MatchScoresDto;

  @ApiProperty({ description: 'Temporal distribution (date -> count)', type: Object })
    temporalDistribution!: Record<string, number>;

  @ApiProperty({ description: 'Hour distribution (hour -> count)', type: Object })
    hourDistribution!: Record<number, number>;

  @ApiProperty({ description: 'Day distribution (day -> count)', type: Object })
    dayDistribution!: Record<number, number>;
}

// ==================== EXPORT RESPONSE DTOs ====================

export class ExportDataDto {
  @ApiProperty({ description: 'Export format', example: 'csv', enum: ['json', 'csv', 'parquet'] })
    format!: string;

  @ApiProperty({ description: 'Exported data (base64 for binary formats)', example: 'id,userUuid,...' })
    data!: string;

  @ApiProperty({ description: 'Filename for download', example: 'housing_training_data_1742752800000.csv' })
    filename!: string;
}

// ==================== SAMPLE RESPONSE DTOs ====================

export class SampleDataDto {
  @ApiProperty({ description: 'Sample training data', type: [TrainingSampleDto] })
    sample!: TrainingSampleDto[];

  @ApiProperty({ description: 'Feature schema', type: FeatureSetDto })
    featureSchema!: FeatureSetDto;

  @ApiProperty({ description: 'Label schema', type: LabelSetDto })
    labelSchema!: LabelSetDto;
}

// ==================== WRAPPER RESPONSE DTOs ====================

export class TrainingDataWrapperResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
    success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Training dataset generated successfully' })
    message!: string;

  @ApiProperty({ description: 'Response code', example: 'OK' })
    code!: string;

  @ApiProperty({ description: 'Training dataset', type: TrainingDatasetResponseDto })
    data!: TrainingDatasetResponseDto;
}

export class StatsWrapperResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
    success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Dataset statistics retrieved' })
    message!: string;

  @ApiProperty({ description: 'Response code', example: 'OK' })
    code!: string;

  @ApiProperty({ description: 'Dataset statistics', type: DatasetStatsResponseDto })
    data!: DatasetStatsResponseDto;
}

export class ExportWrapperResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
    success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'CSV export ready' })
    message!: string;

  @ApiProperty({ description: 'Response code', example: 'OK' })
    code!: string;

  @ApiProperty({ description: 'Export data', type: ExportDataDto })
    data!: ExportDataDto;
}

export class SampleWrapperResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
    success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Sample data retrieved' })
    message!: string;

  @ApiProperty({ description: 'Response code', example: 'OK' })
    code!: string;

  @ApiProperty({ description: 'Sample data', type: SampleDataDto })
    data!: SampleDataDto;
}