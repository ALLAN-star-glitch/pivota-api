import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  CreateJobPostDto,
  JobPostResponseDto,
  ValidateJobPostIdsRequestDto,
  ValidateJobPostIdsReponseDto,
  CloseJobPostRequestDto,
  CloseJobPostResponseDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  UpdateJobPostRequestDto,
} from '@pivota-api/dtos';


import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface ApplyToJobPostGrpcRequest extends CreateJobApplicationDto {
  jobPostId: string;
  applicantId: string;
}

interface JobsServiceGrpc {
  CreateJobPost(
    data: CreateJobPostDto,
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  GetJobPostById(
    data: { id: string },
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  GetJobsByCategory(
    data: { categoryId: string },
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  ValidateJobPostIds(data: ValidateJobPostIdsRequestDto): Observable<BaseResponseDto<ValidateJobPostIdsReponseDto>>;

  UpdateJobPost(data: UpdateJobPostRequestDto): Observable<BaseResponseDto<JobPostResponseDto>>;
  CloseJobPost(data: CloseJobPostRequestDto): Observable<BaseResponseDto<CloseJobPostResponseDto>>;
  ApplyToJobPost(data: ApplyToJobPostGrpcRequest): Observable<BaseResponseDto<JobApplicationResponseDto>>;
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
    return BaseResponseDto.ok(res.data, res.message, res.code);
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
    const res = await firstValueFrom(
      this.grpcService.GetJobsByCategory({ categoryId }),
    );

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
    dto: ValidateJobPostIdsRequestDto
  ): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>>{
    const response = await firstValueFrom(
      this.grpcService.ValidateJobPostIds(dto),
    );

    this.logger.debug(`ValidatedJobIds: ${JSON.stringify(response)}`);

    if(response?.success){
      return BaseResponseDto.ok(response.data, response.message, response.code)
    }

    return BaseResponseDto.fail(response?.message, response?.code)
  }

  // ===========================================================
  // UPDATE JOB POST
  // ===========================================================
  async updateJobPost(dto: UpdateJobPostRequestDto): Promise<BaseResponseDto<JobPostResponseDto>> {
    const res = await firstValueFrom(this.grpcService.UpdateJobPost(dto));
    this.logger.debug(`UpdateJobPost gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // CLOSE JOB POST
  // ===========================================================
  async closeJobPost(dto: CloseJobPostRequestDto): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CloseJobPost(dto));
    this.logger.debug(`CloseJobPost gRPC: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  
// ===========================================================
  // APPLY TO JOB POST (API Gateway Service)
  // ===========================================================
  async applyToJobPost(
    jobPostId: string, 
    applicantId: string, 
    dto: CreateJobApplicationDto
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    
    // 3. Assemble the full message. 
    // TypeScript now knows this matches ApplyToJobPostGrpcRequest
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

