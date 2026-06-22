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
  AdminCreateJobPostDto,
  CreateJobPostDto,
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

import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';

interface ApplyToJobPostGrpcRequest extends CreateJobApplicationDto {
  jobPostId: string;
  applicantId: string;
}

interface JobsServiceGrpc {
  // --- Creation ---
  CreateJobPost(
    data: CreateJobPostDto & { creatorId: string; accountId: string },
  ): Observable<BaseResponseDto<JobPostCreateResponseDto>>;

  CreateAdminJobPost(
    data: AdminCreateJobPostDto,
  ): Observable<BaseResponseDto<JobPostCreateResponseDto>>;

  // --- Discovery (WITH CACHE CONTROL) ---
  GetAllJobs(
    data: GetAllJobsRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  GetJobPostById(
    data: GetJobByIdRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  GetJobsByCategory(
    data: GetJobsByCategoryRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  // ===================================================
  // GET JOB LISTINGS BY OWNER (WITH CACHE CONTROL)
  // ===================================================
  GetJobListingsByOwner(
    data: GetJobListingsByOwnerDto,
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  ValidateJobPostIds(
    data: ValidateJobPostIdsRequestDto,
  ): Observable<BaseResponseDto<ValidateJobPostIdsReponseDto>>;

  // --- Update ---
  UpdateJobPost(
    data: UpdateJobGrpcRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  UpdateAdminJobPost(
    data: UpdateJobGrpcRequestDto,
  ): Observable<BaseResponseDto<JobPostResponseDto>>;

  // --- Closure ---
  CloseJobPost(
    data: CloseJobGrpcRequestDto,
  ): Observable<BaseResponseDto<CloseJobPostResponseDto>>;

  CloseAdminJobPost(
    data: CloseJobGrpcRequestDto,
  ): Observable<BaseResponseDto<CloseJobPostResponseDto>>;

  // --- Applications ---
  ApplyToJobPost(
    data: ApplyToJobPostGrpcRequest
  ): Observable<BaseResponseDto<JobApplicationResponseDto>>;

  GetOwnApplications(
    data: { applicantId: string; status?: string }
  ): Observable<BaseResponseDto<JobApplicationResponseDto[]>>;

  GetAdminApplications(
    data: { applicantId?: string; employerId?: string; status?: string }
  ): Observable<BaseResponseDto<JobApplicationResponseDto[]>>;

  GetApplicationById(
    data: { id: string; requesterId: string; requesterRole?: string }
  ): Observable<BaseResponseDto<JobApplicationDetailResponseDto>>;

  // --- Ownership & Management ---
  GetOwnJobs(
    data: { creatorId: string } & GetOwnJobsFilterDto,
  ): Observable<BaseResponseDto<JobPostResponseDto[]>>;

  GetAdminJobs(
    data: GetAdminJobsFilterDto,
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
    dto: CreateJobPostDto & { creatorId: string; accountId: string; creatorName?: string; accountName?: string },
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
  // 3. GET ALL JOBS (With Pagination and Cache Control)
  // ===========================================================
  async getAllJobs(
    dto: GetAllJobsRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetAllJobs: limit=${dto.limit}, offset=${dto.offset}, ` +
      `employmentType=${dto.employmentType}, paymentType=${dto.paymentType}, ` +
      `workArrangement=${dto.workArrangement}, commitment=${dto.commitment}, ` +
      `workSchedule=${dto.workSchedule}, documentationLevel=${dto.documentationLevel}, ` +
      `skillLevel=${dto.skillLevel}, experienceLevel=${dto.experienceLevel}, ` +
      `educationLevel=${dto.educationLevel}, isRemote=${dto.isRemote}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );

    const res = await firstValueFrom(this.grpcService.GetAllJobs(dto));

    this.logger.debug(`GetAllJobs gRPC Response: ${res?.success}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 4. GET JOB POST BY ID (With Cache Control)
  // ===========================================================
  async getJobPostById(
    dto: GetJobByIdRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetJobPostById: id=${dto.id}, ` +
      `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}`
    );

    const res = await firstValueFrom(this.grpcService.GetJobPostById(dto));

    this.logger.debug(`GetJobPostById gRPC Response: ${res?.success}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 5. GET JOBS BY CATEGORY (With Cache Control)
  // ===========================================================
  async getJobsByCategory(
    dto: GetJobsByCategoryRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetJobsByCategory: categoryId=${dto.categoryId}, ` +
      `employmentType=${dto.employmentType}, paymentType=${dto.paymentType}, ` +
      `workArrangement=${dto.workArrangement}, commitment=${dto.commitment}, ` +
      `workSchedule=${dto.workSchedule}, documentationLevel=${dto.documentationLevel}, ` +
      `skillLevel=${dto.skillLevel}, experienceLevel=${dto.experienceLevel}, ` +
      `educationLevel=${dto.educationLevel}, isRemote=${dto.isRemote}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );

    const res = await firstValueFrom(this.grpcService.GetJobsByCategory(dto));

    this.logger.debug(`GetJobsByCategory gRPC Response: ${res?.success}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 6. GET JOB LISTINGS BY OWNER (With Pagination and Cache Control)
  // ===========================================================
  async getJobListingsByOwner(
    dto: GetJobListingsByOwnerDto,
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetJobListingsByOwner: accountId=${dto.accountId}, ` +
      `limit=${dto.limit}, offset=${dto.offset}, sortBy=${dto.sortBy}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );

    const res = await firstValueFrom(this.grpcService.GetJobListingsByOwner(dto));

    this.logger.debug(`GetJobListingsByOwner gRPC Response: ${res?.success}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 7. GET OWN JOBS (With Pagination - No Caching)
  // ===========================================================
  async getOwnJobs(
    creatorId: string,
    dto: GetOwnJobsFilterDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const { status, employmentType, paymentType, workArrangement, commitment, experienceLevel, educationLevel, limit, offset, sortBy } = dto;
    
    this.logger.debug(
      `📤 Sending to gRPC - GetOwnJobs: creatorId=${creatorId}, status=${status}, ` +
      `employmentType=${employmentType}, paymentType=${paymentType}, workArrangement=${workArrangement}, ` +
      `commitment=${commitment}, experienceLevel=${experienceLevel}, educationLevel=${educationLevel}, ` +
      `limit=${limit}, offset=${offset}, sortBy=${sortBy}`
    );

    const res = await firstValueFrom(
      this.grpcService.GetOwnJobs({ 
        creatorId, 
        status, 
        employmentType,
        paymentType,
        workArrangement,
        commitment,
        experienceLevel,
        educationLevel,
        limit, 
        offset, 
        sortBy 
      })
    );

    this.logger.debug(`GetOwnJobs gRPC: ${res?.success} for user ${creatorId}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 8. GET ADMIN JOBS (With Pagination - No Caching)
  // ===========================================================
  async getAdminJobs(
    dto: GetAdminJobsFilterDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    this.logger.debug(
      `📤 Sending to gRPC - GetAdminJobs: creatorId=${dto.creatorId}, accountId=${dto.accountId}, ` +
      `status=${dto.status}, employmentType=${dto.employmentType}, paymentType=${dto.paymentType}, ` +
      `workArrangement=${dto.workArrangement}, commitment=${dto.commitment}, ` +
      `experienceLevel=${dto.experienceLevel}, educationLevel=${dto.educationLevel}, ` +
      `isRemote=${dto.isRemote}, limit=${dto.limit}, offset=${dto.offset}, sortBy=${dto.sortBy}`
    );

    const res = await firstValueFrom(this.grpcService.GetAdminJobs(dto));

    this.logger.debug(`GetAdminJobs gRPC: ${res?.success} records found`);

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 9. UPDATE JOB POST
  // ===========================================================
  async updateJobPost(
    dto: UpdateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`UpdateJobPost (Own) | Job: ${dto.id} | User: ${dto.creatorId} | Acc: ${dto.accountId}`);
    
    const res = await firstValueFrom(this.grpcService.UpdateJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 10. UPDATE ADMIN JOB POST
  // ===========================================================
  async updateAdminJobPost(
    dto: UpdateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    this.logger.debug(`UpdateAdminJobPost (Admin) | Job: ${dto.id} | Target: ${dto.creatorId}`);
    
    const res = await firstValueFrom(this.grpcService.UpdateAdminJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 11. CLOSE JOB POST
  // ===========================================================
  async closeJobPost(
    dto: CloseJobGrpcRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`CloseJobPost (Own) for Job ${dto.id} by User ${dto.creatorId}`);
    const res = await firstValueFrom(this.grpcService.CloseJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 12. CLOSE ADMIN JOB POST
  // ===========================================================
  async closeAdminJobPost(
    dto: CloseJobGrpcRequestDto,
  ): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    this.logger.debug(`CloseAdminJobPost (Admin) for Job ${dto.id}`);
    const res = await firstValueFrom(this.grpcService.CloseAdminJobPost(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 13. VALIDATE JOB POST IDS
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
  // 14. GET OWN APPLICATIONS (Slim List)
  // ===========================================================
  async getOwnApplications(
    applicantId: string, 
    status?: string
  ): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetOwnApplications({ applicantId, status }));

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 15. GET ADMIN APPLICATIONS (Management)
  // ===========================================================
  async getAdminApplications(query: {
    applicantId?: string;
    employerId?: string;
    status?: string;
  }): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetAdminApplications(query));

    if (res?.success) {
      return BaseResponseDto.ok(res.data || [], res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 16. GET APPLICATION BY ID (Full Details)
  // ===========================================================
  async getApplicationById(
    id: string, 
    requesterId: string,
    requesterRole?: string
  ): Promise<BaseResponseDto<JobApplicationDetailResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetApplicationById({ id, requesterId, requesterRole })
    );

    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // 17. APPLY TO JOB POST
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
    if (res?.success) {
      return BaseResponseDto.ok(res.data, res.message, res.code);
    }
    return BaseResponseDto.fail(res?.message, res?.code);
  }
}