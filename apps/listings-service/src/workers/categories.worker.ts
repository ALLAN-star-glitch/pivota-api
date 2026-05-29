console.log('🔥 CATEGORIES WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService, RedisService } from '@pivota-api/shared-redis';
import { CategoriesService } from '../business-modules/categories/categories.service';

@Injectable()
export class CategoriesWorker implements OnModuleInit {
  private readonly logger = new Logger(CategoriesWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    private categoriesService: CategoriesService,
    private redisService: RedisService,
  ) {
    console.log('🔥 CategoriesWorker CONSTRUCTOR called');
    this.logger.log('CategoriesWorker constructor called');
  }

  async onModuleInit() {
    console.log('🔥 CategoriesWorker.onModuleInit() STARTED');
    this.logger.log('CategoriesWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 CategoriesWorker already initialized, skipping');
      this.logger.log('CategoriesWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 CategoriesWorker.initialize() STARTED');
    this.logger.log('CategoriesWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Create worker to process category jobs
      this.queue.createWorker('categories-queue', async (job) => {
        await this.processCategoriesJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Categories worker initialized in ${elapsed}ms`);
      console.log(`🔥 CategoriesWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 CategoriesWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize categories worker: ${error.message}`);
      throw error;
    }
  }

  private async processCategoriesJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📋 Processing categories job ${id}: ${name}`);
    console.log(`📋 Processing categories job ${id}: ${name}`);
    const startTime = Date.now();
    
    try {
      switch (name) {
        case 'bulk-sync-categories':
          { this.logger.log(`📋 Bulk syncing categories: syncId=${data.syncId}, categoryIds=${data.categoryIds?.length || 'all'}`);
          console.log(`📋 Bulk syncing categories: syncId=${data.syncId}, categoryIds=${data.categoryIds?.length || 'all'}`);
          
          const result = await this.categoriesService.processBulkSync(data.syncId, data.categoryIds);
          
          const elapsed = Date.now() - startTime;
          this.logger.log(`✅ Bulk sync ${data.syncId} completed: ${result.syncedCount} synced, ${result.failedCount} failed in ${elapsed}ms`);
          console.log(`✅ Bulk sync ${data.syncId} completed: ${result.syncedCount} synced, ${result.failedCount} failed in ${elapsed}ms`);
          break; }
          
        case 'sync-category':
          this.logger.log(`📋 Syncing category: ${data.categoryId}`);
          console.log(`📋 Syncing category: ${data.categoryId}`);
          await this.categoriesService.getCategoryById(data.categoryId);
          break;
          
        case 'update-category-tree':
          this.logger.log(`📋 Updating category tree`);
          console.log(`📋 Updating category tree`);
          // Invalidate all category caches when tree changes
          await this.categoriesService.invalidateCategoriesCache();
          break;
          
        case 'warm-category-cache':
          this.logger.log(`📋 Warming category cache: ${data.categoryId || 'all'}`);
          console.log(`📋 Warming category cache: ${data.categoryId || 'all'}`);
          
          if (data.categoryId) {
            await this.categoriesService.getCategoryById(data.categoryId);
          } else {
            // Warm up popular categories
            await this.warmUpPopularCategories();
          }
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown categories job type: ${name}`);
          console.log(`⚠️ Unknown categories job type: ${name}`);
      }
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Categories job ${name} completed in ${elapsed}ms`);
      console.log(`✅ Categories job ${name} completed in ${elapsed}ms`);
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Categories job ${name} failed after ${elapsed}ms: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`❌ Categories job ${name} failed after ${elapsed}ms: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Warm up cache for popular categories
   */
  private async warmUpPopularCategories(): Promise<void> {
    this.logger.log('🔥 Warming up popular categories cache...');
    const startTime = Date.now();
    
    try {
      // Get categories that are most frequently used
      const popularCategories = await this.categoriesService['prisma'].category.findMany({
        where: { type: 'COMPLIMENTARY' },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
      
      for (const category of popularCategories) {
        await this.categoriesService.getCategoryById(category.id);
      }
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Warmed up ${popularCategories.length} categories in ${elapsed}ms`);
      console.log(`✅ Warmed up ${popularCategories.length} categories in ${elapsed}ms`);
    } catch (error) {
      this.logger.error(`Failed to warm up categories: ${error.message}`);
      console.error(`Failed to warm up categories: ${error.message}`);
    }
  }
}