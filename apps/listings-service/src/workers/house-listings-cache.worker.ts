/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheKeys, QueueService } from '@pivota-api/shared-redis';
import { RedisService } from '@pivota-api/shared-redis';
import {
  SearchHouseListingsDto,
  GetHouseListingsByCategoryDto,
  GetListingsByOwnerDto,
} from '@pivota-api/dtos';
import { HousingService } from '../business-modules/housing-module/services/housing.service';


// Define query types with proper typing
type PopularQuery = {
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: string;
  bedrooms?: number;
  propertyType?: string;
  isFurnished?: boolean;
  sortBy?: 'recent' | 'price_asc' | 'price_desc';
  limit?: number;
  page?: number;
};

@Injectable()
export class HousingListingsCacheWorker implements OnModuleInit {
  private readonly logger = new Logger(HousingListingsCacheWorker.name);
  private initialized = false;
  
  // Cache TTLs
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual listings
    POPULAR: 60,   // 1 minute - popular/hot listings
  };

  constructor(
    private queue: QueueService,
    private redis: RedisService,
    private housingService: HousingService,
  ) {
    this.logger.log('🔥 HousingListingsCacheWorker constructor called');
  }

  async onModuleInit() {
    this.logger.log('🔥 HousingListingsCacheWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      this.logger.log('HousingListingsCacheWorker already initialized');
      return;
    }

    this.logger.log('🔥 HousingListingsCacheWorker.initialize() STARTED');
    const startTime = Date.now();

    try {
      // Create worker for cache operations
      this.queue.createWorker('cache-housing-queue', async (job) => {
        await this.processCacheJob(job);
      });

      this.initialized = true;

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Housing listings cache worker initialized in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize housing listings cache worker: ${error.message}`);
      throw error;
    }
  }

  private async processCacheJob(job: any): Promise<void> {
    const { name, data, id } = job;

    this.logger.log(`📋 Processing cache job ${id}: ${name}`);
    console.log(`📋 Processing cache job ${id}: ${name}`);

    try {
      switch (name) {
        case 'cache-housing-listings':
          await this.cacheHousingListings(data);
          break;

        case 'cache-single-housing':
          await this.cacheSingleHousing(data);
          break;

        case 'invalidate-housing-listings':
          await this.invalidateHousingListings(data);
          break;

        case 'invalidate-single-housing':
          await this.invalidateSingleHousing(data);
          break;

        case 'warm-housing-listings':
          await this.warmHousingListings(data);
          break;

        case 'refresh-popular-housing-listings':
          await this.refreshPopularHousingListings(data);
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

// services/housing/workers/housing-listings-cache.worker.ts

/**
 * Cache housing listings with intelligent TTL
 */
private async cacheHousingListings(data: {
  params: any;
  result: any;
  pagination: any;
  ttl?: number;
}): Promise<void> {
  const { params, result, pagination, ttl } = data;
  
  // ⛔ CRITICAL: Don't cache empty results
  if (!result || result.length === 0) {
    this.logger.warn(`⚠️ Skipping cache for empty result set (would cache 0 items)`);
    console.log(`⚠️ Skipping cache for empty result set`);
    return; // Exit early - DO NOT cache empty results
  } 
  
  // ✅ Only cache if there are results
  const cacheKey = CacheKeys.getHouseAllKey({
    city: params.city,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    listingType: params.listingType, 
    bedrooms: params.bedrooms,
    propertyType: params.propertyType,
    isFurnished: params.isFurnished,
    sortBy: params.sortBy,
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
  
  this.logger.log(`✅ Cached housing listings: ${cacheKey} (${result.length} items, TTL: ${ttl || this.CACHE_TTL.LISTINGS}s)`);
  console.log(`✅ Cached housing listings: ${cacheKey} (${result.length} items)`);

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
   * Cache a single housing listing
   */
  private async cacheSingleHousing(data: {
    listingId: string;
    result: any;
    ttl?: number;
  }): Promise<void> {
    const { listingId, result, ttl } = data;
    const cacheKey = CacheKeys.getSingleHousingKey(listingId);

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
    
    this.logger.log(`✅ Cached single housing: ${cacheKey}`);
    console.log(`✅ Cached single housing: ${cacheKey}`);
  }

  /**
   * Invalidate all housing listings (when any listing changes)
   */
  private async invalidateHousingListings(data: {
    categoryId?: string;
    accountId?: string;
    creatorId?: string;
  }): Promise<void> {
    let pattern: string;

    if (data.categoryId) {
      // Invalidate by category
      pattern = CacheKeys.getHousingCategoryPattern(data.categoryId);
    } else {
      // Invalidate ALL listings (use with caution!)
      pattern = CacheKeys.getHousingListingsPattern();
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
   * Invalidate a single housing listing
   */
  private async invalidateSingleHousing(data: {
    listingId: string;
  }): Promise<void> {
    const cacheKey = CacheKeys.getSingleHousingKey(data.listingId);
    await this.redis.delete(cacheKey);
    
    this.logger.log(`✅ Invalidated single housing: ${cacheKey}`);
    console.log(`✅ Invalidated single housing: ${cacheKey}`);

    // Also invalidate all listings since this listing might appear there
    await this.invalidateHousingListings({});
  }

  /**
   * Warm cache for popular queries
   */
  private async warmHousingListings(data: {
    categories?: string[];
    cities?: string[];
  }): Promise<void> {
    this.logger.log(`🔥 Warming housing listings cache...`);
    console.log(`🔥 Warming housing listings cache...`);

    // Define popular queries with proper typing
    const popularQueries: PopularQuery[] = [
      // Most common queries
      { sortBy: 'recent', limit: 20 },
      { sortBy: 'recent', limit: 20, city: 'nairobi' },
      { sortBy: 'recent', limit: 20, city: 'mombasa' },
      { sortBy: 'price_asc', limit: 20 },
      { sortBy: 'price_desc', limit: 20 },
      { listingType: 'RENTAL', sortBy: 'recent', limit: 20 },
      { listingType: 'SALE', sortBy: 'recent', limit: 20 },
      { bedrooms: 2, sortBy: 'recent', limit: 20 },
      { bedrooms: 3, sortBy: 'recent', limit: 20 },
      { propertyType: 'APARTMENT', sortBy: 'recent', limit: 20 },
      { propertyType: 'HOUSE', sortBy: 'recent', limit: 20 },
      { isFurnished: true, sortBy: 'recent', limit: 20 },
      
      // Category-specific
      { categoryId: 'cat_apartments', sortBy: 'recent' },
      { categoryId: 'cat_houses', sortBy: 'recent' },
      
      // Filtered queries
      { minPrice: 20000, maxPrice: 60000, sortBy: 'price_asc' },
    ];

    let warmedCount = 0;

    for (const query of popularQueries) {
      try {
        // Check if already cached
        const cacheKey = CacheKeys.getHousingListingKey({
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
          // Use getHouseListingsByCategory for category queries
          const dto: GetHouseListingsByCategoryDto = {
            categoryId: query.categoryId,
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            listingType: query.listingType,
            bedrooms: query.bedrooms,
            propertyType: query.propertyType,
            isFurnished: query.isFurnished,
            // ✅ Cache control flags
            bypassCache: false,
            skipCache: true, // Skip reading cache, write to cache
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.housingService.getHouseListingsByCategory(dto);
        } else if (query.sortBy && !query.categoryId) {
          // Use searchListings for general queries
          const dto: SearchHouseListingsDto = {
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            listingType: query.listingType,
            bedrooms: query.bedrooms,
            propertyType: query.propertyType,
            isFurnished: query.isFurnished,
            // ✅ Cache control flags
            bypassCache: false,
            skipCache: true, // Skip reading cache, write to cache
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.housingService.searchListings(dto);
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
   * Refresh popular housing listings periodically
   */
  private async refreshPopularHousingListings(data: {
    categoryId?: string;
  }): Promise<void> {
    this.logger.log(`🔄 Refreshing popular housing listings...`);
    
    try {
      const dto: SearchHouseListingsDto = {
        limit: 20,
        offset: 0,
        sortBy: 'recent',
        // ✅ Cache control flags
        bypassCache: false,
        skipCache: true, // Skip reading cache, write to cache
        refreshCache: true, // Force refresh even if exists
        cacheTTL: this.CACHE_TTL.LISTINGS,
        readOnly: false,
      };

      const result = await this.housingService.searchListings(dto);
      
      if (result.success && result.data) {
        this.logger.log(`✅ Refreshed popular housing listings`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to refresh popular housing listings: ${error.message}`);
    }
  }

  /**
   * Helper method to invalidate cache when listings change
   * This can be called from CRUD operations
   */
  async invalidateCache(data: {
    listingId?: string;
    categoryId?: string;
    accountId?: string;
    creatorId?: string;
    allListings?: boolean;
  }): Promise<void> {
    const jobs = [];

    // 1. Invalidate listings
    if (data.allListings || data.categoryId) {
      jobs.push(
        this.queue.addJob(
          'cache-housing-queue',
          'invalidate-housing-listings',
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

    // 2. Invalidate single listing
    if (data.listingId) {
      jobs.push(
        this.queue.addJob(
          'cache-housing-queue',
          'invalidate-single-housing',
          { listingId: data.listingId },
          {
            attempts: 3,
            removeOnComplete: true,
          }
        )
      );
    }

    await Promise.all(jobs);
    this.logger.log(`📋 Cache invalidation queued for housing: ${JSON.stringify(data)}`);
  }
}