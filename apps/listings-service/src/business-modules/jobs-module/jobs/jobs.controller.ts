import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  ValidateJobPostIdsReponseDto,
  UpdateJobPostRequestDto,
  CloseJobPostRequestDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  CloseJobPostResponseDto,
} from '@pivota-api/dtos';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // -----------------------------
  // CREATE JOB POST
  // -----------------------------
  @GrpcMethod('JobsService', 'CreateJobPost')
  async createJobPost(
    data: CreateJobPostDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`CreateJobPost Request: ${JSON.stringify(data)}`);
    return this.jobsService.createJobPost(data);
  }

  // -----------------------------
  // GET JOB POST BY ID
  // -----------------------------
  @GrpcMethod('JobsService', 'GetJobPostById')
  async getJobPostById(
    data: { id: string },
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`GetJobPostById Request: ${JSON.stringify(data)}`);
    return this.jobsService.getJobPostById(data.id);
  }

  // -----------------------------
  // GET JOBS BY CATEGORY
  // -----------------------------
  @GrpcMethod('JobsService', 'GetJobsByCategory')
  async getJobsByCategory(
    data: { categoryId: string },
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(`GetJobsByCategory Request: ${JSON.stringify(data)}`);
    return this.jobsService.getJobsByCategory(data.categoryId);
  }

  // -----------------------------
  // VALIDATE JOB POST IDS
  // -----------------------------
  @GrpcMethod('JobsService', 'ValidateJobPostIds')
  async validateJobPostIds(
    data: ValidateJobPostIdsRequestDto,
  ): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>> {
    this.logger.debug(`ValidateJobPostIds Request: ${JSON.stringify(data)}`);
    return this.jobsService.validateJobPostIds(data);
  }

  // -----------------------------
  // UPDATE JOB POST
  // -----------------------------
  @GrpcMethod('JobsService', 'UpdateJobPost')
  async updateJobPost(
    data: UpdateJobPostRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`UpdateJobPost Request: ${JSON.stringify(data)}`);
    return this.jobsService.updateJobPost(data);
  }

  // -----------------------------
  // CLOSE JOB POST (Soft Delete/Status Change)
  // -----------------------------
  @GrpcMethod('JobsService', 'CloseJobPost')
  async closeJobPost(
    data: CloseJobPostRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`CloseJobPost Request: ${JSON.stringify(data)}`);
    return this.jobsService.closeJobPost(data);
  }

  // -----------------------------
// APPLY TO JOB POST
// -----------------------------
@GrpcMethod('JobsService', 'ApplyToJobPost')
async applyToJobPost(
  // Use a type intersection to combine the DTO fields with the missing IDs
  data: CreateJobApplicationDto & { jobPostId: string; applicantId: string },
): Promise<BaseResponseDto<JobApplicationResponseDto>> {
  this.logger.debug(
    `[gRPC] ApplyToJobPost Request: User ${data.applicantId} -> Job ${data.jobPostId}`
  );

  /**
   * DESTRUCTURING: 
   * Extract the IDs separately and put everything else into 'dto'
   */
  const { jobPostId, applicantId, ...dto } = data;

  /**
   * PASS TO SERVICE:
   * Matches the new signature: (jobPostId, applicantId, dto)
   */
  return this.jobsService.applyToJobPost(jobPostId, applicantId, dto);
}
}