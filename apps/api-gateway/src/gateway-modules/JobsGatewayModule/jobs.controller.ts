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
import { ApiBearerAuth, ApiBody, ApiExtraModels, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtRequest } from '@pivota-api/interfaces';
// Updated Decorators
import { Permissions } from '../../decorators/permissions.decorator';
import { Public } from '../../decorators/public.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';


/**
 * Helper decorator for SubscriptionGuard
 */
@ApiTags('Jobs Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@ApiExtraModels(BaseResponseDto, JobPostCreateResponseDto, JobPostResponseDto, CloseJobPostResponseDto, JobApplicationResponseDto)
@SetModule('jobs') // Attach module metadata for SubscriptionGuard  
@Controller('jobs-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard) // Added SubscriptionGuard
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // -----------------------------
// Core Job Creation Logic
// -----------------------------
private async executeJobCreation(
  dto: (CreateJobPostDto & { creatorId: string; accountId: string; creatorName?: string; accountName?: string }) | AdminCreateJobPostDto,
  actorUuid: string
): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  try {
    // Check if it's an Admin DTO (which contains accountId natively in the class)
    // and if we are in the 'Admin' flow.
    if ('accountId' in dto && dto.accountId && !('creatorName' in dto)) {
      this.logger.debug(`Processing ADMIN Job Creation for Account ${dto.accountId} initiated by admin ${actorUuid}`);
      return await this.jobsService.createAdminJobPost(dto as AdminCreateJobPostDto);
    }

    // Standard "Own" flow
    const ownDto = dto as CreateJobPostDto & { creatorId: string; accountId: string; creatorName?: string; accountName?: string };
    this.logger.debug(`Processing OWN Job Creation for Account ${ownDto.accountId} initiated by ${actorUuid}`);
    return await this.jobsService.createJobPost(ownDto);
    
  } catch (error) {
    this.logger.error(`🔥 Job creation execution failed`, error.stack);
    return BaseResponseDto.fail('Unexpected error while routing job creation', 'INTERNAL_ERROR');
  }
}

// -----------------------------
// CREATE OWN JOB
// -----------------------------
@Post('jobs')
@Permissions('jobs.create.own')
@ApiOperation({ summary: 'Create a job post for the authenticated user' })
/* ... swagger decorators ... */
async createOwn(
  @Body() dto: CreateJobPostDto,
  @Req() req: JwtRequest
): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  const requesterUuid = req.user.userUuid;
  const accountId = req.user.accountId;
  
  // Extract names from JWT to denormalize into the Listings DB immediately
  // This powers the shared nav / dashboard without extra gRPC calls
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
    throw response; // Let the Global Exception Filter handle the error response  
  }
  return response;
}

// -----------------------------
// CREATE JOB FOR ANY USER (ADMIN)
// -----------------------------
@Post('admin/accounts/:accountId/jobs')
@Permissions('jobs.create.any')
@ApiOperation({ 
  summary: 'Admin: Create job post for an account',
  description: 'Creates a job listing for an organization. If "creatorId" is omitted, the job is attributed to the organization account itself.' 
})
@ApiParam({ 
  name: 'accountId', 
  description: 'The UUID of the organization owning this listing',
  example: 'eb02ea40-4f17-4040-8885-0029105d9fb2' 
})
@ApiBody({ 
  type: AdminCreateJobPostDto,
  description: 'Job details. "creatorId" is optional for organization-level posts.' 
})
@ApiResponse({ status: 201, type: JobPostCreateResponseDto })
@ApiResponse({ status: 403, description: 'Insufficient permissions' })
@ApiResponse({ status: 404, description: 'Account or Creator not found' })
async createAny(
  @Param('accountId') accountId: string, 
  @Body() dto: AdminCreateJobPostDto,
  @Req() req: JwtRequest
): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  
  // 1. Merge accountId from URL (Source of Truth)
  // 2. We keep the original dto intact and just override identity fields
  const finalData = { 
    ...dto, 
    accountId,
    // If no creatorId provided, we can pass null or a system-level identifier
    creatorId: dto.creatorId || null 
  };

  this.logger.log(`👮 Admin ${req.user.userUuid} creating job for Account ${accountId} (Creator: ${dto.creatorId ?? 'Organization'})`);
  
  const response = await this.executeJobCreation(finalData, req.user.userUuid);

  if (!response.success) {
    throw response; 
  }

  return response;
}


