"use strict";

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  CreateCategoryRequestDto,
  CreateCategoryResponseDto,
} from '@pivota-api/dtos';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  JobCategory,
  JobPost
} from '../../../../generated/prisma/client';


type FullCategory = JobCategory & {
  subcategories: JobCategory[];
  jobPosts: JobPost[];
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** -----------------------------------------------
   *  SHARED CLEAN HELPER
   *  One recursive mapper for ALL responses
   * ----------------------------------------------- */
  private mapCategory(cat: FullCategory): CreateCategoryResponseDto {
    const jobPosts = cat.jobPosts || [];
    const subcategories = cat.subcategories || [];

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description ?? null,
      parentId: cat.parentId ?? null,

     
      jobPostsCount: jobPosts.length,
      subcategoriesCount: subcategories.length,

      hasSubcategories: subcategories.length > 0,
      hasParent: !!cat.parentId,

      subcategories: subcategories.map((child) =>
        this.mapCategory(child as FullCategory),
      ),

      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
}


  /** ---------------------------------------------------------------
   *  CREATE CATEGORY
   * --------------------------------------------------------------- */
  async createJobCategory(
    dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.log(`Creating job category: ${dto.name}`);

    try {
      let hasParent = false;

      if (dto.parentId) {
        const parent = await this.prisma.jobCategory.findUnique({
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

      // Prevent duplicate category
      const existing = await this.prisma.jobCategory.findFirst({
        where: {
          name: dto.name,
          parentId: dto.parentId || null,
        },
      });

      if (existing) {
        return {
          success: false,
          message: 'Category already exists under same parent',
          code: 'DUPLICATE_CATEGORY',
          data: null,
          error: { message: 'Duplicate category detected.', details: null },
        };
      }

      const created = await this.prisma.jobCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          parentId: dto.parentId || null,
          hasParent,
          hasSubcategories: false,
        },
        include: {
          subcategories: true,
          jobPosts: true,

        },
      });

      // Update parent
      if (dto.parentId) {
        await this.prisma.jobCategory.update({
          where: { id: dto.parentId },
          data: { hasSubcategories: true },
        });
      }

      const success_response = {

        success: true,
        message: 'Category created successfully',
        code: 'CREATED',
        category: this.mapCategory(created as FullCategory),
        error: null,


      }

      return success_response;
        
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Create category failed: ${err.message}`, err.stack);

      return {
        success: false,
        message: 'Failed to create category',
        code: 'CATEGORY_CREATION_FAILED',
        data: null,
        error: { message: err.message, details: err.stack },
      };
    }
  }

  /** ---------------------------------------------------------------
   *  GET ALL CATEGORIES
   * --------------------------------------------------------------- */
  async getCategoriesWithStats(): Promise<
    BaseResponseDto<CreateCategoryResponseDto[]>
  > {
    try {
      const categories = await this.prisma.jobCategory.findMany({
        include: {
          subcategories: true,
          jobPosts: true,

        },
      });

      const success_response = {
        success: true,
        message: 'Categories fetched successfully',
        code: 'FETCHED',
        categories: categories.map((cat) =>
          this.mapCategory(cat as FullCategory),
        ),
        error: null,


      }

      return success_response;

    } catch (error) {
      const err = error as Error;
      this.logger.error('Fetch categories failed', err.stack);

      return {
        success: false,
        message: 'Failed to fetch categories',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: err.message, details: err.stack },
      };
    }
  }

  /** ---------------------------------------------------------------
   *  GET CATEGORY BY ID
   * --------------------------------------------------------------- */
  async getCategoryById(
    id: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    try {
      const cat = await this.prisma.jobCategory.findUnique({
        where: { id },
        include: {
          subcategories: true,
          jobPosts: true,
      
        },
      });

      if (!cat) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: { message: 'Category does not exist.', details: null },
        };
      }

      const success_response = {

        success: true,
        message: 'Category fetched successfully',
        code: 'FETCHED',
        category: this.mapCategory(cat as FullCategory),
        error: null,
      };

      return success_response;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Fetch category failed', err.stack);

      return {
        success: false,
        message: 'Failed to fetch category',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: err.message, details: err.stack },
      };
    }
  }

  /** ---------------------------------------------------------------
   *  DELETE CATEGORY
   * --------------------------------------------------------------- */
  async deleteJobCategory(id: string): Promise<BaseResponseDto<null>> {
    try {
      const category = await this.prisma.jobCategory.findUnique({
        where: { id },
        include: {
          subcategories: true,
          jobPosts: true,
      
        },
      });

      if (!category) {
        return {
          success: false,
          message: 'Category not found',
          code: 'CATEGORY_NOT_FOUND',
          data: null,
          error: { message: 'Category does not exist.', details: null },
        };
      }

      if (category.subcategories.length > 0) {
        return {
          success: false,
          message: 'Cannot delete category with subcategories',
          code: 'CATEGORY_HAS_SUBCATEGORIES',
          data: null,
          error: { message: 'Delete or reassign subcategories first.', details: null },
        };
      }

      if (
        category.jobPosts.length > 0 
    
      ) {
        return {
          success: false,
          message: 'Cannot delete category linked to jobs',
          code: 'CATEGORY_LINKED_TO_JOBS',
          data: null,
          error: {
            message: 'Reassign or delete jobs before deleting category.',
            details: null,
          },
        };
      }

      await this.prisma.jobCategory.delete({ where: { id } });

      return {
        success: true,
        message: 'Category deleted successfully',
        code: 'DELETED',
        data: null,
        error: null,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Delete category failed: ${err.message}`, err.stack);

      return {
        success: false,
        message: 'Failed to delete category',
        code: 'CATEGORY_DELETE_FAILED',
        data: null,
        error: { message: err.message, details: err.stack },
      };
    }
  }

  /**
 * Delete a subcategory only (child category), ensuring:
 * - It exists
 * - It has a parent (i.e., is a subcategory)
 * - It has no own subcategories
 * - It has no linked jobs
 * - Parent's hasSubcategories is recalculated after deletion
 */
