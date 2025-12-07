import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BaseResponseDto,
  CreateCategoryRequestDto,
  CreateCategoryResponseDto,
} from '@pivota-api/dtos';
import { BaseCategoryGrpcResponse, BaseCategoriesGrpcResponse } from '@pivota-api/interfaces';
import { firstValueFrom, Observable } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';

interface CategoriesServiceGrpc {
  CreateCategory(
    data: CreateCategoryRequestDto,
  ): Observable<BaseCategoryGrpcResponse<CreateCategoryResponseDto>>;

  DeleteCategory(
    data: { id: string },
  ): Observable<BaseCategoryGrpcResponse<null>>;

  GetCategories(data: object): Observable<
    BaseCategoriesGrpcResponse<CreateCategoryResponseDto[]>
  >;

  GetCategoryById(
    data: { id: string },
  ): Observable<BaseCategoryGrpcResponse<CreateCategoryResponseDto>>;

  GetCategoryByName(
    data: { name: string },
  ): Observable<BaseCategoryGrpcResponse<CreateCategoryResponseDto>>;

  GetSubcategoryByName(
    data: { categoryId: string; name: string },
  ): Observable<BaseCategoryGrpcResponse<CreateCategoryResponseDto>>;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  private grpcService: CategoriesServiceGrpc;

  constructor(
    @Inject('CATEGORIES_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {
    this.grpcService =
      this.grpcClient.getService<CategoriesServiceGrpc>('CategoriesService');
  }

  // ===========================================================
  // CREATE CATEGORY
  // ===========================================================
  async createCategory(
    dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    const res = await firstValueFrom(this.grpcService.CreateCategory(dto));

    if (res?.success) {
      return BaseResponseDto.ok(res.category, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }
  

  // ===========================================================
  // DELETE CATEGORY
  // ===========================================================
  async deleteCategory(
    id: string,
  ): Promise<BaseResponseDto<null>> {
    const res = await firstValueFrom(
      this.grpcService.DeleteCategory({ id }),
    );
    this.logger.debug(`DeleteCategory gRPC response: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(null, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET ALL CATEGORIES
  // ===========================================================
  async getCategories(): Promise<BaseResponseDto<CreateCategoryResponseDto[]>> {
    const res = await firstValueFrom(this.grpcService.GetCategories({}));

    if (res?.success) {
      return BaseResponseDto.ok(res.categories || [],  res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }
 

  // ===========================================================
  // GET CATEGORY BY ID
  // ===========================================================
  async getCategory(
    id: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetCategoryById({ id }),
    );
    this.logger.debug(`GetCategory gRPC response: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.category, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET CATEGORY BY NAME
  // ===========================================================
  async getCategoryByName(
    name: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetCategoryByName({ name }),
    );
    this.logger.debug(`GetCategoryByName gRPC response: ${JSON.stringify(res)}`);

    if (res?.success) {
      return BaseResponseDto.ok(res.category, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }

  // ===========================================================
  // GET SUBCATEGORY BY NAME
  // ===========================================================
  async getSubcategoryByName(
    categoryId: string,
    name: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    const res = await firstValueFrom(
      this.grpcService.GetSubcategoryByName({ categoryId, name }),
    );

    this.logger.debug(
      `GetSubcategoryByName gRPC response: ${JSON.stringify(res)}`,
    );

    if (res?.success) {
      return BaseResponseDto.ok(res.category, res.message, res.code);
    }

    return BaseResponseDto.fail(res?.message, res?.code);
  }
}
