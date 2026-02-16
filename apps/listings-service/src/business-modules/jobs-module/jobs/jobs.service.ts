/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  JobPostResponseDto,
  BaseResponseDto,
  UserResponseDto,
  GetUserByUserUuidDto,
  ValidateJobPostIdsReponseDto,
  ValidateJobPostIdsRequestDto,
  CreateJobApplicationDto,
  JobApplicationResponseDto,
  CloseJobPostResponseDto,
  JobPostCreateResponseDto,
  AdminCreateJobPostDto,
  CreateJobPostDto,
  UpdateAdminJobPostRequestDto,
  UserProfileResponseDto,
  CreateJobGrpcRequestDto,
  JobApplicationDetailResponseDto,
  CloseJobGrpcRequestDto,
  UpdateJobGrpcRequestDto
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc,   } from '@pivota-api/interfaces';
import { ClientGrpc } from '@nestjs/microservices';
import { Category, JobApplicationAttachment, JobApplicationStatusHistory, JobPost, JobPostApplication } from '../../../../generated/prisma/client';

interface JobPersistenceData extends CreateJobGrpcRequestDto {
  creatorName: string;
  accountName: string;
  accountId: string; // Ensures accountId is present even if it was optional in the DTO
}

interface UpdatePersistenceData extends Partial<JobPersistenceData> {
  id: string;
}

interface UserServiceGrpc {

  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
}

type JobPostWithRelations = JobPost & {
  category: Category | null;
  subCategory: Category | null;
};

// The "Heavy" database result type
type FullApplicationResult = JobPostApplication & {
  attachments: JobApplicationAttachment[];
  statusHistory: JobApplicationStatusHistory[];
};

type SlimApplicationResult = JobPostApplication & {
  statusHistory?: Pick<JobApplicationStatusHistory, 'reason'>[];
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
   private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PROFILE_GRPC') private readonly userService: ClientGrpc, 
  ) {
     this.userGrpcService = this.userService.getService<UserServiceGrpc>('ProfileService');
  }


// ======================================================
// 1. ADMIN FLOW (With gRPC Validation)
// ======================================================
async createAdminJobPost(
  dto: CreateJobGrpcRequestDto,
): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  try {
    // Identity Validation: Verify the User exists and get their Account info
    const userProfile = await firstValueFrom(
      this.userGrpcService.getUserProfileByUuid({ userUuid: dto.creatorId })
    );

    if (!userProfile?.success || !userProfile.data) {
      this.logger.error(`❌ Admin Validation Failed: Creator ${dto.creatorId} not found.`);
      return BaseResponseDto.fail('The specified Creator does not exist.', 'USER_NOT_FOUND');
    }

    // Security check: Ensure the Admin didn't provide a mismatched account ID
    if (userProfile.data.account.uuid !== dto.accountId) {
      return BaseResponseDto.fail('The Creator does not belong to the specified Account.', 'ACCOUNT_MISMATCH');
    }

    // Resolve Names for denormalization (shared nav support)
    const creatorName = `${userProfile.data.user.firstName} ${userProfile.data.user.lastName}`;
    const accountName = userProfile.data.organization?.name || creatorName;

    return await this.persistJobToDb({
      ...dto,
      accountId: userProfile.data.account.uuid, // Ensure we use the account ID from the profile, not just trust the input
      creatorName,
      accountName,
    });
  } catch (error) {
    this.logger.error(`🔥 Admin Job Creation Error: ${error.message}`);
    return BaseResponseDto.fail('Internal failure during admin job creation.', 'ERROR');
  }
}

// ======================================================
// 2. STANDARD FLOW (Fast / Trusted Gateway IDs)
// ======================================================
async createJobPost(
  dto: CreateJobPostDto & { creatorId: string; accountId: string, creatorName?: string; accountName?: string},
): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  try {
    // For standard users, we skip the gRPC call to the Profile Service
    // and rely on the IDs passed from the Gateway (extracted from JWT).
    return await this.persistJobToDb({
      ...dto,
      creatorName: dto.creatorName || 'Creator', // Fallback name if not provided by gateway (though ideally it should be)  
      accountName: dto.accountName || 'Account',
    });
  } catch (error) {
    this.logger.error(`🔥 Job Creation Error: ${error.message}`);
    return BaseResponseDto.fail('Internal failure during job creation.', 'INTERNAL_ERROR');
  }
}

