/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

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
  Query,
} from '@nestjs/common';

import {
  BaseResponseDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  CloseJobPostResponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  JobPostCreateResponseDto,
  AdminCreateJobPostDto,
  CreateJobPostDto,
  GetOwnJobsFilterDto,
  GetAdminJobsFilterDto,
  JobApplicationDetailResponseDto,
  GetAdminApplicationsFilterDto,
  GetOwnApplicationsFilterDto,
  CloseJobGrpcRequestDto,
  CloseAdminJobPostRequestHttpDto,
  UpdateAdminJobPostRequestHttpDto,
  UpdateJobGrpcRequestDto,
  UpdateOwnJobPostRequestHttpDto,
  GetAllJobsRequestDto,
  GetJobsByCategoryRequestDto,
  GetJobByIdRequestDto,
  GetJobListingsByOwnerDto,
  PaginationDto,
} from '@pivota-api/dtos';

import { ParseCuidPipe } from '@pivota-api/pipes';

import { JwtAuthGuard } from '../AuthenticationGatewayModule/jwt.guard';
import { 
  ApiBearerAuth, 
  ApiBody, 
  ApiExtraModels, 
  ApiOperation, 
  ApiParam, 
  ApiQuery,
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtRequest } from '@pivota-api/interfaces';
// Updated Decorators
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

// Import constants for Swagger enum display
import { 
  EMPLOYMENT_TYPES,
  PAYMENT_TYPES,
  WORK_ARRANGEMENTS,
  COMMITMENT_LEVELS,
  WORK_SCHEDULES,
  DOCUMENTATION_LEVELS,
  SKILL_LEVELS,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
} from '@pivota-api/constants';

