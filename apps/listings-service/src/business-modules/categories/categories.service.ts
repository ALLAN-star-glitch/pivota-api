"use strict";

import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly prisma: PrismaService) {}

  /** -------------------------------
   * Recursive mapper for category responses
   * ------------------------------- */
  private mapCategory(
    cat: FullCategory, 
    includeSubcategories = false  // Default to false for performance
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
      // Only include subcategories if explicitly requested
      subcategories: includeSubcategories 
        ? (cat.subcategories ?? []).map((child) =>
            this.mapCategory(child as FullCategory, false) // Don't nest further to avoid deep recursion
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

      // Prevent duplicates within the SAME vertical using slug uniqueness
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
        },
        include: this.standardInclude,
      });

      if (dto.parentId) {
        await this.prisma.category.update({
          where: { id: dto.parentId },
          data: { hasSubcategories: true },
        });
      }

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
   * GET CATEGORY BY SLUG (Critical for Validation)
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
        data: this.mapCategory(cat as FullCategory, true), // Include subcategories for single category view
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
   * GET DISCOVERY METADATA (Lightweight list)
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

      // Log what's being updated
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
        },
        include: this.standardInclude,
      });

      if (dto.parentId) {
        await this.prisma.category.update({
          where: { id: dto.parentId },
          data: { hasSubcategories: true },
        });
      }

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
      // Build the where clause dynamically
      const where: any = {};
      
      // Filter by vertical (HOUSING, JOBS, SOCIAL_SUPPORT)
      if (dto.vertical) {
        where.vertical = dto.vertical;
      }
      
      // Filter by type (MAIN, COMPLIMENTARY)
      if (dto.type) {
        where.type = dto.type;
      }
      
      // Handle parentId filtering properly
      // Check for string 'null' (from query params), null, or undefined
      if (dto.parentId === 'null' || dto.parentId === null) {
        // Explicitly fetch ONLY top-level categories
        where.parentId = null;
      } else if (dto.parentId) {
        // Fetch subcategories of a specific parent
        where.parentId = dto.parentId;
      }
      // If no parentId specified, don't add parentId filter - fetch ALL categories
      
      // Filter by hasSubcategories
      if (dto.hasSubcategories !== undefined && dto.hasSubcategories !== null) {
        where.hasSubcategories = dto.hasSubcategories;
      }
      
      // Filter by hasParent
      if (dto.hasParent !== undefined && dto.hasParent !== null) {
        where.hasParent = dto.hasParent;
      }
      
      // Search by name (partial match, case-insensitive)
      if (dto.search && dto.search.trim()) {
        where.name = {
          contains: dto.search.trim(),
          mode: 'insensitive'
        };
      }
      
      // Determine if we need to include nested subcategories
      // Only use deep nesting if explicitly requested (performance optimization)
      const includeConfig = dto.includeNested 
        ? {
            ...this.standardInclude,
            subcategories: {
              include: {
                subcategories: {
                  include: {
                    subcategories: true // Limit to 3 levels to prevent infinite recursion
                  }
                }
              }
            }
          }
        : this.standardInclude;
      
      // Execute query with ordering
      const categories = await this.prisma.category.findMany({
        where,
        include: includeConfig,
        orderBy: [
          { vertical: 'asc' },
          { name: 'asc' }
        ]
      });

      // Log the query results for debugging
      this.logger.debug(`Fetched ${categories.length} categories - Filters: ${JSON.stringify({
        vertical: dto.vertical || 'ALL',
        type: dto.type || 'ALL',
        parentId: dto.parentId || 'ALL (including children)',
        hasSubcategories: dto.hasSubcategories ?? 'NOT_SET',
        hasParent: dto.hasParent ?? 'NOT_SET',
        search: dto.search || 'NONE',
        includeNested: dto.includeNested || false
      })}`);

      // Map and return results - pass includeNested flag to control subcategory inclusion
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
        data: this.mapCategory(cat as FullCategory, true), // Include subcategories for single category view
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
        data: this.mapCategory(cat as FullCategory, true), // Include subcategories for single category view
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
}