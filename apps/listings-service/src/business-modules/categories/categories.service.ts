/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";

import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import {
  BaseResponseDto,
  CategoryIdParamDto,
  CategoryResponseDto,
  CreateCategoryRequestDto,
  DiscoveryCategoryResponseDto,
  DiscoveryParamsDto,
  GetCategoriesRequestDto,
  GetCategoryByNameQueryDto,
  GetCategoryBySlugParamsDto,
  UpdateCategoryRequestDto,
} from '@pivota-api/dtos';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  Category, 
  JobPost, 
  ServiceOffering, 
  SupportProgram 
} from '../../../generated/prisma/client';
import { CategoryEvents, CategoryEvent } from '@pivota-api/constants';
import { QueueService } from '@pivota-api/shared-redis';

type FullCategory = Category & {
  subcategories: Category[];
  jobPosts: JobPost[];
  subCategoryPosts: JobPost[];
  serviceOfferings?: ServiceOffering[];
  supportPrograms?: SupportProgram[];
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  // Standard include block for consistent recursive fetching
  private readonly standardInclude = {
    subcategories: true,
    jobPosts: true,
    subCategoryPosts: true,
    serviceOfferings: true,
    supportPrograms: true,
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CATEGORIES_CLIENT') private readonly kafkaClient: ClientKafka,
    private queue: QueueService,
  ) {}

  /**
   * SINGLE SOURCE OF TRUTH: Emit category event to Kafka for Profile Service to consume
   * This method handles ALL Kafka emissions for categories
   */
  private async emitCategoryEvent(eventType: string, category: any): Promise<void> {
    const event: CategoryEvent = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      source: 'listings-service',
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        vertical: category.vertical,
        type: category.type,
        description: category.description ?? undefined,
        parentId: category.parentId ?? undefined,
        hasSubcategories: category.hasSubcategories,
        hasParent: category.hasParent,
        version: (category.version || 0) + 1,
        isActive: eventType !== CategoryEvents.DELETED,
      },
    };
    
    this.logger.log(`📤 Emitting ${eventType} event for category ${category.id}: ${category.name}`);
    
    try {
      await this.kafkaClient.emit(eventType, { key: category.id, value: JSON.stringify(event) });
      this.logger.debug(`✅ Successfully emitted ${eventType} for category ${category.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to emit ${eventType} for category ${category.id}: ${error.message}`);
      // Don't throw - we don't want to fail the operation if event emission fails
    }
  }

  /**
   * Queue a bulk sync job for async processing
   */
  private async queueBulkSync(syncId: string, categoryIds?: string[]): Promise<void> {
    await this.queue.addJob(
      'categories-queue',
      'bulk-sync-categories',
      {
        syncId,
        categoryIds,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    
    this.logger.log(`✅ Bulk sync queued with ID: ${syncId}`);
  }

  /**
   * Process bulk sync (called by worker)
   * Reuses emitCategoryEvent for each category
   */
  async processBulkSync(syncId: string, categoryIds?: string[]): Promise<{ syncedCount: number; failedCount: number }> {
    this.logger.log(`Processing bulk sync: ${syncId}`);
    
    try {
      // Fetch categories to sync
      const where: any = { type: 'COMPLIMENTARY' };
      if (categoryIds?.length) {
        where.id = { in: categoryIds };
      }
      
      const categories = await this.prisma.category.findMany({
        where,
        orderBy: { createdAt: 'asc' }
      });
      
      this.logger.log(`Found ${categories.length} categories to sync for ${syncId}`);
      
      let syncedCount = 0;
      let failedCount = 0;
      
      // Process in batches to avoid overwhelming Kafka
      const batchSize = 50;
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (category) => {
          try {
            // REUSE the existing emitCategoryEvent method
            await this.emitCategoryEvent(CategoryEvents.CREATED, category);
            syncedCount++;
            
            if (syncedCount % 50 === 0) {
              this.logger.log(`Progress ${syncId}: ${syncedCount}/${categories.length} categories synced`);
            }
          } catch (error) {
            failedCount++;
            this.logger.error(`Failed to sync category ${category.id}: ${error.message}`);
          }
        }));
        
        // Small delay between batches to prevent Kafka overload
        if (i + batchSize < categories.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      this.logger.log(`✅ Bulk sync ${syncId} completed: ${syncedCount} synced, ${failedCount} failed`);
      
      return { syncedCount, failedCount };
      
    } catch (error) {
      this.logger.error(`Bulk sync ${syncId} failed: ${error.message}`);
      throw error;
    }
  }

  /** -------------------------------
   * Recursive mapper for category responses
   * ------------------------------- */
  private mapCategory(
    cat: FullCategory, 
    includeSubcategories = false
  ): CategoryResponseDto {
    const jobPostsCount = (cat.jobPosts?.length ?? 0) + (cat.subCategoryPosts?.length ?? 0);
    const servicesCount = cat.serviceOfferings?.length ?? 0;
    const supportCount = cat.supportPrograms?.length ?? 0;
    const subcategoriesCount = cat.subcategories?.length ?? 0;

    return {
      id: cat.id,
      name: cat.name,
      vertical: cat.vertical,
      type: cat.type as 'MAIN' | 'COMPLIMENTARY',
      slug: cat.slug,
      description: cat.description ?? null,
      parentId: cat.parentId ?? null,
      jobPostsCount,
      servicesCount,
      supportCount,
      subcategoriesCount,
      hasSubcategories: subcategoriesCount > 0,
      hasParent: !!cat.parentId,
      subcategories: includeSubcategories 
        ? (cat.subcategories ?? []).map((child) =>
            this.mapCategory(child as FullCategory, false)
          )
        : [],
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
  }

  /** -------------------------------
   * CREATE CATEGORY
   * ------------------------------- */
  async createCategory(dto: CreateCategoryRequestDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`Creating category: ${dto.name} for vertical: ${dto.vertical} (${dto.type || 'MAIN'})`);

    try {
      let hasParent = false;
      if (dto.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent) {
          return {
            success: false,
            message: 'Parent category not found',
            code: 'PARENT_NOT_FOUND',
            data: null,
            error: { message: 'Provided parentId does not exist.', details: null },
          };
        }
        hasParent = true;
      }

      const slug = dto.slug || dto.name.toLowerCase().replace(/ /g, '-');

      const existing = await this.prisma.category.findUnique({
        where: { 
          vertical_slug: { vertical: dto.vertical, slug } 
        },
      });
      
      if (existing) {
        return {
          success: false,
          message: 'Category already exists in this vertical',
          code: 'DUPLICATE_CATEGORY',
          data: null,
          error: { message: 'Duplicate slug detected for this vertical.', details: null },
        };
      }

      const created = await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          vertical: dto.vertical,
          type: dto.type || 'MAIN',
          parentId: dto.parentId || null,
          hasParent,
          hasSubcategories: false,
          version: 1,
        },
        include: this.standardInclude,
      });

      if (dto.parentId) {
        await this.prisma.category.update({
          where: { id: dto.parentId },
          data: { hasSubcategories: true },
        });
      }

      await this.emitCategoryEvent(CategoryEvents.CREATED, created);

      return {
        success: true,
        message: 'Category created successfully',
        code: 'CREATED',
        data: this.mapCategory(created as FullCategory, false),
        error: null,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Create category failed: ${err.message}`);
      return {
        success: false,
        message: 'Failed to create category',
        code: 'CATEGORY_CREATION_FAILED',
        data: null,
        error: { message: err.message, details: null },
      };
    }
  }

  /** -------------------------------
   * GET CATEGORY BY SLUG
   * ------------------------------- */
  async getCategoryBySlug(dto: GetCategoryBySlugParamsDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    try {
      const cat = await this.prisma.category.findUnique({
        where: { vertical_slug: { vertical: dto.vertical, slug: dto.slug } },
        include: this.standardInclude,
      });

      if (!cat) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: null,
        };
      }

      return {
        success: true,
        message: 'Category fetched successfully',
        code: 'FETCHED',
        data: this.mapCategory(cat as FullCategory, true),
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch category by slug',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * GET DISCOVERY METADATA
   * ------------------------------- */
  async getDiscoveryMetadata(dto: DiscoveryParamsDto): Promise<BaseResponseDto<DiscoveryCategoryResponseDto[]>> {
    try {
      const where: any = { 
        parentId: null,
      };
      
      if (dto.vertical) {
        where.vertical = dto.vertical;
      }
      
      if (dto.type) {
        where.type = dto.type;
      }
      
      const categories = await this.prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          vertical: true,
          type: true,
          hasSubcategories: true,
        },
        orderBy: { name: 'asc' }
      });

      return {
        success: true,
        message: 'Discovery metadata fetched successfully',
        code: 'FETCHED',
        data: categories,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch discovery metadata',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * UPDATE CATEGORY
   * ------------------------------- */
  async updateCategory(dto: UpdateCategoryRequestDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    try {
      const existing = await this.prisma.category.findUnique({ where: { id: dto.id } });
      if (!existing) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: null,
        };
      }

      this.logger.log(`Updating category: ${existing.name} (${existing.type})`);

      const updated = await this.prisma.category.update({
        where: { id: dto.id },
        data: {
          name: dto.name,
          description: dto.description,
          vertical: dto.vertical,
          type: dto.type,
          slug: dto.name && !dto.slug ? dto.name.toLowerCase().replace(/ /g, '-') : dto.slug,
          parentId: dto.parentId,
          hasParent: !!dto.parentId,
          version: (existing.version || 0) + 1,
        },
        include: this.standardInclude,
      });

      if (dto.parentId) {
        await this.prisma.category.update({
          where: { id: dto.parentId },
          data: { hasSubcategories: true },
        });
      }

      await this.emitCategoryEvent(CategoryEvents.UPDATED, updated);

      return {
        success: true,
        message: 'Category updated successfully',
        code: 'UPDATED',
        data: this.mapCategory(updated as FullCategory, true),
        error: null,
      };
    } catch (error) {
      this.logger.error(`Update category failed: ${(error as Error).message}`);
      return {
        success: false,
        message: 'Failed to update category',
        code: 'UPDATE_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * GET CATEGORIES WITH FLEXIBLE FILTERING
   * ------------------------------- */
  async getCategoriesWithStats(dto: GetCategoriesRequestDto): Promise<BaseResponseDto<CategoryResponseDto[]>> {
    try {
      const where: any = {};
      
      if (dto.vertical) {
        where.vertical = dto.vertical;
      }
      
      if (dto.type) {
        where.type = dto.type;
      }
      
      if (dto.parentId === 'null' || dto.parentId === null) {
        where.parentId = null;
      } else if (dto.parentId) {
        where.parentId = dto.parentId;
      }
      
      if (dto.hasSubcategories !== undefined && dto.hasSubcategories !== null) {
        where.hasSubcategories = dto.hasSubcategories;
      }
      
      if (dto.hasParent !== undefined && dto.hasParent !== null) {
        where.hasParent = dto.hasParent;
      }
      
      if (dto.search && dto.search.trim()) {
        where.name = {
          contains: dto.search.trim(),
          mode: 'insensitive'
        };
      }
      
      const includeConfig = dto.includeNested 
        ? {
            ...this.standardInclude,
            subcategories: {
              include: {
                subcategories: {
                  include: {
                    subcategories: true
                  }
                }
              }
            }
          }
        : this.standardInclude;
      
      const categories = await this.prisma.category.findMany({
        where,
        include: includeConfig,
        orderBy: [
          { vertical: 'asc' },
          { name: 'asc' }
        ]
      });

      this.logger.debug(`Fetched ${categories.length} categories`);

      return {
        success: true,
        message: 'Categories fetched successfully',
        code: 'FETCHED',
        data: categories.map((cat) => this.mapCategory(cat as FullCategory, dto.includeNested ?? false)),
        error: null,
      };
      
    } catch (error) {
      this.logger.error('Fetch categories failed', (error as Error).stack);
      return {
        success: false,
        message: 'Failed to fetch categories',
        code: 'FETCH_FAILED',
        data: null,
        error: { 
          message: (error as Error).message, 
          details: process.env.NODE_ENV === 'development' ? (error as Error).stack : null 
        },
      };
    }
  }

  /** -------------------------------
   * GET CATEGORY BY ID
   * ------------------------------- */
  async getCategoryById(id: string): Promise<BaseResponseDto<CategoryResponseDto>> {
    try {
      const cat = await this.prisma.category.findUnique({
        where: { id },
        include: this.standardInclude,
      });

      if (!cat) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: null,
        };
      }

      return {
        success: true,
        message: 'Category fetched successfully',
        code: 'FETCHED',
        data: this.mapCategory(cat as FullCategory, true),
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch category',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * DELETE CATEGORY
   * ------------------------------- */
  async deleteCategory(dto: CategoryIdParamDto): Promise<BaseResponseDto<null>> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.id },
        include: this.standardInclude,
      });

      if (!category) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: null,
        };
      }

      const totalUsage = 
        category.jobPosts.length + 
        category.subCategoryPosts.length + 
        (category.serviceOfferings?.length ?? 0) + 
        (category.supportPrograms?.length ?? 0);

      if (category.subcategories.length > 0) {
        return {
          success: false,
          message: 'Cannot delete category with subcategories',
          code: 'HAS_CHILDREN',
          data: null,
          error: null,
        };
      }

      if (totalUsage > 0) {
        return {
          success: false,
          message: 'Category is in use',
          code: 'CATEGORY_IN_USE',
          data: null,
          error: null,
        };
      }

      await this.prisma.category.delete({ where: { id: dto.id } });

      await this.emitCategoryEvent(CategoryEvents.DELETED, { id: dto.id, name: category.name });

      return {
        success: true,
        message: 'Category deleted successfully',
        code: 'DELETED',
        data: null,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete category',
        code: 'DELETE_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * GET CATEGORY BY NAME
   * ------------------------------- */
  async getCategoryByName(dto: GetCategoryByNameQueryDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    try {
      const cat = await this.prisma.category.findFirst({
        where: { 
          name: { equals: dto.name, mode: 'insensitive' },
          ...(dto.vertical && { vertical: dto.vertical }),
          ...(dto.type && { type: dto.type })
        },
        include: this.standardInclude,
      });

      if (!cat) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: null,
        };
      }

      return {
        success: true,
        message: 'Category fetched successfully',
        code: 'FETCHED',
        data: this.mapCategory(cat as FullCategory, true),
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch category',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: (error as Error).message, details: null },
      };
    }
  }

  /** -------------------------------
   * BULK SYNC CATEGORIES (Public API)
   * ------------------------------- */
  async bulkSyncCategories(): Promise<BaseResponseDto<{ syncedCount: number }>> {
    const syncId = randomUUID();
    this.logger.log(`Starting bulk sync: ${syncId}`);
    
    try {
      // Count categories first for the response
      const count = await this.prisma.category.count({
        where: { type: 'COMPLIMENTARY' }
      });
      
      // Queue the bulk sync job for async processing
      await this.queueBulkSync(syncId);
      
      this.logger.log(`✅ Bulk sync queued: ${syncId} with ${count} categories`);
      
      return BaseResponseDto.ok(
        { syncedCount: count },
        `Bulk sync queued successfully. Processing ${count} categories asynchronously. Sync ID: ${syncId}`,
        'ACCEPTED'
      );
    } catch (error) {
      this.logger.error(`Failed to queue bulk sync: ${error.message}`);
      return BaseResponseDto.fail(
        `Failed to queue bulk sync: ${error.message}`,
        'BULK_SYNC_FAILED'
      );
    }
  }
}