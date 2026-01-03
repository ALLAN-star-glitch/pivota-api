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
  Patch,
} from '@nestjs/common';

import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  UpdateJobPostRequestDto,
  CloseJobPostRequestDto,
  CloseJobPostResponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
} from '@pivota-api/dtos';

import { ParseCuidPipe } from '@pivota-api/pipes';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtRequest } from '@pivota-api/interfaces';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';

@ApiTags('Jobs Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('jobs-module')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // ===========================================================
  // CREATE JOB POST
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'ModuleManager' , 'BusinessSystemAdmin', "BusinessContentAdmin", "GeneralUser")
  @Version('1')
  @Post('jobs')
  @ApiOperation({summary: 'Create a new job post'})
  async createJobPost(
    @Body() dto: CreateJobPostDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const userId = req.user.userUuid;
    dto.creatorId = userId;

    this.logger.debug(`REST createJobPost request by user=${userId}`);
    return this.jobsService.createJobPost(dto);
  }

  // ===========================================================
  // UPDATE JOB POST
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @Patch('jobs/:id')
  @ApiOperation({ summary: 'Update an existing job post' })
  @ApiParam({ name: 'id', type: String })
  async updateJobPost(
    @Param('id') id: string,
    @Body() dto: UpdateJobPostRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const userId = req.user.userUuid;
    
    dto.id = id;
    dto.creatorId = userId; // Identity enforcement

    this.logger.debug(`REST updateJobPost request for id=${id} by user=${userId}`);
    return this.jobsService.updateJobPost(dto);
  }

  // ===========================================================
  // CLOSE JOB POST
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @Patch('jobs/:id/close')
  @ApiOperation({ summary: 'Close a job post (Status Change)' })
  @ApiParam({ name: 'id', type: String })
  async closeJobPost(
    @Param('id') id: string,
    @Body() dto: CloseJobPostRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    const userId = req.user.userUuid;
    
    dto.id = id;
    dto.creatorId = userId; // Identity enforcement

    this.logger.debug(`REST closeJobPost request for id=${id} by user=${userId}`);
    return this.jobsService.closeJobPost(dto);
  }

 // ===========================================================
  // APPLY TO JOB POST
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GeneralUser', 'ModuleManager', 'SystemAdmin', 'SuperAdmin')
  @Version('1')
  @Post('jobs/:id/apply')
  @ApiOperation({ summary: 'Apply for a job post' })
  @ApiParam({ name: 'id', type: String, description: 'The CUID of the Job Post' })
  async applyToJobPost(
    // Validate the 'id' param using our new Pipe
    @Param('id', ParseCuidPipe) id: string, 
    @Body() dto: CreateJobApplicationDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    const userId = req.user.userUuid;

    this.logger.debug(`REST applyToJobPost validated for job=${id} by user=${userId}`);

    return this.jobsService.applyToJobPost(id, userId, dto);
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
    return this.jobsService.getJobsByCategory(categoryId);
  }

  // ===========================================================
  // Validate Job Post IDs
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ModuleManager', 'GeneralUser')
  @Version('1')
  @Post('jobs/validate-ids')
  @ApiOperation({ summary: 'Validate Job Post IDs' })
  @ApiBody({ type: ValidateJobPostIdsRequestDto })
  async validateJobIds(
    @Body() dto: ValidateJobPostIdsRequestDto,
  ) {
    return this.jobsService.validateJobPostIds(dto);
  }
}