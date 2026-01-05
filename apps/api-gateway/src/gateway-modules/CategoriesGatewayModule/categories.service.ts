"use strict";

import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { firstValueFrom, Observable } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';

/**
 * Updated interface to match categories.proto exactly
 */
interface CategoriesServiceGrpc {
  CreateCategory(
    data: CreateCategoryRequestDto,
  ): Observable<BaseResponseDto<CategoryResponseDto>>;

  UpdateCategory(
    data: UpdateCategoryRequestDto,
  ): Observable<BaseResponseDto<CategoryResponseDto>>;

  DeleteCategory(
    data: CategoryIdParamDto,
  ): Observable<BaseResponseDto<null>>;

  GetCategoriesByVertical(
    data: GetCategoriesRequestDto,
  ): Observable<BaseResponseDto<CategoryResponseDto[]>>;

  GetDiscoveryMetadata(
    data: DiscoveryParamsDto,
  ): Observable<BaseResponseDto<DiscoveryCategoryResponseDto[]>>;

  GetCategoryById(
    data: CategoryIdParamDto,
  ): Observable<BaseResponseDto<CategoryResponseDto>>;

  GetCategoryBySlug(
    data: GetCategoryBySlugParamsDto,
  ): Observable<BaseResponseDto<CategoryResponseDto>>;

  GetCategoryByName(
    data: GetCategoryByNameQueryDto,
  ): Observable<BaseResponseDto<CategoryResponseDto>>;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private grpcService: CategoriesServiceGrpc;

  constructor(
    @Inject('CATEGORIES_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService = this.grpcClient.getService<CategoriesServiceGrpc>('CategoriesService');
  }

  // ===========================================================
  // CREATE & UPDATE
  // ===========================================================
  async createCategory(dto: CreateCategoryRequestDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`gRPC Request: CreateCategory - Name: ${dto.name}`);
    const res = await firstValueFrom(this.grpcService.CreateCategory(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  async updateCategory(dto: UpdateCategoryRequestDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`gRPC Request: UpdateCategory - ID: ${dto.id}`);
    const res = await firstValueFrom(this.grpcService.UpdateCategory(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // DELETE
  // ===========================================================
  async deleteCategory(id: string): Promise<BaseResponseDto<null>> {
    this.logger.warn(`gRPC Request: DeleteCategory - ID: ${id}`);
    const res = await firstValueFrom(this.grpcService.DeleteCategory({ id }));
    return res?.success 
      ? BaseResponseDto.ok(null, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // FETCH METHODS (LISTS)
  // ===========================================================
  async getCategories(dto: GetCategoriesRequestDto): Promise<BaseResponseDto<CategoryResponseDto[]>> {
    this.logger.debug(`gRPC Request: GetCategoriesByVertical - Vertical: ${dto.vertical || 'ALL'}`);
    const res = await firstValueFrom(this.grpcService.GetCategoriesByVertical(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data || [], res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  async getDiscoveryMetadata(dto: DiscoveryParamsDto): Promise<BaseResponseDto<DiscoveryCategoryResponseDto[]>> {
    this.logger.debug(`gRPC Request: GetDiscoveryMetadata - Vertical: ${dto.vertical}`);
    const res = await firstValueFrom(this.grpcService.GetDiscoveryMetadata(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data || [], res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // FETCH METHODS (SINGLE)
  // ===========================================================
  async getCategory(id: string): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`gRPC Request: GetCategoryById - ID: ${id}`);
    const res = await firstValueFrom(this.grpcService.GetCategoryById({ id }));
    return res?.success 
      ? BaseResponseDto.ok(res.data, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  async getCategoryBySlug(dto: GetCategoryBySlugParamsDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`gRPC Request: GetCategoryBySlug - Slug: ${dto.slug}`);
    const res = await firstValueFrom(this.grpcService.GetCategoryBySlug(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }

  async getCategoryByName(dto: GetCategoryByNameQueryDto): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`gRPC Request: GetCategoryByName - Name: ${dto.name}`);
    const res = await firstValueFrom(this.grpcService.GetCategoryByName(dto));
    return res?.success 
      ? BaseResponseDto.ok(res.data, res.message, res.code) 
      : BaseResponseDto.fail(res?.message, res?.code);
  }
}