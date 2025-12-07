import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Param,
  Version,
  UseGuards,
} from '@nestjs/common';
import {
  BaseResponseDto,
  CreateCategoryRequestDto,
  CreateCategoryResponseDto,
} from '@pivota-api/dtos';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';

import { RolesGuard } from '@pivota-api/guards';
import { Roles } from '@pivota-api/decorators';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('JobCategories Module - ((Listings-Service) - MICROSERVICE)')
@ApiBearerAuth()
@Controller('categories-module')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===========================================================
  // CREATE JOB CATEGORY  (Admins Only)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ContentManagerAdmin')
  @Version('1')
  @Post('categories')
  @ApiOperation({summary: 'Create a new job category'})
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST createCategory request: ${JSON.stringify(dto)}`);
    return this.categoriesService.createCategory(dto);
  }

  // ===========================================================
  // GET ALL CATEGORIES (Public or Protected — I keep as Public)
  // ===========================================================
  @Version('1')
  @Get('categories')
  @ApiOperation({summary: 'Get all job categories'})
  async getCategories(): Promise<
    BaseResponseDto<CreateCategoryResponseDto[]>
  > {
    this.logger.debug(`REST getCategories request`);
    return this.categoriesService.getCategories();
  }

  // ===========================================================
  // GET CATEGORY BY ID (Public)
  // ===========================================================
  @ApiParam({ name: 'id', type: String })
  @Version('1')
  @Get('categories/:id')
  @ApiOperation({summary: 'Get a job category by ID'})
  async getCategoryById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST getCategoryById request: ${id}`);
    return this.categoriesService.getCategory(id);
  }

  // ===========================================================
  // GET CATEGORY BY NAME (Public)
  // ===========================================================
  @ApiParam({ name: 'name', type: String })
  @Version('1')
  @Get('categories/name/:name')
  @ApiOperation({summary: 'Get a job category by name'})
  async getCategoryByName(
    @Param('name') name: string,
  ): Promise<BaseResponseDto<CreateCategoryResponseDto>> {
    this.logger.debug(`REST getCategoryByName request: ${name}`);
    return this.categoriesService.getCategoryByName(name);
  }

  // ===========================================================
  // GET SUBCATEGORY BY NAME (Public)
  // ===========================================================
  @ApiParam({ name: 'categoryId', type: String })
  @ApiParam({ name: 'name', type: String })
  @Version('1')
  @Get('categories/:categoryId/subcategories/:name')
  @ApiOperation({summary: 'Get a subcategory by name'})
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
  // DELETE CATEGORY (Admins Only)
  // ===========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin')
  @ApiParam({ name: 'id', type: String })
  @Version('1')
  @Post('categories/delete/:id')
  @ApiOperation({summary: 'Delete a job category'})
  async deleteCategory(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<null>> {
    this.logger.debug(`REST deleteCategory request: ${id}`);
    return this.categoriesService.deleteCategory(id);
  }
}
