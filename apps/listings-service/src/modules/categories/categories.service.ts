import { Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  CreateCategoryRequestDto,
  CreateCategoryResponseDto,
} from '@pivota-api/dtos';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new job category with validation, parent checks, and duplicates prevention.
   */
  async createJobCategory(
    dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.log(`Creating job category: ${dto.name}`);

    try {
      // Validate parentId if provided
      if (dto.parentId) {
        const parentExists = await this.prisma.jobCategory.findUnique({
          where: { id: dto.parentId },
        });
        if (!parentExists) {
          return {
            success: false,
            message: 'Parent category not found',
            code: 'PARENT_NOT_FOUND',
            data: null,
            error: { message: 'Provided parentId does not exist.', details: null },
          };
        }
        if (parentExists.categoryType !== dto.categoryType.toUpperCase()) {
          return {
            success: false,
            message: 'Category type must match parent category type',
            code: 'CATEGORY_TYPE_MISMATCH',
            data: null,
            error: { message: 'Child category type differs from parent.', details: null },
          };
        }
      }

      // Prevent duplicate category under same parent
      const existing = await this.prisma.jobCategory.findFirst({
        where: {
          name: dto.name,
          parentId: dto.parentId || null,
          categoryType: dto.categoryType.toUpperCase() as 'INFORMAL' | 'FORMAL',
        },
      });
      if (existing) {
        return {
          success: false,
          message: 'Category with this name already exists under the same parent',
          code: 'DUPLICATE_CATEGORY',
          data: null,
          error: { message: 'Duplicate category detected.', details: null },
        };
      }

      // Create category
      const created = await this.prisma.jobCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          parentId: dto.parentId || null,
          categoryType: dto.categoryType.toUpperCase() as 'INFORMAL' | 'FORMAL',
        },
      });

      const responseData: CreateCategoryResponseDto = {
        id: created.id,
        name: created.name,
        description: created.description,
        parentId: created.parentId,
        categoryType: created.categoryType,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      return {
        success: true,
        message: 'Category created successfully',
        code: 'CREATED',
        data: responseData,
        error: null,
      };
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to create category',
        code: 'CATEGORY_CREATION_FAILED',
        data: null,
        error: { message: error.message, details: error.stack },
      };
    }
  }

  // /**
  //  * Update an existing job category.
  //  */
  // async updateJobCategory(
  //   id: string,
  //   dto: UpdateCategoryRequestDto,
  // ): Promise<BaseResponseDto<UpdateCategoryResponseDto>> {
  //   this.logger.log(`Updating job category: ${id}`);
  //   try {
  //     const category = await this.prisma.jobCategory.findUnique({ where: { id } });
  //     if (!category) {
  //       return {
  //         success: false,
  //         message: 'Category not found',
  //         code: 'CATEGORY_NOT_FOUND',
  //         data: null,
  //         error: { message: 'Category does not exist.', details: null },
  //       };
  //     }

  //     // Prevent duplicate name under same parent
  //     const duplicate = await this.prisma.jobCategory.findFirst({
  //       where: {
  //         id: { not: id },
  //         name: dto.name || category.name,
  //         parentId: dto.parentId ?? category.parentId,
  //         categoryType: dto.categoryType?.toUpperCase() as 'INFORMAL' | 'FORMAL' ?? category.categoryType,
  //       },
  //     });
  //     if (duplicate) {
  //       return {
  //         success: false,
  //         message: 'Duplicate category under the same parent',
  //         code: 'DUPLICATE_CATEGORY',
  //         data: null,
  //         error: { message: 'Duplicate category detected.', details: null },
  //       };
  //     }

  //     // Update category
  //     const updated = await this.prisma.jobCategory.update({
  //       where: { id },
  //       data: {
  //         name: dto.name,
  //         description: dto.description,
  //         parentId: dto.parentId,
  //         categoryType: dto.categoryType?.toUpperCase() as 'INFORMAL' | 'FORMAL',
  //       },
  //     });

  //     const responseData: UpdateCategoryResponseDto = {
  //       id: updated.id,
  //       name: updated.name,
  //       description: updated.description,
  //       parentId: updated.parentId,
  //       categoryType: updated.categoryType,
  //       createdAt: updated.createdAt.toISOString(),
  //       updatedAt: updated.updatedAt.toISOString(),
  //     };

  //     return {
  //       success: true,
  //       message: 'Category updated successfully',
  //       code: 'UPDATED',
  //       data: responseData,
  //       error: null,
  //     };
  //   } catch (error) {
  //     this.logger.error(`Failed to update category: ${error.message}`, error.stack);
  //     return {
  //       success: false,
  //       message: 'Failed to update category',
  //       code: 'CATEGORY_UPDATE_FAILED',
  //       data: null,
  //       error: { message: error.message, details: error.stack },
  //     };
  //   }
  // }

  /**
   * Delete a category with checks for subcategories and linked jobs.
   */
  async deleteJobCategory(id: string): Promise<BaseResponseDto<null>> {
    this.logger.log(`Deleting job category: ${id}`);
    try {
      const category = await this.prisma.jobCategory.findUnique({
        where: { id },
        include: { subcategories: true, informalJobs: true, formalJobs: true, providerJobs: true },
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

      if (category.informalJobs.length > 0 || category.formalJobs.length > 0 || category.providerJobs.length > 0) {
        return {
          success: false,
          message: 'Cannot delete category linked to jobs',
          code: 'CATEGORY_LINKED_TO_JOBS',
          data: null,
          error: { message: 'Reassign or delete jobs before deleting category.', details: null },
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
      this.logger.error(`Failed to delete category: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Failed to delete category',
        code: 'CATEGORY_DELETE_FAILED',
        data: null,
        error: { message: error.message, details: error.stack },
      };
    }
  }

  /**
   * Fetch all categories including subcategories and counts.
   */
  async getCategoriesWithStats(): Promise<BaseResponseDto<unknown>> {
    try {
      const categories = await this.prisma.jobCategory.findMany({
        include: { subcategories: true, informalJobs: true, formalJobs: true, providerJobs: true },
      });

      const data = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        categoryType: cat.categoryType,
        parentId: cat.parentId,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
        informalJobsCount: cat.informalJobs.length,
        formalJobsCount: cat.formalJobs.length,
        providerJobsCount: cat.providerJobs.length,
        subcategories: cat.subcategories,
      }));

      return {
        success: true,
        message: 'Categories fetched successfully',
        code: 'FETCHED',
        data,
        error: null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch categories', error.stack);
      return {
        success: false,
        message: 'Failed to fetch categories',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: error.message, details: error.stack },
      };
    }
  }

  /**
   * Fetch a single category with subcategories and linked jobs.
   */
  async getCategoryById(id: string): Promise<BaseResponseDto<unknown>> {
    try {
      const cat = await this.prisma.jobCategory.findUnique({
        where: { id },
        include: { subcategories: true, informalJobs: true, formalJobs: true, providerJobs: true },
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

      const data = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        categoryType: cat.categoryType,
        parentId: cat.parentId,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
        informalJobsCount: cat.informalJobs.length,
        formalJobsCount: cat.formalJobs.length,
        providerJobsCount: cat.providerJobs.length,
        subcategories: cat.subcategories,
      };

      return {
        success: true,
        message: 'Category fetched successfully',
        code: 'FETCHED',
        data,
        error: null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch category', error.stack);
      return {
        success: false,
        message: 'Failed to fetch category',
        code: 'FETCH_FAILED',
        data: null,
        error: { message: error.message, details: error.stack },
      };
    }
  }
}