async deleteSubcategory(subcategoryId: string): Promise<BaseResponseDto<null>> {
  try {
    const subcat = await this.prisma.jobCategory.findUnique({
      where: { id: subcategoryId },
      include: {
        subcategories: true,
        jobPosts: true,
    
      },
    });

    if (!subcat) {
      return {
        success: false,
        message: 'Subcategory not found',
        code: 'SUBCATEGORY_NOT_FOUND',
        data: null,
        error: { message: 'Subcategory does not exist.', details: null },
      };
    }

    // ❌ Cannot delete a category that is not a subcategory
    if (!subcat.parentId) {
      return {
        success: false,
        message: 'This category is not a subcategory',
        code: 'NOT_A_SUBCATEGORY',
        data: null,
        error: { message: 'Only subcategories can be deleted using this endpoint.', details: null },
      };
    }

    // ❌ Cannot delete if it has children
    if (subcat.subcategories.length > 0) {
      return {
        success: false,
        message: 'Cannot delete subcategory that contains subcategories',
        code: 'HAS_CHILDREN',
        data: null,
        error: { message: 'Delete or reassign inner subcategories first.', details: null },
      };
    }

    // ❌ Cannot delete if linked to job posts
    if (
      subcat.jobPosts.length > 0 
    ) {
      return {
        success: false,
        message: 'Cannot delete subcategory linked to jobs',
        code: 'LINKED_TO_JOBS',
        data: null,
        error: { message: 'Reassign or delete these jobs first.', details: null },
      };
    }

    const parentId = subcat.parentId;

    // ✅ Delete safely
    await this.prisma.jobCategory.delete({ where: { id: subcategoryId } });

    // ✅ After deletion, recalc parent's hasSubcategories
    const siblingCount = await this.prisma.jobCategory.count({
      where: { parentId },
    });

    if (siblingCount === 0) {
      await this.prisma.jobCategory.update({
        where: { id: parentId },
        data: { hasSubcategories: false },
      });
    }

    return {
      success: true,
      message: 'Subcategory deleted successfully',
      code: 'SUBCATEGORY_DELETED',
      data: null,
      error: null,
    };
  } catch (error: unknown) {
    this.logger.error(
      `Failed to delete subcategory: ${(error as Error).message}`,
      (error as Error).stack,
    );

    return {
      success: false,
      message: 'Failed to delete subcategory',
      code: 'SUBCATEGORY_DELETE_FAILED',
      data: null,
      error: {
        message: (error as Error).message,
        details: (error as Error).stack,
      },
    };
  }
}

/**
 * Fetch a single category by name (case-insensitive)
 */
async getCategoryByName(
  name: string
): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
  try {
    const cat = await this.prisma.jobCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // case-insensitive lookup
        },
      },
      include: {
        subcategories: true,
        jobPosts: true,
       
      },
    });

    if (!cat) {
      return {
        success: false,
        message: 'Category not found',
        code: 'CATEGORY_NOT_FOUND',
        data: null,
        error: { message: 'No category exists with this name.', details: null },
      };
    }

    const success_response = {
      success: true,
      code: "OK",
      message: 'Category fetched successfully',
      category: this.mapCategory(cat),
      error: null
    }
    return success_response;

  } catch (error: unknown) {
    this.logger.error(
      `Failed to fetch category by name: ${(error as Error).message}`,
      (error as Error).stack,
    );
  


    return {
      success: false,
      message: 'Failed to fetch category',
      code: 'FETCH_FAILED',
      data: null,
      error: {
        message: (error as Error).message,
        details: (error as Error).stack,
      },
    };
  }
}




}
