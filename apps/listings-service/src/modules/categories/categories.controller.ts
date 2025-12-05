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

//   // ===================== UPDATE =====================
//   @GrpcMethod('CategoriesService', 'UpdateCategory')
//   async updateCategory(
//     data: { id: string; dto: UpdateCategoryRequestDto },
//   ): Promise<BaseResponseDto<UpdateCategoryResponseDto>> {
//     this.logger.debug(`UpdateCategory request: ${JSON.stringify(data)}`);
//     return this.categoriesService.updateJobCategory(data.id, data.dto);
//   }

  // ===================== DELETE =====================
  @GrpcMethod('CategoriesService', 'DeleteCategory')
  async deleteCategory(data: { id: string }): Promise<BaseResponseDto<null>> {
    this.logger.debug(`DeleteCategory request: ${JSON.stringify(data)}`);
    return this.categoriesService.deleteJobCategory(data.id);
  }

  // ===================== FETCH ALL =====================
  @GrpcMethod('CategoriesService', 'GetCategories')
  async getCategories(): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(`GetCategories request`);
    return this.categoriesService.getCategoriesWithStats();
  }

  // ===================== FETCH SINGLE =====================
  @GrpcMethod('CategoriesService', 'GetCategory')
  async getCategory(data: { id: string }): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(`GetCategory request: ${JSON.stringify(data)}`);
    return this.categoriesService.getCategoryById(data.id);
  }
}
