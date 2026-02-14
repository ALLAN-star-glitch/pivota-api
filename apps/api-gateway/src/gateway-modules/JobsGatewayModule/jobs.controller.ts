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
  UpdateAdminJobPostRequestDto,
  UpdateOwnJobPostRequestDto,
  CloseAdminJobPostRequestDto,
  CloseOwnJobPostRequestDto,
  GetOwnJobsFilterDto,
  GetAdminJobsFilterDto
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
  dto: (UpdateOwnJobPostRequestDto & { creatorId: string }) | UpdateAdminJobPostRequestDto,
  actorUuid: string
): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    // Determine flow based on the presence of accountId (Admin DTO has it, Own DTO doesn't)
    if ('accountId' in dto && dto.accountId) {
      this.logger.debug(`Processing ADMIN Job Update for Job ${dto.id} initiated by admin ${actorUuid}`);
      return await this.jobsService.updateAdminJobPost(dto as UpdateAdminJobPostRequestDto);
    }

    // Standard "Own" flow
    const ownDto = dto as UpdateOwnJobPostRequestDto & { creatorId: string };
    this.logger.debug(`Processing OWN Job Update for Job ${ownDto.id} initiated by user ${actorUuid}`);
    return await this.jobsService.updateJobPost(ownDto);
    
  } catch (error) {
    this.logger.error(
      `🔥 Job update execution failed for Job ${dto.id} by actor ${actorUuid}`,
      error.stack
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
  @Body() dto: UpdateOwnJobPostRequestDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<JobPostResponseDto>> {
  const userId = req.user.userUuid;

  // We inject the creatorId from the JWT to ensure the Microservice 
  // can verify ownership before applying the update.
  const sanitizedDto: UpdateOwnJobPostRequestDto & { creatorId: string } = {
    ...dto,
    id,
    creatorId: userId,
  };

  this.logger.log(`👤 User ${userId} updating their own job ${id}`);
  return this.executeJobUpdate(sanitizedDto, userId);
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
  @Body() dto: UpdateAdminJobPostRequestDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<JobPostResponseDto>> {
  const requesterUuid = req.user.userUuid;

  // Admin DTO already includes target creatorId & accountId from the body
  const sanitizedDto: UpdateAdminJobPostRequestDto = {
    ...dto,
    id,
  };

  this.logger.log(`👮 Admin ${requesterUuid} updating job ${id} for User ${dto.creatorId}`);
  return this.executeJobUpdate(sanitizedDto, requesterUuid);
}


// -----------------------------
// Core Job Close Logic
// -----------------------------
private async executeJobClose(
  dto: (CloseOwnJobPostRequestDto & { creatorId: string; accountId: string }) | CloseAdminJobPostRequestDto,
  actorUuid: string
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  // Extract ID immediately so it's available for the entire scope, including the catch block
  const jobId = dto.id; 

  try {
    // Check if it's the Admin flow
    // We check for accountId and the absence of the 'creatorId' property added in sanitizedDto
    if ('accountId' in dto && dto.accountId && !('creatorId' in dto)) {
      this.logger.debug(`Processing ADMIN Job Close for Job ${jobId} initiated by admin ${actorUuid}`);
      return await this.jobsService.closeAdminJobPost(dto as CloseAdminJobPostRequestDto);
    }

    // Standard flow
    const ownDto = dto as CloseOwnJobPostRequestDto & { creatorId: string };
    this.logger.debug(`Processing OWN Job Close for Job ${jobId} initiated by user ${actorUuid}`);
    return await this.jobsService.closeJobPost(ownDto);
    
  } catch (error) {
    this.logger.error(`🔥 Job close execution failed for Job ${jobId}`, error.stack);
    return BaseResponseDto.fail('Unexpected error while routing job closure', 'INTERNAL_ERROR');
  }
}

// -----------------------------
// CLOSE OWN JOB
// -----------------------------
@Permissions('jobs.close.own')
@SetModule('jobs')
@Version('1')
@Patch('jobs/:id/close')
@ApiOperation({ summary: 'Close own job post (Status Change)' })
@ApiParam({ name: 'id', type: String, description: 'CUID of the job post to close' })
@ApiResponse({ status: 200, description: 'Job post closed successfully', type: CloseJobPostResponseDto })
@ApiResponse({ status: 403, description: 'Forbidden: User cannot close this job post' })
@ApiBody({ type: CloseOwnJobPostRequestDto, description: 'Payload for closing own job post' })
async closeOwn(
  @Param('id') id: string,
  @Body() dto: CloseOwnJobPostRequestDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  const userId = req.user.userUuid;
  const accountId = req.user.accountId;

  const sanitizedDto: CloseOwnJobPostRequestDto & { creatorId: string; accountId: string } = {
    ...dto,
    id,
    creatorId: userId,
    accountId,
  };

  this.logger.log(`👤 User ${userId} closing their own job ${id}`);
  return this.executeJobClose(sanitizedDto, userId);
}

// -----------------------------
// CLOSE JOB FOR ANY USER (ADMIN)
// -----------------------------
@Permissions('jobs.close.any')
@SetModule('jobs')
@Version('1')
@Patch('admin/jobs/:id/close')
@ApiOperation({ summary: 'Close any job post (Admin only)' })
@ApiParam({ name: 'id', type: String, description: 'CUID of the job post to close' })
@ApiResponse({ status: 200, description: 'Job post closed successfully', type: CloseJobPostResponseDto })
@ApiResponse({ status: 403, description: 'Forbidden: Admin cannot close this job post' })
@ApiBody({ type: CloseAdminJobPostRequestDto, description: 'Payload for closing any job post (Admin only)' })
async closeAny(
  @Param('id') id: string,
  @Body() dto: CloseAdminJobPostRequestDto,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  const requesterUuid = req.user.userUuid;
  const requesterRole = req.user.role;

  // Ensure route ID is used; Admin DTO already contains creatorId & accountId
  const sanitizedDto: CloseAdminJobPostRequestDto = {
    ...dto,
    id,

  };

  this.logger.log(
    `👮 ${requesterRole} (${requesterUuid}) closing job ${id} for User ${dto.creatorId}, Account ${dto.accountId}`
  );
  return this.executeJobClose(sanitizedDto, requesterUuid);
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