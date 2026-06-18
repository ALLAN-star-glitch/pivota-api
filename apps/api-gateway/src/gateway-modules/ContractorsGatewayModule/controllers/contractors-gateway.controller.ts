"use strict";

import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Version,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
  GetAllOfferingsRequestDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthenticationGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { ContractorsGatewayService } from '../services/contractors-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug, isPlatformRole, RoleType } from '@pivota-api/access-management';
import { UserService } from '../../UserProfileGatewayModule/services/user.service';

@ApiTags('Contractors/Professionals Service Offerings')
@ApiBearerAuth()
@Controller('contractors-module')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(
    private readonly contractorsService: ContractorsGatewayService,
    private readonly userService: UserService,
  ) {}

  /**
   * Helper to check if user has platform role (bypass business logic)
   */
  private hasPlatformRole(user: JwtRequest['user']): boolean {
    const userRole = user.role as RoleType;
    return isPlatformRole(userRole);
  }
 
  // ===========================================================
  // SERVICE OFFERING MANAGEMENT
  // ===========================================================

  @Post('service-offerings')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN)
  @Version('1')
  @ApiOperation({ summary: 'Create a service offering' })
  @ApiResponse({ status: 201, description: 'Service offering created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Professional profile not found' })
  async createServiceOffering(
    @Body() dto: CreateServiceOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    const userId = req.user.sub;
    const accountId = req.user.accountId;

    this.logger.debug(`Creating service offering for user: ${userId}, account: ${accountId}`);

    const response = await this.contractorsService.createServiceOffering(dto, userId, accountId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET MY SERVICE OFFERINGS
  // ===========================================================

  @Get('service-offerings/me')
  @Version('1')
  @ApiOperation({ summary: 'Get my service offerings' })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyServiceOfferings(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    const accountId = req.user.accountId;
    const response = await this.contractorsService.getOfferingsByAccount(accountId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY ACCOUNT (Admin)
  // ===========================================================

  @Get('service-offerings/account/:accountId')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
  @ApiOperation({ summary: 'Get service offerings by account ID' })
  @ApiParam({ name: 'accountId', description: 'Account UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getOfferingsByAccount(
    @Param('accountId') accountId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    const response = await this.contractorsService.getOfferingsByAccount(accountId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY PROFESSIONAL (Public)
  // ===========================================================

  @Get('service-offerings/professional/:professionalId')
  @Public()
  @Version('1')
  @ApiOperation({ summary: 'Get service offerings by professional ID' })
  @ApiParam({ name: 'professionalId', description: 'Skilled professional UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  async getOfferingsByProfessional(
    @Param('professionalId') professionalId: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    const response = await this.contractorsService.getOfferingsByProfessional(professionalId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // PUBLIC DISCOVERY
  // ===========================================================

  @Public()
  @Get('service-offerings/discovery')
  @Version('1')
  @ApiOperation({ 
    summary: 'Discover service offerings by vertical',
    description: 'Public endpoint to search and discover service offerings. The vertical is determined by the category associated with the offering.'
  })
  @ApiQuery({ name: 'vertical', required: true, enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'PROFESSIONAL_SERVICES'], example: 'HOUSING', description: 'Filter by category vertical (e.g., HOUSING for home services)' })
  @ApiQuery({ name: 'city', required: false, example: 'Nairobi' })
  @ApiQuery({ name: 'categoryId', required: false, example: 'cmnboid7w006sarihf05x9txr' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 4 })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['rating', 'price_asc', 'price_desc', 'experience', 'recent'], example: 'rating' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}`);
    const response = await this.contractorsService.getOfferingsByVertical(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY CATEGORY (Public)
  // ===========================================================

  @Get('service-offerings/category/:categoryId')
  @Public()
  @Version('1')
  @ApiOperation({ 
    summary: 'Get service offerings by category ID',
    description: 'Retrieves all active service offerings for a specific COMPLIMENTARY category.'
  })
  @ApiParam({ 
    name: 'categoryId', 
    description: 'Category ID (must be COMPLIMENTARY type)',
    example: 'cmnboid7w006sarihf05x9txr'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 5000 })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getOfferingsByCategory(
    @Param('categoryId') categoryId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByCategory: ${categoryId}`);
    const response = await this.contractorsService.getOfferingsByCategory(
      categoryId, limit, offset, city, minPrice, maxPrice
    );
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // NEW: GET ALL OFFERINGS (Across all categories)
  // IMPORTANT: This must come BEFORE the generic :id route
  // ===========================================================

  @Get('service-offerings/all')
  @Public()
  @Version('1')
  @ApiOperation({ 
    summary: 'Get all service offerings across all categories',
    description: 'Public endpoint to retrieve all active service offerings with pagination and filtering options.'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)', example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city', example: 'Nairobi' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter', example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter', example: 5000 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['recent', 'price_asc', 'price_desc', 'rating'], description: 'Sort by option', example: 'recent' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum rating filter (1-5)', example: 4 })
  @ApiQuery({ name: 'verifiedOnly', required: false, type: Boolean, description: 'Show only verified professionals', example: true })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getAllOfferings(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'rating',
    @Query('minRating') minRating?: number,
    @Query('verifiedOnly') verifiedOnly?: boolean,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetAllOfferings: limit=${limit}, offset=${offset}, sortBy=${sortBy}, minRating=${minRating}`);
    const response = await this.contractorsService.getAllOfferings(
      limit, offset, city, minPrice, maxPrice, sortBy, minRating, verifiedOnly
    );
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERING BY ID (Public)
  // IMPORTANT: This must come AFTER specific routes like /all, /me, etc.
  // ===========================================================

  @Get('service-offerings/:id')
  @Public()
  @Version('1')
  @ApiOperation({ summary: 'Get service offering by ID' })
  @ApiParam({ name: 'id', description: 'Service offering ID', example: 'cmnxxxxx' })
  @ApiResponse({ status: 200, description: 'Offering retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async getOfferingById(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    const response = await this.contractorsService.getOfferingById(id);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // UPDATE SERVICE OFFERING
  // ===========================================================

  @Patch('service-offerings/:id')
  @Permissions(P.PROFESSIONAL_SERVICES_UPDATE_OWN)
  @Version('1')
  @ApiOperation({ summary: 'Update a service offering' })
  @ApiParam({ name: 'id', description: 'Service offering ID', example: 'cmnxxxxx' })
  @ApiResponse({ status: 200, description: 'Offering updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async updateServiceOffering(
    @Param('id') id: string,
    @Body() dto: UpdateServiceOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    const userId = req.user.sub;
    const response = await this.contractorsService.updateServiceOffering(id, dto, userId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // DELETE SERVICE OFFERING
  // ===========================================================

  @Delete('service-offerings/:id')
  @Permissions(P.PROFESSIONAL_SERVICES_DELETE_OWN)
  @Version('1')
  @ApiOperation({ summary: 'Delete a service offering' })
  @ApiParam({ name: 'id', description: 'Service offering ID', example: 'cmnxxxxx' })
  @ApiResponse({ status: 200, description: 'Offering deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async deleteServiceOffering(
    @Param('id') id: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const userId = req.user.sub;
    const response = await this.contractorsService.deleteServiceOffering(id, userId);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}