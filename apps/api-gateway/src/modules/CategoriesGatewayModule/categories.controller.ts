import { Body, Controller, Logger, Post, Get, Param, Version } from '@nestjs/common';
import { BaseResponseDto, CreateCategoryRequestDto, CreateCategoryResponseDto } from '@pivota-api/dtos';
import { CategoriesService } from './categories.service';

@Controller('listings-service')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===========================================================
  // CREATE JOB CATEGORY
  // ===========================================================
  @Version('1')
  @Post('categories')
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST createCategory request: ${JSON.stringify(dto)}`);
    return this.categoriesService.createCategory(dto);
  }

  // ===========================================================
  // GET ALL CATEGORIES
  // ===========================================================
  @Version('1')
  @Get('categories')
  async getCategories(): Promise<BaseResponseDto<CreateCategoryResponseDto[]>> {
    this.logger.debug(`REST getCategories request`);
    return this.categoriesService.getCategories();
  }

  // ===========================================================
  // GET CATEGORY BY ID
  // ===========================================================
  @Version('1')
  @Get('categories/:id')
  async getCategoryById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST getCategoryById request: ${id}`);
    return this.categoriesService.getCategory(id);
  }

  // ===========================================================
  // GET CATEGORY BY NAME
  // ===========================================================
  @Version('1')
  @Get('categories/name/:name')
  async getCategoryByName(
    @Param('name') name: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST getCategoryByName request: ${name}`);
    return this.categoriesService.getCategoryByName(name);
  }

  // ===========================================================
  // GET SUBCATEGORY BY NAME
  // ===========================================================
  @Version('1')
  @Get('categories/:categoryId/subcategories/:name')
  async getSubcategoryByName(
    @Param('categoryId') categoryId: string,
    @Param('name') name: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(
      `REST getSubcategoryByName request: categoryId=${categoryId}, name=${name}`,
    );
    return this.categoriesService.getSubcategoryByName(categoryId, name);
  }

  // ===========================================================
  // DELETE CATEGORY
  // ===========================================================
  @Version('1')
  @Post('categories/delete/:id')
  async deleteCategory(@Param('id') id: string): Promise<BaseResponseDto<null>> {
    this.logger.debug(`REST deleteCategory request: ${id}`);
    return this.categoriesService.deleteCategory(id);
  }
}
