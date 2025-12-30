"use strict";

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
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
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===================== CREATE =====================
  @GrpcMethod('CategoriesService', 'CreateCategory')
  async createCategory(
    data: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`CreateCategory request: ${data.name}`);
    return this.categoriesService.createCategory(data);
  }

  // ===================== UPDATE =====================
  @GrpcMethod('CategoriesService', 'UpdateCategory')
  async updateCategory(
    data: UpdateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`UpdateCategory request: ${data.id}`);
    return this.categoriesService.updateCategory(data);
  }

  // ===================== DELETE =====================
  @GrpcMethod('CategoriesService', 'DeleteCategory')
  async deleteCategory(data: CategoryIdParamDto): Promise<BaseResponseDto<null>> {
    this.logger.debug(`DeleteCategory request: ${data.id}`);
    return this.categoriesService.deleteCategory(data);
  }

  // ===================== FETCH ALL (WITH STATS) =====================
  @GrpcMethod('CategoriesService', 'GetCategoriesByVertical')
  async getCategories(
    data: GetCategoriesRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto[]>> {
    this.logger.debug(`GetCategories request for vertical: ${data.vertical ?? 'ALL'}`);
    return this.categoriesService.getCategoriesWithStats(data);
  }
  
  // ===================== FETCH DISCOVERY (LIGHTWEIGHT) =====================
  @GrpcMethod('CategoriesService', 'GetDiscoveryMetadata')
  async getDiscoveryMetadata(
    data: DiscoveryParamsDto,
  ): Promise<BaseResponseDto<DiscoveryCategoryResponseDto[]>> {
    this.logger.debug(`GetDiscoveryMetadata request for: ${data.vertical}`);
    return this.categoriesService.getDiscoveryMetadata(data);
  }

  // ===================== FETCH SINGLE BY ID =====================
  @GrpcMethod('CategoriesService', 'GetCategoryById')
  async getCategoryById(data: { id: string }): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`GetCategoryById request: ${data.id}`);
    return this.categoriesService.getCategoryById(data.id);
  }

  // ===================== FETCH SINGLE BY SLUG =====================
  @GrpcMethod('CategoriesService', 'GetCategoryBySlug')
  async getCategoryBySlug(
    data: GetCategoryBySlugParamsDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`GetCategoryBySlug request: ${data.vertical}/${data.slug}`);
    return this.categoriesService.getCategoryBySlug(data);
  }

  // ===================== FETCH SINGLE BY NAME =====================
  @GrpcMethod('CategoriesService', 'GetCategoryByName')
  async getCategoryByName(
    data: GetCategoryByNameQueryDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`GetCategoryByName request: ${data.name}`);
    return this.categoriesService.getCategoryByName(data);
  }
}