/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateJobPostDto,
  JobPostResponseDto,
  BaseResponseDto,
  UserResponseDto,
  GetUserByUserUuidDto,
  ValidateJobPostIdsReponseDto,
  ValidateJobPostIdsRequestDto
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc,   } from '@pivota-api/interfaces';
import { ClientGrpc } from '@nestjs/microservices';

interface UserServiceGrpc {

  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}


@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
   private userGrpcService: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_GRPC') private readonly userService: ClientGrpc, 
  ) {}

  onModuleInit() {
    this.userGrpcService = this.userService.getService<UserServiceGrpc>('UserService');
    
  }


  private getGrpcService(): UserServiceGrpc {
    if (!this.userGrpcService) {
      this.userGrpcService = this.userService.getService<UserServiceGrpc>('UserService');
    }
    return this.userGrpcService;
  }

  // ======================================================
  // CREATE JOB POST
  // ======================================================
  async createJobPost(
    dto: CreateJobPostDto,
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        const failure = {
          success: false,
          message: 'Invalid category ID',
          code: 'CATEGORY_NOT_FOUND',
          jobPost: null,
          error: { message: 'No category exists with this ID', details: null },
        };
        return failure;
      }

      const created = await this.prisma.jobPost.create({
        data: {
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId ?? null,
          creatorId: dto.creatorId,
          jobType: dto.jobType,
          locationCity: dto.locationCity,
          locationNeighborhood: dto.locationNeighborhood ?? '',
          isRemote: dto.isRemote ?? false,
          payAmount: dto.payAmount ?? 0,
          payRate: dto.payRate,
          skills: dto.skills ?? [],
          experienceLevel: dto.experienceLevel ?? '',
          employmentType: dto.employmentType ?? '',
          documentsNeeded: dto.documentsNeeded ?? [],
          equipmentRequired: dto.equipmentRequired ?? [],
          additionalNotes: dto.additionalNotes ?? '',
          requiresDocuments: dto.requiresDocuments ?? false,
          requiresEquipment: dto.requiresEquipment ?? false,
          status: dto.status ?? 'ACTIVE',
        },
        include: {
          category: true,
          subCategory: true,
        },
      });

      // -----------------------------
      // Fetch creator info from User Service
      // -----------------------------
      

      const userGrpcService = this.getGrpcService();
      const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: created.creatorId });
      const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

      this.logger.log(`Creator fetched successfully: ${JSON.stringify(creatorRes)}`);


      const [applicationsCount, bookingsCount] = await Promise.all([
        this.prisma.jobPostApplication.count({ where: { jobPostId: created.id } }),
        this.prisma.booking.count({ where: { jobPostId: created.id } }),
      ]);

      const jobPost: JobPostResponseDto = {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        category: created.category
          ? { id: created.category.id, name: created.category.name }
          : null,
        subCategory: created.subCategory
          ? { id: created.subCategory.id, name: created.subCategory.name }
          : undefined,
        creator: {
          id: creatorRes.user.uuid,
          fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
          email: creatorRes.user.email ?? undefined,
        },
        applicationsCount,
        bookingsCount,
      };

      const success =  {
        success: true,
        message: 'Job post created successfully',
        code: 'CREATED',
        jobPost,
        error: null,
      };
      return success;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Create job post failed: ${err.message}`, err.stack);
      const response =  {
        success: false,
        message: 'Failed to create job post',
        code: 'JOB_CREATION_FAILED',
        jobPost: null,
        error: { message: err.message, details: err.stack },
      };
      return response;
    }
  }

  // ======================================================
  // GET JOB POST BY ID
  // ======================================================
  async getJobPostById(id: string): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
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

       const userGrpcService = this.getGrpcService();
       const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: job.creatorId });
       const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);
       

     

      const [applicationsCount, bookingsCount] = await Promise.all([
        this.prisma.jobPostApplication.count({ where: { jobPostId: job.id } }),
        this.prisma.booking.count({ where: { jobPostId: job.id } }),
      ]);

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
        creator: {
          id: creatorRes.user.uuid,
          fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(),
          email: creatorRes.user.email ?? undefined,
        },
        applicationsCount,
        bookingsCount,
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
  try {
    const jobs = await this.prisma.jobPost.findMany({
      where: { categoryId },
      include: { category: true, subCategory: true },
    });

    const jobsCount = jobs.length; // total number of jobs

    const jobsWithCounts: JobPostResponseDto[] = await Promise.all(
      jobs.map(async (job) => {
        const [applicationsCount, bookingsCount] = await Promise.all([
          this.prisma.jobPostApplication.count({ where: { jobPostId: job.id } }),
          this.prisma.booking.count({ where: { jobPostId: job.id } }),
        ]);

        const userGrpcService = this.getGrpcService();
        const creator$ = userGrpcService.getUserProfileByUuid({ userUuid: job.creatorId });
        const creatorRes: BaseUserResponseGrpc<UserResponseDto> = await firstValueFrom(creator$);

        return {
          ...job,
          createdAt: job.createdAt.toISOString(),   // convert to string
          updatedAt: job.updatedAt.toISOString(),   // convert to string
          category: job.category
            ? { id: job.category.id, name: job.category.name }
            : null,
          subCategory: job.subCategory
            ? { id: job.subCategory.id, name: job.subCategory.name }
            : undefined,
          creator: { 
            id: job.creatorId, 
            fullName: `${creatorRes.user.firstName} ${creatorRes.user.lastName}`.trim(), 
            email: undefined 
          },
          applicationsCount,
          bookingsCount,
        };
      }),
    );

    return {
      success: true,
      message: `Jobs fetched successfully. Total jobs: ${jobsCount}`, 
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
  id: string, 
  creatorId: string, 
  dto: Partial<CreateJobPostDto>
): Promise<BaseResponseDto<JobPostResponseDto>> {
  try {
    const existing = await this.prisma.jobPost.findUnique({ where: { id } });
    
    if (!existing || existing.creatorId !== creatorId) {
      return { success: false, message: 'Unauthorized or not found', code: 'UNAUTHORIZED', data: null, error: null };
    }

    const updated = await this.prisma.jobPost.update({
      where: { id },
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
async closeJobPost(id: string, creatorId: string): Promise<BaseResponseDto<boolean>> {
  await this.prisma.jobPost.updateMany({
    where: { id, creatorId },
    data: { status: 'CLOSED' }
  });
  return { success: true, message: 'Job closed', code: 'CLOSED', data: true, error: null };
}

async applyToJobPost(dto: {
  jobPostId: string;
  applicantId: string;
  employerId: string;
  applicationType: string;
  expectedPay?: number;
  pitch?: string;
  // Referral Fields
  referrerName?: string;
  referrerPhone?: string;
  referrerEmail?: string;
  referrerRelationship?: string;
  attachments?: { type: string; fileUrl: string; fileName: string }[];
}): Promise<BaseResponseDto<any>> {
  return this.prisma.$transaction(async (tx) => {
    
    // 1. Determine if this is a referral based on provided details
    const isReferral = !!(dto.referrerName || dto.referrerPhone);

    // 2. Create the Main Application
    const application = await tx.jobPostApplication.create({
      data: {
        jobPostId: dto.jobPostId,
        applicantId: dto.applicantId,
        employerId: dto.employerId,
        applicationType: dto.applicationType,
        expectedPay: dto.expectedPay,
        status: 'PENDING',
        // New Referral Mapping
        isReferral: isReferral,
        referrerName: dto.referrerName,
        referrerPhone: dto.referrerPhone,
        referrerEmail: dto.referrerEmail,
        referrerRelationship: dto.referrerRelationship,
      },
    });

    // 3. Create Attachments (including the pitch)
    const attachmentData = [];
    
    if (dto.pitch) {
      attachmentData.push({
        applicationId: application.id,
        type: 'COVER_LETTER',
        contentText: dto.pitch,
        isPrimary: true,
      });
    }

    if (dto.attachments && dto.attachments.length > 0) {
      dto.attachments.forEach(attr => {
        attachmentData.push({
          applicationId: application.id,
          type: attr.type,
          fileUrl: attr.fileUrl,
          fileName: attr.fileName,
        });
      });
    }

    if (attachmentData.length > 0) {
      await tx.jobApplicationAttachment.createMany({ 
        data: attachmentData 
      });
    }

    // 4. Initialize Status History (Crucial for your Audit Trail)
    await tx.jobApplicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: 'NONE',
        newStatus: 'PENDING',
        changedBy: dto.applicantId,
        reason: isReferral 
          ? `Application submitted with referral from ${dto.referrerName}` 
          : 'Standard application submission',
      },
    });

    return { 
      success: true, 
      message: 'Application submitted successfully', 
      data: application 
    };
  });
}

    // 3. Initialize Status History
    await tx.jobApplicationStatusHistory.create({
      data: {
        applicationId: application.id,
        oldStatus: 'NONE',
        newStatus: 'PENDING',
        changedBy: dto.applicantId,
        reason: 'Initial submission',
      },
    });

    return { success: true, message: 'Application submitted successfully', code: 'CREATED' };
  });
}


}
