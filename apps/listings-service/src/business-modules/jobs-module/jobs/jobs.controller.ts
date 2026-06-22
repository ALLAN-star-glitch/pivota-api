import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  ValidateJobPostIdsReponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  CloseJobPostResponseDto,
  JobPostCreateResponseDto,
  CreateJobPostDto,
  CreateJobGrpcRequestDto,
  JobApplicationDetailResponseDto,
  CloseJobGrpcRequestDto,
  UpdateJobGrpcRequestDto,
  GetAllJobsRequestDto,
  GetJobsByCategoryRequestDto,
  GetJobByIdRequestDto,
  GetJobListingsByOwnerDto,
  GetAdminJobsFilterDto,
  GetOwnJobsFilterDto,
} from '@pivota-api/dtos';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // ======================================================
  // 1. CREATE FLOWS
  // ======================================================

  @GrpcMethod('JobsService', 'CreateJobPost')
  async createJobPost(
    data: CreateJobPostDto & { 
      creatorId: string; 
      accountId: string; 
      creatorName?: string; 
      accountName?: string 
    },
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    this.logger.debug(`[gRPC] CreateJobPost for Account: ${data.accountId}`);
    return this.jobsService.createJobPost(data);
  }

  @GrpcMethod('JobsService', 'CreateAdminJobPost')
  async createAdminJobPost(
    data: CreateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    this.logger.debug(`[gRPC] CreateAdminJobPost for User: ${data.creatorId}`);
    return this.jobsService.createAdminJobPost(data);
  }

  // ======================================================
  // 2. READ FLOWS (Discovery & Listings WITH CACHING)
  // ======================================================

  /**
   * Get all jobs with pagination and caching
   */
  @GrpcMethod('JobsService', 'GetAllJobs')
  async getAllJobs(
    data: GetAllJobsRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `[gRPC] GetAllJobs: limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.jobsService.getAllJobs(data);
  }

  /**
   * Get job by ID with caching
   */
  @GrpcMethod('JobsService', 'GetJobPostById')
  async getJobPostById(
    data: GetJobByIdRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(
      `[gRPC] GetJobPostById: ${data.id}, ` +
      `bypassCache=${data.bypassCache}, refreshCache=${data.refreshCache}`
    );
    return this.jobsService.getJobPostById(data);
  }

  /**
   * Get jobs by category with caching
   */
  @GrpcMethod('JobsService', 'GetJobsByCategory')
  async getJobsByCategory(
    data: GetJobsByCategoryRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `[gRPC] GetJobsByCategory: categoryId=${data.categoryId}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.jobsService.getJobsByCategory(data);
  }

  /**
   * Get job listings by owner (account) with pagination and caching
   */
  @GrpcMethod('JobsService', 'GetJobListingsByOwner')
  async getJobListingsByOwner(
    data: GetJobListingsByOwnerDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `[gRPC] GetJobListingsByOwner: accountId=${data.accountId}, ` +
      `limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}, ` +
      `bypassCache=${data.bypassCache}, skipCache=${data.skipCache}, refreshCache=${data.refreshCache}`
    );
    return this.jobsService.getJobListingsByOwner(data);
  }

  /**
   * Get own jobs (No caching - user-specific)
   */
  @GrpcMethod('JobsService', 'GetOwnJobs')
  async getOwnJobs(
    data: GetOwnJobsFilterDto & { creatorId: string },
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const { creatorId, ...filter } = data;
    this.logger.debug(
      `[gRPC] GetOwnJobs for User: ${creatorId} | Status: ${filter.status || 'ALL'} | ` +
      `limit=${filter.limit}, offset=${filter.offset}, sortBy=${filter.sortBy}`
    );
    return this.jobsService.getOwnJobs(creatorId, filter);
  }

  /**
   * Get admin jobs with pagination (No caching - admin specific)
   */
  @GrpcMethod('JobsService', 'GetAdminJobs')
  async getAdminJobs(
    data: GetAdminJobsFilterDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `[gRPC] GetAdminJobs filters: creatorId=${data.creatorId}, accountId=${data.accountId}, ` +
      `status=${data.status}, limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}`
    );
    return this.jobsService.getAdminJobs(data);
  }

  // ======================================================
  // 3. UPDATE FLOWS
  // ======================================================

  @GrpcMethod('JobsService', 'UpdateJobPost')
  async updateJobPost(
    data: UpdateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(
      `[gRPC] UpdateJobPost | Job: ${data.id} | Actor: ${data.creatorId} | Acc: ${data.accountId}`
    );
    return this.jobsService.updateJobPost(data);
  }

  @GrpcMethod('JobsService', 'UpdateAdminJobPost')
  async updateAdminJobPost(
    data: UpdateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(
      `[gRPC] UpdateAdminJobPost | Job: ${data.id} | Target: ${data.creatorId}`
    );
    return this.jobsService.updateAdminJobPost(data);
  }

  // ======================================================
  // 4. CLOSURE FLOWS
  // ======================================================

  @GrpcMethod('JobsService', 'CloseJobPost')
  async closeJobPost(
    data: CloseJobGrpcRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`[gRPC] CloseJobPost: ${data.id} by User: ${data.creatorId}`);
    return this.jobsService.closeJobPost(data);
  }

  @GrpcMethod('JobsService', 'CloseAdminJobPost')
  async closeAdminJobPost(
    data: CloseJobGrpcRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`[gRPC] CloseAdminJobPost: ${data.id}`);
    return this.jobsService.closeAdminJobPost(data);
  }

  // ======================================================
  // 5. UTILITY & APPLICATIONS
  // ======================================================

  @GrpcMethod('JobsService', 'ValidateJobPostIds')
  async validateJobPostIds(
    data: ValidateJobPostIdsRequestDto,
  ): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>> {
    this.logger.debug(`[gRPC] ValidateJobPostIds: ${data.ids.length} items`);
    return this.jobsService.validateJobPostIds(data);
  }

  @GrpcMethod('JobsService', 'ApplyToJobPost')
  async applyToJobPost(
    data: CreateJobApplicationDto & { jobPostId: string; applicantId: string },
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    this.logger.debug(`[gRPC] ApplyToJobPost: User ${data.applicantId} -> Job ${data.jobPostId}`);

    const { jobPostId, applicantId, ...dto } = data;
    return this.jobsService.applyToJobPost(jobPostId, applicantId, dto);
  }

  @GrpcMethod('JobsService', 'GetOwnApplications')
  async getOwnApplications(
    data: { applicantId: string; status?: string },
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    this.logger.debug(`[gRPC] GetOwnApplications for Applicant: ${data.applicantId}`);
    return this.jobsService.getOwnApplications(data.applicantId, data.status);
  }
 
  @GrpcMethod('JobsService', 'GetAdminApplications')
  async getAdminApplications(
    data: { applicantId?: string; employerId?: string; status?: string },
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    this.logger.debug(`[gRPC] GetAdminApplications filters: ${JSON.stringify(data)}`);
    return this.jobsService.getAdminApplications(data);
  }

  @GrpcMethod('JobsService', 'GetApplicationById')
  async getApplicationById(
    data: { id: string; requesterId: string; requesterRole?: string },
  ): Promise<BaseResponseDto<JobApplicationDetailResponseDto>> {
    this.logger.debug(`[gRPC] GetApplicationById: ${data.id} requested by ${data.requesterId}`);
    return this.jobsService.getApplicationById(data.id, data.requesterId, data.requesterRole);
  } 
}