// ======================================================
// 3. CORE PERSISTENCE (Private Helper)
// ======================================================
private async persistJobToDb(data: JobPersistenceData): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
  // Category Validation
  const categoryCount = await this.prisma.category.count({
    where: { id: data.categoryId },
  });

  if (categoryCount === 0) {
    return BaseResponseDto.fail('Invalid category ID provided.', 'CATEGORY_NOT_FOUND');
  }

  const created = await this.prisma.jobPost.create({
    data: {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId ?? null,
      creatorId: data.creatorId,
      accountId: data.accountId,
      creatorName: data.creatorName,
      accountName: data.accountName,
      jobType: data.jobType,
      locationCity: data.locationCity,
      locationNeighborhood: data.locationNeighborhood ?? '',
      isRemote: data.isRemote ?? false,
      payAmount: data.payAmount ?? 0,
      payRate: data.payRate,
      isNegotiable: data.isNegotiable ?? false,
      skills: data.skills ?? [],
      experienceLevel: data.experienceLevel ?? '',
      employmentType: data.employmentType ?? '',
      requiresDocuments: data.requiresDocuments ?? false,
      documentsNeeded: data.documentsNeeded ?? [],
      requiresEquipment: data.requiresEquipment ?? false,
      equipmentRequired: data.equipmentRequired ?? [],
      additionalNotes: data.additionalNotes ?? '',
      status: data.status ?? 'ACTIVE',
    },
  });

  return {
    success: true,
    message: 'Job post created successfully',
    code: 'CREATED',
    data: {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

// ======================================================
// GET JOB POST BY ID
// ======================================================
async getJobPostById(id: string): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    // 1. Fetch Job from DB with relations using strictly typed result
    const job = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    }) as JobPostWithRelations | null;

    if (!job) {
      return BaseResponseDto.fail(
        'Job post not found', 
        'NOT_FOUND'
      );
    }

    // 2. Map the data using the shared helper for consistent shape
    const data = await this.mapToResponseDto(job);

    return {
      success: true,
      message: 'Job post fetched successfully',
      code: 'OK',
      data: data,
      error: null,
    };

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Fetch job post failed: ${err.message}`, err.stack);

    return BaseResponseDto.fail(
      'Failed to fetch job post',
      'NOT_FOUND'
    );
    
  } finally {
    this.logger.log(`[JOBS] Finished fetching job post: ${id}`);
  }
}

  // ======================================================
// FETCH JOBS BY CATEGORY
// ======================================================
async getJobsByCategory(categoryId: string): Promise<BaseResponseDto<JobPostResponseDto[]>> {
  this.logger.log(`[JOBS] Fetching feed for category: ${categoryId}`);

  try {
    const jobs = await this.prisma.jobPost.findMany({
      where: { categoryId, status: 'ACTIVE' },
      include: { 
        category: true, 
        subCategory: true 
      },
      orderBy: { createdAt: 'desc' }
    }) as JobPostWithRelations[];

    const jobsWithCounts = await Promise.all(
      jobs.map((job) => this.mapToResponseDto(job))
    );

    return {
      success: true,
      message: `Successfully fetched ${jobs.length} jobs`,
      code: 'OK',
      data: jobsWithCounts,
      error: null,
    };
  } catch (error) {
    const err = error as Error;
    this.logger.error(`Fetch jobs by category failed: ${err.message}`, err.stack);
    return BaseResponseDto.fail('Failed to fetch jobs', 'NOT_FOUND');
  }
}


  // Validate if job posts exist
async validateJobPostIds(dto: ValidateJobPostIdsRequestDto): Promise<BaseResponseDto<ValidateJobPostIdsReponseDto>> {
  try {
    const existingJobs = await this.prisma.jobPost.findMany({
      where: { id: { in: dto.ids } },
      select: { id: true },
    });

    const existingIds = existingJobs.map(j => j.id);
    const invalidIds = dto.ids.filter(id => !existingIds.includes(id));

    return {
      success: true,
      message: 'Validation completed',
      code: 'VALIDATION_DONE',
      data: { validIds: existingIds, invalidIds },
      error: null,
    };
  } catch (err) {
    const error = err as Error;
    this.logger.error(`Failed to validate job IDs: ${error.message}`, error.stack);
    return {
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_FAILED',
      data: { validIds: [], invalidIds: dto.ids },
      error: { message: error.message, details: error.stack },
    };
  }
}

// ======================================================
// 1. UPDATE OWN JOB POST (Standard - Ownership & Account Check)
// ======================================================
async updateJobPost(
  dto: UpdateJobGrpcRequestDto
): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    // We verify both creator AND account to ensure organizational integrity
    const existing = await this.prisma.jobPost.findUnique({ 
      where: { id: dto.id },
      select: { creatorId: true, accountId: true }
    });
    
    if (!existing || existing.creatorId !== dto.creatorId || existing.accountId !== dto.accountId) {
      this.logger.warn(`⚠️ Unauthorized update attempt: User ${dto.creatorId} (Acc: ${dto.accountId}) tried to edit Job ${dto.id}`);
      return BaseResponseDto.fail('Job post not found or unauthorized access.', 'UNAUTHORIZED');
    }

    return await this.performUpdate(dto);
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Job update failed: ${err.message}`);
    return BaseResponseDto.fail('Failed to update job post.', 'INTERNAL_ERROR');
  }
}

