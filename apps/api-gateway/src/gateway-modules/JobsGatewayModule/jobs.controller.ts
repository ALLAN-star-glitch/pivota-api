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
} from '@pivota-api/dtos';

import { ParseCuidPipe } from '@pivota-api/pipes';

import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
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
 
/**
 * Jobs Controller
 * 
 * Handles all job-related operations including:
 * - Job post creation, updates, and closure
 * - Job applications and tracking
 * - Public job discovery
 * - Administrative job management
 * 
 * All endpoints are routed through the API Gateway and communicate
 * with the Listings Microservice via gRPC.
 */
@ApiTags('Jobs') // Main module tag
@ApiBearerAuth()
@ApiExtraModels(
  BaseResponseDto, 
  JobPostCreateResponseDto, 
  JobPostResponseDto, 
  CloseJobPostResponseDto, 
  JobApplicationResponseDto
)
@SetModule(ModuleSlug.EMPLOYMENT)
@Controller('jobs-module')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // -----------------------------
  // Core Job Creation Logic
  // -----------------------------
  /**
   * Core execution logic for job creation
   * Routes between regular user and admin flows
   */
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

  /**
   * Create a new job posting for the authenticated user
   * 
   * @param dto - Job post details
   * @param req - JWT request containing user information
   * @returns Created job post details
   */
  @Post('jobs')
  @Permissions(P.EMPLOYMENT_CREATE_OWN)
  @ApiTags('Jobs - Management')
  @ApiOperation({ 
    summary: 'Create a new job posting',
    description: `
      Creates a new job posting for the authenticated user.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_CREATE_OWN}
      
      **Process:**
      1. Validates user permissions
      2. Creates job post in the listings microservice
      3. Returns created job details with status
      
      **Notes:**
      • Creator and account information are automatically extracted from JWT
      • Job is created with default status (typically ACTIVE)
    `
  })
  @ApiBody({ type: CreateJobPostDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Job post created successfully',
    type: JobPostCreateResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Job posted successfully',
        code: 'CREATED',
        data: {
          id: 'job_123abc',
          status: 'ACTIVE',
          createdAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createOwn(
    @Body() dto: CreateJobPostDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const accountId = req.user.accountId;
    const creatorName = req.user.userName; 
    const accountName = req.user.accountName; 

    const sanitizedDto = {
      ...dto,
      creatorId: requesterUuid,
      accountId,
      creatorName,
      accountName,
    };

    this.logger.log(`👤 User ${requesterUuid} creating their own job`);
    const response = await this.executeJobCreation(sanitizedDto, requesterUuid);
    if (!response.success) {
      this.logger.error(`Job creation failed for User ${requesterUuid}: ${response.message}`);
      throw response;
    }
    return response;
  }

  /**
   * Update an existing job posting owned by the user
   * 
   * @param id - Job post ID
   * @param dto - Fields to update
   * @param req - JWT request
   * @returns Updated job post
   */
  @Patch('jobs/:id')
  @Permissions(P.EMPLOYMENT_UPDATE_OWN)
  @ApiTags('Jobs - Management')
  @Version('1')
  @ApiOperation({ 
    summary: 'Update your own job posting',
    description: `
      Updates one or more fields of an existing job posting.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_UPDATE_OWN}
      
      **Important Rules:**
      • You can only update jobs where you are the creator
      • All fields are optional - partial updates supported
      • Status changes affect job visibility
      
      **What You Cannot Change:**
      • Account ownership (accountId is protected)
      • Creator ID (for security reasons)
      • Job ID
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job posting',
    example: 'job_123abc'
  })
  @ApiBody({ 
    type: UpdateOwnJobPostRequestHttpDto,
    examples: {
      'Update Title': { value: { title: 'Senior Developer Needed' } },
      'Update Status': { value: { status: 'CLOSED' } }
    }
  })
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
    const userId = req.user.userUuid;
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

  /**
   * Get all job postings created by the authenticated user
   * 
   * @param req - JWT request
   * @param query - Filter parameters
   * @returns List of user's job postings
   */
  @Get('my-listings')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Management')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get your job postings',
    description: `
      Retrieves all job postings created by the authenticated user.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Features:**
      • Returns jobs created by the authenticated user
      • Supports filtering by status
      • Sorted by creation date (newest first)
    `
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by job status',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT'],
    example: 'ACTIVE'
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
    const userId = req.user.userUuid;
    const { status } = query;

    this.logger.log(`👤 User ${userId} fetching listings. Filter: ${status ?? 'ALL'}`);
    
    return this.jobsService.getOwnJobs(userId, status);
  }

  /**
   * Close (archive) a job posting owned by the user
   * 
   * @param id - Job post ID
   * @param req - JWT request
   * @returns Closure confirmation
   */
  @Patch('jobs/:id/close')
  @Permissions(P.EMPLOYMENT_CLOSE_OWN)
  @ApiTags('Jobs - Management')
  @ApiOperation({ 
    summary: 'Close your own job posting',
    description: `
      Marks a job posting as closed/archived.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_CLOSE_OWN}
      
      **Effects:**
      • Job will no longer appear in search results
      • Existing applications remain accessible
      • Can be reopened if needed
    `
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
    const userId = req.user.userUuid;
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

  /**
   * Apply for a job posting
   * 
   * @param id - Job post ID
   * @param dto - Application details
   * @param req - JWT request
   * @returns Application confirmation
   */
  @Post('jobs/:id/apply')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Applications')
  @Version('1')
  @ApiOperation({ 
    summary: 'Apply for a job',
    description: `
      Submit an application for a specific job posting.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Process:**
      1. Validates job exists and is active
      2. Creates application record
      3. Notifies job poster (via notification service)
      4. Returns application details
      
      **Notes:**
      • Users can only apply once per job
      • Application status tracks progress (PENDING, REVIEWED, REJECTED, HIRED)
    `
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
    const userId = req.user.userUuid;
    this.logger.log(`📝 User ${userId} applying to job ${id}`);
    return this.jobsService.applyToJobPost(id, userId, dto);
  }

  /**
   * Get all applications submitted by the authenticated user
   * 
   * @param req - JWT request
   * @param query - Filter parameters
   * @returns List of user's applications
   */
  @Get('my-applications')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Applications')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get your job applications',
    description: `
      Retrieves all job applications submitted by the authenticated user.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Features:**
      • Returns applications across all jobs
      • Supports filtering by status
      • Includes job details for each application
    `
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
    const userId = req.user.userUuid;
    this.logger.log(`👤 User ${userId} fetching their applications. Filter: ${query.status ?? 'ALL'}`);
    return this.jobsService.getOwnApplications(userId, query.status);
  }

  /**
   * Get detailed information about a specific application
   * 
   * @param id - Application ID
   * @param req - JWT request
   * @returns Full application details
   */
  @Get('applications/:id')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Applications')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get application details',
    description: `
      Retrieves complete details of a specific job application.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Access Rules:**
      • Applicants can view their own applications
      • Job posters can view applications for their jobs
      • Admins can view all applications
    `
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
    const userId = req.user.userUuid;
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

  /**
   * Create a job posting for any account (Admin only)
   * 
   * @param accountId - Target account ID
   * @param dto - Job details
   * @param req - JWT request
   * @returns Created job details
   */
  @Post('admin/accounts/:accountId/jobs')
  @Permissions(P.EMPLOYMENT_CREATE_ANY)
  @ApiTags('Jobs - Admin')
  @ApiOperation({ 
    summary: '[ADMIN] Create job posting for any account',
    description: `
      **Admin-only endpoint**: Creates a job posting on behalf of any account.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_CREATE_ANY}
      
      **Admin Privileges:**
      • Can specify any account ID via URL parameter
      • Can override creator ID (optional)
      • Bypasses normal ownership validation
      
      **Use Cases:**
      • Support team creating jobs for customers
      • Bulk job creation by admin staff
      • Manual job entry for phone-in customers
    `
  })
  @ApiParam({ 
    name: 'accountId', 
    description: 'UUID of the organization owning this listing',
    example: 'eb02ea40-4f17-4040-8885-0029105d9fb2' 
  })
  @ApiBody({ 
    type: AdminCreateJobPostDto,
    description: 'Job details. "creatorId" is optional for organization-level posts.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Job created successfully',
    type: JobPostCreateResponseDto
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Account or Creator not found' })
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

    this.logger.log(`👮 Admin ${req.user.userUuid} creating job for Account ${accountId} (Creator: ${dto.creatorId ?? 'Organization'})`);
    
    const response = await this.executeJobCreation(finalData, req.user.userUuid);

    if (!response.success) {
      throw response; 
    }

    return response;
  }

  /**
   * Update any job posting (Admin only)
   * 
   * @param id - Job ID
   * @param dto - Update details
   * @param req - JWT request
   * @returns Updated job
   */
  @Patch('admin/jobs/:id')
  @Permissions(P.EMPLOYMENT_UPDATE_ANY)
  @ApiTags('Jobs - Admin')
  @Version('1')
  @ApiOperation({ 
    summary: '[ADMIN] Update any job posting',
    description: `
      **Admin-only endpoint**: Updates any job posting in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_UPDATE_ANY}
      
      **Admin Capabilities:**
      • Modify job details for any account
      • Change ownership (accountId, creatorId)
      • Update job status
      
      **Use Cases:**
      • Correcting job errors reported by users
      • Updating job details for offline customers
      • Content moderation
    `
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
    const requesterUuid = req.user.userUuid;

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

  /**
   * Close any job posting (Admin only)
   * 
   * @param id - Job ID
   * @param dto - Closure details
   * @param req - JWT request
   * @returns Closure confirmation
   */
  @Patch('admin/jobs/:id/close')
  @Permissions(P.EMPLOYMENT_CLOSE_ANY)
  @ApiTags('Jobs - Admin')
  @ApiOperation({ 
    summary: '[ADMIN] Close any job posting',
    description: `
      **Admin-only endpoint**: Closes any job posting in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_CLOSE_ANY}
      
      **Use Cases:**
      • Removing inappropriate job posts
      • Closing jobs for users who request assistance
      • Bulk job management
    `
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
    const requesterUuid = req.user.userUuid;

    const sanitizedDto: CloseJobGrpcRequestDto = {
      ...dto,
      id,
    };

    this.logger.log(`👮 Admin ${requesterUuid} closing job ${id} for User ${dto.creatorId}`);
    const response = await this.executeJobClose(sanitizedDto, requesterUuid, true);
    if (!response.success) {
      throw response;
    }
    return response;
  }

  /**
   * Get all job postings with filters (Admin only)
   * 
   * @param req - JWT request
   * @param query - Filter parameters
   * @returns List of jobs
   */
  @Get('admin/listings')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Admin')
  @Version('1')
  @ApiOperation({ 
    summary: '[ADMIN] Get all job postings',
    description: `
      **Admin-only endpoint**: View all job postings with filters.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Admin Capabilities:**
      • View jobs from any account or creator
      • Filter by status, account ID, or creator ID
      • Access to all jobs for management and oversight
    `
  })
  @ApiQuery({ 
    name: 'status', 
    required: false,
    description: 'Filter by job status',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT']
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
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: [JobPostResponseDto]
  })
  async getAdminJobs(
    @Req() req: JwtRequest,
    @Query() query: GetAdminJobsFilterDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const adminId = req.user.userUuid;
    const actorRole = req.user.role;

    // Updated role check - Individual and Member cannot access admin endpoints
    if (actorRole === 'Individual' || actorRole === 'Member') {
      this.logger.warn(`🛑 Unauthorized admin access attempt by ${adminId}`);
      return BaseResponseDto.fail('Unauthorized access to administrative listings.', 'FORBIDDEN');
    }

    this.logger.log(`👮 Admin ${adminId} (${actorRole}) searching system-wide listings`);

    const response = await this.jobsService.getAdminJobs(query);
    if (!response.success) {
      this.logger.error(`Failed to fetch admin job listings: ${response.message}`);
      throw response;
    }

    return response;  
  }

  /**
   * Get all applications with filters (Admin only)
   * 
   * @param req - JWT request
   * @param query - Filter parameters
   * @returns List of applications
   */
  @Get('admin/applications')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Admin')
  @Version('1')
  @ApiOperation({ 
    summary: '[ADMIN] Get all job applications',
    description: `
      **Admin-only endpoint**: View all job applications with filters.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Admin Capabilities:**
      • View applications across all jobs
      • Filter by status, job, or applicant
      • Access for reporting and management
    `
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
    const adminId = req.user.userUuid;
    
    // Updated role check - Individual, Member, ContentManagerAdmin cannot access admin endpoints
    if (req.user.role === 'Individual' || req.user.role === 'Member' || req.user.role === 'ContentManagerAdmin') {
      return BaseResponseDto.fail('Unauthorized access to administrative applications.', 'FORBIDDEN');
    }
    
    this.logger.log(`👮 Admin ${adminId} searching system-wide applications`);
    return this.jobsService.getAdminApplications(query);
  }

  // ===========================================================
  // 🌐 JOBS - PUBLIC OPERATIONS
  // ===========================================================

  /**
   * Get job details by ID (Public)
   * 
   * @param id - Job ID
   * @returns Job details
   */
  @Public()
  @Get('details/:id')
  @ApiTags('Jobs - Public')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get job details by ID',
    description: `
      Public endpoint to retrieve complete job posting details.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      
      **Returns:**
      • Full job details including description and requirements
      • Does not require authentication
      • Used for job detail pages and sharing
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the job posting',
    example: 'job_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Job details retrieved',
    type: JobPostResponseDto
  })
  async getJobPostById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const resp = await this.jobsService.getJobPostById(id);
    if (!resp.success) {
      this.logger.warn(`Job post with ID ${id} not found.`);
      throw resp;
    }
    return resp;
  }

  /**
   * Get jobs by category (Public)
   * 
   * @param categoryId - Category ID
   * @returns List of jobs in category
   */
  @Public()
  @Get('jobs/category/:categoryId')
  @ApiTags('Jobs - Public')
  @Version('1')
  @ApiOperation({ 
    summary: 'Get jobs by category',
    description: `
      Public endpoint to retrieve all job postings in a specific category.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      
      **Features:**
      • Returns all active jobs in the category
      • Sorted by creation date (newest first)
      • Used for category browsing
    `
  })
  @ApiParam({ 
    name: 'categoryId', 
    type: String,
    description: 'ID of the job category',
    example: 'cat_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Jobs retrieved successfully',
    type: [JobPostResponseDto]
  })
  async getJobsByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    return this.jobsService.getJobsByCategory(categoryId);
  }

  /**
   * Validate job post IDs (Public)
   * 
   * @param dto - IDs to validate
   * @returns Validation results
   */
  @Post('jobs/validate-ids')
  @Permissions(P.EMPLOYMENT_READ)
  @ApiTags('Jobs - Public')
  @Version('1')
  @ApiOperation({ 
    summary: 'Validate job post IDs',
    description: `
      Validates whether given job post IDs exist and are active.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** ${P.EMPLOYMENT_READ}
      
      **Use Cases:**
      • Checking job availability before applying
      • Validating job references in other systems
      • Bulk validation for external integrations
    `
  })
  @ApiBody({ type: ValidateJobPostIdsRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Validation results',
    schema: {
      example: {
        success: true,
        data: {
          valid: ['job_123abc'],
          invalid: ['job_456def']
        }
      }
    }
  })
  async validateJobIds(
    @Body() dto: ValidateJobPostIdsRequestDto,
  ) {
    return this.jobsService.validateJobPostIds(dto);
  }

  // ===========================================================
  // ⚙️ CORE EXECUTION METHODS
  // ===========================================================

  /**
   * Core execution logic for job updates
   * Routes between regular user and admin flows
   */
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

  /**
   * Core execution logic for job closure
   * Routes between regular user and admin flows
   */
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