/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheKeys, QueueService } from '@pivota-api/shared-redis';
import { RedisService } from '@pivota-api/shared-redis';
import {
  GetAllJobsRequestDto,
  GetJobsByCategoryRequestDto,
} from '@pivota-api/dtos';
import { JobsService } from '../business-modules/jobs-module/jobs/jobs.service';

// Import the TYPES (string literal unions) from the constants package
import { 
  EmploymentType, 
  PaymentType, 
  WorkArrangement, 
  CommitmentLevel,
  WorkSchedule,
  DocumentationLevel,
  SkillLevel,
  ExperienceLevel,
  EducationLevel
} from '@pivota-api/constants';

// Define query types with proper typing using the string literal union types
type PopularQuery = {
  categoryId?: string;
  city?: string;
  minPay?: number;
  maxPay?: number;
  sortBy: 'recent' | 'pay_asc' | 'pay_desc';
  limit?: number;
  page?: number;
  // Job Characteristics - All 9 fields with string literal union types
  employmentType?: EmploymentType;
  paymentType?: PaymentType;
  workArrangement?: WorkArrangement;
  commitment?: CommitmentLevel;
  workSchedule?: WorkSchedule;
  documentationLevel?: DocumentationLevel;
  skillLevel?: SkillLevel;
  experienceLevel?: ExperienceLevel;
  educationLevel?: EducationLevel;
  isRemote?: boolean;
  // ============================================================
  // NEW FILTERS - ADD THESE
  // ============================================================
  isAnonymous?: boolean;
  applicationDeadlineAfter?: string;
  applicationDeadlineBefore?: string;
  startDateAfter?: string;
  startDateBefore?: string;
  hoursPerWeekMin?: number;
  hoursPerWeekMax?: number;
};

@Injectable()
export class JobsListingsCacheWorker implements OnModuleInit {
  private readonly logger = new Logger(JobsListingsCacheWorker.name);
  private initialized = false;
  
