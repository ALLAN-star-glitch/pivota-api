/* eslint-disable @typescript-eslint/no-explicit-any */
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
  UpdateJobGrpcRequestDto,
  GetAllJobsRequestDto,
  GetJobsByCategoryRequestDto,
  PaginationDto,
  GetJobByIdRequestDto,
  GetJobListingsByOwnerDto,
  GetAdminJobsFilterDto,
  GetOwnJobsFilterDto,
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';
import { Category, JobApplicationAttachment, JobApplicationStatusHistory, JobPost, JobPostApplication } from '../../../../generated/prisma/client';
import { QueueService, RedisService, CacheKeys } from '@pivota-api/shared-redis';

interface JobPersistenceData extends CreateJobGrpcRequestDto {
  creatorName: string;
  accountName: string;
  accountId: string;
}

interface UserServiceGrpc {
  getUserProfileByUuid(data: GetUserByUserUuidDto): Observable<BaseResponseDto<UserProfileResponseDto> | null>;
}

type JobPostWithRelations = JobPost & {
  category: Category | null;
  subCategory: Category | null;
};

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

  // Cache TTLs
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual job posts
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PROFILE_GRPC') private readonly userService: ClientGrpc,
    private readonly queue: QueueService,
    private readonly redis: RedisService,
  ) {
    this.userGrpcService = this.userService.getService<UserServiceGrpc>('ProfileService');
  }

  // ======================================================
  // PRIVATE HELPER METHODS
  // ======================================================

  private getEffectiveTTL(requestedTTL: number | undefined, options: any): number {
    const ttl = requestedTTL || this.DEFAULT_CACHE_TTL;
    
    if (options.minPay !== undefined || options.maxPay !== undefined) {
      return Math.min(ttl, 60);
    }
    
    return ttl;
  }

