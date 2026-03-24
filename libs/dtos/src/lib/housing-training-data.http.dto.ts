// housing-training-data.http.dto.ts
import { ApiProperty, OmitType } from '@nestjs/swagger';
import {  IsUUID } from 'class-validator';
import { 
  TrainingDataBaseRequestDto, 
  StatsBaseRequestDto, 
  ExportBaseRequestDto,
  SampleBaseRequestDto 
} from './housing-training-data.base.dto';

// Extend base DTOs with account UUID (will not appear in Swagger docs)
export class TrainingDataRequestDto extends TrainingDataBaseRequestDto {
  @ApiProperty({ description: 'Account UUID from JWT', example: 'acc-123-456' })
  @IsUUID()
  accountUuid: string | undefined;
}

export class StatsRequestDto extends StatsBaseRequestDto {
  @ApiProperty({ description: 'Account UUID from JWT', example: 'acc-123-456' })
    @IsUUID()
    accountUuid!: string;
}

export class ExportRequestDto extends ExportBaseRequestDto {
  @ApiProperty({ description: 'Account UUID from JWT', example: 'acc-123-456' })
    @IsUUID()
    accountUuid!: string;
}

export class SampleRequestDto extends SampleBaseRequestDto {
  @ApiProperty({ description: 'Account UUID from JWT', example: 'acc-123-456' })
    @IsUUID()
    accountUuid!: string;
}

// For Swagger documentation - omit the accountUuid field
export class TrainingDataSwaggerRequestDto extends OmitType(TrainingDataRequestDto, ['accountUuid'] as const) {}
export class StatsSwaggerRequestDto extends OmitType(StatsRequestDto, ['accountUuid'] as const) {}
export class ExportSwaggerRequestDto extends OmitType(ExportRequestDto, ['accountUuid'] as const) {}
export class SampleSwaggerRequestDto extends OmitType(SampleRequestDto, ['accountUuid'] as const) {}