  // Cache TTLs
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual job posts
    POPULAR: 60,   // 1 minute - popular/hot listings
  };

  constructor(
    private queue: QueueService,
    private redis: RedisService,
    private jobsService: JobsService,
  ) {
    this.logger.log('🔥 JobsListingsCacheWorker constructor called');
  }

  async onModuleInit() {
    this.logger.log('🔥 JobsListingsCacheWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      this.logger.log('JobsListingsCacheWorker already initialized');
      return;
    }

    this.logger.log('🔥 JobsListingsCacheWorker.initialize() STARTED');
    const startTime = Date.now();

    try {
      // Create worker for cache operations
      this.queue.createWorker('cache-jobs-queue', async (job) => {
        await this.processCacheJob(job);
      });

      this.initialized = true;

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Jobs listings cache worker initialized in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize jobs listings cache worker: ${error.message}`);
      throw error;
    }
  }

  private async processCacheJob(job: any): Promise<void> {
    const { name, data, id } = job;

    this.logger.log(`📋 Processing cache job ${id}: ${name}`);
    console.log(`📋 Processing cache job ${id}: ${name}`);

    try {
      switch (name) {
        case 'cache-job-listings':
          await this.cacheJobListings(data);
          break;

        case 'cache-single-job':
          await this.cacheSingleJob(data);
          break;

        case 'invalidate-job-listings':
          await this.invalidateJobListings(data);
          break;

        case 'invalidate-single-job':
          await this.invalidateSingleJob(data);
          break;

        case 'warm-job-listings':
          await this.warmJobListings(data);
          break;

        case 'refresh-popular-job-listings':
          await this.refreshPopularJobListings(data);
          break;

        default:
          this.logger.warn(`⚠️ Unknown cache job type: ${name}`);
      }

      this.logger.log(`✅ Cache job ${name} completed`);
    } catch (error) {
      this.logger.error(`❌ Cache job ${name} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cache job listings with intelligent TTL
   */
  private async cacheJobListings(data: {
    params: any;
    result: any;
    pagination: any;
    ttl?: number;
  }): Promise<void> {
    const { params, result, pagination, ttl } = data;
    
    const cacheKey = CacheKeys.getJobListingKey({
      categoryId: params.categoryId,
      city: params.city,
      minPay: params.minPay,
      maxPay: params.maxPay,
      sortBy: params.sortBy,
      employmentType: params.employmentType,
      paymentType: params.paymentType,
      workArrangement: params.workArrangement,
      commitment: params.commitment,
      workSchedule: params.workSchedule,
      documentationLevel: params.documentationLevel,
      skillLevel: params.skillLevel,
      experienceLevel: params.experienceLevel,
      educationLevel: params.educationLevel,
      isRemote: params.isRemote,
      // ============================================================
      // NEW FILTERS
      // ============================================================
      isAnonymous: params.isAnonymous,
      applicationDeadlineAfter: params.applicationDeadlineAfter,
      applicationDeadlineBefore: params.applicationDeadlineBefore,
      startDateAfter: params.startDateAfter,
      startDateBefore: params.startDateBefore,
      hoursPerWeekMin: params.hoursPerWeekMin,
      hoursPerWeekMax: params.hoursPerWeekMax,
      page: params.page || 1,
      limit: params.limit || 20,
    });

    // Prepare cache data
    const cacheData = {
      data: result,
      pagination,
      cachedAt: new Date().toISOString(),
      expiresIn: ttl || this.CACHE_TTL.LISTINGS,
    };

    // Store in Redis with appropriate TTL
    await this.redis.setObject(
      cacheKey, 
      cacheData, 
      ttl || this.CACHE_TTL.LISTINGS
    );
    
    this.logger.log(`✅ Cached job listings: ${cacheKey} (${result.length} items, TTL: ${ttl || this.CACHE_TTL.LISTINGS}s)`);
    console.log(`✅ Cached job listings: ${cacheKey} (${result.length} items)`);

    // Also store in a "popular" set for quick access
    if (params.sortBy === 'recent' && params.page === 1) {
      await this.redis.setObject(
        `${cacheKey}:popular`,
        cacheData,
        this.CACHE_TTL.POPULAR
      );
    }
  }

  /**
   * Cache a single job post
   */
  private async cacheSingleJob(data: {
    jobId: string;
    result: any;
    ttl?: number;
  }): Promise<void> {
    const { jobId, result, ttl } = data;
    const cacheKey = CacheKeys.getSingleJobKey(jobId);

    const cacheData = {
      data: result,
      cachedAt: new Date().toISOString(),
      expiresIn: ttl || this.CACHE_TTL.SINGLE,
    };

    await this.redis.setObject(
      cacheKey, 
      cacheData, 
      ttl || this.CACHE_TTL.SINGLE
    );
    
    this.logger.log(`✅ Cached single job: ${cacheKey}`);
    console.log(`✅ Cached single job: ${cacheKey}`);
  }

  /**
   * Invalidate all job listings (when any job changes)
   */
  private async invalidateJobListings(data: {
  categoryId?: string;
  accountId?: string;
  creatorId?: string;
  employmentType?: string;
  experienceLevel?: string;
  workArrangement?: string;
  city?: string;
  isRemote?: boolean;
  // ============================================================
  // NEW FILTERS
  // ============================================================
  isAnonymous?: boolean;
  applicationDeadline?: boolean;
  startDate?: boolean;
  hoursPerWeek?: boolean;
}): Promise<void> {
  let pattern: string;

  if (data.categoryId) {
    pattern = CacheKeys.getJobCategoryPattern(data.categoryId);
  } else if (data.employmentType) {
    pattern = CacheKeys.getJobEmploymentTypePattern(data.employmentType);
  } else if (data.experienceLevel) {
    pattern = CacheKeys.getJobExperienceLevelPattern(data.experienceLevel);
  } else if (data.workArrangement) {
    pattern = CacheKeys.getJobWorkArrangementPattern(data.workArrangement);
  } else if (data.city) {
    pattern = CacheKeys.getJobCityPattern(data.city);
  } else if (data.isRemote !== undefined) {
    pattern = CacheKeys.getJobRemotePattern(data.isRemote);
  // ============================================================
  // NEW INVALIDATION PATTERNS
  // ============================================================
  } else if (data.isAnonymous !== undefined) {
    pattern = CacheKeys.getJobAnonymousPattern(data.isAnonymous);
  } else if (data.applicationDeadline) {
    pattern = CacheKeys.getJobApplicationDeadlinePattern();
  } else if (data.startDate) {
    pattern = CacheKeys.getJobStartDatePattern();
  } else if (data.hoursPerWeek) {
    pattern = CacheKeys.getJobHoursPerWeekPattern();
  } else {
    pattern = CacheKeys.getJobListingsPattern();
  }

  const keys = await this.redis.keys(pattern);
  
  if (keys.length > 0) {
    await this.redis.deleteMany(keys);
    this.logger.log(`✅ Invalidated ${keys.length} cache keys: ${pattern}`);
    console.log(`✅ Invalidated ${keys.length} cache keys: ${pattern}`);
  } else {
    this.logger.log(`ℹ️ No cache keys found for pattern: ${pattern}`);
  }
}

  /**
   * Invalidate a single job post
   */
  private async invalidateSingleJob(data: {
    jobId: string;
  }): Promise<void> {
    const cacheKey = CacheKeys.getSingleJobKey(data.jobId);
    await this.redis.delete(cacheKey);
    
    this.logger.log(`✅ Invalidated single job: ${cacheKey}`);
    console.log(`✅ Invalidated single job: ${cacheKey}`);

    // Also invalidate all listings since this job might appear there
    await this.invalidateJobListings({});
  }

  /**
   * Warm cache for popular queries
   */
  private async warmJobListings(data: {
    categories?: string[];
    cities?: string[];
  }): Promise<void> {
    this.logger.log(`🔥 Warming job listings cache...`);
    console.log(`🔥 Warming job listings cache...`);

    // Define popular queries with all job characteristics
    // Using string literals directly (they match the union types)
    const popularQueries: PopularQuery[] = [
      // Most common queries
      { sortBy: 'recent', limit: 20 },
      { sortBy: 'recent', limit: 20, city: 'nairobi' },
      { sortBy: 'recent', limit: 20, city: 'mombasa' },
      { sortBy: 'pay_desc', limit: 20 },
      
      // Employment Type filters
      { sortBy: 'recent', limit: 20, employmentType: 'PERMANENT' },
      { sortBy: 'recent', limit: 20, employmentType: 'CONTRACT' },
      { sortBy: 'recent', limit: 20, employmentType: 'GIG' },
      
      // Work Arrangement filters
      { sortBy: 'recent', limit: 20, workArrangement: 'ONSITE' },
      { sortBy: 'recent', limit: 20, workArrangement: 'REMOTE' },
      { sortBy: 'recent', limit: 20, workArrangement: 'HYBRID' },
      
      // Commitment filters
      { sortBy: 'recent', limit: 20, commitment: 'FULL_TIME' },
      { sortBy: 'recent', limit: 20, commitment: 'PART_TIME' },
      
      // Payment Type filters
      { sortBy: 'recent', limit: 20, paymentType: 'SALARY' },
      { sortBy: 'recent', limit: 20, paymentType: 'PER_TASK' },
      
      // Experience Level filters
      { sortBy: 'recent', limit: 20, experienceLevel: 'ENTRY' },
      { sortBy: 'recent', limit: 20, experienceLevel: 'MID_LEVEL' },
      { sortBy: 'recent', limit: 20, experienceLevel: 'SENIOR' },
      
      // Skill Level filters
      { sortBy: 'recent', limit: 20, skillLevel: 'SKILLED' },
      { sortBy: 'recent', limit: 20, skillLevel: 'PROFESSIONAL' },
      
      // Education Level filters
      { sortBy: 'recent', limit: 20, educationLevel: 'BACHELORS' },
      { sortBy: 'recent', limit: 20, educationLevel: 'MASTERS' },
      
      // Remote filters
      { sortBy: 'recent', limit: 20, isRemote: true },
      { sortBy: 'recent', limit: 20, isRemote: false },
      
      // ============================================================
      // NEW FILTERS - Add popular queries with new filters
      // ============================================================
      { sortBy: 'recent', limit: 20, isAnonymous: false },
      { sortBy: 'recent', limit: 20, isAnonymous: true },
      { sortBy: 'recent', limit: 20, hoursPerWeekMin: 20, hoursPerWeekMax: 40 },
      { sortBy: 'recent', limit: 20, applicationDeadlineAfter: '2025-12-01T00:00:00Z' },
      { sortBy: 'recent', limit: 20, startDateAfter: '2026-01-01T00:00:00Z' },
      
      // Category-specific
      { categoryId: 'cat_software_engineering', sortBy: 'recent' },
      { categoryId: 'cat_sales_marketing', sortBy: 'recent' },
      { categoryId: 'cat_customer_service', sortBy: 'recent' },
      
      // Filtered queries with multiple characteristics
      { 
        sortBy: 'recent', 
        limit: 20, 
        employmentType: 'PERMANENT',
        experienceLevel: 'MID_LEVEL',
        workArrangement: 'ONSITE',
        isRemote: false,
        isAnonymous: false
      },
      { 
        sortBy: 'pay_desc', 
        limit: 20, 
        employmentType: 'CONTRACT',
        skillLevel: 'PROFESSIONAL',
        minPay: 100000,
        hoursPerWeekMin: 20,
        hoursPerWeekMax: 40
      },
      { 
        sortBy: 'recent', 
        limit: 20, 
        paymentType: 'SALARY',
        commitment: 'FULL_TIME',
        educationLevel: 'BACHELORS',
        isAnonymous: false
      },
      
      // Pay ranges
      { minPay: 50000, maxPay: 200000, sortBy: 'pay_desc' },
      { minPay: 200000, maxPay: 500000, sortBy: 'pay_desc' },
      
      // ============================================================
      // Combined filters with new fields
      // ============================================================
      { 
        sortBy: 'recent', 
        limit: 20, 
        city: 'nairobi',
        minPay: 50000,
        maxPay: 200000,
        isRemote: false,
        isAnonymous: false,
        hoursPerWeekMin: 20,
        hoursPerWeekMax: 40,
        applicationDeadlineAfter: '2025-12-01T00:00:00Z',
        applicationDeadlineBefore: '2025-12-31T23:59:59Z',
        startDateAfter: '2026-01-01T00:00:00Z',
        startDateBefore: '2026-01-15T00:00:00Z'
      },
    ];

    let warmedCount = 0;

    for (const query of popularQueries) {
      try {
        // Check if already cached
        const cacheKey = CacheKeys.getJobListingKey({
          ...query,
          page: 1,
          limit: query.limit || 20,
        });

        const exists = await this.redis.exists(cacheKey);
        if (exists) {
          this.logger.debug(`⏭️ Cache already exists for: ${cacheKey}`);
          continue;
        }

        let result: any;

        // Use the appropriate service method based on the query type
        if (query.categoryId) {
          // Use getJobsByCategory for category queries
          const dto: GetJobsByCategoryRequestDto = {
            categoryId: query.categoryId,
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPay: query.minPay,
            maxPay: query.maxPay,
            sortBy: query.sortBy,
            // Job Characteristics
            employmentType: query.employmentType,
            paymentType: query.paymentType,
            workArrangement: query.workArrangement,
            commitment: query.commitment,
            workSchedule: query.workSchedule,
            documentationLevel: query.documentationLevel,
            skillLevel: query.skillLevel,
            experienceLevel: query.experienceLevel,
            educationLevel: query.educationLevel,
            isRemote: query.isRemote,
            // ============================================================
            // NEW FILTERS
            // ============================================================
            isAnonymous: query.isAnonymous,
            applicationDeadlineAfter: query.applicationDeadlineAfter,
            applicationDeadlineBefore: query.applicationDeadlineBefore,
            startDateAfter: query.startDateAfter,
            startDateBefore: query.startDateBefore,
            hoursPerWeekMin: query.hoursPerWeekMin,
            hoursPerWeekMax: query.hoursPerWeekMax,
            // Cache control flags
            bypassCache: false,
            skipCache: true,
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.jobsService.getJobsByCategory(dto);
        } else {
          // Use getAllJobs for general queries
          const dto: GetAllJobsRequestDto = {
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPay: query.minPay,
            maxPay: query.maxPay,
            sortBy: query.sortBy,
            // Job Characteristics
            employmentType: query.employmentType,
            paymentType: query.paymentType,
            workArrangement: query.workArrangement,
            commitment: query.commitment,
            workSchedule: query.workSchedule,
            documentationLevel: query.documentationLevel,
            skillLevel: query.skillLevel,
            experienceLevel: query.experienceLevel,
            educationLevel: query.educationLevel,
            isRemote: query.isRemote,
            // ============================================================
            // NEW FILTERS
            // ============================================================
            isAnonymous: query.isAnonymous,
            applicationDeadlineAfter: query.applicationDeadlineAfter,
            applicationDeadlineBefore: query.applicationDeadlineBefore,
            startDateAfter: query.startDateAfter,
            startDateBefore: query.startDateBefore,
            hoursPerWeekMin: query.hoursPerWeekMin,
            hoursPerWeekMax: query.hoursPerWeekMax,
            // Cache control flags
            bypassCache: false,
            skipCache: true,
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.jobsService.getAllJobs(dto);
        }

        if (result.success && result.data) {
          // The service will handle caching via the skipCache flag
          warmedCount++;
          this.logger.log(`🔥 Warmed cache for: ${cacheKey}`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to warm cache for query: ${JSON.stringify(query)} - ${error.message}`);
      }
    }

    this.logger.log(`✅ Cache warming complete: ${warmedCount} keys warmed`);
    console.log(`✅ Cache warming complete: ${warmedCount} keys warmed`);
  }

  /**
   * Refresh popular job listings periodically
   */
  private async refreshPopularJobListings(data: {
    categoryId?: string;
  }): Promise<void> {
    this.logger.log(`🔄 Refreshing popular job listings...`);
    
    try {
      // Use getAllJobs for general refresh
      const dto: GetAllJobsRequestDto = {
        limit: 20,
        offset: 0,
        sortBy: 'recent',
        // Cache control flags
        bypassCache: false,
        skipCache: true,
        refreshCache: true,
        cacheTTL: this.CACHE_TTL.LISTINGS,
        readOnly: false,
      };

      const result = await this.jobsService.getAllJobs(dto);
      
      if (result.success && result.data) {
        this.logger.log(`✅ Refreshed popular job listings`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to refresh popular job listings: ${error.message}`);
    }
  }

  /**
   * Helper method to invalidate cache when jobs change
   * This can be called from CRUD operations
   */
  async invalidateCache(data: {
    jobId?: string;
    categoryId?: string;
    accountId?: string;
    creatorId?: string;
    employmentType?: string;
    experienceLevel?: string;
    workArrangement?: string;
    city?: string;
    isRemote?: boolean;
    allListings?: boolean;
  }): Promise<void> {
    const jobs = [];

    // 1. Invalidate listings
    if (data.allListings || data.categoryId || data.employmentType || data.experienceLevel || data.workArrangement || data.city || data.isRemote !== undefined) {
      jobs.push(
        this.queue.addJob(
          'cache-jobs-queue',
          'invalidate-job-listings',
          {
            categoryId: data.categoryId,
            accountId: data.accountId,
            creatorId: data.creatorId,
            employmentType: data.employmentType,
            experienceLevel: data.experienceLevel,
            workArrangement: data.workArrangement,
            city: data.city,
            isRemote: data.isRemote,
          },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    // 2. Invalidate single job
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
}