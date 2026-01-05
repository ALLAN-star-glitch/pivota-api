"use strict";

import {
  Body,
  Controller,
  Logger,
  Post,
  Patch,
  Get,
  Delete,
  Param,
  Query,
  Version,
  UseGuards,
} from '@nestjs/common';
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
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';

@ApiTags('Categories Module - (Listings-Service Microservice)')
@Controller('categories-module')
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===========================================================
  // CREATE CATEGORY (Admin Only)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ContentManagerAdmin')
  @Version('1')
  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ type: CategoryResponseDto })
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`REST createCategory request: ${dto.name} (${dto.vertical})`);
    return this.categoriesService.createCategory(dto);
  }

  // ===========================================================
  // UPDATE CATEGORY (Admin Only)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin', 'ContentManagerAdmin')
  @Version('1')
  @Patch('categories')
  @ApiOperation({ summary: 'Update an existing category' })
  async updateCategory(
    @Body() dto: UpdateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`REST updateCategory request: ${dto.id}`);
    return this.categoriesService.updateCategory(dto);
  }

  // ===========================================================
  // GET CATEGORIES WITH STATS (Public)
  // ===========================================================
  @Version('1')
  @Get('categories')
  @ApiOperation({ summary: 'Get categories tree with usage stats' })
  async getCategories(
    @Query() query: GetCategoriesRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto[]>> {
    this.logger.debug(`REST getCategories request - Vertical: ${query.vertical || 'ALL'}`);
    return this.categoriesService.getCategories(query);
  }

  // ===========================================================
  // GET DISCOVERY METADATA (Public - Lightweight)
  // ===========================================================
  @Version('1')
  @Get('categories/discovery')
  @ApiOperation({ summary: 'Get lightweight discovery metadata for navigation' })
  async getDiscoveryMetadata(
    @Query() query: DiscoveryParamsDto,
  ): Promise<BaseResponseDto<DiscoveryCategoryResponseDto[]>> {
    this.logger.debug(`REST getDiscoveryMetadata request - Vertical: ${query.vertical}`);
    return this.categoriesService.getDiscoveryMetadata(query);
  }

  // ===========================================================
  // GET CATEGORY BY ID (Public)
  // ===========================================================
  @Version('1')
  @Get('categories/id/:id')
  @ApiOperation({ summary: 'Get a category by unique ID' })
  async getCategoryById(
    @Param() params: CategoryIdParamDto, 
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryById request: ${params.id}`);
    return this.categoriesService.getCategory(params.id);
  }

  // ===========================================================
  // GET CATEGORY BY SLUG (Public - Critical for Web URLs)
  // ===========================================================
  @Version('1')
  @Get('categories/slug/:vertical/:slug')
  @ApiOperation({ summary: 'Get a category by vertical and slug' })
  async getCategoryBySlug(
    @Param() params: GetCategoryBySlugParamsDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryBySlug request: ${params.vertical}/${params.slug}`);
    return this.categoriesService.getCategoryBySlug(params);
  }

  // ===========================================================
  // GET CATEGORY BY NAME (Public)
  // ===========================================================
  @Version('1')
  @Get('categories/search')
  @ApiOperation({ summary: 'Search for a category by name and vertical' })
  async getCategoryByName(
    @Query() query: GetCategoryByNameQueryDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryByName request: ${query.name}`);
    return this.categoriesService.getCategoryByName(query);
  }

  // ===========================================================
  // DELETE CATEGORY (SuperAdmin Only)
  // ===========================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemAdmin')
  @Version('1')
  @Delete('categories/:id')
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Delete a category (only if unused and has no children)' })
  async deleteCategory(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<null>> {
    this.logger.warn(`REST deleteCategory request: ${id}`);
    return this.categoriesService.deleteCategory(id);
  }
}