// -----------------------------
// Core Job Update Logic
// -----------------------------
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

// -----------------------------
// UPDATE OWN JOB
// -----------------------------
@Permissions('jobs.update.own') 
@SetModule('jobs')
@Version('1')
@Patch('jobs/:id')
@ApiOperation({ summary: 'Update own job post' })
@ApiParam({ name: 'id', type: String })
async updateOwn(
  @Param('id') id: string,
  @Body() dto: UpdateOwnJobPostRequestHttpDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<JobPostResponseDto>> {
  const userId = req.user.userUuid;
  const accId = req.user.accountId;

  // Transform HTTP DTO + Metadata into the strict gRPC Contract
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
    throw resp; // Let the Global Exception Filter handle the error response  
  }
  return resp;
}

// -----------------------------
// UPDATE JOB FOR ANY USER (ADMIN)
// -----------------------------
@Permissions('jobs.update.any')
@SetModule('jobs')
@Version('1')
@Patch('admin/jobs/:id')
@ApiOperation({ summary: 'Update any job post (Admin only)' })
@ApiParam({ name: 'id', type: String })
async updateAny(
  @Param('id') id: string,
  @Body() dto: UpdateAdminJobPostRequestHttpDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<JobPostResponseDto>> {
  const requesterUuid = req.user.userUuid;

  // Admin DTO includes target creatorId & accountId in the body
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


// -----------------------------
// Core Job Close Logic
// -----------------------------
private async executeJobClose(
  dto: CloseJobGrpcRequestDto,
  actorUuid: string,
  isAdminFlow: boolean 
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    if (isAdminFlow) {
      this.logger.debug(`Processing ADMIN Job Close for job ${dto.id} initiated by admin ${actorUuid}`);
      // Admin bypasses the ownership check in the microservice
      return await this.jobsService.closeAdminJobPost(dto);
    }

    this.logger.debug(`Processing OWN Job Close for job ${dto.id} initiated by user ${actorUuid}`);
    // Microservice will check if dto.creatorId === record.creatorId
    return await this.jobsService.closeJobPost(dto);
    
  } catch (error) {
    this.logger.error(`🔥 Job close execution failed for Job ${dto.id}`, error.stack);
    return BaseResponseDto.fail('Unexpected error while routing job closure', 'INTERNAL_ERROR');
  }
}

// -----------------------------
// CLOSE OWN JOB
// -----------------------------
@Permissions('jobs.close.own')
@ApiOperation({ summary: 'Close own job post' })
@Patch('jobs/:id/close')
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
  // Pass 'false' because this is the ownership-check flow
  const response = await this.executeJobClose(sanitizedDto, userId, false);
  if(!response.success){
    throw response;
  }
  return response;
}
 
// -----------------------------
// CLOSE JOB FOR ANY USER (ADMIN)
// -----------------------------
@Permissions('jobs.close.any')
@ApiOperation({summary: "Close Others jobs - by admin"})
@Patch('admin/jobs/:id/close')
@ApiBody({ type: CloseAdminJobPostRequestHttpDto })
async closeAny(
  @Param('id', ParseCuidPipe) id: string,
  @Body() dto: CloseAdminJobPostRequestHttpDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  const requesterUuid = req.user.userUuid;

  const sanitizedDto: CloseJobGrpcRequestDto = {
    ...dto, // Contains creatorId and accountId from HttpDto
    id,    // Forced from URL param
  };

  this.logger.log(`👮 Admin ${requesterUuid} closing job ${id} for User ${dto.creatorId}`);
  // Pass 'true' to trigger the admin bypass flow
  const response = await this.executeJobClose(sanitizedDto, requesterUuid, true);
  if(!response.success){
    throw response;
  }
  return response;
}

