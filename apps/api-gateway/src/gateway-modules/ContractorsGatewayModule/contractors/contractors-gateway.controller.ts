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
  ApiBody,
} from '@nestjs/swagger';

import {
  BaseResponseDto,
  ServiceOfferingResponseDto,
  GetOfferingByVerticalRequestDto,
  CreateServiceOfferingDto,
  UpdateServiceOfferingDto,
  // Booking DTOs
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  CancelBookingRequestDto,
  CompleteBookingRequestDto,
  GetCustomerBookingsRequestDto,
  GetContractorBookingsRequestDto,
  GetBookingDetailsRequestDto,
  GetUpcomingBookingsRequestDto,
  GetProfessionalStatsRequestDto,
  BookingResponseDto,
  BookingStatisticsResponseDto,
  PaginatedBookingsResponseDto,
  UpcomingBookingResponseDto,
  BookingActionResponseDto,
  BookingStatusListResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
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

@ApiTags('Contractors')
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
  // 🛠️ CONTRACTORS - SERVICE MANAGEMENT
  // ===========================================================

  @Post('service-offerings')
  @Permissions(P.PROFESSIONAL_SERVICES_CREATE_OWN)
  @Version('1')
  @ApiTags('Contractors - Services')
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
  @ApiTags('Contractors - Services')
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
  @ApiTags('Contractors - Services')
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
  @ApiTags('Contractors - Services')
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
  // GET OFFERING BY ID (Public)
  // ===========================================================

  @Get('service-offerings/:id')
  @Public()
  @Version('1')
  @ApiTags('Contractors - Services')
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
  @ApiTags('Contractors - Services')
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
  @ApiTags('Contractors - Services')
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

  // ===========================================================
  // 🔍 CONTRACTORS - PUBLIC DISCOVERY
  // ===========================================================

  @Public()
  @Get('service-offerings/discovery')
  @Version('1')
  @ApiTags('Contractors - Discovery')
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
  @ApiTags('Contractors - Services')
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
  // 📅 BOOKING MANAGEMENT - CLIENT ENDPOINTS
  // ===========================================================

  @Post('bookings')
  @Permissions(P.PROFESSIONAL_SERVICES_BOOK_OWN)
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Service offering or profiles not found' })
  @ApiResponse({ status: 409, description: 'Time slot conflict' })
  async createBooking(
    @Body() dto: CreateBookingRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const clientId = req.user.sub;
    const fullRequest: CreateBookingRequestDto & { clientId: string } = {
      ...dto,
      clientId,
    };

    this.logger.debug(`Creating booking for client: ${clientId}, contractor: ${dto.contractorId}`);

    const response = await this.contractorsService.createBooking(fullRequest);

    if (!response.success) {
      this.logger.error(`Failed to create booking for client: ${clientId}, contractor: ${dto.contractorId}`);
      throw response;
    }

    return response;
  }

  @Get('bookings/me/customer')
@Version('1')
@ApiTags('Contractors - Bookings')
@ApiOperation({ summary: 'Get my bookings as a customer' })
@ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'], description: 'Filter by status' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)' })
@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
@ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
async getMyBookingsAsCustomer(
  @Req() req: JwtRequest,
  @Query('status') status?: string,
  @Query('limit') limit?: number,
  @Query('offset') offset?: number,
): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
  const clientId = req.user.sub;
  const isPlatformAdmin = this.hasPlatformRole(req.user);  // ✅ Get the flag
  
  const dto: GetCustomerBookingsRequestDto & { isPlatformAdmin?: boolean } = {
    clientId,
    status,
    limit: limit || 20,
    offset: offset || 0,
    isPlatformAdmin,  // ✅ Pass it
  };
  
  this.logger.debug(`Fetching customer bookings for: ${clientId}, isPlatformAdmin: ${isPlatformAdmin}`);
  const response = await this.contractorsService.getMyBookingsAsCustomer(dto);
  
  if (!response.success) {
    throw response;
  }
  
  return response;
}

  @Get('bookings/me/contractor')
