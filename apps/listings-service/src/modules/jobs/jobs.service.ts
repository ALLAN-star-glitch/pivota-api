import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateJobPostDto,
  JobPostResponseDto,
  ProviderJobResponseDto,
  CreateProviderJobDto,
  BaseResponseDto,
  UserResponseDto,
  GetUserByUserUuidDto
} from '@pivota-api/dtos';
import { firstValueFrom, Observable } from 'rxjs';
import { BaseUserResponseGrpc  } from '@pivota-api/interfaces';
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
      const category = await this.prisma.jobCategory.findUnique({
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
        const response =  {
          success: false,
          message: 'Job post not found',
          code: 'JOB_NOT_FOUND',
          jobPost: null,
          error: { message: 'No job post exists with this ID', details: null },
        };
        return response;
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

      const response = {
        success: true,
        message: 'Job post fetched successfully',
        code: 'FETCHED',
        jobPost,
        error: null,
      };
      return response;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Fetch job post failed: ${err.message}`, err.stack);
      const failure =  {
        success: false,
        message: 'Failed to fetch job post',
        code: 'FETCH_FAILED',
        jobPost: null,
        error: { message: err.message, details: err.stack },
      };
      return failure;
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

    const response = {
      success: true,
      message: `Jobs fetched successfully. Total jobs: ${jobsCount}`, 
      code: 'FETCHED',
      jobPosts: jobsWithCounts,
      error: null,
    };

    return response;
  } catch (error) {
    const err = error as Error;
    this.logger.error(`Fetch jobs by category failed: ${err.message}`, err.stack);
    const failure = {
      success: false,
      message: 'Failed to fetch jobs',
      code: 'FETCH_FAILED',
      jobPosts: null,
      error: { message: err.message, details: err.stack },
    };
    return failure;
  }
}


  // ======================================================
  // CREATE PROVIDER JOB
  // ======================================================
  async createProviderJob(dto: CreateProviderJobDto): Promise<BaseResponseDto<ProviderJobResponseDto>> {
    try {
      const category = await this.prisma.jobCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        const response =  {
          success: false,
          message: 'Invalid category ID',
          code: 'CATEGORY_NOT_FOUND',
          providerJob: null,
          error: { message: 'No category exists with this ID', details: null },
        };
        return response;
      }

      const created = await this.prisma.providerJob.create({
        data: {
          providerId: dto.providerId,
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          price: dto.price,
          location: dto.location,
          additionalNotes: dto.additionalNotes ?? '',
        },
        include: {
          category: true,
        },
      });

      const providerJob: ProviderJobResponseDto = {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        category: created.category
          ? { id: created.category.id, name: created.category.name }
          : null,
      };

      const success =  {
        success: true,
        message: 'Provider job created successfully',
        code: 'CREATED',
        providerJob,
        error: null,
      };
      return success;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Create provider job failed: ${err.message}`, err.stack);
      const failure =  {
        success: false,
        message: 'Failed to create provider job',
        code: 'CREATION_FAILED',
        providerJob: null,
        error: { message: err.message, details: err.stack },
      };
      return failure;
    }
  }
}
