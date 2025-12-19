import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  CreateProviderJobDto,
  ProviderJobResponseDto,
  ValidateJobPostIdsRequestDto,
  ValidateJobPostIdsReponseDto,
} from '@pivota-api/dtos';

import { BaseJobPostResponseGrpc, BaseJobPostsResponseGrpc, BaseProviderJobResponseGrpc, BaseValidateJobPostIdsReponseGrpc } from '@pivota-api/interfaces';

import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface JobsServiceGrpc {
  CreateJobPost(
    data: CreateJobPostDto,
  ): Observable<BaseJobPostResponseGrpc<JobPostResponseDto>>;

  GetJobPostById(
    data: { id: string },
  ): Observable<BaseJobPostResponseGrpc<JobPostResponseDto>>;

  GetJobsByCategory(
    data: { categoryId: string },
  ): Observable<BaseJobPostsResponseGrpc<JobPostResponseDto[]>>;

  CreateProviderJob(
    data: CreateProviderJobDto,
  ): Observable<BaseProviderJobResponseGrpc<ProviderJobResponseDto>>;

  ValidateJobPostIds(data: ValidateJobPostIdsRequestDto): Observable<BaseValidateJobPostIdsReponseGrpc<ValidateJobPostIdsReponseDto>>;

}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private grpcService: JobsServiceGrpc;

  constructor(
    @Inject('JOBS_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<JobsServiceGrpc>('JobsService');
  }

  // ===========================================================
  // CREATE JOB POST
  // ===========================================================
  async createJobPost(dto: CreateJobPostDto): Promise<BaseResponseDto<JobPostResponseDto>> {
  // Ensure creatorId is included
  const grpcRequest = {
    ...dto,
    creatorId: dto.creatorId, // must exist here
    jobType: dto.jobType,     // make sure enums match proto values (0 | 1)
    status: dto.status,       // same for JobPostStatus
  };

  const res = await firstValueFrom(this.grpcService.CreateJobPost(grpcRequest));

  this.logger.debug(`CreateJobPost gRPC: ${JSON.stringify(res)}`);

  if (res?.success) {
    return BaseResponseDto.ok(res.jobPost, res.message, res.code);
  }

  return BaseResponseDto.fail(res?.message, res?.code);
}

  // ===========================================================
  // GET JOB POST BY ID
  // ===========================================================
  async getJobPostById(
    id: string,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetJobPostById({ id }),
    );

    this.logger.debug(`GetJobPostById gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.jobPost, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET JOBS BY CATEGORY
  // ===========================================================
  async getJobsByCategory(
    categoryId: string,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const res = await firstValueFrom(
      this.grpcService.GetJobsByCategory({ categoryId }),
    );

    this.logger.debug(`GetJobsByCategory gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.jobPosts || [], res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // CREATE PROVIDER JOB
  // ===========================================================
  async createProviderJob(
    dto: CreateProviderJobDto,
  ): Promise<BaseResponseDto<ProviderJobResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.CreateProviderJob(dto),
    );

    this.logger.debug(`CreateProviderJob gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.providerJob, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // VALIDATE JOB POST IDS
  // ===========================================================
  async validateJobPostIds(
    dto: ValidateJobPostIdsRequestDto
  ): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>>{
    const response = await firstValueFrom(
      this.grpcService.ValidateJobPostIds(dto),
    );

    this.logger.debug(`ValidatedJobIds: ${JSON.stringify(response)}`);

    if(response?.success){
      return BaseResponseDto.ok(response.jobIds, response.message, response.code)
    }

    return BaseResponseDto.fail(response?.message, response?.code)
  }


}
