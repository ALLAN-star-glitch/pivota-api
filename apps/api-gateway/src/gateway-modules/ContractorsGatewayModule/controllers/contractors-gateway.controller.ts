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
  GetOfferingsByCategoryRequestDto,
  GetOfferingsByProfessionalRequestDto,
  GetOfferingsByAccountRequestDto,
  GetOfferingByIdRequestDto,
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

  /**
   * Helper to parse boolean from query params
   * This fixes the "false" → true issue
   */
  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return !!value;
  }

  /**
   * Helper to parse number from query params
   */
  private parseNumber(value: any): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
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
  // GET MY SERVICE OFFERINGS (User-specific - No Cache)
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
    const dto: GetOfferingsByAccountRequestDto = { accountId };
    const response = await this.contractorsService.getOfferingsByAccount(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY ACCOUNT (Admin - No Cache)
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
    const dto: GetOfferingsByAccountRequestDto = { accountId };
    const response = await this.contractorsService.getOfferingsByAccount(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY PROFESSIONAL (Public - No Cache)
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
    const dto: GetOfferingsByProfessionalRequestDto = { professionalUuid: professionalId };
    const response = await this.contractorsService.getOfferingsByProfessional(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // PUBLIC DISCOVERY - Get by Vertical (With Cache Control)
  // ===========================================================

  @Public()
  @Get('service-offerings/discovery')
  @Version('1')
  @ApiOperation({ 
    summary: 'Discover service offerings by vertical',
    description: 'Public endpoint to search and discover service offerings.'
  })
  @ApiQuery({ name: 'vertical', required: true, enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'PROFESSIONAL_SERVICES'], example: 'HOUSING' })
  @ApiQuery({ name: 'city', required: false, example: 'Nairobi' })
  @ApiQuery({ name: 'categoryId', required: false, example: 'cmnboid7w006sarihf05x9txr' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 4 })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['rating', 'price_asc', 'price_desc', 'experience', 'recent'], example: 'rating' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(
      `REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const response = await this.contractorsService.getOfferingsByVertical(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET OFFERINGS BY CATEGORY (Public - With Cache Control)
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
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'Nairobi' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getOfferingsByCategory(
    @Param('categoryId') categoryId: string,
    @Query() dto: GetOfferingsByCategoryRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    dto.categoryId = categoryId;
    
    this.logger.debug(
      `REST GetOfferingsByCategory: ${categoryId}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}`
    );
    const response = await this.contractorsService.getOfferingsByCategory(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET ALL OFFERINGS (Public - With Cache Control)
  // IMPORTANT: This must come BEFORE the generic :id route
  // ===========================================================

  @Get('service-offerings/all')
  @Public()
  @Version('1')
  @ApiOperation({ 
    summary: 'Get all service offerings across all categories',
    description: 'Public endpoint to retrieve all active service offerings.'
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'Nairobi' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 500 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 5000 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['recent', 'price_asc', 'price_desc', 'rating'], example: 'recent' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 4 })
  @ApiQuery({ name: 'verifiedOnly', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'skipCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, example: 300 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Offerings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getAllOfferings(
    @Query() query: any,  // ✅ Use 'any' and manually parse
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    // ✅ MANUALLY PARSE ALL VALUES TO FIX THE BOOLEAN ISSUE
    const dto: GetAllOfferingsRequestDto = {
      limit: this.parseNumber(query.limit) || 20,
      offset: this.parseNumber(query.offset) || 0,
      city: query.city,
      minPrice: this.parseNumber(query.minPrice),
      maxPrice: this.parseNumber(query.maxPrice),
      sortBy: query.sortBy as any,
      minRating: this.parseNumber(query.minRating),
      verifiedOnly: this.parseBoolean(query.verifiedOnly),
      bypassCache: this.parseBoolean(query.bypassCache),
      skipCache: this.parseBoolean(query.skipCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 300,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.log(
      `📥 Incoming request: limit=${dto.limit}, offset=${dto.offset}, ` +
      `bypassCache=${dto.bypassCache}, skipCache=${dto.skipCache}, refreshCache=${dto.refreshCache}, ` +
      `readOnly=${dto.readOnly}, verifiedOnly=${dto.verifiedOnly}`
    );

    const response = await this.contractorsService.getAllOfferings(dto);
    
    if (!response.success) {
      throw response;
    }
    return response;
  }

  // ===========================================================
  // GET OFFERING BY ID (Public - With Cache Control)
  // IMPORTANT: This must come AFTER specific routes like /all, /me, etc.
  // ===========================================================

  @Get('service-offerings/:id')
  @Public()
  @Version('1')
  @ApiOperation({ summary: 'Get service offering by ID' })
  @ApiParam({ name: 'id', description: 'Service offering ID', example: 'cmnxxxxx' })
  @ApiQuery({ name: 'bypassCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'refreshCache', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'cacheTTL', required: false, type: Number, example: 600 })
  @ApiQuery({ name: 'readOnly', required: false, type: Boolean, example: false })
  @ApiResponse({ status: 200, description: 'Offering retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async getOfferingById(
    @Param('id') id: string,
    @Query() query: any,  // ✅ Use 'any' and manually parse
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    // ✅ MANUALLY PARSE ALL VALUES
    const dto: GetOfferingByIdRequestDto = {
      id: id,
      bypassCache: this.parseBoolean(query.bypassCache),
      refreshCache: this.parseBoolean(query.refreshCache),
      cacheTTL: this.parseNumber(query.cacheTTL) || 600,
      readOnly: this.parseBoolean(query.readOnly),
    };

    this.logger.debug(
      `REST GetOfferingById: id=${id}, ` +
      `bypassCache=${dto.bypassCache}, refreshCache=${dto.refreshCache}, readOnly=${dto.readOnly}`
    );

    const response = await this.contractorsService.getOfferingById(dto);
    
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