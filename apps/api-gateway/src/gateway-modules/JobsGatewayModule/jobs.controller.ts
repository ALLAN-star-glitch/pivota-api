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
  SetMetadata,
} from '@nestjs/common';

import {
  BaseResponseDto,
  CreateJobPostGrpcDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  UpdateJobPostRequestDto,
  CloseJobPostRequestDto,
  CloseJobPostResponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  JobPostCreateResponseDto,
} from '@pivota-api/dtos';

import { ParseCuidPipe } from '@pivota-api/pipes';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtRequest } from '@pivota-api/interfaces';
// Updated Decorators
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';

/**
 * Helper decorator for SubscriptionGuard
 */
const SetModule = (slug: string) => SetMetadata('module', slug);

@ApiTags('Jobs Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(BaseResponseDto, JobPostCreateResponseDto, JobPostResponseDto, CloseJobPostResponseDto, JobApplicationResponseDto)
@Controller('jobs-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard) // Added SubscriptionGuard
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // ===========================================================
  // CREATE JOB POST
  // ===========================================================
  @Permissions('jobs.create')
  @SetModule('jobs') // Triggers plan check for the 'jobs' module
  @Version('1')
  @Post('jobs')
  @ApiOperation({ summary: 'Create a new job post' })
  async createJobPost(
    @Body() dto: CreateJobPostGrpcDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const requesterAccountId = req.user.accountId;

    const targetCreatorId = dto.creatorId || requesterUuid;
    const targetAccountId = dto.accountId || requesterAccountId;

    if (targetCreatorId !== requesterUuid || targetAccountId !== requesterAccountId) {
      // Admins check still uses requesterRole from JWT
      const isAdmin = ['SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin'].includes(requesterRole);

      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized Job Creation attempt by ${requesterUuid} for User ${targetCreatorId} / Account ${targetAccountId}`);
        return BaseResponseDto.fail(
          'You do not have permission to create jobs for other accounts or users.',
          'FORBIDDEN',
        );
      }

      this.logger.log(`👮 Admin ${requesterRole} (${requesterUuid}) creating job for: User ${targetCreatorId}, Account ${targetAccountId}`);
    }
    
    const sanitizedDto: CreateJobPostGrpcDto = {
      ...dto,
      creatorId: targetCreatorId,
      accountId: targetAccountId,
    };

    this.logger.debug(`Processing Job Creation for Account ${targetAccountId} initiated by ${requesterUuid}`);

    try {
      return await this.jobsService.createJobPost(sanitizedDto);
    } catch (error) {
      this.logger.error(`🔥 Critical error during job creation for account ${targetAccountId}`, error.stack);
      return BaseResponseDto.fail('An unexpected error occurred while creating the job post.', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // UPDATE JOB POST
  // ===========================================================
  @Permissions('jobs.update')
  @SetModule('jobs')
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
    dto.creatorId = userId; 

    this.logger.debug(`REST updateJobPost request for id=${id} by user=${userId}`);
    return this.jobsService.updateJobPost(dto);
  }

  // ===========================================================
  // CLOSE JOB POST
  // ===========================================================
  @Permissions('jobs.update')
  @SetModule('jobs')
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
    dto.creatorId = userId; 

    this.logger.debug(`REST closeJobPost request for id=${id} by user=${userId}`);
    return this.jobsService.closeJobPost(dto);
  }

  // ===========================================================
  // APPLY TO JOB POST
  // ===========================================================
  @Permissions('jobs.read') // Using 'read' permission for application access
  @Version('1')
  @Post('jobs/:id/apply')
  @ApiOperation({ summary: 'Apply for a job post' })
  @ApiParam({ name: 'id', type: String, description: 'The CUID of the Job Post' })
  async applyToJobPost(
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
  @Public()
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
  @Public()
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
  @Permissions('jobs.read')
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