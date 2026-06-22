/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheKeys, QueueService } from '@pivota-api/shared-redis';
import { RedisService } from '@pivota-api/shared-redis';
import { ContractorsService } from '../business-modules/contractors-module/services/contractors.service';
import {
  GetAllOfferingsRequestDto,
  GetOfferingByVerticalRequestDto,
  GetOfferingsByCategoryRequestDto,
} from '@pivota-api/dtos';

// Define query types with proper typing
type PopularQuery = {
  vertical?: string;
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'rating';
  limit?: number;
  verifiedOnly?: boolean;
  page?: number;
};

@Injectable()
export class ContractorsListingsCacheWorker implements OnModuleInit {
  private readonly logger = new Logger(ContractorsListingsCacheWorker.name);
  private initialized = false;
  
  // Cache TTLs
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutes - public listings
    SINGLE: 600,   // 10 minutes - individual offerings
    POPULAR: 60,   // 1 minute - popular/hot listings
  };

  constructor(
    private queue: QueueService,
    private redis: RedisService,
    private contractorsService: ContractorsService,
  ) {
    this.logger.log('🔥 ContractorsListingsCacheWorker constructor called');
  }

  async onModuleInit() {
    this.logger.log('🔥 ContractorsListingsCacheWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      this.logger.log('ContractorsListingsCacheWorker already initialized');
      return;
    }

    this.logger.log('🔥 ContractorsListingsCacheWorker.initialize() STARTED');
    const startTime = Date.now();

    try {
      // Create worker for cache operations
      this.queue.createWorker('cache-service-offering-queue', async (job) => {
        await this.processCacheJob(job);
      });

      this.initialized = true;

      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Listings cache worker initialized in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize listings cache worker: ${error.message}`);
      throw error;
    }
  }

  private async processCacheJob(job: any): Promise<void> {
    const { name, data, id } = job;

    this.logger.log(`📋 Processing cache job ${id}: ${name}`);
    console.log(`📋 Processing cache job ${id}: ${name}`);

    try {
      switch (name) {
        case 'cache-service-listings':
          await this.cacheListings(data);
          break;

        case 'cache-single-service':
          await this.cacheSingleOffering(data);
          break;

        case 'invalidate-service-listings':
          await this.invalidateListings(data);
          break;

        case 'invalidate-single-service':
          await this.invalidateSingleOffering(data);
          break;

        case 'warm-service-listings':
          await this.warmListings(data);
          break;

        case 'refresh-popular-listings':
          await this.refreshPopularListings(data);
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
   * Cache service listings with intelligent TTL
   */
  private async cacheListings(data: {
    params: any;
    result: any;
    pagination: any;
    ttl?: number;
  }): Promise<void> {
    const { params, result, pagination, ttl } = data;
    
    // Generate cache key using the same logic as the service
    const cacheKey = CacheKeys.getListingKey({
      vertical: params.vertical,
      categoryId: params.categoryId,
      city: params.city,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sortBy: params.sortBy,
      minRating: params.minRating,
      verifiedOnly: params.verifiedOnly,
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
    
    this.logger.log(`✅ Cached listings: ${cacheKey} (${result.length} items, TTL: ${ttl || this.CACHE_TTL.LISTINGS}s)`);
    console.log(`✅ Cached listings: ${cacheKey} (${result.length} items)`);

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
   * Cache a single service offering
   */
  private async cacheSingleOffering(data: {
    offeringId: string;
    result: any;
    ttl?: number;
  }): Promise<void> {
    const { offeringId, result, ttl } = data;
    const cacheKey = CacheKeys.getSingleKey(offeringId);

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
    
    this.logger.log(`✅ Cached single offering: ${cacheKey}`);
    console.log(`✅ Cached single offering: ${cacheKey}`);
  }

  /**
   * Invalidate all listings (when any offering changes)
   */
  private async invalidateListings(data: {
    vertical?: string;
    categoryId?: string;
    accountId?: string;
    professionalId?: string;
  }): Promise<void> {
    let pattern: string;

    if (data.categoryId) {
      // Invalidate by category
      pattern = CacheKeys.getCategoryPattern(data.categoryId);
    } else if (data.vertical) {
      // Invalidate by vertical
      pattern = CacheKeys.getVerticalPattern(data.vertical);
    } else {
      // Invalidate ALL listings (use with caution!)
      pattern = CacheKeys.getListingsPattern();
    }

    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.deleteMany(keys);
      this.logger.log(`✅ Invalidated ${keys.length} cache keys: ${pattern}`);
      console.log(`✅ Invalidated ${keys.length} cache keys: ${pattern}`);
    } else {
      this.logger.log(`ℹ️ No cache keys found for pattern: ${pattern}`);
    }

    // Also invalidate single offerings if professional changed
    if (data.professionalId) {
      await this.invalidateProfessionalOfferings(data.professionalId);
    }
  }

  /**
   * Invalidate a single offering
   */
  private async invalidateSingleOffering(data: {
    offeringId: string;
  }): Promise<void> {
    const cacheKey = CacheKeys.getSingleKey(data.offeringId);
    await this.redis.delete(cacheKey);
    
    this.logger.log(`✅ Invalidated single offering: ${cacheKey}`);
    console.log(`✅ Invalidated single offering: ${cacheKey}`);

    // Also invalidate all listings since this offering might appear there
    await this.invalidateListings({});
  }

  /**
   * Invalidate all offerings for a professional
   */
  private async invalidateProfessionalOfferings(professionalId: string): Promise<void> {
    // Since we don't have a pattern for professional in cache keys,
    // we need to find all keys and filter
    const allKeys = await this.redis.keys(CacheKeys.getListingsPattern());
    
    // In a real implementation, you'd want to store mapping of 
    // professional -> cache keys or use Redis Sets
    // For now, invalidate all listings
    if (allKeys.length > 0) {
      await this.redis.deleteMany(allKeys);
      this.logger.log(`✅ Invalidated all listings for professional ${professionalId}`);
    }
  }

  /**
   * Warm cache for popular queries
   */
  private async warmListings(data: {
    verticals?: string[];
    categories?: string[];
  }): Promise<void> {
    this.logger.log(`🔥 Warming listings cache...`);
    console.log(`🔥 Warming listings cache...`);
 
    // Define popular queries with proper typing
    const popularQueries: PopularQuery[] = [
      // Most common queries
      { vertical: 'PLUMBING', sortBy: 'recent', limit: 20 },
      { vertical: 'ELECTRICAL', sortBy: 'recent', limit: 20 },
      { vertical: 'CLEANING', sortBy: 'recent', limit: 20 },
      { vertical: 'CARPENTRY', sortBy: 'rating', limit: 20 },
      { vertical: 'PAINTING', sortBy: 'price_asc', limit: 20 },
      
      // Category-specific
      { categoryId: 'cat_plumbing_repair', sortBy: 'recent' },
      { categoryId: 'cat_electrical_installation', sortBy: 'rating' },
      
      // City-specific
      { city: 'nairobi', sortBy: 'recent' },
      { city: 'mombasa', sortBy: 'recent' },
      
      // Filtered queries
      { verifiedOnly: true, sortBy: 'rating' },
      { minPrice: 1000, maxPrice: 5000, sortBy: 'price_asc' },
    ];

    let warmedCount = 0;

    for (const query of popularQueries) {
      try {
        // Check if already cached
        const cacheKey = CacheKeys.getListingKey({
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
        if (query.vertical) {
          // Use getOfferingsByVertical for vertical queries
          const dto: GetOfferingByVerticalRequestDto = {
            vertical: query.vertical,
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            sortBy: query.sortBy,
            isVerified: query.verifiedOnly,
            // We'll let the service handle cache control
            bypassCache: false,
            skipCache: true, // Skip reading cache, write to cache
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.contractorsService.getOfferingsByVertical(dto);
        } else if (query.categoryId) {
          // Use getOfferingsByCategory for category queries
          const dto: GetOfferingsByCategoryRequestDto = {
            categoryId: query.categoryId,
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            bypassCache: false,
            skipCache: true, // Skip reading cache, write to cache
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.contractorsService.getOfferingsByCategory(dto);
        } else {
          // Use getAllOfferings for general queries
          const dto: GetAllOfferingsRequestDto = {
            limit: query.limit || 20,
            offset: 0,
            city: query.city,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            sortBy: query.sortBy,
            verifiedOnly: query.verifiedOnly,
            bypassCache: false,
            skipCache: true, // Skip reading cache, write to cache
            refreshCache: false,
            cacheTTL: this.CACHE_TTL.LISTINGS,
            readOnly: false,
          };
          
          result = await this.contractorsService.getAllOfferings(dto);
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
   * Refresh popular listings periodically
   */
  private async refreshPopularListings(data: {
    vertical?: string;
  }): Promise<void> {
    this.logger.log(`🔄 Refreshing popular listings...`);
    
    try {
      // Use getOfferingsByVertical for vertical-specific refresh
      const dto: GetOfferingByVerticalRequestDto = {
        vertical: data.vertical || 'PLUMBING',
        limit: 20,
        offset: 0,
        sortBy: 'recent',
        bypassCache: false,
        skipCache: true, // Skip reading cache, write to cache
        refreshCache: true, // Force refresh even if exists
        cacheTTL: this.CACHE_TTL.LISTINGS,
        readOnly: false,
      };

      const result = await this.contractorsService.getOfferingsByVertical(dto);
      
      if (result.success && result.data) {
        this.logger.log(`✅ Refreshed popular listings for ${data.vertical || 'PLUMBING'}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to refresh popular listings: ${error.message}`);
    }
  }
}