// ======================================================
// 2. UPDATE ADMIN JOB POST (Admin - Identity Validation)
// ======================================================
async updateAdminJobPost(
  dto: UpdateJobGrpcRequestDto
): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    const existing = await this.prisma.jobPost.findUnique({ where: { id: dto.id } });
    if (!existing) {
      return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
    }

    // gRPC Validation: Admins can change ownership, so we verify the target identity
    const userProfile = await firstValueFrom(
      this.userGrpcService.getUserProfileByUuid({ userUuid: dto.creatorId })
    );

    if (!userProfile?.success || !userProfile.data) {
      return BaseResponseDto.fail('Target creator does not exist.', 'USER_NOT_FOUND');
    }

    // Prevent linking to the wrong account hierarchy
    if (userProfile.data.account.uuid !== dto.accountId) {
      return BaseResponseDto.fail('Identity mismatch: Creator does not belong to the provided account.', 'BAD_REQUEST');
    }

    const creatorName = `${userProfile.data.user.firstName} ${userProfile.data.user.lastName}`;
    const accountName = userProfile.data.organization?.name || creatorName;

    return await this.performUpdate({
      ...dto,
      creatorName,
      accountName
    });
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Admin job update failed: ${err.message}`);
    return BaseResponseDto.fail('Internal failure during admin update.', 'ERROR');
  }
}

// ======================================================
// CORE UPDATE PERSISTENCE (With Vertical Validation)
// ======================================================
private async performUpdate(
  data: UpdateJobGrpcRequestDto & { creatorName?: string; accountName?: string }
): Promise<BaseResponseDto<JobPostResponseDto>> {
  // 1. Destructure EVERY identifier out of the 'data' object 
  // so they don't leak into 'updateFields'
  const { 
    id, 
    creatorId, 
    accountId, 
    categoryId, 
    subCategoryId, 
    ...updateFields 
  } = data;

  // 2. Validate Main Category
  if (categoryId) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { vertical: true }
    });

    if (!category || category.vertical !== 'JOBS') {
      this.logger.error(`Validation Failed: Category ${categoryId} not found or not JOBS`);
      return BaseResponseDto.fail('Invalid category selected.', 'BAD_REQUEST');
    }
  }

  // 3. Validate Sub-Category
  if (subCategoryId) {
    const subCategory = await this.prisma.category.findUnique({
      where: { id: subCategoryId },
      select: { parentId: true, vertical: true }
    });

    if (!subCategory || subCategory.vertical !== 'JOBS') {
      this.logger.error(`Validation Failed: SubCategory ${subCategoryId} not found or not JOBS`);
      return BaseResponseDto.fail('Invalid sub-category selected.', 'BAD_REQUEST');
    }

    // Strict Hierarchy Check: Ensure the parent is the one provided (if provided)
    if (categoryId && subCategory.parentId !== categoryId) {
      return BaseResponseDto.fail('Sub-category mismatch with parent category.', 'BAD_REQUEST');
    }
  }

  // 4. Perform the update with explicit control
  const updated = await this.prisma.jobPost.update({
    where: { id },
    data: {
      ...updateFields, // Contains title, description, etc. (No IDs here!)
      // Manually add the IDs only if they exist
      ...(categoryId && { categoryId }),
      ...(subCategoryId && { subCategoryId }),
      updatedAt: new Date(),
    },
  });

  const freshData = await this.getJobPostById(updated.id);
  return BaseResponseDto.ok(freshData.data, 'Job post updated successfully');
}

// ======================================================
// 1. CLOSE OWN JOB POST (Standard - Ownership Check)
// ======================================================
async closeJobPost(
  dto: CloseJobGrpcRequestDto
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    // 1. Verify job exists and retrieve ownership metadata
    const job = await this.prisma.jobPost.findUnique({
      where: { id: dto.id },
      select: { creatorId: true, accountId: true, status: true }
    });

    if (!job) {
      return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
    }

    // 2. Multi-tenant Ownership Validation
    // Validate that the requester is the original creator
    const isOwner = job.creatorId === dto.creatorId;
    // Validate that the requester belongs to the correct organization/account
    const isCorrectAccount = job.accountId === dto.accountId;

    if (!isOwner || !isCorrectAccount) {
      this.logger.warn(
        `🛑 Unauthorized Close Attempt: User ${dto.creatorId} (Account: ${dto.accountId}) on Job ${dto.id}`
      );
      return BaseResponseDto.fail(
        'Unauthorized: You do not have permission to close this job post.', 
        'FORBIDDEN'
      );
    }

    return await this.executeClosurePersistence(dto.id);
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Close job failed: ${err.message}`);
    return BaseResponseDto.fail('An error occurred while closing the job.', 'INTERNAL_ERROR');
  }
}

