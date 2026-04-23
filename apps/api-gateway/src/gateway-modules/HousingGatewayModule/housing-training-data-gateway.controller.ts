// housing-training-data-gateway.controller.ts
import { Controller, Get, Post, Query, Body, Req, UseGuards, Logger, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { Permissions } from '../../decorators/permissions.decorator';
import { SetModule } from '../../decorators/set-module.decorator';
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
  SampleWrapperResponseDto, 
  SampleSwaggerRequestDto, 
  SampleRequestDto 
} from '@pivota-api/dtos';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

@ApiTags('Housing Training Data')
@ApiBearerAuth('JWT')
@Controller('housing-training-data-gateway')
@SetModule(ModuleSlug.TRAINING_DATA)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HousingTrainingDataGatewayController {
  private readonly logger = new Logger(HousingTrainingDataGatewayController.name);

  constructor(
    private readonly trainingDataService: HousingTrainingDataGatewayService,
  ) {}

  @Get('dataset')
  @Permissions(P.TRAINING_DATA_ACCESS)
  @ApiOperation({ 
    summary: 'Get comprehensive training dataset for AI/ML models',
    description: `
      **🤖 AI Developer Endpoint**: Retrieves structured training data for machine learning models.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT)
      - **Permission Required:** \`${P.TRAINING_DATA_ACCESS}\`
      - **Accessible by:** AI Developer role only
      
      ---
      ## 📊 Data Returned
      | Component | Description |
      |-----------|-------------|
      | **Training Samples** | Structured data with features and labels |
      | **Feature Schema** | Data types, descriptions, and valid ranges |
      | **Label Schema** | Binary, continuous, or multiclass labels |
      | **Feature Importance** | Optional SHAP/LIME scores |
      | **Dataset Metadata** | Date range, filters, record count |
      
      ---
      ## 🎯 Use Cases
      - Training recommendation models (Collaborative Filtering, Neural Networks)
      - User behavior prediction (Conversion Probability)
      - Feature importance analysis (SHAP, LIME)
      - A/B testing evaluation
      
      ---
      ## 📈 Label Definitions
      | Label | Type | Description |
      |-------|------|-------------|
      | \`clicked\` | Binary | User clicked on listing |
      | \`saved\` | Binary | User saved listing to favorites |
      | \`contacted\` | Binary | User contacted provider |
      | \`viewing_scheduled\` | Binary | User scheduled a viewing |
      | \`time_spent\` | Continuous | Seconds spent viewing |
      
      ---
      ## 🎛️ Filtering Options
      | Parameter | Type | Description |
      |-----------|------|-------------|
      | \`startDate\` | ISO Date | Beginning of date range |
      | \`endDate\` | ISO Date | End of date range |
      | \`onlyLabeled\` | Boolean | Only records with labels |
      | \`excludeBots\` | Boolean | Remove bot traffic |
      | \`minDwellTime\` | Seconds | Minimum viewing duration |
      | \`minOverallMatchScore\` | 0-1 | Minimum AI match score |
      
      ---
      ## ⚠️ Rate Limits
      - **Free Tier:** 1,000 records/day
      - **Pro Tier:** 10,000 records/day
      - **Enterprise:** 100,000 records/day
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
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.TRAINING_DATA_ACCESS} permission (AI Developer role required)` })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTrainingDataset(
    @Query() query: TrainingDataSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<TrainingDataWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.sub} requesting training dataset`);
    
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
  @Permissions(P.TRAINING_DATA_ACCESS)
  @ApiOperation({ 
    summary: 'Get dataset statistics and insights',
    description: `
      **🤖 AI Developer Endpoint**: Retrieves statistical information about the training dataset.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT)
      - **Permission Required:** \`${P.TRAINING_DATA_ACCESS}\`
      - **Accessible by:** AI Developer role only
      
      ---
      ## 📊 Statistics Returned
      
      ### Volume Metrics
      | Metric | Description |
      |--------|-------------|
      | \`totalEvents\` | Total number of events in dataset |
      | \`uniqueUsers\` | Number of unique users |
      | \`uniqueListings\` | Number of unique listings |
      | \`uniqueSessions\` | Number of unique sessions |
      
      ### Label Distribution
      | Metric | Description |
      |--------|-------------|
      | \`clickRate\` | Percentage of events with clicks |
      | \`saveRate\` | Percentage of events with saves |
      | \`contactRate\` | Percentage with contact requests |
      | \`viewingRate\` | Percentage with scheduled viewings |
      
      ### Price Analysis
      | Metric | Description |
      |--------|-------------|
      | \`minPrice\` | Minimum listing price |
      | \`maxPrice\` | Maximum listing price |
      | \`avgPrice\` | Average listing price |
      
      ### Match Score Analysis
      | Metric | Description |
      |--------|-------------|
      | \`avgOverallMatchScore\` | Average AI match score |
      | \`avgLocationScore\` | Average location match |
      | \`avgPriceScore\` | Average price match |
      
      ---
      ## 🎯 Use Cases
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
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.TRAINING_DATA_ACCESS} permission (AI Developer role required)` })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDatasetStats(
    @Query() query: StatsSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<StatsWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.sub} requesting dataset stats`);
    
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
  @Permissions(P.TRAINING_DATA_EXPORT)
  @ApiOperation({ 
    summary: 'Download training data as file',
    description: `
      **🤖 AI Developer Endpoint**: Downloads the training dataset as a file.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT)
      - **Permission Required:** \`${P.TRAINING_DATA_EXPORT}\`
      - **Accessible by:** AI Developer role only
      
      ---
      ## 📁 Export Formats
      | Format | Extension | Best For | Tools |
      |--------|-----------|----------|-------|
      | **JSON** | .json | Full structured data with metadata | Python, Node.js |
      | **CSV** | .csv | Flat file for traditional ML | Excel, Pandas |
      | **Parquet** | .parquet | Columnar storage for big data | Spark, Dask |
      
      ---
      ## 🎯 Use Cases
      - Download data for local model training
      - Data exploration in Jupyter notebooks
      - Integration with external ML pipelines
      
      ---
      ## 📝 Example Request Body
      \`\`\`json
      {
        "format": "csv",
        "params": {
          "startDate": "2024-01-01",
          "endDate": "2024-12-31",
          "onlyLabeled": true,
          "limit": 50000
        }
      }
      \`\`\`
      
      ---
      ## 📥 Response
      Returns a file download with appropriate Content-Type header
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
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.TRAINING_DATA_EXPORT} permission (AI Developer role required)` })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async exportTrainingData(
    @Body() body: ExportSwaggerRequestDto,
    @Req() req: JwtRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`🤖 AI Training: ${req.user.sub} downloading training data in ${body.format} format`);
    
    const { format, params } = body;
    
    const dto: TrainingDataRequestDto = {
      ...params,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.exportTrainingData(dto, format);
    
    if (!response.success) {
      this.logger.warn(`Export failed: ${response.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
      return;
    }
    
    if (response.success && response.data) {
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
  @Permissions(P.TRAINING_DATA_EXPORT)
  @ApiOperation({ 
    summary: 'Quick CSV download',
    description: `
      **🤖 AI Developer Endpoint**: Direct CSV download endpoint.
      
      **Access Control:** Requires JWT authentication with ${P.TRAINING_DATA_EXPORT} permission (AI Developer role required)
      
      **Example:**
      \`\`\`
      GET /housing-training-data-gateway/export/csv?startDate=2024-01-01&endDate=2024-12-31&limit=10000
      \`\`\`
      
      **Response:** CSV file download
    `
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
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.TRAINING_DATA_EXPORT} permission (AI Developer role required)` })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async downloadCSV(
    @Query() query: TrainingDataSwaggerRequestDto,
    @Req() req: JwtRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📥 Downloading CSV for account: ${req.user.accountId}`);
    
    const dto: TrainingDataRequestDto = {
      ...query,
      accountUuid: req.user.accountId,
    };
    
    const response = await this.trainingDataService.exportTrainingData(dto, 'csv');
    
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
  @Permissions(P.TRAINING_DATA_ACCESS)
  @ApiOperation({ 
    summary: 'Get a small sample of training data for inspection',
    description: `
      **🤖 AI Developer Endpoint**: Returns a small sample of the training dataset for quick inspection.
      
      ---
      ## 🔐 Access Control
      - **Authentication:** Required (JWT)
      - **Permission Required:** \`${P.TRAINING_DATA_ACCESS}\`
      - **Accessible by:** AI Developer role only
      
      ---
      ## 🎯 Use Cases
      - Quick data preview before full download
      - Schema verification
      - Feature inspection
      - Sample-based validation
      
      ---
      ## 📊 Sample Size
      - **Minimum:** 1 record
      - **Maximum:** 100 records
      - **Default:** 10 records
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
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.TRAINING_DATA_ACCESS} permission (AI Developer role required)` })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSampleData(
    @Query() query: SampleSwaggerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<SampleWrapperResponseDto> {
    this.logger.log(`🤖 AI Training: ${req.user.sub} requesting sample data (size: ${query.size || 10})`);
    
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