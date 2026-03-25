/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-training-data.grpc.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  TrainingDatasetResponseDto,
  DatasetStatsResponseDto,
  ExportDataDto,
} from '@pivota-api/dtos';

import { TrainingDataParams } from '@pivota-api/interfaces';
import { HousingTrainingDataService } from '../services/housing-training-data.service';

@Controller('housing-training-data')
export class HousingTrainingDataController {
  private readonly logger = new Logger(HousingTrainingDataController.name);

  constructor(private readonly trainingDataService: HousingTrainingDataService) {}

  /**
   * Get comprehensive training dataset for AI/ML models
   */
  @GrpcMethod('HousingTrainingDataService', 'GetTrainingDataset')
  async getTrainingDataset(
    data: TrainingDataParams,
  ): Promise<BaseResponseDto<TrainingDatasetResponseDto>> {
    this.logger.debug(`GetTrainingDataset Request: ${JSON.stringify(data)}`);
    return this.trainingDataService.getTrainingDataset(data);
  }

  /**
   * Get dataset statistics and insights
   */
  @GrpcMethod('HousingTrainingDataService', 'GetDatasetStats')
  async getDatasetStats(
    data: TrainingDataParams,
  ): Promise<BaseResponseDto<DatasetStatsResponseDto>> {
    this.logger.debug(`GetDatasetStats Request: ${JSON.stringify(data)}`);
    return this.trainingDataService.getDatasetStats(data);
  }

  /**
   * Export training data in various formats
   */
  @GrpcMethod('HousingTrainingDataService', 'ExportTrainingData')
  async exportTrainingData(
    data: TrainingDataParams & { format?: 'json' | 'csv' | 'parquet' },
  ): Promise<BaseResponseDto<ExportDataDto>> {
    this.logger.debug(`ExportTrainingData Request - Format: ${data.format || 'json'}`);
    
    const { format = 'json', ...params } = data;
    return this.trainingDataService.exportTrainingData(params, format);
  }

  /**
   * Get a small sample of training data for inspection
   */
  @GrpcMethod('HousingTrainingDataService', 'GetSampleData')
  async getSampleData(
    data: TrainingDataParams,
  ): Promise<BaseResponseDto<any>> {
    this.logger.debug(`GetSampleData Request - Size: ${data.limit || 10}`);
    
    const response = await this.trainingDataService.getTrainingDataset({
      ...data,
      limit: Math.min(data.limit || 10, 100),
      onlyLabeled: false,
      excludeBots: false,
    });

    if (response.success && response.data) {
      return BaseResponseDto.ok(
        {
          sample: response.data.samples,
          featureSchema: response.data.features,
          labelSchema: response.data.labels,
        },
        'Sample data retrieved',
        'OK'
      );
    }

    return response as BaseResponseDto<any>;
  }
}