// ===========================================================
  //  APPLICATION FLOWS
  // ===========================================================


  @Permissions('jobs.read')
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
    return this.jobsService.applyToJobPost(id, userId, dto);
  }

  @Permissions('jobs.read')
  @Version('1')
  @Get('my-applications')
  @ApiOperation({ summary: 'Get all applications submitted by the authenticated user' })
  @ApiResponse({ status: 200, type: [JobApplicationResponseDto] })
  async getOwnApplications(
    @Req() req: JwtRequest,
    @Query() query: GetOwnApplicationsFilterDto,
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const userId = req.user.userUuid;
    this.logger.log(`👤 User ${userId} fetching their applications. Filter: ${query.status ?? 'ALL'}`);
    return this.jobsService.getOwnApplications(userId, query.status);
  }

  @Permissions('jobs.read') 
  @Version('1')
  @Get('admin/applications')
  @ApiOperation({ summary: 'Get applications across the system with filters (Admin only)' })
  @ApiResponse({ status: 200, type: [JobApplicationResponseDto] })
  async getAdminApplications(
    @Req() req: JwtRequest,
    @Query() query: GetAdminApplicationsFilterDto,
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const adminId = req.user.userUuid;
    if (req.user.role === 'GeneralUser') {
      return BaseResponseDto.fail('Unauthorized access to administrative applications.', 'FORBIDDEN');
    }
    this.logger.log(`👮 Admin ${adminId} searching system-wide applications`);
    return this.jobsService.getAdminApplications(query);
  }

  // ===========================================================
  // GET APPLICATION BY ID (Full Detail View)
  // ===========================================================
  @Permissions('jobs.read')
  @Version('1')
  @Get('applications/:id')
  @ApiOperation({ summary: 'Get full details of a specific application' })
  async getApplicationById(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobApplicationDetailResponseDto>> {
    const userId = req.user.userUuid;
    const userRole = req.user.role; // This is critical for the microservice bypass
    
    this.logger.log(`🔍 User ${userId} (${userRole}) requesting full details for application ${id}`);
    
    // Pass both the ID and the Role
    const response = await this.jobsService.getApplicationById(id, userId, userRole);
    
    if (!response.success) {
      this.logger.warn(`Access denied for user ${userId} on application ${id}`);
      throw response; 
    }

    this.logger.debug(`Gateway forwarding: User ${userId}, Role ${userRole}`);
    return response;

  }

  // ===========================================================
  // GET JOB BY ID (Public)
  // ===========================================================
  @Public()
  @ApiParam({ name: 'id', type: String })
  @Version('1')
  @Get('details/:id') // Updated path to avoid collision with category routes
  @ApiOperation({ summary: 'Get a job post by ID' })
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

// ===========================================================
  // GET OWN JOB LISTINGS (Dashboard)
  // ===========================================================
  @Permissions('jobs.read')
  @Version('1')
  @Get('my-listings')
  @ApiOperation({ summary: 'Get all job posts created by the authenticated user' })
  @ApiResponse({ status: 200, type: [JobPostResponseDto] })
  async getOwnJobs(
    @Req() req: JwtRequest,
    @Query() query: GetOwnJobsFilterDto, // Use the DTO here for the dropdown
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const userId = req.user.userUuid;
    const { status } = query;

    this.logger.log(`👤 User ${userId} fetching listings. Filter: ${status ?? 'ALL'}`);
    
    return this.jobsService.getOwnJobs(userId, status);
  }


  // ===========================================================
  // GET ADMIN JOB LISTINGS (Management)
  // ===========================================================
  @Permissions('jobs.read')
  @Version('1')
  @Get('admin/listings')
  @ApiOperation({ summary: 'Get job posts across the system with filters (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    type: [JobPostResponseDto], 
    description: 'Listings retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User, Account, or Jobs not found',
    // You can even define a specific Error DTO here if you have one
  })
  async getAdminJobs(
    @Req() req: JwtRequest,
    @Query() query: GetAdminJobsFilterDto, // Swagger dropdown logic integrated here
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const adminId = req.user.userUuid;
    const actorRole = req.user.role;

    // Security Guard: Prevent GeneralUsers from accessing system-wide listings
    if (actorRole === 'GeneralUser') {
      this.logger.warn(`🛑 Unauthorized admin access attempt by ${adminId}`);
      return BaseResponseDto.fail('Unauthorized access to administrative listings.', 'FORBIDDEN');
    }

    this.logger.log(`👮 Admin ${adminId} (${actorRole}) searching system-wide listings`);

    // Pass the entire DTO directly to the service
    const response = await this.jobsService.getAdminJobs(query);
    if (!response.success) {
      this.logger.error(`Failed to fetch admin job listings: ${response.message}`);
      throw response; // Let the Global Exception Filter handle the error response
    }

    return response;  
  }
}