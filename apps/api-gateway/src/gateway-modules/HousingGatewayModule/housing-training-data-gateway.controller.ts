// housing-training-data-gateway.controller.ts
import { Controller, Get, Post, Query, Body, Req, UseGuards, Logger, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../guards/role.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { JwtRequest } from '@pivota-api/interfaces';
import { HousingTrainingDataGatewayService } from './housing-training-data-gateway.service';
import { 
  TrainingDataWrapperResponseDto, 
  TrainingDataSwaggerRequestDto, 
  TrainingDataRequestDto, 
  StatsWrapperResponseDto, 
  StatsSwaggerRequestDto, 
  StatsRequestDto, 
  ExportSwaggerRequestDto, 
  ExportWrapperResponseDto, 
  ExportRequestDto, 
  SampleWrapperResponseDto, 
  SampleSwaggerRequestDto, 
  SampleRequestDto 
} from '@pivota-api/dtos';

@ApiTags('Housing Training Data')
@ApiBearerAuth('JWT-auth')
@Controller('housing-training-data-gateway')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HousingTrainingDataGatewayController {
  private readonly logger = new Logger(HousingTrainingDataGatewayController.name);

  constructor(
    private readonly trainingDataService: HousingTrainingDataGatewayService,
  ) {}

  @Get('dataset')
  @Permissions('houses.read')
  @ApiOperation({ 
    summary: 'Get comprehensive training dataset for AI/ML models',
    description: `
      **AI Developer Endpoint**: Retrieves structured training data for machine learning models.
      
      **Access Control:** Requires JWT authentication with houses.read permission.
      
      **📊 Data Returned:**
      - Training samples with features and labels
      - Feature schemas (types and descriptions)
      - Label schemas (binary, continuous, multiclass)
      - Optional feature importance scores
      - Dataset metadata (date range, filters applied)
      
      **🎯 Use Cases:**
      - Training recommendation models
      - User behavior prediction
      - Conversion probability modeling
      - Feature importance analysis
      
      **Filters Available:**
      - Date range filtering
      - Only labeled data
      - Exclude bot traffic
      - Minimum dwell time
      - Minimum match score
      - Filter by listing/property types
      - Filter by specific users
    `
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records (default: 50000, max: 100000)' })
  @ApiQuery({ name: 'includeLabels', required: false, type: Boolean, description: 'Include label data in response' })
  @ApiQuery({ name: 'onlyLabeled', required: false, type: Boolean, description: 'Only return records with labels' })
  @ApiQuery({ name: 'excludeBots', required: false, type: Boolean, description: 'Exclude bot traffic from results' })
  @ApiQuery({ name: 'userIds', required: false, type: [String], description: 'Filter by specific user UUIDs' })
  @ApiQuery({ name: 'minDwellTime', required: false, type: Number, description: 'Minimum dwell time in seconds' })
  @ApiQuery({ name: 'includeFeatureImportance', required: false, type: Boolean, description: 'Include feature importance calculation' })
  @ApiQuery({ name: 'minOverallMatchScore', required: false, type: Number, description: 'Minimum overall match score (0-1)' })
  @ApiQuery({ name: 'listingTypes', required: false, type: [String], description: 'Filter by listing types (RENTAL, SALE)' })
  @ApiQuery({ name: 'propertyTypes', required: false, type: [String], description: 'Filter by property types (APARTMENT, HOUSE, etc.)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Training dataset generated successfully',
    type: TrainingDataWrapperResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTrainingDataset(
    @Query() query: TrainingDataSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<TrainingDataWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.userUuid} requesting training dataset`);
    
    const dto: TrainingDataRequestDto = {
      ...query,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.getTrainingDataset(dto);
    
    if (!response.success) {
      this.logger.warn(`Training dataset request failed: ${response.message}`);
      throw response;
    }
    
    this.logger.log(`✅ Training dataset generated: ${response.data?.metadata.totalRecords} records`);
    return response as TrainingDataWrapperResponseDto;
  }

  @Get('stats')
  @Permissions('houses.read')
  @ApiOperation({ 
    summary: 'Get dataset statistics and insights',
    description: `
      **AI Developer Endpoint**: Retrieves statistical information about the training dataset.
      
      **Access Control:** Requires JWT authentication with houses.read permission.
      
      **Statistics Returned:**
      - Total events and unique users/listings
      - Label distribution (clicks, saves, contacts, viewings)
      - Price range (min, max, avg)
      - Match scores (overall, price ratio, amenity, location)
      - Temporal distribution (daily/hourly/day-of-week patterns)
      - Bot traffic percentage
      - Average dwell time
      
      **🎯 Use Cases:**
      - Dataset quality assessment
      - Class imbalance detection
      - Temporal pattern analysis
      - Feature distribution understanding
    `
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dataset statistics retrieved',
    type: StatsWrapperResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDatasetStats(
    @Query() query: StatsSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<StatsWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.userUuid} requesting dataset stats`);
    
    const dto: StatsRequestDto = {
      ...query,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.getDatasetStats(dto);
    
    if (!response.success) {
      this.logger.warn(`Dataset stats request failed: ${response.message}`);
      throw response;
    }
    
    this.logger.log(`✅ Dataset stats: ${response.data?.totalEvents} total events`);
    return response as StatsWrapperResponseDto;
  }

  @Post('export')
  @Permissions('houses.read')
  @ApiOperation({ 
    summary: 'Download training data as file',
    description: `
      **AI Developer Endpoint**: Downloads the training dataset as a file (JSON, CSV, or Parquet).
      
      **Access Control:** Requires JWT authentication with houses.read permission.
      
      **📁 Export Formats:**
      - **JSON**: Full structured data with metadata, schemas, and samples
      - **CSV**: Flat file format for traditional ML tools (Excel, Pandas, etc.)
      - **Parquet**: Columnar storage format for big data processing (Spark, Dask)
      
      **🎯 Use Cases:**
      - Download data for local model training
      - Data exploration in Jupyter notebooks
      - Integration with external ML pipelines
      
      **Note:** This endpoint returns a file download. Use the POST method with JSON body.
    `
  })
  @ApiBody({ type: ExportSwaggerRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'File downloaded successfully',
    content: {
      'application/json': { schema: { type: 'string', format: 'binary' } },
      'text/csv': { schema: { type: 'string', format: 'binary' } },
      'application/octet-stream': { schema: { type: 'string', format: 'binary' } }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async exportTrainingData(
    @Body() body: ExportSwaggerRequestDto,
    @Req() req: JwtRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`🤖 AI Training: ${req.user.userUuid} downloading training data in ${body.format} format`);
    
    const dto: ExportRequestDto = {
      ...body,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.exportTrainingData(dto);
    
    if (!response.success) {
      this.logger.warn(`Export failed: ${response.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
      return;
    }
    
    if (response.success && response.data) {
      // Set appropriate content type based on format
      const contentType = response.data.format === 'csv' 
        ? 'text/csv' 
        : response.data.format === 'json' 
          ? 'application/json' 
          : 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${response.data.filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(response.data.data));
      
      this.logger.log(`✅ Download ready: ${response.data.filename}`);
      res.send(response.data.data);
      return;
    }
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
  }

  @Get('export/csv')
  @Permissions('houses.read')
  @ApiOperation({ 
    summary: 'Quick CSV download',
    description: 'Direct CSV download endpoint - opens in browser or saves as file. Use query parameters to filter data.'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max records (default: 50000)' })
  @ApiQuery({ name: 'onlyLabeled', required: false, type: Boolean, description: 'Only return records with labels' })
  @ApiQuery({ name: 'excludeBots', required: false, type: Boolean, description: 'Exclude bot traffic from results' })
  @ApiQuery({ name: 'minDwellTime', required: false, type: Number, description: 'Minimum dwell time in seconds' })
  @ApiQuery({ name: 'minOverallMatchScore', required: false, type: Number, description: 'Minimum overall match score (0-1)' })
  @ApiQuery({ name: 'listingTypes', required: false, type: [String], description: 'Filter by listing types (RENTAL, SALE)' })
  @ApiQuery({ name: 'propertyTypes', required: false, type: [String], description: 'Filter by property types (APARTMENT, HOUSE, etc.)' })
  @ApiResponse({ 
    status: 200, 
    description: 'CSV file downloaded',
    content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } }
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async downloadCSV(
    @Query() query: TrainingDataSwaggerRequestDto,
    @Req() req: JwtRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📥 Downloading CSV for account: ${req.user.accountId}`);
    
    const dto: ExportRequestDto = {
      params: query,
      format: 'csv',
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.exportTrainingData(dto);
    
    if (!response.success) {
      this.logger.warn(`CSV export failed: ${response.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
      return;
    }
    
    if (response.success && response.data) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${response.data.filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(response.data.data));
      this.logger.log(`✅ CSV download ready: ${response.data.filename}`);
      res.send(response.data.data);
      return;
    }
    
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
  }

  @Get('sample')
  @Permissions('houses.read')
  @ApiOperation({ 
    summary: 'Get a small sample of training data for inspection',
    description: `
      **AI Developer Endpoint**: Returns a small sample of the training dataset for quick inspection.
      
      **Access Control:** Requires JWT authentication with houses.read permission.
      
      **🎯 Use Cases:**
      - Quick data preview before full download
      - Schema verification
      - Feature inspection
      - Sample-based validation
      
      **Sample Size:** 1-100 records (default: 10)
    `
  })
  @ApiQuery({ name: 'size', required: false, type: Number, description: 'Number of samples (1-100)', example: 10 })
  @ApiQuery({ name: 'includeLabels', required: false, type: Boolean, description: 'Include label data', example: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Sample data retrieved',
    type: SampleWrapperResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSampleData(
    @Query() query: SampleSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<SampleWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.userUuid} requesting sample data (size: ${query.size || 10})`);
    
    const dto: SampleRequestDto = {
      ...query,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.getSampleData(dto);
    
    if (!response.success) {
      this.logger.warn(`Sample data request failed: ${response.message}`);
      throw response;
    }
    
    this.logger.log(`✅ Sample data: ${response.data?.sample.length} records`);
    return response as SampleWrapperResponseDto;
  }
}