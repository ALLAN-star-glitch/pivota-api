
import { Injectable, Logger, } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { BaseResponseDto } from '@pivota-api/dtos';
import { CategoryEvent } from '@pivota-api/constants';
import { CachedCategory } from '../../../../../profile-service/generated/prisma/client';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validate that category IDs exist and are COMPLIMENTARY type
   */
  async validateCategories(categoryIds: string[]): Promise<BaseResponseDto<{ valid: string[]; invalid: string[] }>> {
    if (!categoryIds.length) {
      return BaseResponseDto.ok({ valid: [], invalid: [] }, 'No categories to validate', 'OK');
    }

    const categories = await this.prisma.cachedCategory.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
        type: 'COMPLIMENTARY', // Only COMPLIMENTARY categories for skilled professionals
      },
      select: { id: true, name: true, vertical: true },
    });
    
    const validIds = categories.map(c => c.id);
    const invalidIds = categoryIds.filter(id => !validIds.includes(id));
    
    if (invalidIds.length > 0) {
      return BaseResponseDto.fail(
        `Invalid categories: ${invalidIds.join(', ')}. Only active COMPLIMENTARY categories are allowed.`,
        'INVALID_CATEGORIES',
        { valid: validIds, invalid: invalidIds }
      );
    }
    
    return BaseResponseDto.ok(
      { valid: validIds, invalid: [] },
      'Categories validated successfully',
      'OK'
    );
  }

  /**
   * Get all COMPLIMENTARY categories (for dropdowns, etc.)
   */
  async getComplimentaryCategories(vertical?: string): Promise<BaseResponseDto<CachedCategory[]>> {
    const categories = await this.prisma.cachedCategory.findMany({
      where: {
        type: 'COMPLIMENTARY',
        isActive: true,
        ...(vertical && { vertical }),
      },
      orderBy: { name: 'asc' },
    });
    
    return BaseResponseDto.ok(categories, 'Categories retrieved', 'OK');
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<BaseResponseDto<CachedCategory>> {
    const category = await this.prisma.cachedCategory.findUnique({
      where: { id, isActive: true },
    });
    
    if (!category) {
      return BaseResponseDto.fail('Category not found', 'NOT_FOUND');
    }
    
    return BaseResponseDto.ok(category, 'Category retrieved', 'OK');
  }

  /**
   * Get categories by IDs
   */
  async getCategoriesByIds(ids: string[]): Promise<BaseResponseDto<CachedCategory[]>> {
    const categories = await this.prisma.cachedCategory.findMany({
      where: { id: { in: ids }, isActive: true },
    });
    
    return BaseResponseDto.ok(categories, 'Categories retrieved', 'OK');
  }

  /**
   * Sync a single category from Kafka event
   */
  async syncCategory(data: CategoryEvent['data']): Promise<void> {
    this.logger.log(`Syncing category ${data.id}: ${data.name}`);
    
    try {
      await this.prisma.cachedCategory.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          slug: data.slug,
          vertical: data.vertical,
          type: data.type,
          description: data.description,
          parentId: data.parentId,
          hasSubcategories: data.hasSubcategories,
          hasParent: data.hasParent,
          isActive: data.isActive ?? true,
          version: data.version,
          syncedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
        },
        create: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          vertical: data.vertical,
          type: data.type,
          description: data.description,
          parentId: data.parentId,
          hasSubcategories: data.hasSubcategories,
          hasParent: data.hasParent,
          isActive: data.isActive ?? true,
          version: data.version,
          syncedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      
      this.logger.log(`✅ Synced category ${data.id}`);
    } catch (error) {
      this.logger.error(`Failed to sync category ${data.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    await this.prisma.cachedCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
    
    this.logger.log(`Soft deleted category ${categoryId}`);
  }


/**
 * Bulk sync categories (called by the worker when processing bulk-sync-categories job)
 * This method processes categories in batches and should handle large datasets efficiently
 */
async bulkSyncCategories(categories: CategoryEvent['data'][]): Promise<{ syncedCount: number; failedCount: number }> {
  const startTime = Date.now();
  this.logger.log(`Bulk syncing ${categories.length} categories`);
  
  if (!categories.length) {
    this.logger.log('No categories to sync');
    return { syncedCount: 0, failedCount: 0 };
  }

  // Process in batches to avoid transaction timeouts and memory issues
  const BATCH_SIZE = 100;
  let syncedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = categories.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(categories.length / BATCH_SIZE);
    
    this.logger.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} categories)`);
    
    // Process each category in the batch
    for (const category of batch) {
      try {
        await this.prisma.cachedCategory.upsert({
          where: { id: category.id },
          update: {
            name: category.name,
            slug: category.slug,
            vertical: category.vertical,
            type: category.type,
            description: category.description,
            parentId: category.parentId,
            hasSubcategories: category.hasSubcategories,
            hasParent: category.hasParent,
            isActive: category.isActive ?? true,
            version: category.version,
            syncedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          create: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            vertical: category.vertical,
            type: category.type,
            description: category.description,
            parentId: category.parentId,
            hasSubcategories: category.hasSubcategories,
            hasParent: category.hasParent,
            isActive: category.isActive ?? true,
            version: category.version,
            syncedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        syncedCount++;
        
        // Log progress every 50 categories
        if (syncedCount % 50 === 0) {
          this.logger.log(`Progress: ${syncedCount}/${categories.length} categories synced`);
        }
        
      } catch (error) {
        failedCount++;
        this.logger.warn(`Failed to sync category ${category.id} (${category.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Small delay between batches to prevent overwhelming the database
    if (i + BATCH_SIZE < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const duration = Date.now() - startTime;
  this.logger.log(`✅ Bulk sync completed in ${duration}ms: ${syncedCount} synced, ${failedCount} failed out of ${categories.length} total`);
  
  if (failedCount > 0) {
    this.logger.warn(`⚠️ Bulk sync completed with ${failedCount} failures`);
  }
  
  return { syncedCount, failedCount };
}
}