@Permissions(P.PROFESSIONAL_SERVICES_READ)
@Version('1')
@ApiTags('Contractors - Bookings')
@ApiOperation({ summary: 'Get my bookings as a contractor/professional' })
@ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'], description: 'Filter by status' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)' })
@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
@ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
async getMyBookingsAsProfessional(
  @Req() req: JwtRequest,
  @Query('status') status?: string,
  @Query('limit') limit?: number,
  @Query('offset') offset?: number,
): Promise<BaseResponseDto<PaginatedBookingsResponseDto>> {
  const contractorId = req.user.professionalId;
  const isPlatformAdmin = this.hasPlatformRole(req.user);

  if (!contractorId && !isPlatformAdmin) {
    const response = BaseResponseDto.fail(
      'No professional profile found. Please create a professional profile first.',
      'PROFILE_NOT_FOUND'
    );
    throw response;
  }

  const dto: GetContractorBookingsRequestDto & { isPlatformAdmin?: boolean } = {
    contractorId: contractorId || '',
    status,
    limit: limit || 20,
    offset: offset || 0,
    isPlatformAdmin,  // ✅ Pass it
  };

  this.logger.debug(`Fetching contractor bookings for professional: ${contractorId || 'platform-admin'} (user: ${req.user.sub}), isPlatformAdmin: ${isPlatformAdmin}`);
  const response = await this.contractorsService.getMyBookingsAsProfessional(dto);
  
  if (!response.success) {
    throw response;
  }
  
  return response;
}

   @Get('bookings/statuses')
  @Public()  
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Get all booking statuses for dropdown/UI' })
  @ApiResponse({ status: 200, description: 'Booking statuses retrieved successfully' })
  async getBookingStatuses(): Promise<BaseResponseDto<BookingStatusListResponseDto>> {
    this.logger.debug(`Fetching booking statuses`);
    const response = await this.contractorsService.getBookingStatuses();
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Get('bookings/:bookingId')
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Get booking details by ID' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiResponse({ status: 200, description: 'Booking details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingDetails(
    @Param('bookingId') bookingId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const userId = req.user.sub;
    const professionalId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);
    
    this.logger.debug(`Fetching booking details: ${bookingId} for userId: ${userId}, professionalId: ${professionalId}, isPlatformAdmin: ${isPlatformAdmin}`);
    
    // Pass isPlatformAdmin to service for authorization bypass
    const response = await this.contractorsService.getBookingDetails(bookingId, userId, professionalId, isPlatformAdmin);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Patch('bookings/:bookingId/accept')
  @Permissions(P.PROFESSIONAL_SERVICES_ACCEPT_OWN)
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Accept a booking (Contractor action)' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiResponse({ status: 200, description: 'Booking accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async acceptBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    // ✅ Platform admins are exempt from professionalId requirement
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: AcceptBookingRequestDto = {
      bookingId,
      contractorId: contractorId || '', // Allow empty for platform admins
    };
    
    this.logger.debug(`Accepting booking: ${bookingId} by contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.contractorsService.acceptBooking(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Patch('bookings/:bookingId/decline')
  @Permissions(P.PROFESSIONAL_SERVICES_DECLINE_OWN)
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Decline a booking (Contractor action)' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiResponse({ status: 200, description: 'Booking declined successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async declineBooking(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    // ✅ Platform admins are exempt from professionalId requirement
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: DeclineBookingRequestDto = {
      bookingId,
      contractorId: contractorId || '', // Allow empty for platform admins
      reason,
    };
    
    this.logger.debug(`Declining booking: ${bookingId} by contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.contractorsService.declineBooking(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Patch('bookings/:bookingId/cancel')
@Permissions(P.PROFESSIONAL_SERVICES_CANCEL_OWN)
@Version('1')
@ApiTags('Contractors - Bookings')
@ApiOperation({ summary: 'Cancel a booking' })
@ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      reason: { type: 'string', example: 'Changed my mind', description: 'Reason for cancellation' }
    }
  }
})
@ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
@ApiResponse({ status: 400, description: 'Invalid status transition' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
@ApiResponse({ status: 404, description: 'Booking not found' })
async cancelBooking(
  @Param('bookingId') bookingId: string,
  @Body('reason') reason: string,
  @Req() req: JwtRequest,
): Promise<BaseResponseDto<BookingActionResponseDto>> {
  const userId = req.user.sub;
  const professionalId = req.user.professionalId;
  const isPlatformAdmin = this.hasPlatformRole(req.user);
  
  this.logger.debug(`Cancelling booking: ${bookingId} by userId: ${userId}, professionalId: ${professionalId}, isPlatformAdmin: ${isPlatformAdmin}`);
  
  const response = await this.contractorsService.cancelBooking(bookingId, userId, professionalId, reason, isPlatformAdmin);  // ✅ Pass isPlatformAdmin
  
  if (!response.success) {
    throw response;
  }
  
  return response;
}

  @Patch('bookings/:bookingId/complete')
  @Permissions(P.PROFESSIONAL_SERVICES_COMPLETE_OWN)
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Complete a booking (Contractor action)' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async completeBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingActionResponseDto>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    // ✅ Platform admins are exempt from professionalId requirement
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: CompleteBookingRequestDto = {
      bookingId,
      contractorId: contractorId || '', // Allow empty for platform admins
    };
    
    this.logger.debug(`Completing booking: ${bookingId} by contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.contractorsService.completeBooking(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }


  // ===========================================================
  // 📊 CONTRACTOR DASHBOARD ENDPOINTS
  // ===========================================================

  @Get('contractor/upcoming-bookings')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
  @ApiTags('Contractors - Dashboard')
  @ApiOperation({ summary: 'Get upcoming bookings for contractor dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default: 10, max: 50)' })
  @ApiResponse({ status: 200, description: 'Upcoming bookings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUpcomingBookingsForProfessional(
    @Req() req: JwtRequest,
    @Query('limit') limit?: number,
  ): Promise<BaseResponseDto<UpcomingBookingResponseDto[]>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    // ✅ Platform admins are exempt from professionalId requirement
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: GetUpcomingBookingsRequestDto = {
      contractorId: contractorId || '', // Allow empty for platform admins
      limit: limit || 10,
    };
    
    this.logger.debug(`Fetching upcoming bookings for contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.contractorsService.getUpcomingBookingsForProfessional(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Get('contractor/booking-stats')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
  @ApiTags('Contractors - Dashboard')
  @ApiOperation({ summary: 'Get booking statistics for contractor dashboard' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfessionalBookingStats(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    // ✅ Platform admins are exempt from professionalId requirement
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: GetProfessionalStatsRequestDto = {
      contractorId: contractorId || '', // Allow empty for platform admins
    };
    
    this.logger.debug(`Fetching booking stats for contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.contractorsService.getProfessionalBookingStats(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}