private async invalidateCache(data: {
  jobId?: string;
  categoryId?: string;
  accountId?: string;
  creatorId?: string;
  allListings?: boolean;
  isAnonymous?: boolean;  // ADD THIS
  applicationDeadline?: boolean;  // ADD THIS
  startDate?: boolean;  // ADD THIS
  hoursPerWeek?: boolean;  // ADD THIS
}): Promise<void> {
  const jobs = [];

  if (data.allListings || data.categoryId) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-job-listings',
        {
          categoryId: data.categoryId,
          accountId: data.accountId,
          creatorId: data.creatorId,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  // ADD THESE NEW INVALIDATION PATTERNS
  if (data.isAnonymous !== undefined) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-job-listings',
        {
          isAnonymous: data.isAnonymous,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  if (data.applicationDeadline) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-job-listings',
        {
          applicationDeadline: true,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  if (data.startDate) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-job-listings',
        {
          startDate: true,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  if (data.hoursPerWeek) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-job-listings',
        {
          hoursPerWeek: true,
        },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  if (data.jobId) {
    jobs.push(
      this.queue.addJob(
        'cache-jobs-queue',
        'invalidate-single-job',
        { jobId: data.jobId },
        {
          attempts: 3,
          removeOnComplete: true,
        }
      )
    );
  }

  await Promise.all(jobs);
  this.logger.log(`📋 Cache invalidation queued for jobs: ${JSON.stringify(data)}`);
}

  // ======================================================
  // 1. ADMIN FLOW (With gRPC Validation)
  // ======================================================
  async createAdminJobPost(
    dto: CreateJobGrpcRequestDto,
  ): Promise<BaseResponseDto<JobPostCreateResponseDto>> {
    try {
      const userProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: dto.creatorId })
      );

      if (!userProfile?.success || !userProfile.data) {
        this.logger.error(`❌ Admin Validation Failed: Creator ${dto.creatorId} not found.`);
        return BaseResponseDto.fail('The specified Creator does not exist.', 'USER_NOT_FOUND');
      }

      if (userProfile.data.account.uuid !== dto.accountId) {
        return BaseResponseDto.fail('The Creator does not belong to the specified Account.', 'ACCOUNT_MISMATCH');
      }

      const creatorName = `${userProfile.data.user.firstName} ${userProfile.data.user.lastName}`;
      const accountName = userProfile.data.organization?.name || creatorName;

      return await this.persistJobToDb({
        ...dto,
        accountId: userProfile.data.account.uuid,
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
      return await this.persistJobToDb({
        ...dto,
        creatorName: dto.creatorName || 'Creator',
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
    const categoryCount = await this.prisma.category.count({
      where: { id: data.categoryId },
    });

    if (categoryCount === 0) {
      return BaseResponseDto.fail('Invalid category ID provided.', 'CATEGORY_NOT_FOUND');
    }

    // Get category name for notification
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { name: true }
    });

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
        
        // Job Characteristics
        employmentType: data.employmentType,
        paymentType: data.paymentType,
        workArrangement: data.workArrangement,
        commitment: data.commitment,
        workSchedule: data.workSchedule,
        documentationLevel: data.documentationLevel,
        skillLevel: data.skillLevel,
        experienceLevel: data.experienceLevel,
        educationLevel: data.educationLevel,
        
        // Location
        locationCity: data.locationCity,
        locationNeighborhood: data.locationNeighborhood ?? '',
        isRemote: data.isRemote ?? false,
        
        // Compensation
        payAmount: data.payAmount ?? 0,
        payRate: data.payRate,
        isNegotiable: data.isNegotiable ?? false,
        
        // Requirements
        skills: data.skills ?? [],
        requiresDocuments: data.requiresDocuments ?? false,
        documentsNeeded: data.documentsNeeded ?? [],
        requiresEquipment: data.requiresEquipment ?? false,
        equipmentRequired: data.equipmentRequired ?? [],
        additionalNotes: data.additionalNotes ?? '',
        
        // Referrals
        allowReferrals: data.allowReferrals ?? true,
        referralBonus: data.referralBonus ?? null,
        
        // New Fields - Application & Start Timeline
        applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        startDateFlexible: data.startDateFlexible ?? false,
        maxApplications: data.maxApplications ?? null,
        
        // New Fields - Privacy & Visibility
        isAnonymous: data.isAnonymous ?? false,
        displayName: data.displayName ?? null,
        contactEmail: data.contactEmail ?? null,
        
        // New Fields - Work Details
        hoursPerWeek: data.hoursPerWeek ?? null,
        contractDuration: data.contractDuration ?? null,
        
        // Analytics (defaults to 0)
        viewCount: 0,
        shareCount: 0,
        
        status: data.status ?? 'ACTIVE',
      },
    });

    await this.invalidateCache({
      categoryId: data.categoryId,
      allListings: true,
    });

    // ============================================================
    // SEND JOB POSTED NOTIFICATION
    // ============================================================
    await this.sendJobPostedNotification(created, data, category?.name);

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
  // JOB NOTIFICATION METHODS
  // ======================================================

  private async sendJobPostedNotification(
  job: JobPost,
  data: JobPersistenceData,
  categoryName?: string
): Promise<void> {
  try {
    // Get creator email from gRPC - for individual users
    let creatorEmail = '';
    let accountEmail = '';

    try {
      const userProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: data.creatorId })
      );
      if (userProfile?.success && userProfile.data) {
        // For individual users, the email is on the user object
        creatorEmail = userProfile.data.user?.email || '';
        // For individual accounts, account email is the same as user email
        accountEmail = creatorEmail;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch user email for ${data.creatorId}: ${error.message}`);
    }

    // Get subcategory name if exists
    let subCategoryName: string | undefined;
    if (data.subCategoryId) {
      const subCategory = await this.prisma.category.findUnique({
        where: { id: data.subCategoryId },
        select: { name: true }
      });
      subCategoryName = subCategory?.name;
    }

    // Build notification data
    const notificationData = {
      jobId: job.id,
      jobExternalId: job.externalId,
      title: job.title,
      description: job.description,
      categoryName: categoryName || 'Unknown',
      subCategoryName,
      locationCity: job.locationCity,
      locationNeighborhood: job.locationNeighborhood || undefined,
      isRemote: job.isRemote,
      payAmount: job.payAmount || undefined,
      payRate: job.payRate || undefined,
      isNegotiable: job.isNegotiable,
      employmentType: job.employmentType,
      paymentType: job.paymentType,
      workArrangement: job.workArrangement,
      commitment: job.commitment,
      experienceLevel: job.experienceLevel,
      educationLevel: job.educationLevel,
      skills: job.skills,
      applicationDeadline: job.applicationDeadline?.toISOString(),
      startDate: job.startDate?.toISOString(),
      isAnonymous: job.isAnonymous,
      displayName: job.displayName || undefined,
      contactEmail: job.contactEmail || undefined,
      hoursPerWeek: job.hoursPerWeek || undefined,
      createdAt: job.createdAt.toISOString(),
      creatorId: job.creatorId,
      creatorName: job.creatorName || 'User',
      creatorEmail,
      accountId: job.accountId,
      accountName: job.accountName || 'Account',
      // For individual accounts, no separate account email
      accountEmail: undefined,
      jobUrl: `https://pivota.com/jobs/${job.externalId}`,
      dashboardUrl: `https://pivota.com/dashboard/jobs/${job.externalId}`,
    };

    await this.queue.addJob(
      'jobs-notification-queue',
      'job.posted',
      notificationData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    this.logger.log(`📧 Job posted notification queued for ${creatorEmail}`);
  } catch (error) {
    this.logger.error(`Failed to queue job posted notification: ${error.message}`);
  }
}

  private async sendApplicationSubmittedNotification(
  application: JobPostApplication,
  jobPost: any,
  applicantUser: any,
  employerEmail: string,
  employerName: string
): Promise<void> {
  try {
    const notificationData = {
      jobPostId: jobPost.id,
      jobTitle: jobPost.title,
      jobLocation: jobPost.locationCity,
      jobCategory: jobPost.category?.name || 'Unknown',
      applicantId: application.applicantId,
      applicantName: applicantUser?.firstName + ' ' + applicantUser?.lastName || 'Applicant',
      applicantEmail: applicantUser?.email || '',
      applicantPhone: applicantUser?.phone,
      employerId: jobPost.creatorId,
      employerName: employerName || 'Employer',
      employerEmail: employerEmail,
      applicationId: application.id,
      applicationExternalId: application.externalId,
      expectedPay: application.expectedPay || undefined,
      availabilityDate: application.availabilityDate?.toISOString(),
      availabilityNotes: application.availabilityNotes || undefined,
      hasRequiredEquipment: application.hasRequiredEquipment,
      applicationDate: application.createdAt.toISOString(),
      applicationUrl: `https://pivota.com/jobs/${jobPost.externalId}/applications/${application.externalId}`,
      dashboardUrl: `https://pivota.com/dashboard/applications/${application.externalId}`,
    };

    await this.queue.addJob(
      'jobs-notification-queue',
      'job.application.submitted',
      notificationData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    this.logger.log(`📧 Application submitted notification queued`);
  } catch (error) {
    this.logger.error(`Failed to queue application submitted notification: ${error.message}`);
  }
}

 private async sendApplicationStatusChangedNotification(
  application: JobPostApplication,
  jobPost: any,
  oldStatus: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  try {
    // Get applicant details
    let applicantName = 'Applicant';
    let applicantEmail = '';
    let employerName = 'Employer';
    let employerEmail = '';

    try {
      const applicantProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: application.applicantId })
      );
      if (applicantProfile?.success && applicantProfile.data) {
        applicantName = `${applicantProfile.data.user.firstName} ${applicantProfile.data.user.lastName}`;
        applicantEmail = applicantProfile.data.user.email;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch applicant details: ${error.message}`);
    }

    try {
      const employerProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: application.employerId })
      );
      if (employerProfile?.success && employerProfile.data) {
        employerName = `${employerProfile.data.user.firstName} ${employerProfile.data.user.lastName}`;
        employerEmail = employerProfile.data.user.email;
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch employer details: ${error.message}`);
    }

    const notificationData = {
      applicationId: application.id,
      applicationExternalId: application.externalId,
      jobPostId: jobPost.id,
      jobTitle: jobPost.title,
      applicantId: application.applicantId,
      applicantName,
      applicantEmail,
      employerId: application.employerId,
      employerName,
      employerEmail,
      oldStatus,
      newStatus,
      reason,
      updatedAt: new Date().toISOString(),
      dashboardUrl: `https://pivota.com/dashboard/applications/${application.externalId}`,
    };

    await this.queue.addJob(
      'jobs-notification-queue',
      'job.application.status.changed',
      notificationData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    this.logger.log(`📧 Application status changed notification queued`);
  } catch (error) {
    this.logger.error(`Failed to queue application status changed notification: ${error.message}`);
  }
}

  private async sendJobClosedNotification(
  job: JobPost,
  totalApplications?: number
): Promise<void> {
  try {
    // Get creator email from gRPC - for individual users
    let creatorEmail = '';

    try {
      const userProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: job.creatorId })
      );
      if (userProfile?.success && userProfile.data) {
        // For individual users, the email is on the user object
        creatorEmail = userProfile.data.user?.email || '';
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch user email: ${error.message}`);
    }

    const notificationData = {
      jobId: job.id,
      jobExternalId: job.externalId,
      title: job.title,
      creatorId: job.creatorId,
      creatorName: job.creatorName || 'User',
      creatorEmail,
      accountId: job.accountId,
      accountName: job.accountName || 'Account',
      // For individual accounts, no separate account email
      accountEmail: undefined,
      closedAt: new Date().toISOString(),
      totalApplications: totalApplications || 0,
      dashboardUrl: `https://pivota.com/dashboard/jobs/${job.externalId}`,
    };

    await this.queue.addJob(
      'jobs-notification-queue',
      'job.closed',
      notificationData,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      }
    );

    this.logger.log(`📧 Job closed notification queued for ${creatorEmail}`);
  } catch (error) {
    this.logger.error(`Failed to queue job closed notification: ${error.message}`);
  }
}

  // ======================================================
  // GET ALL JOBS (With Pagination and Caching)
  // ======================================================

  async getAllJobs(
    dto: GetAllJobsRequestDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const isRemote = dto.isRemote === true;
    
    const {
      limit = 20,
      offset = 0,
      city,
      minPay,
      maxPay,
      sortBy = 'recent',
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      workSchedule,
      documentationLevel,
      skillLevel,
      experienceLevel,
      educationLevel,
      isAnonymous,
      applicationDeadlineAfter,
      applicationDeadlineBefore,
      startDateAfter,
      startDateBefore,
      hoursPerWeekMin,
      hoursPerWeekMax,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    const data = {
      limit,
      offset,
      city,
      minPay,
      maxPay,
      sortBy,
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      workSchedule,
      documentationLevel,
      skillLevel,
      experienceLevel,
      educationLevel,
      isRemote,
      isAnonymous,
      applicationDeadlineAfter,
      applicationDeadlineBefore,
      startDateAfter,
      startDateBefore,
      hoursPerWeekMin,
      hoursPerWeekMax,
    };

    this.logger.log(
      `📊 getAllJobs: limit=${data.limit}, offset=${data.offset}, sortBy=${data.sortBy}, ` +
      `employmentType=${data.employmentType}, paymentType=${data.paymentType}, ` +
      `workArrangement=${data.workArrangement}, commitment=${data.commitment}, ` +
      `workSchedule=${data.workSchedule}, documentationLevel=${data.documentationLevel}, ` +
      `skillLevel=${data.skillLevel}, experienceLevel=${data.experienceLevel}, ` +
      `educationLevel=${data.educationLevel}, isRemote=${data.isRemote}, ` +
      `isAnonymous=${data.isAnonymous}, applicationDeadlineAfter=${data.applicationDeadlineAfter}, ` +
      `applicationDeadlineBefore=${data.applicationDeadlineBefore}, startDateAfter=${data.startDateAfter}, ` +
      `startDateBefore=${data.startDateBefore}, hoursPerWeekMin=${data.hoursPerWeekMin}, ` +
      `hoursPerWeekMax=${data.hoursPerWeekMax}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetAllJobs(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
      const cacheKey = CacheKeys.getJobListingKey({
      categoryId: undefined,
      city: data.city,
      minPay: data.minPay,
      maxPay: data.maxPay,
      sortBy: data.sortBy,
      employmentType: data.employmentType,
      paymentType: data.paymentType,
      workArrangement: data.workArrangement,
      commitment: data.commitment,
      workSchedule: data.workSchedule,
      documentationLevel: data.documentationLevel,
      skillLevel: data.skillLevel,
      experienceLevel: data.experienceLevel,
      educationLevel: data.educationLevel,
      isRemote: data.isRemote,
      // ============================================================
      // NEW FILTERS - ADD THESE
      // ============================================================
      isAnonymous: data.isAnonymous,
      applicationDeadlineAfter: data.applicationDeadlineAfter,
      applicationDeadlineBefore: data.applicationDeadlineBefore,
      startDateAfter: data.startDateAfter,
      startDateBefore: data.startDateBefore,
      hoursPerWeekMin: data.hoursPerWeekMin,
      hoursPerWeekMax: data.hoursPerWeekMax,
      page: page,
      limit: data.limit,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: JobPostResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} jobs`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetAllJobs(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getAllJobs: ${error.message}`);
      return this.executeGetAllJobs(data);
    }
  }

  private async executeGetAllJobs(data: {
    limit: number;
    offset: number;
    city?: string;
    minPay?: number;
    maxPay?: number;
    sortBy: 'recent' | 'pay_asc' | 'pay_desc';
    employmentType?: string;
    paymentType?: string;
    workArrangement?: string;
    commitment?: string;
    workSchedule?: string;
    documentationLevel?: string;
    skillLevel?: string;
    experienceLevel?: string;
    educationLevel?: string;
    isRemote?: boolean;
    isAnonymous?: boolean;
    applicationDeadlineAfter?: string;
    applicationDeadlineBefore?: string;
    startDateAfter?: string;
    startDateBefore?: string;
    hoursPerWeekMin?: number;
    hoursPerWeekMax?: number;
  }): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    try {
      const where: any = {
        status: 'ACTIVE',
      };

      if (data.city) {
        where.locationCity = data.city;
      }

      if (data.minPay !== undefined || data.maxPay !== undefined) {
        where.payAmount = {};
        if (data.minPay !== undefined) where.payAmount.gte = data.minPay;
        if (data.maxPay !== undefined) where.payAmount.lte = data.maxPay;
      }

      // Job Characteristics Filters
      if (data.employmentType) where.employmentType = data.employmentType;
      if (data.paymentType) where.paymentType = data.paymentType;
      if (data.workArrangement) where.workArrangement = data.workArrangement;
      if (data.commitment) where.commitment = data.commitment;
      if (data.workSchedule) where.workSchedule = data.workSchedule;
      if (data.documentationLevel) where.documentationLevel = data.documentationLevel;
      if (data.skillLevel) where.skillLevel = data.skillLevel;
      if (data.experienceLevel) where.experienceLevel = data.experienceLevel;
      if (data.educationLevel) where.educationLevel = data.educationLevel;

      if (data.isRemote !== undefined) {
        where.isRemote = data.isRemote;
      }

      // New Filters Implementation
      if (data.isAnonymous !== undefined) {
        where.isAnonymous = data.isAnonymous;
      }

      if (data.applicationDeadlineAfter || data.applicationDeadlineBefore) {
        where.applicationDeadline = {};
        if (data.applicationDeadlineAfter) {
          where.applicationDeadline.gte = new Date(data.applicationDeadlineAfter);
        }
        if (data.applicationDeadlineBefore) {
          where.applicationDeadline.lte = new Date(data.applicationDeadlineBefore);
        }
      }

      if (data.startDateAfter || data.startDateBefore) {
        where.startDate = {};
        if (data.startDateAfter) {
          where.startDate.gte = new Date(data.startDateAfter);
        }
        if (data.startDateBefore) {
          where.startDate.lte = new Date(data.startDateBefore);
        }
      }

      if (data.hoursPerWeekMin !== undefined || data.hoursPerWeekMax !== undefined) {
        where.hoursPerWeek = {};
        if (data.hoursPerWeekMin !== undefined) {
          where.hoursPerWeek.gte = data.hoursPerWeekMin;
        }
        if (data.hoursPerWeekMax !== undefined) {
          where.hoursPerWeek.lte = data.hoursPerWeekMax;
        }
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'pay_asc':
          orderBy = { payAmount: 'asc' };
          break;
        case 'pay_desc':
          orderBy = { payAmount: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.jobPost.count({ where });

      const jobs = await this.prisma.jobPost.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy,
        skip: data.offset,
        take: data.limit,
      }) as JobPostWithRelations[];

      const mappedJobs = await Promise.all(
        jobs.map((job) => this.mapToResponseDto(job))
      );

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedJobs,
        pagination,
        `Found ${mappedJobs.length} jobs`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get all jobs: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // GET JOBS BY CATEGORY (With Caching)
  // ======================================================

  async getJobsByCategory(
    dto: GetJobsByCategoryRequestDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    const isRemote = dto.isRemote === true;
    
    const {
      categoryId,
      limit = 20,
      offset = 0,
      city,
      minPay,
      maxPay,
      sortBy = 'recent',
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      workSchedule,
      documentationLevel,
      skillLevel,
      experienceLevel,
      educationLevel,
      isAnonymous,
      applicationDeadlineAfter,
      applicationDeadlineBefore,
      startDateAfter,
      startDateBefore,
      hoursPerWeekMin,
      hoursPerWeekMax,
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    const data = {
      categoryId,
      limit,
      offset,
      city,
      minPay,
      maxPay,
      sortBy,
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      workSchedule,
      documentationLevel,
      skillLevel,
      experienceLevel,
      educationLevel,
      isRemote,
      isAnonymous,
      applicationDeadlineAfter,
      applicationDeadlineBefore,
      startDateAfter,
      startDateBefore,
      hoursPerWeekMin,
      hoursPerWeekMax,
    };

    this.logger.log(
      `📊 getJobsByCategory: categoryId=${categoryId}, limit=${data.limit}, ` +
      `employmentType=${data.employmentType}, paymentType=${data.paymentType}, ` +
      `workArrangement=${data.workArrangement}, commitment=${data.commitment}, ` +
      `workSchedule=${data.workSchedule}, documentationLevel=${data.documentationLevel}, ` +
      `skillLevel=${data.skillLevel}, experienceLevel=${data.experienceLevel}, ` +
      `educationLevel=${data.educationLevel}, isRemote=${data.isRemote}, ` +
      `isAnonymous=${data.isAnonymous}, applicationDeadlineAfter=${data.applicationDeadlineAfter}, ` +
      `applicationDeadlineBefore=${data.applicationDeadlineBefore}, startDateAfter=${data.startDateAfter}, ` +
      `startDateBefore=${data.startDateBefore}, hoursPerWeekMin=${data.hoursPerWeekMin}, ` +
      `hoursPerWeekMax=${data.hoursPerWeekMax}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetJobsByCategory(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getJobListingKey({
      categoryId: data.categoryId,
      city: data.city,
      minPay: data.minPay,
      maxPay: data.maxPay,
      sortBy: data.sortBy,
      employmentType: data.employmentType,
      paymentType: data.paymentType,
      workArrangement: data.workArrangement,
      commitment: data.commitment,
      workSchedule: data.workSchedule,
      documentationLevel: data.documentationLevel,
      skillLevel: data.skillLevel,
      experienceLevel: data.experienceLevel,
      educationLevel: data.educationLevel,
      isRemote: data.isRemote,
      isAnonymous: data.isAnonymous,
      applicationDeadlineAfter: data.applicationDeadlineAfter,
      applicationDeadlineBefore: data.applicationDeadlineBefore,
      startDateAfter: data.startDateAfter,
      startDateBefore: data.startDateBefore,
      hoursPerWeekMin: data.hoursPerWeekMin,
      hoursPerWeekMax: data.hoursPerWeekMax,
      page: page,
      limit: data.limit,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: JobPostResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} jobs for category`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetJobsByCategory(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getJobsByCategory: ${error.message}`);
      return this.executeGetJobsByCategory(data);
    }
  }

  private async executeGetJobsByCategory(data: {
    categoryId?: string;
    limit: number;
    offset: number;
    city?: string;
    minPay?: number;
    maxPay?: number;
    sortBy: 'recent' | 'pay_asc' | 'pay_desc';
    employmentType?: string;
    paymentType?: string;
    workArrangement?: string;
    commitment?: string;
    workSchedule?: string;
    documentationLevel?: string;
    skillLevel?: string;
    experienceLevel?: string;
    educationLevel?: string;
    isRemote?: boolean;
    isAnonymous?: boolean;
    applicationDeadlineAfter?: string;
    applicationDeadlineBefore?: string;
    startDateAfter?: string;
    startDateBefore?: string;
    hoursPerWeekMin?: number;
    hoursPerWeekMax?: number;
  }): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    try {
      const where: any = {
        status: 'ACTIVE',
      };

      if (data.categoryId) {
        where.categoryId = data.categoryId;
      }

      if (data.city) {
        where.locationCity = data.city;
      }

      if (data.minPay !== undefined || data.maxPay !== undefined) {
        where.payAmount = {};
        if (data.minPay !== undefined) where.payAmount.gte = data.minPay;
        if (data.maxPay !== undefined) where.payAmount.lte = data.maxPay;
      }

      // Job Characteristics Filters
      if (data.employmentType) where.employmentType = data.employmentType;
      if (data.paymentType) where.paymentType = data.paymentType;
      if (data.workArrangement) where.workArrangement = data.workArrangement;
      if (data.commitment) where.commitment = data.commitment;
      if (data.workSchedule) where.workSchedule = data.workSchedule;
      if (data.documentationLevel) where.documentationLevel = data.documentationLevel;
      if (data.skillLevel) where.skillLevel = data.skillLevel;
      if (data.experienceLevel) where.experienceLevel = data.experienceLevel;
      if (data.educationLevel) where.educationLevel = data.educationLevel;

      if (data.isRemote !== undefined) {
        where.isRemote = data.isRemote;
      }

      // New Filters Implementation
      if (data.isAnonymous !== undefined) {
        where.isAnonymous = data.isAnonymous;
      }

      if (data.applicationDeadlineAfter || data.applicationDeadlineBefore) {
        where.applicationDeadline = {};
        if (data.applicationDeadlineAfter) {
          where.applicationDeadline.gte = new Date(data.applicationDeadlineAfter);
        }
        if (data.applicationDeadlineBefore) {
          where.applicationDeadline.lte = new Date(data.applicationDeadlineBefore);
        }
      }

      if (data.startDateAfter || data.startDateBefore) {
        where.startDate = {};
        if (data.startDateAfter) {
          where.startDate.gte = new Date(data.startDateAfter);
        }
        if (data.startDateBefore) {
          where.startDate.lte = new Date(data.startDateBefore);
        }
      }

      if (data.hoursPerWeekMin !== undefined || data.hoursPerWeekMax !== undefined) {
        where.hoursPerWeek = {};
        if (data.hoursPerWeekMin !== undefined) {
          where.hoursPerWeek.gte = data.hoursPerWeekMin;
        }
        if (data.hoursPerWeekMax !== undefined) {
          where.hoursPerWeek.lte = data.hoursPerWeekMax;
        }
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'pay_asc':
          orderBy = { payAmount: 'asc' };
          break;
        case 'pay_desc':
          orderBy = { payAmount: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.jobPost.count({ where });

      const jobs = await this.prisma.jobPost.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy,
        skip: data.offset,
        take: data.limit,
      }) as JobPostWithRelations[];

      const mappedJobs = await Promise.all(
        jobs.map((job) => this.mapToResponseDto(job))
      );

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedJobs,
        pagination,
        `Found ${mappedJobs.length} jobs for category${data.categoryId ? ` ${data.categoryId}` : ''}`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get jobs by category: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // GET JOB POST BY ID (WITH CACHING)
  // ======================================================

  async getJobPostById(
    dto: GetJobByIdRequestDto
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const bypassCache = dto.bypassCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      id: jobId,
      cacheTTL = this.CACHE_TTL.SINGLE,
    } = dto;

    this.logger.log(
      `📊 getJobPostById: jobId=${jobId}, ` +
      `bypassCache=${bypassCache}, refreshCache=${refreshCache}, readOnly=${readOnly}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      return this.executeGetJobPostById(jobId);
    }

    const cacheKey = CacheKeys.getSingleJobKey(jobId);

    try {
      if (!refreshCache) {
        const cached = await this.redis.getObject<{
          data: JobPostResponseDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.ok(
            cached.data,
            'Cached: Job post retrieved',
            'OK'
          );
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetJobPostById(jobId);

      if (!readOnly && result.success && result.data) {
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-single-job',
          {
            jobId: jobId,
            result: result.data,
            ttl: cacheTTL,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        this.logger.debug(`📋 Queued single job cache for: ${jobId}`);
        
        if (refreshCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              cachedAt: new Date().toISOString(),
            },
            cacheTTL
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getJobPostById: ${error.message}`);
      return this.executeGetJobPostById(jobId);
    }
  }

  private async executeGetJobPostById(
    jobId: string
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
      const job = await this.prisma.jobPost.findUnique({
        where: { id: jobId },
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
    }
  }

  // ======================================================
  // GET JOB LISTINGS BY OWNER (WITH PAGINATION & CACHING)
  // ======================================================

  async getJobListingsByOwner(
    dto: GetJobListingsByOwnerDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const bypassCache = dto.bypassCache === true;
    const skipCache = dto.skipCache === true;
    const refreshCache = dto.refreshCache === true;
    const readOnly = dto.readOnly === true;
    
    const {
      accountId,
      status,
      limit = 20,
      offset = 0,
      sortBy = 'recent',
      cacheTTL = this.DEFAULT_CACHE_TTL,
    } = dto;

    const data = {
      accountId,
      status,
      limit,
      offset,
      sortBy,
    };

    this.logger.log(
      `📊 getJobListingsByOwner: accountId=${accountId}, limit=${limit}, offset=${offset}, ` +
      `bypassCache=${bypassCache}, skipCache=${skipCache}, refreshCache=${refreshCache}`
    );

    if (bypassCache) {
      this.logger.debug('🔴 BYPASSING CACHE - Direct DB query');
      const result = await this.executeGetJobListingsByOwner(data);
      
      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
      }
      
      return result;
    }

    const page = Math.floor((data.offset || 0) / (data.limit || 20)) + 1;
    const cacheKey = CacheKeys.getJobListingKey({
      categoryId: undefined,
      city: undefined,
      minPay: undefined,
      maxPay: undefined,
      sortBy: data.sortBy,
      employmentType: undefined,
      paymentType: undefined,
      workArrangement: undefined,
      commitment: undefined,
      workSchedule: undefined,
      documentationLevel: undefined,
      skillLevel: undefined,
      experienceLevel: undefined,
      educationLevel: undefined,
      isRemote: undefined,
      isAnonymous: undefined,
      applicationDeadlineAfter: undefined,
      applicationDeadlineBefore: undefined,
      startDateAfter: undefined,
      startDateBefore: undefined,
      hoursPerWeekMin: undefined,
      hoursPerWeekMax: undefined,
      page: page,
      limit: data.limit,
    });

    try {
      if (!skipCache) {
        const cached = await this.redis.getObject<{
          data: JobPostResponseDto[];
          pagination: PaginationDto;
          cachedAt: string;
        }>(cacheKey);

        if (cached && !refreshCache) {
          this.logger.debug(`✅ CACHE HIT: ${cacheKey}`);
          return BaseResponseDto.okWithPagination(
            cached.data,
            cached.pagination,
            `Cached: Found ${cached.data.length} jobs for owner`,
            'OK'
          );
        }

        if (cached && refreshCache) {
          this.logger.debug(`🔄 CACHE REFRESH: ${cacheKey} - Forcing refresh`);
        }
      }

      this.logger.debug(`❌ CACHE MISS: ${cacheKey}`);
      const result = await this.executeGetJobListingsByOwner(data);

      if (!readOnly && result.success && result.data) {
        const ttl = this.getEffectiveTTL(cacheTTL, data);
        
        await this.queue.addJob(
          'cache-jobs-queue',
          'cache-job-listings',
          {
            params: data,
            result: result.data,
            pagination: result.pagination,
            cacheKey: cacheKey,
            ttl: ttl,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
          }
        );
        
        this.logger.debug(`📋 Queued cache job: ${cacheKey} (TTL: ${ttl}s)`);
        
        if (refreshCache || skipCache) {
          await this.redis.setObject(
            cacheKey,
            {
              data: result.data,
              pagination: result.pagination,
              cachedAt: new Date().toISOString(),
            },
            ttl
          );
          this.logger.debug(`✅ Synced cache write: ${cacheKey}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Cache error in getJobListingsByOwner: ${error.message}`);
      return this.executeGetJobListingsByOwner(data);
    }
  }

  private async executeGetJobListingsByOwner(data: {
    accountId: string;
    status?: string;
    limit: number;
    offset: number;
    sortBy: 'recent' | 'pay_asc' | 'pay_desc';
  }): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    try {
      const where: any = {
        accountId: data.accountId,
      };

      if (data.status) {
        where.status = data.status;
      }

      let orderBy: any = {};
      switch (data.sortBy) {
        case 'pay_asc':
          orderBy = { payAmount: 'asc' };
          break;
        case 'pay_desc':
          orderBy = { payAmount: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.jobPost.count({ where });

      const jobs = await this.prisma.jobPost.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy,
        skip: data.offset,
        take: data.limit,
      }) as JobPostWithRelations[];

      if (jobs.length === 0) {
        this.logger.log(`No jobs found for account: ${data.accountId}`);
        return BaseResponseDto.ok([], 'No jobs found for this account', 'SUCCESS_EMPTY');
      }

      const mappedJobs = await Promise.all(jobs.map((job) => this.mapToResponseDto(job)));

      const pagination: PaginationDto = {
        total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.offset + data.limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedJobs,
        pagination,
        `Found ${mappedJobs.length} jobs for owner`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to get jobs by owner: ${error.message}`);
      return BaseResponseDto.fail(error.message, 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // GET OWN JOB LISTINGS (WITH PAGINATION)
  // ======================================================

  async getOwnJobs(
    creatorId: string,
    dto: GetOwnJobsFilterDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const {
      status,
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      experienceLevel,
      educationLevel,
      isAnonymous,
      hoursPerWeekMin,
      hoursPerWeekMax,
      limit = 20,
      offset = 0,
      sortBy = 'recent',
    } = dto;

    try {
      const where: any = {
        creatorId,
      };

      if (status) {
        where.status = status as JobPost['status'];
      }

      if (employmentType) where.employmentType = employmentType;
      if (paymentType) where.paymentType = paymentType;
      if (workArrangement) where.workArrangement = workArrangement;
      if (commitment) where.commitment = commitment;
      if (experienceLevel) where.experienceLevel = experienceLevel;
      if (educationLevel) where.educationLevel = educationLevel;
       if (isAnonymous !== undefined) where.isAnonymous = isAnonymous;
      if (hoursPerWeekMin !== undefined || hoursPerWeekMax !== undefined) {
        where.hoursPerWeek = {};
        if (hoursPerWeekMin !== undefined) where.hoursPerWeek.gte = hoursPerWeekMin;
        if (hoursPerWeekMax !== undefined) where.hoursPerWeek.lte = hoursPerWeekMax;
      }
      

      let orderBy: any = {};
      switch (sortBy) {
        case 'pay_asc':
          orderBy = { payAmount: 'asc' };
          break;
        case 'pay_desc':
          orderBy = { payAmount: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.jobPost.count({ where });

      const jobs = await this.prisma.jobPost.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      }) as JobPostWithRelations[];

      if (jobs.length === 0) {
        return BaseResponseDto.fail('No jobs matching your criteria were found.', 'NOT_FOUND');
      }

      const mappedJobs = await Promise.all(jobs.map((job) => this.mapToResponseDto(job)));

      const pagination: PaginationDto = {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedJobs,
        pagination,
        `Found ${mappedJobs.length} jobs`,
        'FETCHED'
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`🔥 Failed to fetch own jobs for user ${creatorId}: ${err.message}`);
      return BaseResponseDto.fail('Failed to fetch your job listings', 'FETCH_FAILED');
    }
  }

  // ======================================================
  // GET ADMIN JOBS (WITH PAGINATION)
  // ======================================================

  async getAdminJobs(
    dto: GetAdminJobsFilterDto
  ): Promise<BaseResponseDto<JobPostResponseDto[]>> {
    const {
      creatorId,
      accountId,
      status,
      employmentType,
      paymentType,
      workArrangement,
      commitment,
      experienceLevel,
      educationLevel,
      isRemote,
      isAnonymous,
      applicationDeadlineAfter,
      applicationDeadlineBefore,
      startDateAfter,
      startDateBefore,
      hoursPerWeekMin,
      hoursPerWeekMax,
      limit = 20,
      offset = 0,
      sortBy = 'recent',
    } = dto;

    try {
      if (creatorId) {
        try {
          const creatorRes = await firstValueFrom(
            this.userGrpcService.getUserProfileByUuid({ userUuid: creatorId })
          );
          
          if (!creatorRes?.success) {
            return BaseResponseDto.fail(creatorRes?.message || 'Creator not found', 'NOT_FOUND');
          }
        } catch (grpcError) {
          this.logger.warn(`[gRPC] Creator lookup failed: ${grpcError.message}`);
          return BaseResponseDto.fail('The provided creator ID does not exist', 'CREATOR_NOT_FOUND');
        }
      }

      if (accountId) {
        try {
          const accountRes = await firstValueFrom(
            this.userGrpcService.getUserProfileByUuid({ userUuid: accountId })
          );

          if (!accountRes?.success) {
            return BaseResponseDto.fail(accountRes?.message || 'Account not found', 'NOT_FOUND');
          }
        } catch (grpcError) {
          this.logger.warn(`[gRPC] Account lookup failed: ${grpcError.message}`);
          return BaseResponseDto.fail('The provided account ID does not exist', 'ACCOUNT_NOT_FOUND');
        }
      }

      const where: any = {};

      if (creatorId) {
        where.creatorId = creatorId;
      }

      if (accountId) {
        where.accountId = accountId;
      }

      if (status) {
        where.status = status;
      }

      if (employmentType) where.employmentType = employmentType;
      if (paymentType) where.paymentType = paymentType;
      if (workArrangement) where.workArrangement = workArrangement;
      if (commitment) where.commitment = commitment;
      if (experienceLevel) where.experienceLevel = experienceLevel;
      if (educationLevel) where.educationLevel = educationLevel;
      if (isRemote !== undefined) where.isRemote = isRemote;
         if (isAnonymous !== undefined) where.isAnonymous = isAnonymous;
      if (applicationDeadlineAfter || applicationDeadlineBefore) {
        where.applicationDeadline = {};
        if (applicationDeadlineAfter) where.applicationDeadline.gte = new Date(applicationDeadlineAfter);
        if (applicationDeadlineBefore) where.applicationDeadline.lte = new Date(applicationDeadlineBefore);
      }
      if (startDateAfter || startDateBefore) {
        where.startDate = {};
        if (startDateAfter) where.startDate.gte = new Date(startDateAfter);
        if (startDateBefore) where.startDate.lte = new Date(startDateBefore);
      }
      if (hoursPerWeekMin !== undefined || hoursPerWeekMax !== undefined) {
        where.hoursPerWeek = {};
        if (hoursPerWeekMin !== undefined) where.hoursPerWeek.gte = hoursPerWeekMin;
        if (hoursPerWeekMax !== undefined) where.hoursPerWeek.lte = hoursPerWeekMax;
      }

      let orderBy: any = {};
      switch (sortBy) {
        case 'pay_asc':
          orderBy = { payAmount: 'asc' };
          break;
        case 'pay_desc':
          orderBy = { payAmount: 'desc' };
          break;
        case 'recent':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }

      const total = await this.prisma.jobPost.count({ where });

      const jobs = await this.prisma.jobPost.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      });

      if (jobs.length === 0) {
        return BaseResponseDto.fail('No jobs matching your criteria were found.', 'NOT_FOUND');
      }

      const mappedJobs = await Promise.all(
        jobs.map((job) => this.mapToResponseDto(job as JobPostWithRelations))
      );

      const pagination: PaginationDto = {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };

      return BaseResponseDto.okWithPagination(
        mappedJobs,
        pagination,
        `Successfully found ${jobs.length} jobs`,
        'FETCHED'
      );
    } catch (error) {
      this.logger.error(`🔥 Unexpected failure in getAdminJobs: ${error.message}`);
      return BaseResponseDto.fail('Internal server error while processing listings', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // UPDATE JOB POST
  // ======================================================

  async updateJobPost(
    dto: UpdateJobGrpcRequestDto
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
      const existing = await this.prisma.jobPost.findUnique({ 
        where: { id: dto.id },
        select: { creatorId: true, accountId: true, categoryId: true }
      });
      
      if (!existing || existing.creatorId !== dto.creatorId || existing.accountId !== dto.accountId) {
        this.logger.warn(`⚠️ Unauthorized update attempt: User ${dto.creatorId} (Acc: ${dto.accountId}) tried to edit Job ${dto.id}`);
        return BaseResponseDto.fail('Job post not found or unauthorized access.', 'UNAUTHORIZED');
      }

      const result = await this.performUpdate(dto);

      await this.invalidateCache({
        jobId: dto.id,
        categoryId: existing.categoryId,
        allListings: true,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`🔥 Job update failed: ${err.message}`);
      return BaseResponseDto.fail('Failed to update job post.', 'INTERNAL_ERROR');
    }
  }

  async updateAdminJobPost(
    dto: UpdateJobGrpcRequestDto
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    try {
      const existing = await this.prisma.jobPost.findUnique({ 
        where: { id: dto.id },
        select: { creatorId: true, accountId: true, categoryId: true }
      });
      if (!existing) {
        return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
      }

      const userProfile = await firstValueFrom(
        this.userGrpcService.getUserProfileByUuid({ userUuid: dto.creatorId })
      );

      if (!userProfile?.success || !userProfile.data) {
        return BaseResponseDto.fail('Target creator does not exist.', 'USER_NOT_FOUND');
      }

      if (userProfile.data.account.uuid !== dto.accountId) {
        return BaseResponseDto.fail('Identity mismatch: Creator does not belong to the provided account.', 'BAD_REQUEST');
      }

      const creatorName = `${userProfile.data.user.firstName} ${userProfile.data.user.lastName}`;
      const accountName = userProfile.data.organization?.name || creatorName;

      const result = await this.performUpdate({
        ...dto,
        creatorName,
        accountName
      });

      await this.invalidateCache({
        jobId: dto.id,
        categoryId: existing.categoryId,
        allListings: true,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`🔥 Admin job update failed: ${err.message}`);
      return BaseResponseDto.fail('Internal failure during admin update.', 'ERROR');
    }
  }

  private async performUpdate(
    data: UpdateJobGrpcRequestDto & { creatorName?: string; accountName?: string }
  ): Promise<BaseResponseDto<JobPostResponseDto>> {
    const { 
      id, 
      creatorId, 
      accountId, 
      categoryId, 
      subCategoryId, 
      ...updateFields 
    } = data;

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

    if (subCategoryId) {
      const subCategory = await this.prisma.category.findUnique({
        where: { id: subCategoryId },
        select: { parentId: true, vertical: true }
      });

      if (!subCategory || subCategory.vertical !== 'JOBS') {
        this.logger.error(`Validation Failed: SubCategory ${subCategoryId} not found or not JOBS`);
        return BaseResponseDto.fail('Invalid sub-category selected.', 'BAD_REQUEST');
      }

      if (categoryId && subCategory.parentId !== categoryId) {
        return BaseResponseDto.fail('Sub-category mismatch with parent category.', 'BAD_REQUEST');
      }
    }

    const updated = await this.prisma.jobPost.update({
      where: { id },
      data: {
        ...updateFields,
        ...(categoryId && { categoryId }),
        ...(subCategoryId && { subCategoryId }),
        updatedAt: new Date(),
      },
    });

    const freshData = await this.getJobPostById({
      id: updated.id,
      bypassCache: true,
      refreshCache: true,
      cacheTTL: this.CACHE_TTL.SINGLE,
      readOnly: false,
    });
    
    return BaseResponseDto.ok(freshData.data, 'Job post updated successfully');
  }

  // ======================================================
  // CLOSE JOB POST
  // ======================================================

async closeJobPost(
  dto: CloseJobGrpcRequestDto
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    const job = await this.prisma.jobPost.findUnique({
      where: { id: dto.id },
      select: { 
        creatorId: true, 
        accountId: true, 
        status: true, 
        categoryId: true,
        id: true,
        externalId: true,
        title: true,
        creatorName: true,
        accountName: true,
      }
    });

    if (!job) {
      return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
    }

    const isOwner = job.creatorId === dto.creatorId;
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

    const result = await this.executeClosurePersistence(dto.id);

    // ============================================================
    // SEND JOB CLOSED NOTIFICATION
    // ============================================================
    const totalApplications = await this.prisma.jobPostApplication.count({
      where: { jobPostId: dto.id }
    });
    
    // Pass the full job object with all required fields
    await this.sendJobClosedNotification(job as JobPost, totalApplications);

    await this.invalidateCache({
      jobId: dto.id,
      categoryId: job.categoryId,
      allListings: true,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Close job failed: ${err.message}`);
    return BaseResponseDto.fail('An error occurred while closing the job.', 'INTERNAL_ERROR');
  }
}

 async closeAdminJobPost(
  dto: CloseJobGrpcRequestDto
): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
  try {
    const job = await this.prisma.jobPost.findUnique({
      where: { id: dto.id },
      select: { 
        id: true, 
        externalId: true,
        title: true,
        creatorId: true, 
        accountId: true, 
        categoryId: true,
        creatorName: true,
        accountName: true,
      }
    });

    if (!job) {
      return BaseResponseDto.fail('Job post not found.', 'NOT_FOUND');
    }

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
    
    const result = await this.executeClosurePersistence(dto.id);

    // ============================================================
    // SEND JOB CLOSED NOTIFICATION
    // ============================================================
    const totalApplications = await this.prisma.jobPostApplication.count({
      where: { jobPostId: dto.id }
    });
    
    // Pass the full job object with all required fields
    await this.sendJobClosedNotification(job as JobPost, totalApplications);

    await this.invalidateCache({
      jobId: dto.id,
      categoryId: job.categoryId,
      allListings: true,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    this.logger.error(`🔥 Admin close job failed: ${err.message}`);
    return BaseResponseDto.fail('Internal failure during administrative closure.', 'INTERNAL_ERROR');
  }
}

  private async executeClosurePersistence(jobId: string): Promise<BaseResponseDto<CloseJobPostResponseDto>> {
    const updatedJob = await this.prisma.jobPost.update({
      where: { id: jobId },
      data: { 
        status: 'CLOSED',
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

  // ======================================================
  // VALIDATE JOB POST IDS
  // ======================================================

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
  // JOB APPLICATION METHODS
  // ======================================================

  async applyToJobPost(
    jobPostId: string, 
    applicantId: string, 
    dto: CreateJobApplicationDto
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    
    this.logger.log(`[Job Application] Applicant ${applicantId} applying to ${jobPostId}`);

    return this.prisma.$transaction(async (tx) => {
      const jobPost = await tx.jobPost.findUnique({
        where: { id: jobPostId },
        select: { 
          status: true, 
          requiresDocuments: true, 
          requiresEquipment: true, 
          allowReferrals: true,
          creatorId: true,
          employmentType: true,
          isNegotiable: true, 
          payAmount: true,
          title: true,
          locationCity: true,
          category: { select: { name: true } }
        }
      });

      if (!jobPost) return { success: false, message: 'Job post not found', code: 'NOT_FOUND' };
      if (jobPost.status !== 'ACTIVE') return { success: false, message: 'This post is no longer accepting applications', code: 'JOB_CLOSED' };

      if (jobPost.requiresEquipment && !dto.hasRequiredEquipment) {
        return { 
          success: false, 
          message: 'You must confirm that you have the required equipment for this job.', 
          code: 'EQUIPMENT_REQUIRED' 
        };
      }

      if (!jobPost.isNegotiable && jobPost.payAmount && dto.expectedPay) {
        if (dto.expectedPay > jobPost.payAmount) {
          return {
            success: false,
            message: `This job has a fixed budget of ${jobPost.payAmount}. Your expected pay is too high.`,
            code: 'PAY_EXCEEDS_BUDGET'
          };
        }
      }

      if (jobPost.requiresDocuments && (!dto.attachments || dto.attachments.length === 0)) {
        return { 
          success: false, 
          message: 'This job requires supporting documents.', 
          code: 'DOCUMENTS_REQUIRED' 
        };
      }

      const existing = await tx.jobPostApplication.findUnique({
        where: { jobPostId_applicantId: { jobPostId, applicantId } },
      });
      if (existing) return { success: false, message: 'You have already applied.', code: 'ALREADY_APPLIED' };

      // Use employmentType to determine if informal (GIG, CASUAL, FREELANCE, etc.)
      const isInformal = ['GIG', 'CASUAL', 'FREELANCE', 'APPRENTICESHIP'].includes(jobPost.employmentType);
      const defaultAvailability = isInformal ? new Date() : null; 

      const application = await tx.jobPostApplication.create({
        data: {
          jobPostId: jobPostId,
          applicantId: applicantId,
          employerId: jobPost.creatorId,
          
          hasRequiredEquipment: dto.hasRequiredEquipment || false,
          expectedPay: dto.expectedPay,
          availabilityDate: dto.availabilityDate ? new Date(dto.availabilityDate) : defaultAvailability,
          availabilityNotes: dto.availabilityNotes,

          referrerName: jobPost.allowReferrals ? dto.referrerName : null,
          referrerPhone: jobPost.allowReferrals ? dto.referrerPhone : null,
          referrerEmail: jobPost.allowReferrals ? dto.referrerEmail : null,
          referrerRelationship: jobPost.allowReferrals ? dto.referrerRelationship : null,
          
          status: 'PENDING',
        },
      });

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

      await tx.jobApplicationStatusHistory.create({
        data: {
          applicationId: application.id,
          oldStatus: 'NONE',
          newStatus: 'PENDING',
          changedBy: applicantId,
          reason: 'Initial application submission',
        },
      });

      const completeApplication = await tx.jobPostApplication.findUnique({
        where: { id: application.id },
        include: { attachments: true, statusHistory: true },
      });

      // ============================================================
      // SEND APPLICATION SUBMITTED NOTIFICATION
      // ============================================================
      // Get applicant details
      let applicantName = 'Applicant';
      let applicantEmail = '';
      let employerEmail = '';
      let employerName = 'Employer';

      try {
        const applicantProfile = await firstValueFrom(
          this.userGrpcService.getUserProfileByUuid({ userUuid: applicantId })
        );
        if (applicantProfile?.success && applicantProfile.data) {
          applicantName = `${applicantProfile.data.user.firstName} ${applicantProfile.data.user.lastName}`;
          applicantEmail = applicantProfile.data.user.email;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch applicant details: ${error.message}`);
      }

      try {
        const employerProfile = await firstValueFrom(
          this.userGrpcService.getUserProfileByUuid({ userUuid: jobPost.creatorId })
        );
        if (employerProfile?.success && employerProfile.data) {
          employerName = `${employerProfile.data.user.firstName} ${employerProfile.data.user.lastName}`;
          employerEmail = employerProfile.data.user.email;
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch employer details: ${error.message}`);
      }

      await this.sendApplicationSubmittedNotification(
        application,
        jobPost,
        { firstName: applicantName.split(' ')[0], lastName: applicantName.split(' ').slice(1).join(' '), email: applicantEmail },
        employerEmail,
        employerName
      );

      return { 
        success: true, 
        message: 'Application submitted successfully', 
        data: completeApplication as unknown as JobApplicationResponseDto, 
        code: 'SUCCESS' 
      };
    });
  }

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

  async getAdminApplications(query: {
    applicantId?: string;
    employerId?: string;
    status?: string;
  }): Promise<BaseResponseDto<JobApplicationResponseDto[]>> {
    try {
      if (query.applicantId) {
        const res = await firstValueFrom(this.userGrpcService.getUserProfileByUuid({ userUuid: query.applicantId }));
        if (!res?.success) return BaseResponseDto.fail('The provided applicant ID does not exist', 'NOT_FOUND');
      }

      if (query.employerId) {
        const res = await firstValueFrom(this.userGrpcService.getUserProfileByUuid({ userUuid: query.employerId }));
        if (!res?.success) return BaseResponseDto.fail('The provided employer ID does not exist', 'NOT_FOUND');
      }

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

  private mapToSlimApplicationDto(app: SlimApplicationResult): JobApplicationResponseDto {
    return {
      id: app.id,
      jobPostId: app.jobPostId,
      applicantId: app.applicantId,
      status: app.status,
      
      createdAt: new Date(app.createdAt),
      updatedAt: app.updatedAt.toISOString(),

      lastStatusChangeReason: app.statusHistory?.[0]?.reason ?? undefined,
    };
  }

  async getApplicationById(
    id: string, 
    requesterId: string,
    requesterRole?: string
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

      const isApplicant = application.applicantId === requesterId;
      const isEmployer = application.employerId === requesterId;
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
      
      expectedPay: app.expectedPay ? Number(app.expectedPay) : undefined,
      availabilityDate: app.availabilityDate ? new Date(app.availabilityDate) : undefined,
      availabilityNotes: app.availabilityNotes ?? undefined,

      referrerName: app.referrerName ?? undefined,
      referrerPhone: app.referrerPhone ?? undefined,
      referrerEmail: app.referrerEmail ?? undefined,
      referrerRelationship: app.referrerRelationship ?? undefined,

      createdAt: new Date(app.createdAt),
      updatedAt: app.updatedAt.toISOString(),
      reviewedAt: app.reviewedAt ? new Date(app.reviewedAt) : undefined,

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

  // ======================================================
  // UPDATE APPLICATION STATUS
  // ======================================================

  async updateApplicationStatus(
    applicationId: string,
    newStatus: string,
    reason?: string,
    changedBy?: string
  ): Promise<BaseResponseDto<JobApplicationResponseDto>> {
    try {
      const application = await this.prisma.jobPostApplication.findUnique({
        where: { id: applicationId },
        include: {
          jobPost: true,
          statusHistory: true,
        },
      });

      if (!application) {
        return BaseResponseDto.fail('Application not found', 'NOT_FOUND');
      }

      const oldStatus = application.status;

      // Update the application status
      const updated = await this.prisma.jobPostApplication.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Add status history entry
      await this.prisma.jobApplicationStatusHistory.create({
        data: {
          applicationId: applicationId,
          oldStatus: oldStatus,
          newStatus: newStatus,
          changedBy: changedBy || 'system',
          reason: reason || null,
        },
      });

      // ============================================================
      // SEND APPLICATION STATUS CHANGED NOTIFICATION
      // ============================================================
      await this.sendApplicationStatusChangedNotification(
        application,
        application.jobPost,
        oldStatus,
        newStatus,
        reason
      );

      return BaseResponseDto.ok(
        {
          id: updated.id,
          jobPostId: updated.jobPostId,
          applicantId: updated.applicantId,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt.toISOString(),
        },
        `Application status updated to ${newStatus}`,
        'OK'
      );
    } catch (error) {
      this.logger.error(`Failed to update application status: ${error.message}`);
      return BaseResponseDto.fail('Failed to update application status', 'INTERNAL_ERROR');
    }
  }

  // ======================================================
  // PRIVATE MAPPING HELPER
  // ======================================================

  private async mapToResponseDto(job: JobPostWithRelations): Promise<JobPostResponseDto> {
    const applicationsCount = await this.prisma.jobPostApplication.count({
      where: { jobPostId: job.id },
    });

    return {
      id: job.id,
      title: job.title,
      description: job.description,
      
      // Job Characteristics
      employmentType: job.employmentType,
      paymentType: job.paymentType,
      workArrangement: job.workArrangement,
      commitment: job.commitment,
      workSchedule: job.workSchedule,
      documentationLevel: job.documentationLevel,
      skillLevel: job.skillLevel,
      experienceLevel: job.experienceLevel,
      educationLevel: job.educationLevel,
      
      // Location
      locationCity: job.locationCity,
      locationNeighborhood: job.locationNeighborhood,
      isRemote: job.isRemote,
      
      // Compensation
      payAmount: job.payAmount,
      payRate: job.payRate,
      isNegotiable: job.isNegotiable,
      
      // Requirements
      skills: job.skills,
      requiresDocuments: job.requiresDocuments,
      documentsNeeded: job.documentsNeeded,
      requiresEquipment: job.requiresEquipment,
      equipmentRequired: job.equipmentRequired,
      additionalNotes: job.additionalNotes,
      
      // Referrals
      allowReferrals: job.allowReferrals,
      referralBonus: job.referralBonus,
      
      // New Fields
      applicationDeadline: job.applicationDeadline?.toISOString(),
      startDate: job.startDate?.toISOString(),
      startDateFlexible: job.startDateFlexible,
      maxApplications: job.maxApplications,
      
      // Privacy & Visibility
      isAnonymous: job.isAnonymous,
      displayName: job.displayName,
      contactEmail: job.contactEmail,
      
      // Work Details
      hoursPerWeek: job.hoursPerWeek,
      contractDuration: job.contractDuration,
      
      // Analytics
      viewCount: job.viewCount,
      shareCount: job.shareCount,
      
      // Status & Timestamps
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      
      // Relations
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
}