// ======================================================
// 2. CLOSE ADMIN JOB POST (Admin - Bypass Ownership)
// ======================================================
// ======================================================
// 2. CLOSE ADMIN JOB POST (Admin - Integrity Check)
// ======================================================
async closeAdminJobPost(
  dto: CloseJobGrpcRequestDto
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    // 1. Fetch the job to verify existence and check integrity
    const job = await this.prisma.jobPost.findUnique({
      where: { id: dto.id },
      select: { id: true, creatorId: true, accountId: true }
    });

    if (!job) {
      return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
    }

    // 2. Integrity Validation: Does this job belong to the user/account the admin specified?
    const matchesTargetUser = job.creatorId === dto.creatorId;
    const matchesTargetAccount = job.accountId === dto.accountId;

    if (!matchesTargetUser || !matchesTargetAccount) {
      this.logger.warn(
        `👮 Admin Integrity Mismatch: Admin provided User=${dto.creatorId}/Acc=${dto.accountId} but DB has User=${job.creatorId}/Acc=${job.accountId}`
      );
      return BaseResponseDto.fail(
        'Data integrity error: The provided User or Account ID does not match the job record.',
        'BAD_REQUEST'
      );
    }

    this.logger.log(`✅ Admin Integrity Verified. Closing job ${dto.id} for User ${dto.creatorId}`);
    return await this.executeClosurePersistence(dto.id);
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Admin close job failed: ${err.message}`);
    return BaseResponseDto.fail('Internal failure during administrative closure.', 'INTERNAL_ERROR');
  }
}

// ======================================================
// 3. CORE CLOSURE PERSISTENCE (Private Helper)
// ======================================================
private async executeClosurePersistence(jobId: string): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  const updatedJob = await this.prisma.jobPost.update({
    where: { id: jobId },
    data: { 
      status: 'CLOSED',
      // Ensure we track when the state changed
      updatedAt: new Date() 
    }
  });

  return BaseResponseDto.ok({
    id: updatedJob.id,
    status: updatedJob.status,
    isClosed: updatedJob.status === 'CLOSED',
    closedAt: updatedJob.updatedAt
  }, 'Job closed successfully.', 'OK');
}

async applyToJobPost(
  jobPostId: string, 
  applicantId: string, 
  dto: CreateJobApplicationDto
): Promise<BaseResponseDto<JobApplicationResponseDto>> {
  
  this.logger.log(`[Job Application] Applicant ${applicantId} applying to ${jobPostId}`);

  return this.prisma.$transaction(async (tx) => {
    // 1. Fetch Job Post (Using explicit jobPostId)
    const jobPost = await tx.jobPost.findUnique({
      where: { id: jobPostId }, // Use parameter instead of dto
      select: { 
        status: true, 
        requiresDocuments: true, 
        requiresEquipment: true, 
        allowReferrals: true,
        creatorId: true,
        jobType: true,
        isNegotiable: true, 
        payAmount: true     
      }
    });

    if (!jobPost) return { success: false, message: 'Job post not found', code: 'NOT_FOUND' };
    if (jobPost.status !== 'ACTIVE') return { success: false, message: 'This post is no longer accepting applications', code: 'JOB_CLOSED' };

    // 2. VALIDATION GATES
    
    // A. Equipment Check (Handshake)
    if (jobPost.requiresEquipment && !dto.hasRequiredEquipment) {
      return { 
        success: false, 
        message: 'You must confirm that you have the required equipment for this job.', 
        code: 'EQUIPMENT_REQUIRED' 
      };
    }

    // B. Pay Validation (Enforcing Negotiability Rules)
    if (!jobPost.isNegotiable && jobPost.payAmount && dto.expectedPay) {
      if (dto.expectedPay > jobPost.payAmount) {
        return {
          success: false,
          message: `This job has a fixed budget of ${jobPost.payAmount}. Your expected pay is too high.`,
          code: 'PAY_EXCEEDS_BUDGET'
        };
      }
    }

    // C. Documents Check
    if (jobPost.requiresDocuments && (!dto.attachments || dto.attachments.length === 0)) {
      return { 
        success: false, 
        message: 'This job requires supporting documents.', 
        code: 'DOCUMENTS_REQUIRED' 
      };
    }

    // 3. DUPLICATION CHECK
    const existing = await tx.jobPostApplication.findUnique({
      where: { jobPostId_applicantId: { jobPostId, applicantId } }, // Clean shorthand
    });
    if (existing) return { success: false, message: 'You have already applied.', code: 'ALREADY_APPLIED' };

    // 4. SECTOR-SPECIFIC DEFAULTS
    const isInformal = jobPost.jobType === 'INFORMAL';
    const defaultAvailability = isInformal ? new Date() : null; 

    // 5. CREATE APPLICATION
    const application = await tx.jobPostApplication.create({
      data: {
        jobPostId: jobPostId,
        applicantId: applicantId,
        employerId: jobPost.creatorId, // From DB (Secure)
        
        hasRequiredEquipment: dto.hasRequiredEquipment || false,
        expectedPay: dto.expectedPay,
        availabilityDate: dto.availabilityDate ? new Date(dto.availabilityDate) : defaultAvailability,
        availabilityNotes: dto.availabilityNotes,

        // Referral details (saved only if job allows)
        referrerName: jobPost.allowReferrals ? dto.referrerName : null,
        referrerPhone: jobPost.allowReferrals ? dto.referrerPhone : null,
        referrerEmail: jobPost.allowReferrals ? dto.referrerEmail : null,
        referrerRelationship: jobPost.allowReferrals ? dto.referrerRelationship : null,
        
        status: 'PENDING',
      },
    });

    // 6. Handle Attachments
    if (dto.attachments && dto.attachments.length > 0) {
      await tx.jobApplicationAttachment.createMany({ 
        data: dto.attachments.map(attr => ({
          applicationId: application.id,
          type: attr.type,
          fileUrl: attr.fileUrl || '', 
          fileName: attr.fileName || null,
          contentText: attr.contentText || null,
          isPrimary: attr.isPrimary || false,
        }))
      });
    }

    // 7. Audit Trail
    await tx.jobApplicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: 'NONE',
        newStatus: 'PENDING',
        changedBy: applicantId,
        reason: 'Initial application submission',
      },
    });

    // 8. Final Fetch
    const completeApplication = await tx.jobPostApplication.findUnique({
      where: { id: application.id },
      include: { attachments: true, statusHistory: true },
    });

    return { 
      success: true, 
      message: 'Application submitted successfully', 
      data: completeApplication as unknown as JobApplicationResponseDto, 
      code: 'SUCCESS' 
    };
  });
}

// ======================================================
  // 1. GET OWN JOB LISTINGS (Standard Flow)
  // ======================================================
  async getOwnJobs(creatorId: string, status?: string): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    try {
      const jobs: JobPostWithRelations[] = await this.prisma.jobPost.findMany({
        where: {
          creatorId,
          ...(status && { status: status as JobPost['status'] }),
        },
        include: { category: true, subCategory: true },
        orderBy: { createdAt: 'desc' },
      });

      if (jobs.length === 0) {
      return BaseResponseDto.fail('No jobs matching your criteria were found.', 'NOT_FOUND');
    }

      const mappedJobs = await Promise.all(jobs.map((job) => this.mapToResponseDto(job)));

      return BaseResponseDto.ok(mappedJobs, 'Own job listings fetched successfully', 'FETCHED');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`🔥 Failed to fetch own jobs for user ${creatorId}: ${err.message}`);
      return BaseResponseDto.fail('Failed to fetch your job listings', 'FETCH_FAILED');
    }
  }

 async getAdminJobs(query: {
  creatorId?: string;
  accountId?: string;
  status?: string;
}): Promise<BaseResponseDto<JobPostResponseDto[]>> {
  try {
    // 1. VALIDATE CREATOR
    if (query.creatorId) {
      try {
        const creatorRes = await firstValueFrom(
          this.userGrpcService.getUserProfileByUuid({ userUuid: query.creatorId })
        );
        
        if (!creatorRes?.success) {
          return BaseResponseDto.fail(creatorRes?.message || 'Creator not found', 'NOT_FOUND');
        }
      } catch (grpcError) {
        // This catches the "13 INTERNAL: User not found" error from your logs
        this.logger.warn(`[gRPC] Creator lookup failed: ${grpcError.message}`);
        return BaseResponseDto.fail('The provided creator ID does not exist', 'CREATOR_NOT_FOUND');
      }
    }


    // 2. VALIDATE ACCOUNT
    if (query.accountId) {
      try {
        const accountRes = await firstValueFrom(
          this.userGrpcService.getUserProfileByUuid({ userUuid: query.accountId })
        );

        if (!accountRes?.success) {
          return BaseResponseDto.fail(accountRes?.message || 'Account not found', 'NOT_FOUND');
        }
      } catch (grpcError) {
        this.logger.warn(`[gRPC] Account lookup failed: ${grpcError.message}`);
        return BaseResponseDto.fail('The provided account ID does not exist', 'ACCOUNT_NOT_FOUND');
      }
    }

    // 3. FETCH JOBS
    const jobs = await this.prisma.jobPost.findMany({
      where: {
        ...(query.creatorId && { creatorId: query.creatorId }),
        ...(query.accountId && { accountId: query.accountId }),
        ...(query.status && { status: query.status  }),
      },
      include: { category: true, subCategory: true },
      orderBy: { createdAt: 'desc' },
    });

    if (jobs.length === 0) {
      return BaseResponseDto.fail('No jobs matching your criteria were found.', 'NOT_FOUND');
    }

    const mappedJobs = await Promise.all(jobs.map((job) => this.mapToResponseDto(job as JobPostWithRelations)));
    return BaseResponseDto.ok(mappedJobs, `Successfully found ${jobs.length} jobs`, 'FETCHED');

  } catch (error) {
    this.logger.error(`🔥 Unexpected failure in getAdminJobs: ${error.message}`);
    return BaseResponseDto.fail('Internal server error while processing listings', 'INTERNAL_ERROR');
  }
}

  // ======================================================
  // 3. PRIVATE MAPPING HELPER (No 'any' types)
  // ======================================================
  private async mapToResponseDto(job: JobPostWithRelations): Promise<JobPostResponseDto> {
    const applicationsCount = await this.prisma.jobPostApplication.count({
      where: { jobPostId: job.id },
    });

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      jobType: job.jobType,
      locationCity: job.locationCity,
      locationNeighborhood: job.locationNeighborhood,
      isRemote: job.isRemote,
      payAmount: job.payAmount,
      payRate: job.payRate,
      isNegotiable: job.isNegotiable,
      skills: job.skills,
      experienceLevel: job.experienceLevel,
      employmentType: job.employmentType,
      requiresDocuments: job.requiresDocuments,
      documentsNeeded: job.documentsNeeded,
      requiresEquipment: job.requiresEquipment,
      equipmentRequired: job.equipmentRequired,
      additionalNotes: job.additionalNotes,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      
      category: job.category ? { 
        id: job.category.id, 
        name: job.category.name 
      } : null,
      
      subCategory: job.subCategory ? { 
        id: job.subCategory.id, 
        name: job.subCategory.name 
      } : undefined,

      creator: {
        id: job.creatorId,
        fullName: job.creatorName,
      },
      account: {
        id: job.accountId,
        name: job.accountName,
      },
      applicationsCount,
    };
  }

  // ======================================================
// 1. GET OWN APPLICATIONS (Standard Flow)
// ======================================================
async getOwnApplications(applicantId: string, status?: string): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
  try {
    const applications = await this.prisma.jobPostApplication.findMany({
      where: {
        applicantId,
        ...(status && { status: status as SlimApplicationResult['status'] }),
      },
      include: {
        jobPost: { include: { category: true, subCategory: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (applications.length === 0) {
      return BaseResponseDto.fail('No applications matching your criteria were found.', 'NOT_FOUND');
    }

    const mapped = applications.map((app) => this.mapToSlimApplicationDto(app));
    return BaseResponseDto.ok(mapped, 'Your applications were fetched successfully', 'FETCHED');
  } catch (error) {
    this.logger.error(`🔥 Failed to fetch own applications for user ${applicantId}: ${error.message}`);
    return BaseResponseDto.fail('Failed to fetch your applications', 'FETCH_FAILED');
  }
}

// ======================================================
// 2. GET ADMIN APPLICATIONS (Management Flow)
// ======================================================
async getAdminApplications(query: {
  applicantId?: string;
  employerId?: string;
  status?: string;
}): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
  try {
    // Identity Validations (gRPC)
    if (query.applicantId) {
      const res = await firstValueFrom(this.userGrpcService.getUserProfileByUuid({ userUuid: query.applicantId }));
      if (!res?.success) return BaseResponseDto.fail('The provided applicant ID does not exist', 'NOT_FOUND');
    }

    if (query.employerId) {
      const res = await firstValueFrom(this.userGrpcService.getUserProfileByUuid({ userUuid: query.employerId }));
      if (!res?.success) return BaseResponseDto.fail('The provided employer ID does not exist', 'NOT_FOUND');
    }

    // Fetch
    const applications = await this.prisma.jobPostApplication.findMany({
      where: {
        ...(query.applicantId && { applicantId: query.applicantId }),
        ...(query.employerId && { employerId: query.employerId }),
        ...(query.status && { status: query.status as SlimApplicationResult['status'] }),
      },
      include: {
        jobPost: { include: { category: true, subCategory: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (applications.length === 0) {
      return BaseResponseDto.fail('No applications found matching those criteria.', 'NOT_FOUND');
    }

    const mapped = applications.map((app) => this.mapToSlimApplicationDto(app));
    return BaseResponseDto.ok(mapped, `Successfully found ${applications.length} applications`, 'FETCHED');
  } catch (error) {
    this.logger.error(`🔥 Unexpected failure in getAdminApplications: ${error.message}`);
    return BaseResponseDto.fail('Internal server error while processing applications', 'INTERNAL_ERROR');
  }
}

/// ======================================================
// 3. PRIVATE APPLICATION MAPPING HELPER (Lightweight)
// ======================================================
private mapToSlimApplicationDto(app: SlimApplicationResult): JobApplicationResponseDto {
  return {
    id: app.id,
    jobPostId: app.jobPostId,
    applicantId: app.applicantId,
    status: app.status,
    
    // Minimal Timestamps
    createdAt: new Date(app.createdAt),
    updatedAt: app.updatedAt.toISOString(),

    // Safely extract the latest status reason
    lastStatusChangeReason: app.statusHistory?.[0]?.reason ?? undefined,
  };
}

// ======================================================
// GET APPLICATION BY ID (Authenticated Detail View)
// ======================================================
async getApplicationById(
  id: string, 
  requesterId: string,
  requesterRole?: string // Received from Gateway
): Promise<BaseResponseDto<JobApplicationDetailResponseDto>> {
  try {
    const application = await this.prisma.jobPostApplication.findUnique({
      where: { id },
      include: {
        attachments: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    }) as FullApplicationResult | null;

    if (!application) {
      return BaseResponseDto.fail('Application not found.', 'NOT_FOUND');
    }

    // 1. Ownership Check
    const isApplicant = application.applicantId === requesterId;
    const isEmployer = application.employerId === requesterId;
    
    // 2. Role-Based Bypass 
    // This ensures that even if guards pass the user through the gateway, 
    // the resource-level check allows Admins to see the data.
    const isPrivilegedUser = requesterRole === 'Admin' || requesterRole === 'SuperAdmin';

    this.logger.debug(`Access Audit: User=${requesterId}, Role=${requesterRole}, isOwner=${isApplicant || isEmployer}, isPrivileged=${isPrivilegedUser}`);

    if (!isApplicant && !isEmployer && !isPrivilegedUser) {
      return BaseResponseDto.fail('Unauthorized to view this application.', 'FORBIDDEN');
    }

    const mapped = this.mapToFullApplicationDto(application);
    return BaseResponseDto.ok(mapped, 'Application details retrieved.', 'OK');

  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Detail fetch failed: ${err.message}`);
    return BaseResponseDto.fail('Internal error.', 'INTERNAL_ERROR');
  }
}

