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
  UpdateJobPostRequestDto,
  CloseJobPostRequestDto,
  CloseJobPostResponseDto,
  CreateJobPostGrpcDto,
  JobPostCreateResponseDto
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc,   } from '@pivota-api/interfaces';
import { ClientGrpc } from '@nestjs/microservices';

interface UserServiceGrpc {

  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserResponseDto> | null>;
}


@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
   private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PROFILE_GRPC') private readonly userService: ClientGrpc, 
  ) {}

  onModuleInit() {
    this.userGrpcService = this.userService.getService<UserServiceGrpc>('ProfileService');
    
  }


  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService = this.userService.getService<UserServiceGrpc>('ProfileService');
    }
    return this.userGrpcService;
  }

  // ======================================================
  // CREATE JOB POST
  // ======================================================
  async createJobPost(
    dto: CreateJobPostGrpcDto,
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    try {
      // 1. Minimum Validation: Check if category exists but don't fetch full details
      const categoryCount = await this.prisma.category.count({
        where: { id: dto.categoryId },
      });

      if (categoryCount === 0) {
        return {
          success: false,
          message: 'Invalid category ID',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: { message: 'No category exists with this ID', details: null },
        };
      }

      // 2. Create record - NO 'include' used here to save DB resources
      const created = await this.prisma.jobPost.create({
        data: {
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId ?? null,
          creatorId: dto.creatorId,
          accountId: dto.accountId,
          jobType: dto.jobType,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood ?? '',
          isRemote: dto.isRemote ?? false,
          payAmount: dto.payAmount ?? 0,
          payRate: dto.payRate,
          isNegotiable: dto.isNegotiable ?? false,
          skills: dto.skills ?? [],
          experienceLevel: dto.experienceLevel ?? '',
          employmentType: dto.employmentType ?? '',
          requiresDocuments: dto.requiresDocuments ?? false,
          documentsNeeded: dto.documentsNeeded ?? [],
          requiresEquipment: dto.requiresEquipment ?? false,
          equipmentRequired: dto.equipmentRequired ?? [],
          additionalNotes: dto.additionalNotes ?? '',
          status: dto.status ?? 'ACTIVE',
        }
      });

      // 3. Ultra-Lean Response Mapping
      const data: JobPostCreateResponseDto = {
        id: created.id,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      };


      return {
        success: true,
        message: 'Job post created successfully',
        code: 'CREATED',
        data,
        error: null,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Create job post failed: ${err.message}`, err.stack);
      return {
        success: false,
        message: 'Failed to create job post',
        code: 'JOB_CREATION_FAILED',
        data: null,
        error: { message: err.message, details: err.stack },
      };
    }
  }
  

  // ======================================================
  // GET JOB POST BY ID
  // ======================================================
  async getJobPostById(id: string): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    // 1. Fetch Job from DB with relations
    // We cast as 'any' to allow clean mapping of category/subCategory objects
    const job = await this.prisma.jobPost.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
      },
    });

    if (!job) {
      return {
        success: false,
        message: 'Job post not found',
        code: 'JOB_NOT_FOUND',
        data: null,
        error: { message: 'No job post exists with this ID', details: null },
      };
    }

    // 2. Count applications only (Removed Booking logic)
    const applicationsCount = await this.prisma.jobPostApplication.count({ 
      where: { jobPostId: job.id } 
    });

    // 3. Construct Response using spread operator
    // Using denormalized names (job.creatorName / job.accountName)
    const jobPost: JobPostResponseDto = {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      
      category: job.category
        ? { id: job.category.id, name: job.category.name }
        : null,
      
      subCategory: job.subCategory
        ? { id: job.subCategory.id, name: job.subCategory.name }
        : undefined,

      // Identity Pillar (Now from DB, no gRPC needed)
      creator: {
        id: job.creatorId,
        fullName: job.creatorName,
      },
      account: {
        id: job.accountId,
        name: job.accountName,
      },
      
      applicationsCount,
      // bookingsCount removed as per your request
    };

    return {
      success: true,
      message: 'Job post fetched successfully',
      code: 'FETCHED',
      data: jobPost,
      error: null,
    };
  } catch (error) {
    const err = error as Error;
    this.logger.error(`Fetch job post failed: ${err.message}`, err.stack);
    return {
      success: false,
      message: 'Failed to fetch job post',
      code: 'FETCH_FAILED',
      data: null,
      error: { message: err.message, details: err.stack },
    };
  }
}

  // ======================================================
// FETCH JOBS BY CATEGORY
// ======================================================
async getJobsByCategory(categoryId: string): Promise<BaseResponseDto<JobPostResponseDto[]>> {
  this.logger.log(`[JOBS] Fetching feed for category: ${categoryId}`);

  try {
    // 1. Fetch all jobs in the category with relations
    const jobs = await this.prisma.jobPost.findMany({
      where: { categoryId, status: 'ACTIVE' }, // Only show active jobs in feed
      include: { 
        category: true, 
        subCategory: true 
      },
      orderBy: { createdAt: 'desc' } // Newest first
    });

    // 2. Map the results (Removing gRPC and Bookings)
    const jobsWithCounts: JobPostResponseDto[] = await Promise.all(
      jobs.map(async (job) => {
        // We still count applications as they are dynamic
        const applicationsCount = await this.prisma.jobPostApplication.count({ 
          where: { jobPostId: job.id } 
        });

        return {
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          
          category: job.category
            ? { id: job.category.id, name: job.category.name }
            : null,
            
          subCategory: job.subCategory
            ? { id: job.subCategory.id, name: job.subCategory.name }
            : undefined,

          // Identity Pillars (Using denormalized names from DB)
          creator: { 
            id: job.creatorId, 
            fullName: job.creatorName, 
          },
          account: {
            id: job.accountId,
            name: job.accountName,
          },

          applicationsCount,
          // bookingsCount removed
        };
      }),
    );

    return {
      success: true,
      message: `Successfully fetched ${jobs.length} jobs`, 
      code: 'FETCHED',
      data: jobsWithCounts,
      error: null,
    };

  } catch (error) {
    const err = error as Error;
    this.logger.error(`Fetch jobs by category failed: ${err.message}`, err.stack);
    return {
      success: false,
      message: 'Failed to fetch jobs',
      code: 'FETCH_FAILED',
      data: null,
      error: { message: err.message, details: err.stack },
    };
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
// UPDATE JOB POST
// ======================================================
async updateJobPost(
    dto: UpdateJobPostRequestDto
): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    const existing = await this.prisma.jobPost.findUnique({ where: { id: dto.id } });
    
    if (!existing || existing.creatorId !== dto.creatorId) {
      return { success: false, message: 'Unauthorized or not found', code: 'UNAUTHORIZED', data: null, error: null };
    }

    const updated = await this.prisma.jobPost.update({
      where: { id: dto.id },
      data: { ...dto },
      include: { category: true, subCategory: true }
    });

    return this.getJobPostById(updated.id); // Reuse your detailed fetcher
  } catch (error) {
    return { success: false, message: 'Update failed', code: 'UPDATE_FAILED', data: null, error: null };
  }
}

// ======================================================
// CLOSE JOB POST (Soft Delete)
// ======================================================
async closeJobPost(dto: CloseJobPostRequestDto): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    // 1. Verify ownership and current status
    const job = await this.prisma.jobPost.findUnique({
      where: { id: dto.id },
      select: { creatorId: true, status: true }
    });

    if (!job || job.creatorId !== dto.creatorId) {
      return { 
        success: false, 
        message: 'Job post not found or unauthorized', 
        code: 'NOT_FOUND_OR_UNAUTHORIZED', 
        data: null 
      };
    }

    // 2. Perform the update to get the updated object back
    const updatedJob = await this.prisma.jobPost.update({
      where: { id: dto.id },
      data: { 
        status: 'CLOSED',
        // updatedAt is handled by Prisma automatically
      }
    });

    return { 
      success: true, 
      message: 'Job closed successfully', 
      code: 'CLOSED', 
      data: {
        id: updatedJob.id,
        status: updatedJob.status,
        isClosed: updatedJob.status === 'CLOSED',
        closedAt: updatedJob.updatedAt
      }
    };
  } catch (error) {
    return { 
      success: false, 
      message: 'An error occurred while closing the job', 
      code: 'ERROR', 
      data: null 
    };
  }
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


}
