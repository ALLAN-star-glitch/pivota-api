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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Permissions } from '../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../guards/PermissionGuard.guard';
import { SetModule } from '../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';
import { Public } from '../../decorators/public.decorator';

@ApiTags('Categories')
@Controller('categories-module')
@SetModule(ModuleSlug.REGISTRY)
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ===========================================================
  // 📁 CATEGORIES - ADMIN OPERATIONS
  // ===========================================================

  /**
   * Create a new category
   * 
   * Creates a new category in the system. Categories are used to organize listings
   * across different verticals (Housing, Jobs, Services, Social Support).
   * 
   * @param dto - Category creation data including name, slug, vertical, and optional parent
   * @returns The created category with all properties
   */
  @Post('categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(P.ROLE_CREATE)
  @Version('1')
  @ApiTags('Categories - Admin')
  @ApiOperation({ 
    summary: 'Create a new category',
    description: `
      Creates a new category in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission Required:** \`${P.ROLE_CREATE}\`
      **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      **Category Properties:**
      • **name** - Display name (e.g., "Apartments")
      • **slug** - URL-friendly identifier (e.g., "apartments")
      • **vertical** - The pillar this belongs to (HOUSING, JOBS, SOCIAL_SUPPORT, SERVICES)
      • **type** - Category type: MAIN or COMPLIMENTARY
      • **parentId** - Optional parent for hierarchical categories
      • **icon** - Optional icon name for UI
      • **color** - Optional color code for UI branding
      
      **Category Hierarchy:**
      • Parent categories (e.g., "Property")
      • Child categories (e.g., "Apartments", "Houses", "Land")
      • Supports unlimited nesting levels
      
      **Validation Rules:**
      • Slug must be unique within the same vertical
      • Parent must exist if provided
      • Cannot create circular references
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Category created successfully',
    type: CategoryResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Category created successfully',
        code: 'CREATED',
        data: {
          id: 'cat_123abc',
          name: 'Apartments',
          slug: 'apartments',
          vertical: 'HOUSING',
          type: 'MAIN',
          icon: 'home',
          color: '#3B82F6',
          parentId: null,
          hasSubcategories: false,
          hasParent: false,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.ROLE_CREATE} permission` })
  @ApiResponse({ status: 409, description: 'Conflict - Category with same slug already exists' })
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`REST createCategory request: ${dto.name} (${dto.vertical})`);
    return this.categoriesService.createCategory(dto);
  }

  /**
   * Update an existing category
   * 
   * Updates properties of an existing category. Cannot change the vertical.
   * 
   * @param dto - Category update data including ID and fields to update
   * @returns The updated category
   */
  @Patch('categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(P.ROLE_UPDATE)
  @Version('1')
  @ApiTags('Categories - Admin')
  @ApiOperation({ 
    summary: 'Update an existing category',
    description: `
      Updates an existing category's properties.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission Required:** \`${P.ROLE_UPDATE}\`
      **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      **Updatable Fields:**
      • **name** - Display name
      • **slug** - URL-friendly identifier (must remain unique)
      • **type** - Category type (MAIN or COMPLIMENTARY)
      • **icon** - Optional icon name for UI
      • **color** - Optional color code for UI branding
      • **parentId** - Change parent category
      
      **Restrictions:**
      • Cannot change the vertical
      • Cannot create circular references
      • Slug uniqueness enforced within the same vertical
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category updated successfully',
    type: CategoryResponseDto
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.ROLE_UPDATE} permission` })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Category with same slug already exists' })
  async updateCategory(
    @Body() dto: UpdateCategoryRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.log(`REST updateCategory request: ${dto.id}`);
    return this.categoriesService.updateCategory(dto);
  }

  /**
   * Delete a category
   * 
   * Permanently removes a category from the system.
   * 
   * @param id - ID of the category to delete
   * @returns Success confirmation
   */
  @Delete('categories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(P.ROLE_DELETE)
  @Version('1')
  @ApiTags('Categories - Admin')
  @ApiOperation({ 
    summary: 'Delete a category',
    description: `
      Permanently deletes a category from the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission Required:** \`${P.ROLE_DELETE}\`
      **Accessible by:** Platform Admins (SuperAdmin, PlatformSystemAdmin)
      
      **Deletion Rules:**
      • Category must have no child categories
      • Category must not be in use by any listings
      • Protected system categories cannot be deleted
      • Operation cannot be undone
      
      **Validation:**
      • Checks for existing subcategories
      • Checks for listings using this category
      • Prevents deletion of system-protected categories
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the category to delete',
    example: 'cat_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Category deleted successfully',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Category has subcategories or is in use' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: `Forbidden - Requires ${P.ROLE_DELETE} permission` })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<null>> {
    this.logger.warn(`REST deleteCategory request: ${id}`);
    return this.categoriesService.deleteCategory(id);
  }

  // ===========================================================
  // 📁 CATEGORIES - PUBLIC OPERATIONS
  // ===========================================================

  /**
   * Get categories tree with usage stats
   * 
   * Retrieves all categories, optionally filtered by vertical and type,
   * with usage statistics for each category.
   * 
   * @param query - Filter parameters (vertical, type)
   * @returns Hierarchical category tree with usage stats
   */
  @Get('categories')
  @Public()
  @Version('1')
  @ApiTags('Categories - Public')
  @ApiOperation({ 
    summary: 'Get categories tree with usage stats',
    description: `
      Retrieves the complete category hierarchy with usage statistics.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      **Permission:** Public endpoint
      
      **Features:**
      • Returns categories in a hierarchical tree structure
      • Includes usage statistics (number of listings in each category)
      • Can filter by vertical (HOUSING, JOBS, SOCIAL_SUPPORT, SERVICES)
      • Can filter by type (MAIN, COMPLIMENTARY)
      • Sorted by category name
      
      **Use Cases:**
      • Building navigation menus
      • Category-based filtering UI
      • Analytics dashboards
      • SEO optimization
      
      **Response includes:**
      • Full category details
      • Child categories nested
      • Listing counts per category
      • Hierarchical relationships
    `
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: false,
    description: 'Filter by vertical',
    enum: ['HOUSING', 'JOBS', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false,
    description: 'Filter by category type (MAIN or COMPLIMENTARY)',
    enum: ['MAIN', 'COMPLIMENTARY'],
    example: 'MAIN'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories retrieved successfully',
    type: [CategoryResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Categories retrieved successfully',
        code: 'OK',
        data: [
          {
            id: 'cat_123abc',
            name: 'Property',
            slug: 'property',
            vertical: 'HOUSING',
            type: 'MAIN',
            icon: 'building',
            listingCount: 150,
            subcategories: [
              {
                id: 'cat_456def',
                name: 'Apartments',
                slug: 'apartments',
                type: 'MAIN',
                listingCount: 85,
                subcategories: []
              },
              {
                id: 'cat_789ghi',
                name: 'Houses',
                slug: 'houses',
                type: 'MAIN',
                listingCount: 65,
                subcategories: []
              }
            ]
          }
        ]
      }
    }
  })
  async getCategories(
    @Query() query: GetCategoriesRequestDto,
  ): Promise<BaseResponseDto<CategoryResponseDto[]>> {
    this.logger.debug(`REST getCategories request - Vertical: ${query.vertical || 'ALL'}, Type: ${query.type || 'ALL'}`);
    return this.categoriesService.getCategories(query);
  }

  /**
   * Get lightweight discovery metadata
   * 
   * Returns a simplified category structure optimized for navigation UIs.
   * 
   * @param query - Filter parameters (vertical, type)
   * @returns Lightweight category metadata
   */
  @Get('categories/discovery')
  @Public()
  @Version('1')
  @ApiTags('Categories - Public')
  @ApiOperation({ 
    summary: 'Get lightweight discovery metadata',
    description: `
      Returns a simplified category structure optimized for navigation UIs.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      **Permission:** Public endpoint
      
      **Features:**
      • Lightweight response format
      • Only essential fields (id, name, slug, icon)
      • Flat structure for easy rendering
      • Ideal for dropdowns and navigation menus
      • Can filter by type (MAIN, COMPLIMENTARY)
      
      **Use Cases:**
      • Category dropdowns in search forms
      • Mobile navigation menus
      • Quick category selection UI
      • Filter components
      
      **Performance:**
      • Optimized for fast loading
      • Minimal data transfer
      • Caching-friendly response
    `
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: true,
    description: 'Vertical to get discovery metadata for',
    enum: ['HOUSING', 'JOBS', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false,
    description: 'Filter by category type (MAIN or COMPLIMENTARY)',
    enum: ['MAIN', 'COMPLIMENTARY'],
    example: 'MAIN'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Discovery metadata retrieved successfully',
    type: [DiscoveryCategoryResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Discovery metadata retrieved',
        code: 'OK',
        data: [
          {
            id: 'cat_123abc',
            name: 'Apartments',
            slug: 'apartments',
            type: 'MAIN',
            icon: 'home',
            color: '#3B82F6'
          },
          {
            id: 'cat_456def',
            name: 'Houses',
            slug: 'houses',
            type: 'MAIN',
            icon: 'building',
            color: '#10B981'
          }
        ]
      }
    }
  })
  async getDiscoveryMetadata(
    @Query() query: DiscoveryParamsDto,
  ): Promise<BaseResponseDto<DiscoveryCategoryResponseDto[]>> {
    this.logger.debug(`REST getDiscoveryMetadata request - Vertical: ${query.vertical}, Type: ${query.type || 'ALL'}`);
    return this.categoriesService.getDiscoveryMetadata(query);
  }

  /**
   * Get category by ID
   * 
   * Retrieves a single category by its unique identifier.
   * 
   * @param params - Parameters containing the category ID
   * @returns Category details
   */
  @Get('categories/id/:id')
  @Public()
  @Version('1')
  @ApiTags('Categories - Public')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: `
      Retrieves a single category by its unique identifier.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      **Permission:** Public endpoint
      
      **Use Cases:**
      • Category detail pages
      • Breadcrumb navigation
      • Category metadata retrieval
      • SEO optimization
      
      **Returns:**
      • Full category details
      • Parent category reference (if any)
      • Subcategories list (if any)
      • Usage statistics
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'CUID of the category',
    example: 'cat_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category retrieved successfully',
    type: CategoryResponseDto
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(
    @Param() params: CategoryIdParamDto, 
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryById request: ${params.id}`);
    return this.categoriesService.getCategory(params.id);
  }

  /**
   * Get category by vertical and slug
   * 
   * Retrieves a category using its vertical and URL-friendly slug.
   * This is the primary endpoint for public-facing URLs.
   * 
   * @param params - Parameters containing vertical and slug
   * @returns Category details
   */
  @Get('categories/slug/:vertical/:slug')
  @Public()
  @Version('1')
  @ApiTags('Categories - Public')
  @ApiOperation({ 
    summary: 'Get category by vertical and slug',
    description: `
      Retrieves a category using its vertical and URL-friendly slug.
      This is the primary endpoint for public-facing URLs.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      **Permission:** Public endpoint
      
      **URL Pattern:**
      • Format: /categories/slug/{vertical}/{slug}
      • Example: /categories/slug/HOUSING/apartments
      
      **Use Cases:**
      • Category landing pages
      • SEO-friendly URLs
      • Breadcrumb navigation
      • Link generation
      
      **Advantages:**
      • Human-readable URLs
      • SEO optimized
      • Cache-friendly
      • Consistent across environments
    `
  })
  @ApiParam({ 
    name: 'vertical', 
    type: String,
    description: 'Vertical (HOUSING, JOBS, SOCIAL_SUPPORT, SERVICES)',
    enum: ['HOUSING', 'JOBS', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiParam({ 
    name: 'slug', 
    type: String,
    description: 'URL-friendly category slug',
    example: 'apartments'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category retrieved successfully',
    type: CategoryResponseDto
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryBySlug(
    @Param() params: GetCategoryBySlugParamsDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryBySlug request: ${params.vertical}/${params.slug}`);
    return this.categoriesService.getCategoryBySlug(params);
  }

  /**
   * Search for category by name
   * 
   * Finds a category by its name within a specific vertical.
   * Useful for auto-complete and search functionality.
   * 
   * @param query - Search parameters (name, vertical, type)
   * @returns Matching category
   */
  @Get('categories/search')
  @Public()
  @Version('1')
  @ApiTags('Categories - Public')
  @ApiOperation({ 
    summary: 'Search for category by name',
    description: `
      Finds a category by its name within a specific vertical.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      **Permission:** Public endpoint
      
      **Features:**
      • Case-insensitive search
      • Exact name matching
      • Can filter by type (MAIN, COMPLIMENTARY)
      • Returns first matching category
      
      **Use Cases:**
      • Auto-complete components
      • Category lookup by name
      • Import/export functionality
      • Admin tools
      
      **Limitations:**
      • Returns only exact matches
      • Consider using fuzzy search for partial matches
    `
  })
  @ApiQuery({ 
    name: 'name', 
    required: true,
    description: 'Category name to search for',
    example: 'Apartments'
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: true,
    description: 'Vertical to search within',
    enum: ['HOUSING', 'JOBS', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false,
    description: 'Filter by category type (MAIN or COMPLIMENTARY)',
    enum: ['MAIN', 'COMPLIMENTARY'],
    example: 'MAIN'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category found',
    type: CategoryResponseDto
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryByName(
    @Query() query: GetCategoryByNameQueryDto,
  ): Promise<BaseResponseDto<CategoryResponseDto>> {
    this.logger.debug(`REST getCategoryByName request: ${query.name}`);
    return this.categoriesService.getCategoryByName(query);
  }
}