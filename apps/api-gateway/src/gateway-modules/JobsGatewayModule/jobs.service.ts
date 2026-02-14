import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  ValidateJobPostIdsReponseDto,
  CloseJobPostResponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  JobPostCreateResponseDto,
  CloseAdminJobPostRequestDto,
  CloseOwnJobPostRequestDto,
  AdminCreateJobPostDto,
  CreateJobPostDto,
  UpdateAdminJobPostRequestDto,
  UpdateOwnJobPostRequestDto,
} from '@pivota-api/dtos';

import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface ApplyToJobPostGrpcRequest extends CreateJobApplicationDto {
  jobPostId: string;
  applicantId: string;
}

interface JobsServiceGrpc {

  CreateJobPost(
    data: CreateJobPostDto & { creatorId: string; accountId: string },
  ): Observable<BaseResponseDto<JobPostCreateResponseDto>>;

  CreateAdminJobPost(
    data: AdminCreateJobPostDto,
  ): Observable<BaseResponseDto<JobPostCreateResponseDto>>;

  UpdateJobPost(
    data: UpdateOwnJobPostRequestDto & { creatorId: string },
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  UpdateAdminJobPost(
    data: UpdateAdminJobPostRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto>>;
  GetJobPostById(
    data: { id: string },
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  GetJobsByCategory(
    data: { categoryId: string },
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  ValidateJobPostIds(
    data: ValidateJobPostIdsRequestDto,
  ): Observable<BaseResponseDto<ValidateJobPostIdsReponseDto>>;


  CloseJobPost(
    data: CloseOwnJobPostRequestDto & { creatorId: string },
  ): Observable<BaseResponseDto<CloseJobPostResponseDto>>;

  CloseAdminJobPost(
    data: CloseAdminJobPostRequestDto,
  ): Observable<BaseResponseDto<CloseJobPostResponseDto>>;

  ApplyToJobPost(
    data: ApplyToJobPostGrpcRequest,
  ): Observable<BaseResponseDto<JobApplicationResponseDto>>;

  GetOwnJobs(
    data: { creatorId: string; status?: string },
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

 
  GetAdminJobs(
    data: { creatorId?: string; accountId?: string; status?: string },
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;
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
  // 1. CREATE OWN JOB POST (Standard)
  // ===========================================================
  async createJobPost(
    dto: CreateJobPostDto & { creatorId: string; accountId: string, creatorName?: string; accountName?: string  },
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 2. CREATE ADMIN JOB POST (With Identity Lookup)
  // ===========================================================
  async createAdminJobPost(
    dto: AdminCreateJobPostDto,
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateAdminJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 1. UPDATE OWN JOB POST (Standard)
  // ===========================================================
  async updateJobPost(
    dto: UpdateOwnJobPostRequestDto & { creatorId: string },
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`UpdateJobPost (Own) for Job ${dto.id} by User ${dto.creatorId}`);
    const res = await firstValueFrom(this.grpcService.UpdateJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 2. UPDATE ADMIN JOB POST (Admin Flow)
  // ===========================================================
  async updateAdminJobPost(
    dto: UpdateAdminJobPostRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`UpdateAdminJobPost (Admin) for Job ${dto.id}`);
    const res = await firstValueFrom(this.grpcService.UpdateAdminJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET OWN JOB LISTINGS (Dashboard Flow)
  // ===========================================================
  async getOwnJobs(
    creatorId: string, 
    status?: string
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetOwnJobs({ creatorId, status }));

    this.logger.debug(`GetOwnJobs gRPC: ${res?.success} for user ${creatorId}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET ADMIN JOB LISTINGS (Admin Flow)
  // ===========================================================
  async getAdminJobs(query: {
    creatorId?: string;
    accountId?: string;
    status?: string;
  }): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetAdminJobs(query));

    this.logger.debug(`GetAdminJobs gRPC: ${res?.success} records found`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET JOB POST BY ID
  // ===========================================================
  async getJobPostById(id: string): Promise<BaseResponseDto<JobPostResponseDto>> {
    const res = await firstValueFrom(this.grpcService.GetJobPostById({ id }));

    this.logger.debug(`GetJobPostById gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET JOBS BY CATEGORY
  // ===========================================================
  async getJobsByCategory(
    categoryId: string,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetJobsByCategory({ categoryId }));

    this.logger.debug(`GetJobsByCategory gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // VALIDATE JOB POST IDS
  // ===========================================================
  async validateJobPostIds(
    dto: ValidateJobPostIdsRequestDto,
  ): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>> {
    const response = await firstValueFrom(this.grpcService.ValidateJobPostIds(dto));

    this.logger.debug(`ValidatedJobIds: ${JSON.stringify(response)}`);

    if (response?.success) {
      return BaseResponseDto.ok(response.data, response.message, response.code);
    }

    return BaseResponseDto.fail(response?.message, response?.code);
  }

  // ===========================================================
  // 1. CLOSE OWN JOB POST (Standard)
  // ===========================================================
  async closeJobPost(
    dto: CloseOwnJobPostRequestDto & { creatorId: string },
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`CloseJobPost (Own) for Job ${dto.id} by User ${dto.creatorId}`);
    const res = await firstValueFrom(this.grpcService.CloseJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 2. CLOSE ADMIN JOB POST (Admin Flow)
  // ===========================================================
  async closeAdminJobPost(
    dto: CloseAdminJobPostRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`CloseAdminJobPost (Admin) for Job ${dto.id}`);
    const res = await firstValueFrom(this.grpcService.CloseAdminJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // APPLY TO JOB POST
  // ===========================================================
  async applyToJobPost(
    jobPostId: string,
    applicantId: string,
    dto: CreateJobApplicationDto,
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    const grpcRequest: ApplyToJobPostGrpcRequest = {
      ...dto,
      jobPostId,
      applicantId,
    };

    const res = await firstValueFrom(this.grpcService.ApplyToJobPost(grpcRequest));
    this.logger.debug(`ApplyToJobPost gRPC result: ${res?.success}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}