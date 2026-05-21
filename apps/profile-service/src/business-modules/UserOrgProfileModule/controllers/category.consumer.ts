/* eslint-disable @typescript-eslint/no-explicit-any */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { CategoryService } from '../services/category.service';
import { CategoryEvents, CategoryEvent } from '@pivota-api/constants';


@Controller()
export class CategoryConsumer {
  private readonly logger = new Logger(CategoryConsumer.name);

  constructor(private readonly categoryService: CategoryService) {}

  @EventPattern(CategoryEvents.CREATED)
  @EventPattern(CategoryEvents.UPDATED)
  async handleCategoryUpsert(@Payload() message: any, @Ctx() context: KafkaContext) {
    try {
      const event: CategoryEvent = typeof message === 'string' ? JSON.parse(message) : message;
      this.logger.log(`Received ${context.getTopic()} event for category ${event.data.id}`);
      
      await this.categoryService.syncCategory(event.data);
    } catch (error) {
      this.logger.error(`Failed to process category event: ${error.message}`);
      // Don't throw - avoid infinite retry loops
    }
  }

  @EventPattern(CategoryEvents.DELETED)
  async handleCategoryDelete(@Payload() message: any) {
    try {
      const event: CategoryEvent = typeof message === 'string' ? JSON.parse(message) : message;
      this.logger.log(`Received delete event for category ${event.data.id}`);
      
      await this.categoryService.deleteCategory(event.data.id);
    } catch (error) {
      this.logger.error(`Failed to process delete event: ${error.message}`);
    }
  }

  // Add handler for bulk sync events from Listings Service worker
  @EventPattern(CategoryEvents.BULK_SYNC)
  async handleBulkSync(@Payload() message: any) {
    try {
      const payload = typeof message === 'string' ? JSON.parse(message) : message;
      this.logger.log(`Received bulk sync event: ${payload.syncId}`);
      
      // Extract categories from the payload
      const categories = payload.categories || [];
      
      if (!categories.length) {
        this.logger.warn('Bulk sync event received with no categories');
        return;
      }
      
      this.logger.log(`Processing bulk sync for ${categories.length} categories`);
      
      // Call the bulk sync method on the category service
      await this.categoryService.bulkSyncCategories(categories);
      
      this.logger.log(`✅ Bulk sync ${payload.syncId} completed successfully`);
      
    } catch (error) {
      this.logger.error(`Failed to process bulk sync event: ${error.message}`);
      // Don't throw - avoid infinite retry loops
    }
  }
}