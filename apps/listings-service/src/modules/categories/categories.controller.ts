import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  BaseResponseDto,
  CreateCategoryRequestDto,
  CreateCategoryResponseDto,
} from '@pivota-api/dtos';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===================== CREATE =====================
  @GrpcMethod('CategoriesService', 'CreateCategory')
  async createCategory(
    data: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`CreateCategory request: ${JSON.stringify(data)}`);
    return this.categoriesService.createJobCategory(data);
  }

  // ===================== DELETE =====================
  @GrpcMethod('CategoriesService', 'DeleteCategory')
  async deleteCategory(data: { id: string }): Promise<BaseResponseDto<null>> {
    this.logger.debug(`DeleteCategory request: ${JSON.stringify(data)}`);
    return this.categoriesService.deleteJobCategory(data.id);
  }

  // ===================== FETCH ALL =====================
  @GrpcMethod('CategoriesService', 'GetCategories')
  async getCategories(): Promise<BaseResponseDto<CreateCategoryResponseDto[]>> {
    this.logger.debug(`GetCategories request`);
    return this.categoriesService.getCategoriesWithStats();
  }

  // ===================== FETCH SINGLE BY ID =====================
  @GrpcMethod('CategoriesService', 'GetCategoryById')
  async getCategory(data: { id: string }): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`GetCategory request: ${JSON.stringify(data)}`);
    return this.categoriesService.getCategoryById(data.id);
  }

  // ===================== FETCH SINGLE BY NAME =====================
  @GrpcMethod('CategoriesService', 'GetCategoryByName')
  async getCategoryByName(
    data: { name: string },
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`GetCategoryByName request: ${JSON.stringify(data)}`);
    return this.categoriesService.getCategoryByName(data.name);
  }

  // ===================== FETCH SUBCATEGORY BY NAME =====================
  @GrpcMethod('CategoriesService', 'GetSubcategoryByName')
  async getSubcategoryByName(
    data: { categoryId: string; name: string },
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(
      `GetSubcategoryByName request: ${JSON.stringify(data)}`,
    );
    return this.categoriesService.getSubcategoryByName(
      data.categoryId,
      data.name,
    );
  }
}
