/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-training-data-gateway.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  BaseResponseDto,
  TrainingDatasetResponseDto,
  DatasetStatsResponseDto,
  ExportDataDto,
  SampleRequestDto,
  StatsRequestDto,
  TrainingDataRequestDto,
} from '@pivota-api/dtos';

// Interface for the gRPC client
interface HousingTrainingDataServiceGrpc {
  GetTrainingDataset(data: TrainingDataRequestDto): Observable<BaseResponseDto<TrainingDatasetResponseDto>>;
  GetDatasetStats(data: StatsRequestDto): Observable<BaseResponseDto<DatasetStatsResponseDto>>;
  ExportTrainingData(data: any): Observable<BaseResponseDto<ExportDataDto>>;
  GetSampleData(data: SampleRequestDto): Observable<BaseResponseDto<SampleDataResponse>>;
}

// Sample data response structure
interface SampleDataResponse {
  sample: any[];
  featureSchema: any;
  labelSchema: any;
}

@Injectable()
export class HousingTrainingDataGatewayService {
  private readonly logger = new Logger(HousingTrainingDataGatewayService.name);
  private grpcService: HousingTrainingDataServiceGrpc;

  constructor(
    @Inject('HOUSING_TRAINING_PACKAGE') 
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<HousingTrainingDataServiceGrpc>('HousingTrainingDataService');
  }

  /**
   * Get comprehensive training dataset for AI/ML models
   */
  async getTrainingDataset(dto: TrainingDataRequestDto): Promise<BaseResponseDto<TrainingDatasetResponseDto>> {
    this.logger.debug(`GetTrainingDataset called for account: ${dto.accountUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetTrainingDataset(dto));
      return this.handleGrpcResponse(res, 'GetTrainingDataset');
    } catch (error) {
      this.logger.error(`GetTrainingDataset failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to get training dataset', 'GRPC_ERROR');
    }
  }

  /**
   * Get dataset statistics and insights
   */
  async getDatasetStats(dto: StatsRequestDto): Promise<BaseResponseDto<DatasetStatsResponseDto>> {
    this.logger.debug(`GetDatasetStats called for account: ${dto.accountUuid}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetDatasetStats(dto));
      return this.handleGrpcResponse(res, 'GetDatasetStats');
    } catch (error) {
      this.logger.error(`GetDatasetStats failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to get dataset statistics', 'GRPC_ERROR');
    }
  }

  /**
   * Export training data in various formats
   * Accepts TrainingDataRequestDto and format separately
   */
  async exportTrainingData(
    dto: TrainingDataRequestDto, 
    format: 'json' | 'csv' | 'parquet'
  ): Promise<BaseResponseDto<ExportDataDto>> {
    this.logger.debug(`ExportTrainingData called for account: ${dto.accountUuid}, format: ${format}`);
    
    try {
      // Create the ExportRequestDto expected by the gRPC service
      const exportRequest = {
        params: dto,
        format,
      };
      
      const res = await firstValueFrom(this.grpcService.ExportTrainingData(exportRequest));
      return this.handleGrpcResponse(res, 'ExportTrainingData');
    } catch (error) {
      this.logger.error(`ExportTrainingData failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to export training data', 'GRPC_ERROR');
    }
  }

  /**
   * Get a small sample of training data for inspection
   */
  async getSampleData(dto: SampleRequestDto): Promise<BaseResponseDto<SampleDataResponse>> {
    this.logger.debug(`GetSampleData called for account: ${dto.accountUuid}, size: ${dto.size || 10}`);
    
    try {
      const res = await firstValueFrom(this.grpcService.GetSampleData(dto));
      return this.handleGrpcResponse(res, 'GetSampleData');
    } catch (error) {
      this.logger.error(`GetSampleData failed: ${error.message}`);
      return BaseResponseDto.fail('Failed to get sample data', 'GRPC_ERROR');
    }
  }

  /**
   * Universal handler to standardize gRPC response mapping
   */
  private handleGrpcResponse<T>(res: BaseResponseDto<T>, methodName: string): BaseResponseDto<T> {
    this.logger.debug(`${methodName} gRPC: ${res?.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    
    return BaseResponseDto.fail(
      res?.message || `Internal error in ${methodName}`, 
      res?.code || 'INTERNAL_ERROR'
    );
  }
}