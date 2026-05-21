console.log('🔥 CATEGORIES WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { CategoriesService } from '../business-modules/categories/categories.service';

@Injectable()
export class CategoriesWorker implements OnModuleInit {
  private readonly logger = new Logger(CategoriesWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    private categoriesService: CategoriesService,
  ) {
    console.log('🔥 CategoriesWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 CategoriesWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 CategoriesWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 CategoriesWorker.initialize() STARTED');
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
    
    try {
      switch (name) {
        case 'bulk-sync-categories':
          this.logger.log(`📋 Bulk syncing categories: syncId=${data.syncId}, categoryIds=${data.categoryIds?.length}`);
          await this.categoriesService.processBulkSync(data.syncId, data.categoryIds);
          break;
          
        case 'sync-category':
          this.logger.log(`📋 Syncing category: ${data.categoryId}`);
          // Add individual category sync if needed
          // await this.categoriesService.syncCategory(data.categoryId);
          break;
          
        case 'update-category-tree':
          this.logger.log(`📋 Updating category tree`);
          // Add category tree update if needed
          // await this.categoriesService.updateCategoryTree();
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown categories job type: ${name}`);
          console.log(`⚠️ Unknown categories job type: ${name}`);
      }
      
      this.logger.log(`✅ Categories job ${name} completed`);
      console.log(`✅ Categories job ${name} completed`);
      
    } catch (error) {
      console.error(`❌ Categories job ${name} failed: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`❌ Categories job ${name} failed: ${error.message}`);
      this.logger.error(error.stack);
      throw error; // Re-throw for BullMQ retry
    }
  }
}