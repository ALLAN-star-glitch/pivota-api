import {
  Body,
  Controller,
  Logger,
  Post,
  Get,
  Query,
  Version,
  UseGuards,
  Req,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceGrpcOfferingDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { RolesGuard } from '../../../guards/role.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { ContractorsGatewayService } from '../services/contractors-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';

/**
 * Helper decorator for SubscriptionGuard to identify module context
 */
const SetModule = (slug: string) => SetMetadata('module', slug);

@ApiTags('Contractors') // Main module tag
@ApiBearerAuth()
@Controller('contractors-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(private readonly contractorsService: ContractorsGatewayService) {}
 
  // ===========================================================
  // 🛠️ CONTRACTORS - SERVICE MANAGEMENT
  // ===========================================================

  /**
   * Create a service offering (contractor listing)
   * 
   * Allows verified providers to create service offerings that appear in discovery searches.
   * 
   * @param dto - Service offering details including title, description, pricing, etc.
   * @param req - JWT request containing user information
   * @returns Created service offering
   */
  @Post('listing')
  @Permissions('services.create') 
  @SetModule('services') 
  @Version('1')
  @ApiTags('Contractors - Services')
  @ApiOperation({ 
    summary: 'Create a service offering',
    description: `
      Creates a new service offering (contractor listing) in the system.
      
      **Microservice:** Listings Service
      **Authentication:** Required (JWT cookie)
      **Permission:** services.create
      
      **What are Service Offerings?**
      Service offerings are proactive listings created by contractors/providers
      to advertise their services. Unlike job posts (which are requests from employers),
      service offerings represent services that providers are offering to the market.
      
      **Provider Types:**
      • **Individual Providers** - Freelancers, sole proprietors
      • **Organization Providers** - Companies, agencies
      
      **Identity Population Rules:**
      • **For General Users:** Automatically uses their own userUuid and accountId from JWT
      • **For Admins:** Can override creatorId and accountId, or defaults to their own
      
      **Required Information:**
      • **title** - Name of the service (e.g., "Professional Plumbing Services")
      • **description** - Detailed service description
      • **categoryId** - Primary service category
      • **basePrice** - Starting price for the service
      • **priceUnit** - Pricing model (FIXED, PER_HOUR, PER_SESSION)
      • **locationCity** - City where service is offered
      • **verticals** - Pillars this service belongs to (e.g., ["JOBS", "HOUSING"])
      
      **Optional Information:**
      • **subCategoryId** - More specific categorization
      • **yearsExperience** - Provider's experience level
      • **availability** - Availability schedule (JSON string)
      • **images** - Service portfolio images
      
      **After Creation:**
      • Service becomes discoverable in search results
      • Can receive bookings from clients
      • Provider can manage through dashboard
    `
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Service offering created successfully',
    type: ServiceOfferingResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Service offering created successfully',
        code: 'CREATED',
        data: {
          id: 'srv_123abc',
          externalId: 'ext_456def',
          creatorId: 'usr_789ghi',
          accountId: 'acc_123abc',
          creatorName: 'John Doe',
          accountName: 'John Doe Plumbing',
          title: 'Professional Plumbing Services',
          description: 'Expert plumbing services for residential and commercial properties...',
          verticals: ['JOBS', 'HOUSING'],
          categoryId: 'cat_123abc',
          subCategoryId: 'cat_456def',
          basePrice: 5000,
          priceUnit: 'PER_HOUR',
          currency: 'KES',
          locationCity: 'Nairobi',
          locationNeighborhood: 'Kilimani',
          yearsExperience: 10,
          availability: '{"Mon-Fri": "8am-5pm", "Sat": "9am-12pm"}',
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Service with same details already exists' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createServiceOffering(
    @Body() dto: CreateServiceGrpcOfferingDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto>> {
    
    const { userUuid, accountId, role } = req.user;
    const isAdmin = ['SuperAdmin', 'SystemAdmin', 'BusinessSystemAdmin'].includes(role);

    /**
     * IDENTITY POPULATION
     * - Admin: Can provide a custom creator/account ID or default to their own.
     * - GeneralUser: Forced to use their own IDs from the JWT.
     */
    if (isAdmin) {
      dto.creatorId = dto.creatorId || userUuid;
      dto.accountId = dto.accountId || accountId;
    } else {
      dto.creatorId = userUuid;
      dto.accountId = accountId;
    }
    

    this.logger.debug(
      `[Services] Creating listing for Creator: ${dto.creatorId} under Account: ${dto.accountId}`,
    );

    return this.contractorsService.createServiceOffering(dto);
  }

  // ===========================================================
  // 🔍 CONTRACTORS - PUBLIC DISCOVERY
  // ===========================================================

  /**
   * Discover service offerings by vertical
   * 
   * Public endpoint to search and discover service offerings across different pillars.
   * 
   * @param dto - Search parameters including vertical, city, and filters
   * @returns List of matching service offerings
   */
  @Public()
  @Get('discovery')
  @Version('1')
  @ApiTags('Contractors - Discovery')
  @ApiOperation({ 
    summary: 'Discover service offerings by vertical',
    description: `
      Public endpoint to search and discover service offerings across different life pillars.
      
      **Microservice:** Listings Service
      **Authentication:** Not required
      
      **What is Discovery?**
      Discovery allows users to find service providers offering specific types of services
      in their area. Unlike job posts (employer-driven), discovery is provider-driven.
      
      **Search Capabilities:**
      • **By Vertical** - Filter by life pillar (JOBS, HOUSING, SOCIAL_SUPPORT, SERVICES)
      • **By Location** - Filter by city
      • **By Category** - Filter by service category
      • **By Price** - Price range filtering
      • **By Rating** - Filter by provider rating
      
      **Sorting:**
      • Results are sorted by relevance (combination of rating, experience, and recency)
      • Can be sorted by price, rating, or distance
      
      **Response Includes:**
      • Provider details (name, verification status, rating)
      • Service details (title, description, price)
      • Location information
      • Availability
      
      **Use Cases:**
      • Finding plumbers in Nairobi
      • Discovering tutors in a specific area
      • Finding verified electricians
      • Comparing service prices
    `
  })
  @ApiQuery({ 
    name: 'vertical', 
    required: true,
    description: 'Life pillar to search within',
    enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'SERVICES'],
    example: 'HOUSING'
  })
  @ApiQuery({ 
    name: 'city', 
    required: false,
    description: 'Filter by city',
    example: 'Nairobi'
  })
  @ApiQuery({ 
    name: 'categoryId', 
    required: false,
    description: 'Filter by service category',
    example: 'cat_123abc'
  })
  @ApiQuery({ 
    name: 'minPrice', 
    required: false,
    description: 'Minimum price filter',
    example: 1000,
    type: Number
  })
  @ApiQuery({ 
    name: 'maxPrice', 
    required: false,
    description: 'Maximum price filter',
    example: 10000,
    type: Number
  })
  @ApiQuery({ 
    name: 'minRating', 
    required: false,
    description: 'Minimum provider rating (1-5)',
    example: 4,
    type: Number
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false,
    description: 'Maximum number of results',
    example: 20,
    type: Number
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false,
    description: 'Pagination offset',
    example: 0,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service offerings retrieved successfully',
    type: [ServiceOfferingResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Service offerings retrieved successfully',
        code: 'OK',
        data: [
          {
            id: 'srv_123abc',
            title: 'Professional Plumbing Services',
            description: 'Expert plumbing services for residential properties...',
            accountName: 'John Doe Plumbing',
            basePrice: 5000,
            priceUnit: 'PER_HOUR',
            currency: 'KES',
            locationCity: 'Nairobi',
            locationNeighborhood: 'Kilimani',
            yearsExperience: 10,
            averageRating: 4.8,
            totalReviews: 45,
            isVerified: true,
            availability: '{"Mon-Fri": "8am-5pm"}',
            createdAt: '2026-03-01T10:30:00.000Z'
          },
          {
            id: 'srv_456def',
            title: 'Electrical Services',
            description: 'Licensed electrician for all electrical needs...',
            accountName: 'Safe Electrics Ltd',
            basePrice: 3500,
            priceUnit: 'PER_HOUR',
            currency: 'KES',
            locationCity: 'Nairobi',
            locationNeighborhood: 'Westlands',
            yearsExperience: 8,
            averageRating: 4.9,
            totalReviews: 67,
            isVerified: true,
            availability: '{"Mon-Fri": "8am-6pm", "Sat": "9am-1pm"}',
            createdAt: '2026-02-28T14:20:00.000Z'
          }
        ],
        pagination: {
          total: 156,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200,
    description: 'No service offerings found',
    schema: {
      example: {
        success: true,
        message: 'No service offerings match your criteria',
        code: 'SUCCESS_EMPTY',
        data: [],
        pagination: {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async getOfferingsByVertical(
    @Query() dto: GetOfferingByVerticalRequestDto,
  ): Promise<BaseResponseDto<ServiceOfferingResponseDto[]>> {
    this.logger.debug(`REST GetOfferingsByVertical: ${dto.vertical} in ${dto.city || 'All Cities'}`);
    
    return this.contractorsService.getOfferingsByVertical(dto);
  }
} 