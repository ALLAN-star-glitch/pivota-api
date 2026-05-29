/* eslint-disable @typescript-eslint/no-explicit-any */
console.log('🔥 CONTRACTORS PRICING WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ContractorsPricingService } from '../business-modules/contractors-module/services/contractors-pricing.service';


@Injectable()
export class ContractorsPricingWorker implements OnModuleInit {
  private readonly logger = new Logger(ContractorsPricingWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    private pricingService: ContractorsPricingService,
  ) {
    console.log('🔥 ContractorsPricingWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 ContractorsPricingWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 ContractorsPricingWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 ContractorsPricingWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Create worker to process pricing cache jobs
      this.queue.createWorker('cache-queue', async (job) => {
        await this.processCacheJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Contractors pricing worker initialized in ${elapsed}ms`);
      console.log(`🔥 ContractorsPricingWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 ContractorsPricingWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize contractors pricing worker: ${error.message}`);
      throw error;
    }
  }

  private async processCacheJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📋 Processing cache job ${id}: ${name}`);
    console.log(`📋 Processing cache job ${id}: ${name}`);
    
    try {
      switch (name) {
        case 'invalidate-pricing-cache':
          this.logger.log(`📋 Invalidating pricing cache: categoryId=${data.categoryId}`);
          console.log(`📋 Invalidating pricing cache: categoryId=${data.categoryId}`);
          // Call pricing service to invalidate cache
          await this.pricingService.invalidatePricingCache(data.categoryId);
          break;
          
        case 'warm-pricing-cache':
          this.logger.log(`📋 Warming pricing cache: categoryId=${data.categoryId}`);
          console.log(`📋 Warming pricing cache: categoryId=${data.categoryId}`);
          // Trigger cache warm-up
          await this.pricingService.getPricingUnitsByCategory(data.categoryId);
          break;
          
        case 'refresh-pricing-metadata':
          this.logger.log(`📋 Refreshing pricing metadata`);
          console.log(`📋 Refreshing pricing metadata`);
          // Refresh metadata cache
          await this.pricingService.getPricingMetadata();
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown cache job type: ${name}`);
          console.log(`⚠️ Unknown cache job type: ${name}`);
      }
      
      this.logger.log(`✅ Cache job ${name} completed`);
      console.log(`✅ Cache job ${name} completed`);
      
    } catch (error) {
      console.error(`❌ Cache job ${name} failed: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`❌ Cache job ${name} failed: ${error.message}`);
      this.logger.error(error.stack);
      throw error; // Re-throw for BullMQ retry
    }
  }
}