@ApiTags('Jobs & Employment Pillar')
@ApiBearerAuth()
@ApiExtraModels(
  BaseResponseDto, 
  JobPostCreateResponseDto, 
  JobPostResponseDto, 
  CloseJobPostResponseDto, 
  JobApplicationResponseDto,
  PaginationDto
)
@SetModule(ModuleSlug.EMPLOYMENT)
@Controller('jobs-module')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  /**
   * Helper to parse boolean from query params
   * This fixes the "false" → true issue
   */
  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return !!value;
  }

  /**
   * Helper to parse number from query params
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Helper to parse date from query params
   */
  private parseDate(value: any): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value;
    return undefined;
  }

  // -----------------------------
  // Core Job Creation Logic
  // -----------------------------
  private async executeJobCreation(
    dto: (CreateJobPostDto & { creatorId: string; accountId: string; creatorName?: string; accountName?: string }) | AdminCreateJobPostDto,
    actorUuid: string
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    try {
      if ('accountId' in dto && dto.accountId && !('creatorName' in dto)) {
        this.logger.debug(`Processing ADMIN Job Creation for Account ${dto.accountId} initiated by admin ${actorUuid}`);
        return await this.jobsService.createAdminJobPost(dto as AdminCreateJobPostDto);
      }

      const ownDto = dto as CreateJobPostDto & { creatorId: string; accountId: string; creatorName?: string; accountName?: string };
      this.logger.debug(`Processing OWN Job Creation for Account ${ownDto.accountId} initiated by ${actorUuid}`);
      return await this.jobsService.createJobPost(ownDto);
      
    } catch (error) {
      this.logger.error(`🔥 Job creation execution failed`, error.stack);
      return BaseResponseDto.fail('Unexpected error while routing job creation', 'INTERNAL_ERROR');
    }
  }

  // ===========================================================
  // 💼 JOBS - USER OPERATIONS
  // ===========================================================

  @Post('jobs')
  @Permissions(P.EMPLOYMENT_CREATE_OWN)
  @ApiOperation({ 
    summary: 'Create a new job posting',
    description: 'Creates a new job posting for the authenticated user with all job characteristics and timeline fields.'
  })
  @ApiBody({ type: CreateJobPostDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Job post created successfully',
    type: JobPostCreateResponseDto
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createOwn(
    @Body() dto: CreateJobPostDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const requesterUuid = req.user.sub;
    const accountId = req.user.accountId;

    const sanitizedDto = {
      ...dto,
      creatorId: requesterUuid,
      accountId,
    };

    this.logger.log(`👤 User ${requesterUuid} creating their own job`);
    const response = await this.executeJobCreation(sanitizedDto, requesterUuid);
    if (!response.success) {
      this.logger.error(`Job creation failed for User ${requesterUuid}: ${response.message}`);
      throw response;
    }
    return response;
  }

  @Patch('jobs/:id')
  @Permissions(P.EMPLOYMENT_UPDATE_OWN)
  @Version('1')
  @ApiOperation({ 
    summary: 'Update your own job posting',
    description: 'Updates one or more fields of an existing job posting.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job posting',
    example: 'job_123abc'
  })
  @ApiBody({ type: UpdateOwnJobPostRequestHttpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Job post updated successfully',
    type: JobPostResponseDto
  })
  async updateOwn(
    @Param('id') id: string,
    @Body() dto: UpdateOwnJobPostRequestHttpDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const userId = req.user.sub;
    const accId = req.user.accountId;

    const sanitizedDto: UpdateJobGrpcRequestDto = {
      ...dto,
      id,
      creatorId: userId,
      accountId: accId,
    };

    this.logger.log(`👤 User ${userId} updating their own job ${id}`);
    const resp = await this.executeJobUpdate(sanitizedDto, userId, false);
    if (!resp.success) {
      this.logger.error(`Job update failed for User ${userId} on Job ${id}: ${resp.message}`);
      throw resp;
    }
    return resp;
  }

  @Get('my-listings')
@Permissions(P.EMPLOYMENT_READ)
@Version('1')
@ApiOperation({ 
  summary: 'Get your job postings',
  description: 'Retrieves all job postings created by the authenticated user with pagination and job characteristics filters.'
})
@ApiQuery({ 
  name: 'status', 
  required: false,
  description: 'Filter by job status',
  enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'],
  example: 'ACTIVE'
})
// Job Characteristics Filters
@ApiQuery({ 
  name: 'employmentType', 
  required: false,
  description: 'Filter by employment type',
  enum: EMPLOYMENT_TYPES,
  example: 'PERMANENT'
})
@ApiQuery({ 
  name: 'paymentType', 
  required: false,
  description: 'Filter by payment type',
  enum: PAYMENT_TYPES,
  example: 'SALARY'
})
@ApiQuery({ 
  name: 'workArrangement', 
  required: false,
  description: 'Filter by work arrangement',
  enum: WORK_ARRANGEMENTS,
  example: 'REMOTE'
})
@ApiQuery({ 
  name: 'commitment', 
  required: false,
  description: 'Filter by commitment level',
  enum: COMMITMENT_LEVELS,
  example: 'FULL_TIME'
})
@ApiQuery({ 
  name: 'experienceLevel', 
  required: false,
  description: 'Filter by experience level',
  enum: EXPERIENCE_LEVELS,
  example: 'MID_LEVEL'
})
@ApiQuery({ 
  name: 'educationLevel', 
  required: false,
  description: 'Filter by education level',
  enum: EDUCATION_LEVELS,
  example: 'BACHELORS'
})
// ============================================================
// NEW FILTERS - ADD THESE
// ============================================================
@ApiQuery({ 
  name: 'isAnonymous', 
  required: false,
  type: Boolean,
  description: 'Filter by anonymous status',
  example: false
})
@ApiQuery({ 
  name: 'hoursPerWeekMin', 
  required: false,
  type: Number,
  description: 'Minimum hours per week',
  example: 20
})
@ApiQuery({ 
  name: 'hoursPerWeekMax', 
  required: false,
  type: Number,
  description: 'Maximum hours per week',
  example: 40
})
@ApiQuery({ 
  name: 'limit', 
  required: false,
  type: Number,
  description: 'Results per page (default: 20, max: 100)',
  example: 20
})
@ApiQuery({ 
  name: 'offset', 
  required: false,
  type: Number,
  description: 'Pagination offset',
  example: 0
})
@ApiQuery({ 
  name: 'sortBy', 
  required: false,
  enum: ['recent', 'pay_asc', 'pay_desc'],
  description: 'Sort order',
  example: 'recent'
})
@ApiResponse({ 
  status: 200, 
  description: 'Jobs retrieved successfully',
  type: [JobPostResponseDto]
})
async getOwnJobs(
  @Req() req: JwtRequest,
  @Query() query: GetOwnJobsFilterDto,
): Promise<BaseResponseDto<JobPostResponseDto[]>> {
  const userId = req.user.sub;

  this.logger.log(
    `👤 User ${userId} fetching listings. Filter: ${query.status ?? 'ALL'}, ` +
    `employmentType=${query.employmentType}, paymentType=${query.paymentType}, ` +
    `workArrangement=${query.workArrangement}, commitment=${query.commitment}, ` +
    `experienceLevel=${query.experienceLevel}, educationLevel=${query.educationLevel}, ` +
    `isAnonymous=${query.isAnonymous}, hoursPerWeekMin=${query.hoursPerWeekMin}, ` +
    `hoursPerWeekMax=${query.hoursPerWeekMax}, ` +
    `limit=${query.limit}, offset=${query.offset}, sortBy=${query.sortBy}`
  );
  return this.jobsService.getOwnJobs(userId, query);
}

  @Patch('jobs/:id/close')
  @Permissions(P.EMPLOYMENT_CLOSE_OWN)
  @ApiOperation({ 
    summary: 'Close your own job posting',
    description: 'Marks a job posting as closed/archived.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job to close',
    example: 'job_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job closed successfully',
    type: CloseJobPostResponseDto
  })
  async closeOwn(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    const userId = req.user.sub;
    const accountId = req.user.accountId;

    const sanitizedDto: CloseJobGrpcRequestDto = {
      id,
      creatorId: userId,
      accountId,
    };

    this.logger.log(`👤 User ${userId} closing their own job ${id}`);
    const response = await this.executeJobClose(sanitizedDto, userId, false);
    if (!response.success) {
      throw response;
    }
    return response;
  }

  // ===========================================================
  // 📝 JOBS - APPLICATIONS
  // ===========================================================

  @Post('jobs/:id/apply')
  @Permissions(P.EMPLOYMENT_READ)
  @Version('1')
  @ApiOperation({ 
    summary: 'Apply for a job',
    description: 'Submit an application for a specific job posting.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String, 
    description: 'CUID of the Job Post',
    example: 'job_123abc'
  })
  @ApiBody({ type: CreateJobApplicationDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Application submitted successfully',
    type: JobApplicationResponseDto
  })
  async applyToJobPost(
    @Param('id', ParseCuidPipe) id: string, 
    @Body() dto: CreateJobApplicationDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    const userId = req.user.sub;
    this.logger.log(`📝 User ${userId} applying to job ${id}`);
    return this.jobsService.applyToJobPost(id, userId, dto);
  }

  @Get('my-applications')
  @Permissions(P.EMPLOYMENT_READ)
  @Version('1')
  @ApiOperation({ 
    summary: 'Get your job applications',
    description: 'Retrieves all job applications submitted by the authenticated user.'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by application status',
    enum: ['PENDING', 'REVIEWED', 'REJECTED', 'HIRED'],
    example: 'PENDING'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Applications retrieved successfully',
    type: [JobApplicationResponseDto]
  })
  async getOwnApplications(
    @Req() req: JwtRequest,
    @Query() query: GetOwnApplicationsFilterDto,
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const userId = req.user.sub;
    this.logger.log(`👤 User ${userId} fetching their applications. Filter: ${query.status ?? 'ALL'}`);
    return this.jobsService.getOwnApplications(userId, query.status);
  }

  @Get('applications/:id')
  @Permissions(P.EMPLOYMENT_READ)
  @Version('1')
  @ApiOperation({ 
    summary: 'Get application details',
    description: 'Retrieves complete details of a specific job application.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the application',
    example: 'app_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application details retrieved',
    type: JobApplicationDetailResponseDto
  })
  async getApplicationById(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobApplicationDetailResponseDto>> {
    const userId = req.user.sub;
    const userRole = req.user.role;
    
    this.logger.log(`🔍 User ${userId} (${userRole}) requesting full details for application ${id}`);
    
    const response = await this.jobsService.getApplicationById(id, userId, userRole);
    
    if (!response.success) {
      this.logger.warn(`Access denied for user ${userId} on application ${id}`);
      throw response; 
    }

    return response;
  }

  // ===========================================================
  // 👑 JOBS - ADMIN OPERATIONS
  // ===========================================================

  @Post('admin/accounts/:accountId/jobs')
  @Permissions(P.EMPLOYMENT_CREATE_ANY)
  @ApiOperation({ 
    summary: '[ADMIN] Create job posting for any account',
    description: 'Admin-only endpoint: Creates a job posting on behalf of any account.'
  })
  @ApiParam({ 
    name: 'accountId', 
    description: 'UUID of the organization owning this listing',
    example: 'eb02ea40-4f17-4040-8885-0029105d9fb2' 
  })
  @ApiBody({ type: AdminCreateJobPostDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Job created successfully',
    type: JobPostCreateResponseDto
  })
  async createAny(
    @Param('accountId') accountId: string, 
    @Body() dto: AdminCreateJobPostDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const finalData = { 
      ...dto, 
      accountId,
      creatorId: dto.creatorId || null 
    };

    this.logger.log(`👮 Admin ${req.user.sub} creating job for Account ${accountId}`);
    const response = await this.executeJobCreation(finalData, req.user.sub);
    if (!response.success) {
      throw response; 
    }
    return response;
  }

  @Patch('admin/jobs/:id')
  @Permissions(P.EMPLOYMENT_UPDATE_ANY)
  @Version('1')
  @ApiOperation({ 
    summary: '[ADMIN] Update any job posting',
    description: 'Admin-only endpoint: Updates any job posting in the system.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job to update',
    example: 'job_123abc'
  })
  @ApiBody({ type: UpdateAdminJobPostRequestHttpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Job updated successfully',
    type: JobPostResponseDto
  })
  async updateAny(
    @Param('id') id: string,
    @Body() dto: UpdateAdminJobPostRequestHttpDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const requesterUuid = req.user.sub;

    const sanitizedDto: UpdateJobGrpcRequestDto = {
      ...dto,
      id,
    } as UpdateJobGrpcRequestDto;

    this.logger.log(`👮 Admin ${requesterUuid} updating job ${id} for User ${dto.creatorId}`);
    const resp = await this.executeJobUpdate(sanitizedDto, requesterUuid, true);
    if (!resp.success) {
      this.logger.error(`Job update failed for Admin ${requesterUuid} on Job ${id}: ${resp.message}`);
      throw resp;
    }
    return resp;
  }

  @Patch('admin/jobs/:id/close')
  @Permissions(P.EMPLOYMENT_CLOSE_ANY)
  @ApiOperation({ 
    summary: '[ADMIN] Close any job posting',
    description: 'Admin-only endpoint: Closes any job posting in the system.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job to close',
    example: 'job_123abc'
  })
  @ApiBody({ type: CloseAdminJobPostRequestHttpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Job closed successfully',
    type: CloseJobPostResponseDto
  })
  async closeAny(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: CloseAdminJobPostRequestHttpDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    const requesterUuid = req.user.sub;

    const sanitizedDto: CloseJobGrpcRequestDto = {
      ...dto,
      id,
    };

    this.logger.log(`👮 Admin ${requesterUuid} closing job ${id}`);
    const response = await this.executeJobClose(sanitizedDto, requesterUuid, true);
    if (!response.success) {
      throw response;
    }
    return response;
  }

@Get('admin/listings')
@Permissions(P.EMPLOYMENT_READ)
@Version('1')
@ApiOperation({ 
  summary: '[ADMIN] Get all job postings',
  description: 'Admin-only endpoint: View all job postings with filters and pagination.'
})
@ApiQuery({ 
  name: 'status', 
  required: false,
  description: 'Filter by job status',
  enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED']
})
@ApiQuery({ 
  name: 'accountId', 
  required: false,
  description: 'Filter by owning account ID',
  type: String
})
@ApiQuery({ 
  name: 'creatorId', 
  required: false,
  description: 'Filter by creator ID',
  type: String
})
// Job Characteristics Filters
@ApiQuery({ 
  name: 'employmentType', 
  required: false,
  description: 'Filter by employment type',
  enum: EMPLOYMENT_TYPES,
  example: 'PERMANENT'
})
@ApiQuery({ 
  name: 'paymentType', 
  required: false,
  description: 'Filter by payment type',
  enum: PAYMENT_TYPES,
  example: 'SALARY'
})
@ApiQuery({ 
  name: 'workArrangement', 
  required: false,
  description: 'Filter by work arrangement',
  enum: WORK_ARRANGEMENTS,
  example: 'REMOTE'
})
@ApiQuery({ 
  name: 'commitment', 
  required: false,
  description: 'Filter by commitment level',
  enum: COMMITMENT_LEVELS,
  example: 'FULL_TIME'
})
@ApiQuery({ 
  name: 'experienceLevel', 
  required: false,
  description: 'Filter by experience level',
  enum: EXPERIENCE_LEVELS,
  example: 'MID_LEVEL'
})
@ApiQuery({ 
  name: 'educationLevel', 
  required: false,
  description: 'Filter by education level',
  enum: EDUCATION_LEVELS,
  example: 'BACHELORS'
})
@ApiQuery({ 
  name: 'isRemote', 
  required: false,
  description: 'Filter by remote status',
  type: Boolean,
  example: true
})
// ============================================================
// NEW ADMIN FILTERS - ADD THESE
// ============================================================
@ApiQuery({ 
  name: 'isAnonymous', 
  required: false,
  description: 'Filter by anonymous status',
  type: Boolean,
  example: false
})
@ApiQuery({ 
  name: 'applicationDeadlineAfter', 
  required: false,
  description: 'Filter jobs with application deadline after this date (ISO 8601)',
  type: String,
  example: '2025-12-01T00:00:00Z'
})
@ApiQuery({ 
  name: 'applicationDeadlineBefore', 
  required: false,
  description: 'Filter jobs with application deadline before this date (ISO 8601)',
  type: String,
  example: '2025-12-31T23:59:59Z'
})
@ApiQuery({ 
  name: 'startDateAfter', 
  required: false,
  description: 'Filter jobs with start date after this date (ISO 8601)',
  type: String,
  example: '2026-01-01T00:00:00Z'
})
@ApiQuery({ 
  name: 'startDateBefore', 
  required: false,
  description: 'Filter jobs with start date before this date (ISO 8601)',
  type: String,
  example: '2026-01-15T00:00:00Z'
})
@ApiQuery({ 
  name: 'hoursPerWeekMin', 
  required: false,
  description: 'Minimum hours per week',
  type: Number,
  example: 20
})
@ApiQuery({ 
  name: 'hoursPerWeekMax', 
  required: false,
  description: 'Maximum hours per week',
  type: Number,
  example: 40
})
@ApiQuery({ 
  name: 'limit', 
  required: false,
  type: Number,
  description: 'Results per page (default: 20, max: 100)',
  example: 20
})
@ApiQuery({ 
  name: 'offset', 
  required: false,
  type: Number,
  description: 'Pagination offset',
  example: 0
})
@ApiQuery({ 
  name: 'sortBy', 
  required: false,
  enum: ['recent', 'pay_asc', 'pay_desc'],
  description: 'Sort order',
  example: 'recent'
})
@ApiResponse({ 
  status: 200, 
  description: 'Jobs retrieved successfully',
  type: [JobPostResponseDto]
})
async getAdminJobs(
  @Req() req: JwtRequest,
  @Query() query: GetAdminJobsFilterDto,
): Promise<BaseResponseDto<JobPostResponseDto[]>> {
  const adminId = req.user.sub;
  const actorRole = req.user.role;

  if (actorRole === 'Individual' || actorRole === 'Member') {
    this.logger.warn(`🛑 Unauthorized admin access attempt by ${adminId}`);
    return BaseResponseDto.fail('Unauthorized access to administrative listings.', 'FORBIDDEN');
  }

  this.logger.log(
    `👮 Admin ${adminId} (${actorRole}) searching system-wide listings. ` +
    `Filters: creatorId=${query.creatorId}, accountId=${query.accountId}, status=${query.status}, ` +
    `employmentType=${query.employmentType}, paymentType=${query.paymentType}, ` +
    `workArrangement=${query.workArrangement}, commitment=${query.commitment}, ` +
    `experienceLevel=${query.experienceLevel}, educationLevel=${query.educationLevel}, ` +
    `isRemote=${query.isRemote}, isAnonymous=${query.isAnonymous}, ` +
    `applicationDeadlineAfter=${query.applicationDeadlineAfter}, ` +
    `applicationDeadlineBefore=${query.applicationDeadlineBefore}, ` +
    `startDateAfter=${query.startDateAfter}, startDateBefore=${query.startDateBefore}, ` +
    `hoursPerWeekMin=${query.hoursPerWeekMin}, hoursPerWeekMax=${query.hoursPerWeekMax}, ` +
    `limit=${query.limit}, offset=${query.offset}, sortBy=${query.sortBy}`
  );
  const response = await this.jobsService.getAdminJobs(query);
  if (!response.success) {
    this.logger.error(`Failed to fetch admin job listings: ${response.message}`);
    throw response;
  }
  return response;  
}

  // ===========================================================
  // GET JOB LISTINGS BY OWNER (PUBLIC WITH CACHE CONTROL)
  // ===========================================================

  @Public()
  @Get('jobs/owner/:accountId')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get job listings by owner (account)',
    description: 'Public endpoint to retrieve all job listings for a specific account/owner with pagination and cache control.'
  })
  @ApiParam({ 
    name: 'accountId', 
    type: String,
    description: 'Account ID of the owner',
    example: 'acc_123456'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by job status',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'],
    example: 'ACTIVE'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false,
    type: Number,
    description: 'Results per page (default: 20, max: 100)',
    example: 20
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false,
    type: Number,
    description: 'Pagination offset',
    example: 0
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false,
    enum: ['recent', 'pay_asc', 'pay_desc'],
    description: 'Sort order',
    example: 'recent'
  })
  @ApiQuery({ 
    name: 'bypassCache', 
    required: false, 
    type: Boolean, 
    description: 'Bypass cache (Admin only)', 
    example: false 
  })
  @ApiQuery({ 
    name: 'skipCache', 
    required: false, 
    type: Boolean, 
    description: 'Skip reading cache, still write', 
    example: false 
  })
  @ApiQuery({ 
    name: 'refreshCache', 
    required: false, 
    type: Boolean, 
    description: 'Force refresh cache', 
    example: false 
  })
  @ApiQuery({ 
    name: 'cacheTTL', 
    required: false, 
    type: Number, 
    description: 'Override cache TTL (seconds)', 
    example: 300 
  })
  @ApiQuery({ 
    name: 'readOnly', 
    required: false, 
    type: Boolean, 
    description: 'Don\'t write to cache', 
    example: false 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: [JobPostResponseDto]
  })
  async getJobListingsByOwner(
    @Param('accountId') accountId: string,
    @Query() query: any,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const dto: GetJobListingsByOwnerDto = {
      accountId: accountId,
      status: query.status,
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      sortBy: query.sortBy as any || 'recent',
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `📥 Incoming request: accountId=${accountId}, status=${dto.status}, ` +
      `limit=${dto.limit}, offset=${dto.offset}, sortBy=${dto.sortBy}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    
    const response = await this.jobsService.getJobListingsByOwner(dto);
    if (!response.success) {
      this.logger.warn(`Job listings by owner failed for account ${accountId}: ${response.message}`);
      throw response;
    }
    return response;
  }

  @Get('admin/applications')
  @Permissions(P.EMPLOYMENT_READ)
  @Version('1')
  @ApiOperation({ 
    summary: '[ADMIN] Get all job applications',
    description: 'Admin-only endpoint: View all job applications with filters.'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by application status',
    enum: ['PENDING', 'REVIEWED', 'REJECTED', 'HIRED']
  })
  @ApiQuery({ 
    name: 'jobId', 
    required: false,
    description: 'Filter by job ID',
    type: String
  })
  @ApiQuery({ 
    name: 'applicantId', 
    required: false,
    description: 'Filter by applicant ID',
    type: String
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Applications retrieved successfully',
    type: [JobApplicationResponseDto]
  })
  async getAdminApplications(
    @Req() req: JwtRequest,
    @Query() query: GetAdminApplicationsFilterDto,
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const adminId = req.user.sub;
    
    if (req.user.role === 'Individual' || req.user.role === 'Member' || req.user.role === 'ContentManagerAdmin') {
      return BaseResponseDto.fail('Unauthorized access to administrative applications.', 'FORBIDDEN');
    }
    
    this.logger.log(`👮 Admin ${adminId} searching system-wide applications`);
    return this.jobsService.getAdminApplications(query);
  }

  // ===========================================================
  // 🌐 JOBS - PUBLIC OPERATIONS (WITH CACHE CONTROL)
  // ===========================================================

  @Public()
  @Get('jobs')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get all job postings',
    description: 'Public endpoint to retrieve all job postings with pagination and job characteristics filtering.'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'minPay', required: false, type: Number, description: 'Minimum pay filter', example: 50000 })
  @ApiQuery({ name: 'maxPay', required: false, type: Number, description: 'Maximum pay filter', example: 200000 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['recent', 'pay_asc', 'pay_desc'], description: 'Sort by option', example: 'recent' })
  // Job Characteristics Filters
  @ApiQuery({ name: 'employmentType', required: false, enum: EMPLOYMENT_TYPES, description: 'Filter by employment type', example: 'PERMANENT' })
  @ApiQuery({ name: 'paymentType', required: false, enum: PAYMENT_TYPES, description: 'Filter by payment type', example: 'SALARY' })
  @ApiQuery({ name: 'workArrangement', required: false, enum: WORK_ARRANGEMENTS, description: 'Filter by work arrangement', example: 'REMOTE' })
  @ApiQuery({ name: 'commitment', required: false, enum: COMMITMENT_LEVELS, description: 'Filter by commitment level', example: 'FULL_TIME' })
  @ApiQuery({ name: 'workSchedule', required: false, enum: WORK_SCHEDULES, description: 'Filter by work schedule', example: 'DAY_SHIFT' })
  @ApiQuery({ name: 'documentationLevel', required: false, enum: DOCUMENTATION_LEVELS, description: 'Filter by documentation level', example: 'FORMAL_CONTRACT' })
  @ApiQuery({ name: 'skillLevel', required: false, enum: SKILL_LEVELS, description: 'Filter by skill level', example: 'SKILLED' })
  @ApiQuery({ name: 'experienceLevel', required: false, enum: EXPERIENCE_LEVELS, description: 'Filter by experience level', example: 'MID_LEVEL' })
  @ApiQuery({ name: 'educationLevel', required: false, enum: EDUCATION_LEVELS, description: 'Filter by education level', example: 'BACHELORS' })
  @ApiQuery({ name: 'isRemote', required: false, type: Boolean, description: 'Filter by remote status' })
  // New timeline filters
  @ApiQuery({ name: 'applicationDeadlineBefore', required: false, type: String, description: 'Filter jobs with application deadline before this date (ISO 8601)', example: '2025-12-31T23:59:59Z' })
  @ApiQuery({ name: 'applicationDeadlineAfter', required: false, type: String, description: 'Filter jobs with application deadline after this date (ISO 8601)', example: '2025-12-01T00:00:00Z' })
  @ApiQuery({ name: 'startDateBefore', required: false, type: String, description: 'Filter jobs with start date before this date (ISO 8601)', example: '2026-01-15T00:00:00Z' })
  @ApiQuery({ name: 'startDateAfter', required: false, type: String, description: 'Filter jobs with start date after this date (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'isAnonymous', required: false, type: Boolean, description: 'Filter by anonymous status', example: false })
  @ApiQuery({ name: 'hoursPerWeekMin', required: false, type: Number, description: 'Minimum hours per week', example: 20 })
  @ApiQuery({ name: 'hoursPerWeekMax', required: false, type: Number, description: 'Maximum hours per week', example: 40 })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, description: 'Skip reading cache, still write', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: [JobPostResponseDto]
  })
  async getAllJobs(
    @Query() query: any,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const dto: GetAllJobsRequestDto = {
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      city: query.city,
      minPay: this.parseNumber(query.minPay),
      maxPay: this.parseNumber(query.maxPay),
      sortBy: query.sortBy as any || 'recent',
      // Job Characteristics
      employmentType: query.employmentType,
      paymentType: query.paymentType,
      workArrangement: query.workArrangement,
      commitment: query.commitment,
      workSchedule: query.workSchedule,
      documentationLevel: query.documentationLevel,
      skillLevel: query.skillLevel,
      experienceLevel: query.experienceLevel,
      educationLevel: query.educationLevel,
      isRemote: this.parseBoolean(query.isRemote),
      // New timeline filters
      applicationDeadlineBefore: this.parseDate(query.applicationDeadlineBefore),
      applicationDeadlineAfter: this.parseDate(query.applicationDeadlineAfter),
      startDateBefore: this.parseDate(query.startDateBefore),
      startDateAfter: this.parseDate(query.startDateAfter),
      isAnonymous: this.parseBoolean(query.isAnonymous),
      hoursPerWeekMin: this.parseNumber(query.hoursPerWeekMin),
      hoursPerWeekMax: this.parseNumber(query.hoursPerWeekMax),
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `📥 Incoming request: limit=${dto.limit}, offset=${dto.offset}, ` +
      `employmentType=${dto.employmentType}, paymentType=${dto.paymentType}, ` +
      `workArrangement=${dto.workArrangement}, commitment=${dto.commitment}, ` +
      `workSchedule=${dto.workSchedule}, documentationLevel=${dto.documentationLevel}, ` +
      `skillLevel=${dto.skillLevel}, experienceLevel=${dto.experienceLevel}, ` +
      `educationLevel=${dto.educationLevel}, isRemote=${dto.isRemote}, ` +
      `isAnonymous=${dto.isAnonymous}, hoursPerWeekMin=${dto.hoursPerWeekMin}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const response = await this.jobsService.getAllJobs(dto);
    if (!response.success) {
      throw response;
    }
    return response;
  }

  @Public()
  @Get('jobs/category')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get jobs by category',
    description: 'Public endpoint to retrieve job postings in a specific category with job characteristics filtering and cache control.'
  })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Category ID to filter by', example: 'cat_123abc' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'minPay', required: false, type: Number, description: 'Minimum pay filter', example: 50000 })
  @ApiQuery({ name: 'maxPay', required: false, type: Number, description: 'Maximum pay filter', example: 200000 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['recent', 'pay_asc', 'pay_desc'], description: 'Sort by option', example: 'recent' })
  // Job Characteristics Filters
  @ApiQuery({ name: 'employmentType', required: false, enum: EMPLOYMENT_TYPES, description: 'Filter by employment type', example: 'PERMANENT' })
  @ApiQuery({ name: 'paymentType', required: false, enum: PAYMENT_TYPES, description: 'Filter by payment type', example: 'SALARY' })
  @ApiQuery({ name: 'workArrangement', required: false, enum: WORK_ARRANGEMENTS, description: 'Filter by work arrangement', example: 'REMOTE' })
  @ApiQuery({ name: 'commitment', required: false, enum: COMMITMENT_LEVELS, description: 'Filter by commitment level', example: 'FULL_TIME' })
  @ApiQuery({ name: 'workSchedule', required: false, enum: WORK_SCHEDULES, description: 'Filter by work schedule', example: 'DAY_SHIFT' })
  @ApiQuery({ name: 'documentationLevel', required: false, enum: DOCUMENTATION_LEVELS, description: 'Filter by documentation level', example: 'FORMAL_CONTRACT' })
  @ApiQuery({ name: 'skillLevel', required: false, enum: SKILL_LEVELS, description: 'Filter by skill level', example: 'SKILLED' })
  @ApiQuery({ name: 'experienceLevel', required: false, enum: EXPERIENCE_LEVELS, description: 'Filter by experience level', example: 'MID_LEVEL' })
  @ApiQuery({ name: 'educationLevel', required: false, enum: EDUCATION_LEVELS, description: 'Filter by education level', example: 'BACHELORS' })
  @ApiQuery({ name: 'isRemote', required: false, type: Boolean, description: 'Filter by remote status' })
  // New timeline filters
  @ApiQuery({ name: 'applicationDeadlineBefore', required: false, type: String, description: 'Filter jobs with application deadline before this date (ISO 8601)', example: '2025-12-31T23:59:59Z' })
  @ApiQuery({ name: 'applicationDeadlineAfter', required: false, type: String, description: 'Filter jobs with application deadline after this date (ISO 8601)', example: '2025-12-01T00:00:00Z' })
  @ApiQuery({ name: 'startDateBefore', required: false, type: String, description: 'Filter jobs with start date before this date (ISO 8601)', example: '2026-01-15T00:00:00Z' })
  @ApiQuery({ name: 'startDateAfter', required: false, type: String, description: 'Filter jobs with start date after this date (ISO 8601)', example: '2026-01-01T00:00:00Z' })
  @ApiQuery({ name: 'isAnonymous', required: false, type: Boolean, description: 'Filter by anonymous status', example: false })
  @ApiQuery({ name: 'hoursPerWeekMin', required: false, type: Number, description: 'Minimum hours per week', example: 20 })
  @ApiQuery({ name: 'hoursPerWeekMax', required: false, type: Number, description: 'Maximum hours per week', example: 40 })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, description: 'Skip reading cache, still write', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: [JobPostResponseDto]
  })
  async getJobsByCategory(
    @Query() query: any,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const dto: GetJobsByCategoryRequestDto = {
      categoryId: query.categoryId,
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      city: query.city,
      minPay: this.parseNumber(query.minPay),
      maxPay: this.parseNumber(query.maxPay),
      sortBy: query.sortBy as any || 'recent',
      // Job Characteristics
      employmentType: query.employmentType,
      paymentType: query.paymentType,
      workArrangement: query.workArrangement,
      commitment: query.commitment,
      workSchedule: query.workSchedule,
      documentationLevel: query.documentationLevel,
      skillLevel: query.skillLevel,
      experienceLevel: query.experienceLevel,
      educationLevel: query.educationLevel,
      isRemote: this.parseBoolean(query.isRemote),
      // New timeline filters
      applicationDeadlineBefore: this.parseDate(query.applicationDeadlineBefore),
      applicationDeadlineAfter: this.parseDate(query.applicationDeadlineAfter),
      startDateBefore: this.parseDate(query.startDateBefore),
      startDateAfter: this.parseDate(query.startDateAfter),
      isAnonymous: this.parseBoolean(query.isAnonymous),
      hoursPerWeekMin: this.parseNumber(query.hoursPerWeekMin),
      hoursPerWeekMax: this.parseNumber(query.hoursPerWeekMax),
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `📥 Incoming request: categoryId=${dto.categoryId}, limit=${dto.limit}, offset=${dto.offset}, ` +
      `employmentType=${dto.employmentType}, paymentType=${dto.paymentType}, ` +
      `workArrangement=${dto.workArrangement}, commitment=${dto.commitment}, ` +
      `workSchedule=${dto.workSchedule}, documentationLevel=${dto.documentationLevel}, ` +
      `skillLevel=${dto.skillLevel}, experienceLevel=${dto.experienceLevel}, ` +
      `educationLevel=${dto.educationLevel}, isRemote=${dto.isRemote}, ` +
      `isAnonymous=${dto.isAnonymous}, hoursPerWeekMin=${dto.hoursPerWeekMin}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const response = await this.jobsService.getJobsByCategory(dto);
    if (!response.success) {
      throw response;
    }
    return response;
  }

  @Public()
  @Get('details/:id')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get job details by ID',
    description: 'Public endpoint to retrieve complete job posting details with cache control.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job posting',
    example: 'job_123abc'
  })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, description: 'Bypass cache (Admin only)', example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, description: 'Force refresh cache', example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, description: 'Override cache TTL (seconds)', example: 600 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, description: 'Don\'t write to cache', example: false })
  @ApiResponse({ 
    status: 200, 
    description: 'Job details retrieved',
    type: JobPostResponseDto
  })
  async getJobPostById(
    @Param('id') id: string,
    @Query() query: any,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const dto: GetJobByIdRequestDto = {
      id: id,
      bypassCache: this.parseBoolean(query.bypassCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 600,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `📥 Incoming request: id=${id}, ` +
      `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}`
    );
    
    const resp = await this.jobsService.getJobPostById(dto);
    if (!resp.success) {
      this.logger.warn(`Job post with ID ${id} not found.`);
      throw resp;
    }
    return resp;
  }

  @Post('jobs/validate-ids')
  @Permissions(P.EMPLOYMENT_READ)
  @Version('1')
  @ApiOperation({ 
    summary: 'Validate job post IDs',
    description: 'Validates whether given job post IDs exist and are active.'
  })
  @ApiBody({ type: ValidateJobPostIdsRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation results'
  })
  async validateJobIds(
    @Body() dto: ValidateJobPostIdsRequestDto,
  ) {
    return this.jobsService.validateJobPostIds(dto);
  }

  // ===========================================================
  // ⚙️ CORE EXECUTION METHODS
  // ===========================================================

  private async executeJobUpdate(
    dto: UpdateJobGrpcRequestDto,
    actorUuid: string,
    isAdminFlow: boolean
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
      if (isAdminFlow) {
        this.logger.debug(`Processing ADMIN Job Update for Job ${dto.id} initiated by admin ${actorUuid}`);
        return await this.jobsService.updateAdminJobPost(dto);
      }

      this.logger.debug(`Processing OWN Job Update for Job ${dto.id} initiated by user ${actorUuid}`);
      return await this.jobsService.updateJobPost(dto);
      
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `🔥 Job update execution failed for Job ${dto.id} by actor ${actorUuid}`,
        err.stack
      );
      return BaseResponseDto.fail('Unexpected error while routing job update', 'INTERNAL_ERROR');
    }
  }

  private async executeJobClose(
    dto: CloseJobGrpcRequestDto,
    actorUuid: string,
    isAdminFlow: boolean 
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    try {
      if (isAdminFlow) {
        this.logger.debug(`Processing ADMIN Job Close for job ${dto.id} initiated by admin ${actorUuid}`);
        return await this.jobsService.closeAdminJobPost(dto);
      }

      this.logger.debug(`Processing OWN Job Close for job ${dto.id} initiated by user ${actorUuid}`);
      return await this.jobsService.closeJobPost(dto);
      
    } catch (error) {
      this.logger.error(`🔥 Job close execution failed for Job ${dto.id}`, error.stack);
      return BaseResponseDto.fail('Unexpected error while routing job closure', 'INTERNAL_ERROR');
    }
  }
}