private mapToFullApplicationDto(app: FullApplicationResult): JobApplicationDetailResponseDto {
  return {
    id: app.id,
    externalId: app.externalId,
    jobPostId: app.jobPostId,
    applicantId: app.applicantId,
    employerId: app.employerId,
    status: app.status,
    
    // Detailed Financials
    expectedPay: app.expectedPay ? Number(app.expectedPay) : undefined,
    availabilityDate: app.availabilityDate ? new Date(app.availabilityDate) : undefined,
    availabilityNotes: app.availabilityNotes ?? undefined,

    // Detailed Referrer Info
    referrerName: app.referrerName ?? undefined,
    referrerPhone: app.referrerPhone ?? undefined,
    referrerEmail: app.referrerEmail ?? undefined,
    referrerRelationship: app.referrerRelationship ?? undefined,

    // Timestamps
    createdAt: new Date(app.createdAt),
    updatedAt: app.updatedAt.toISOString(),
    reviewedAt: app.reviewedAt ? new Date(app.reviewedAt) : undefined,

    // Heavy Relations
    attachments: app.attachments.map(attr => ({
      id: attr.id,
      type: attr.type,
      fileUrl: attr.fileUrl,
      fileName: attr.fileName ?? undefined,
      isPrimary: attr.isPrimary,
    })),

    statusHistory: app.statusHistory.map(history => ({
      id: history.id,
      oldStatus: history.oldStatus,
      newStatus: history.newStatus,
      changedBy: history.changedBy,
      reason: history.reason ?? undefined,
      createdAt: new Date(history.createdAt),
    })),
  };
}


}
