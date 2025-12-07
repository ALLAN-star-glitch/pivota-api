import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Param,
  Version,
  UseGuards,
  Req,
} from '@nestjs/common';

import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  CreateProviderJobDto,
  ProviderJobResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '@pivota-api/guards';
import { Roles } from '@pivota-api/decorators';

import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtRequest } from '@pivota-api/interfaces';



@ApiTags('Jobs Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('jobs-module')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // ===========================================================
  // CREATE JOB POST (Authenticated User)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('jobs')
  @ApiOperation({summary: 'Create a new job post'})
  async createJobPost(
    @Body() dto: CreateJobPostDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const userId = req.user.userUuid;

    dto.creatorId = userId;

    this.logger.debug(
      `REST createJobPost request by user=${userId}: ${JSON.stringify(dto)}`,
    );

    return this.jobsService.createJobPost(dto);
  }


  // ===========================================================
  // GET JOB BY ID (Public)
  // ===========================================================
  @ApiParam({ name: 'id', type: String })
  @Version('1')
  @Get('/:id')
  @ApiOperation({summary: 'Get a job post by ID'})
  async getJobPostById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`REST getJobPostById request: ${id}`);
    return this.jobsService.getJobPostById(id);
  }

  // ===========================================================
  // GET JOBS BY CATEGORY (Public)
  // ===========================================================
  @ApiParam({ name: 'categoryId', type: String })
  @Version('1')
  @Get('jobs/category/:categoryId')
  @ApiOperation({summary: 'Get all job posts by category'})
  async getJobsByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(`REST getJobsByCategory: ${categoryId}`);
    return this.jobsService.getJobsByCategory(categoryId);
  }

  // ===========================================================
  // CREATE PROVIDER JOB (Only Service Providers)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'PremiumUser')
  @Version('1')
  @Post('provider-jobs')
  @ApiOperation({summary: 'Create a new provider job'}) 
  async createProviderJob(
    @Body() dto: CreateProviderJobDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ProviderJobResponseDto>> {
    const providerId = req.user.userUuid;

    dto.providerId = providerId;

    this.logger.debug(
      `REST createProviderJob request by provider=${providerId}: ${JSON.stringify(
        dto,
      )}`,
    );

    return this.jobsService.createProviderJob(dto);
  }
}
