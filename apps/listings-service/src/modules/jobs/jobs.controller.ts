import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  CreateProviderJobDto,
  ProviderJobResponseDto,
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
  createJobPost(
    data: CreateJobPostDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`CreateJobPost RequestDto: ${JSON.stringify(data)}`);
    return this.jobsService.createJobPost(data);
  }

  
  // -----------------------------
  // GET JOB POST BY ID
  // -----------------------------
  @GrpcMethod('JobsService', 'GetJobPostById')
  getJobPostById(
    data: { id: string },
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`GetJobPostById Request: ${JSON.stringify(data)}`);
    return this.jobsService.getJobPostById(data.id);
  }

  // -----------------------------
  // GET JOBS BY CATEGORY
  // -----------------------------
  @GrpcMethod('JobsService', 'GetJobsByCategory')
  getJobsByCategory(
    data: { categoryId: string },
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(`GetJobsByCategory Request: ${JSON.stringify(data)}`);
    return this.jobsService.getJobsByCategory(data.categoryId);
  }

  // -----------------------------
  // CREATE PROVIDER JOB
  // -----------------------------
  @GrpcMethod('JobsService', 'CreateProviderJob')
  createProviderJob(
    data: CreateProviderJobDto,
  ): Promise<BaseResponseDto<ProviderJobResponseDto>> {
    this.logger.debug(`CreateProviderJob RequestDto: ${JSON.stringify(data)}`);
    return this.jobsService.createProviderJob(data);
  }
}
