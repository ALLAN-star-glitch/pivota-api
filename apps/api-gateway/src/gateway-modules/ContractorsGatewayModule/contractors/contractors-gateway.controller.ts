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
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';
import { UserService } from '../../UserProfileGatewayModule/services/user.service';

@ApiTags('Contractors')
@ApiBearerAuth()
@Controller('contractors-module')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class ContractorsGatewayController {
  private readonly logger = new Logger(ContractorsGatewayController.name);

  constructor(private readonly contractorsService: ContractorsGatewayService,
     private readonly userService: UserService,
  ) {}
 
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

    return this.contractorsService.createServiceOffering(dto, userId, accountId);
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
    return this.contractorsService.getOfferingsByAccount(accountId);
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
    return this.contractorsService.getOfferingsByAccount(accountId);
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
    return this.contractorsService.getOfferingsByProfessional(professionalId);
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
    return this.contractorsService.getOfferingById(id);
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
    return this.contractorsService.updateServiceOffering(id, dto, userId);
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
    return this.contractorsService.deleteServiceOffering(id, userId);
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
    return this.contractorsService.getOfferingsByVertical(dto);
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
    return this.contractorsService.getOfferingsByCategory(
      categoryId, limit, offset, city, minPrice, maxPrice
    );
  }

  // ===========================================================
  // 📅 BOOKING MANAGEMENT - CLIENT ENDPOINTS
  // ===========================================================

 @Post('bookings')
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
  const clientId = req.user.sub;  // Get clientId from JWT token
  
  // Create the full request with clientId from JWT
  const fullRequest: CreateBookingRequestDto & { clientId: string } = {
    ...dto,
    clientId,  // Add the clientId from JWT
  };
  
  this.logger.debug(`Creating booking for client: ${clientId}, contractor: ${dto.contractorId}`);
  return this.contractorsService.createBooking(fullRequest);
}

  @Get('bookings/me/customer')
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Get my bookings as a customer' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], description: 'Filter by status' })
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
    const dto: GetCustomerBookingsRequestDto = {
      clientId,
      status,
      limit: limit || 20,
      offset: offset || 0,
    };
    this.logger.debug(`Fetching customer bookings for: ${clientId}`);
    return this.contractorsService.getMyBookingsAsCustomer(dto);
  }

@Get('bookings/me/contractor')
@Version('1')
@ApiTags('Contractors - Bookings')
@ApiOperation({ summary: 'Get my bookings as a contractor/professional' })
@ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], description: 'Filter by status' })
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
  // Get the user's skilled professional profile UUID
  const professionalProfile = await this.userService.getSkilledProfessionalByAccount(req.user.accountId);
  
  if (!professionalProfile.success || !professionalProfile.data) {
    return BaseResponseDto.fail(
      'No skilled professional profile found. Please create a professional profile first.',
      'PROFILE_NOT_FOUND'
    );
  }
  
  const contractorId = professionalProfile.data.uuid; // This is the professional UUID
  
  const dto: GetContractorBookingsRequestDto = {
    contractorId,
    status,
    limit: limit || 20,
    offset: offset || 0,
  };
   
  
  this.logger.debug(`Fetching contractor bookings for professional: ${contractorId} (user: ${req.user.sub})`);
  return this.contractorsService.getMyBookingsAsProfessional(dto);
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
    // Determine user type based on the relationship (this could be enhanced)
    // For now, we'll let the service figure it out by checking both roles
    const dto: GetBookingDetailsRequestDto = {
      bookingId,
      userId,
      userType: 'CLIENT', // Default, service will check both
    };
    this.logger.debug(`Fetching booking details: ${bookingId} for user: ${userId}`);
    return this.contractorsService.getBookingDetails(dto);
  }

  @Patch('bookings/:bookingId/accept')
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
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const contractorId = req.user.sub;
    const dto: AcceptBookingRequestDto = {
      bookingId,
      contractorId,
    };
    this.logger.debug(`Accepting booking: ${bookingId} by contractor: ${contractorId}`);
    return this.contractorsService.acceptBooking(dto);
  }

  @Patch('bookings/:bookingId/decline')
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
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const contractorId = req.user.sub;
    const dto: DeclineBookingRequestDto = {
      bookingId,
      contractorId,
      reason,
    };
    this.logger.debug(`Declining booking: ${bookingId} by contractor: ${contractorId}`);
    return this.contractorsService.declineBooking(dto);
  }

  @Patch('bookings/:bookingId/cancel')
  @Version('1')
  @ApiTags('Contractors - Bookings')
  @ApiOperation({ summary: 'Cancel a booking (Client or Contractor action)' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body('userType') userType: 'CLIENT' | 'CONTRACTOR',
    @Body('reason') reason: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const userId = req.user.sub;
    const dto: CancelBookingRequestDto = {
      bookingId,
      userId,
      userType,
      reason,
    };
    this.logger.debug(`Cancelling booking: ${bookingId} by: ${userType}`);
    return this.contractorsService.cancelBooking(dto);
  }

  @Patch('bookings/:bookingId/complete')
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
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const contractorId = req.user.sub;
    const dto: CompleteBookingRequestDto = {
      bookingId,
      contractorId,
    };
    this.logger.debug(`Completing booking: ${bookingId} by contractor: ${contractorId}`);
    return this.contractorsService.completeBooking(dto);
  }

  // ===========================================================
  // 📊 CONTRACTOR DASHBOARD ENDPOINTS
  // ===========================================================

  @Get('contractor/upcoming-bookings')
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
    const contractorId = req.user.sub;
    const dto: GetUpcomingBookingsRequestDto = {
      contractorId,
      limit: limit || 10,
    };
    this.logger.debug(`Fetching upcoming bookings for contractor: ${contractorId}`);
    return this.contractorsService.getUpcomingBookingsForProfessional(dto);
  }

  @Get('contractor/booking-stats')
  @Version('1')
  @ApiTags('Contractors - Dashboard')
  @ApiOperation({ summary: 'Get booking statistics for contractor dashboard' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfessionalBookingStats(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
    const contractorId = req.user.sub;
    const dto: GetProfessionalStatsRequestDto = {
      contractorId,
    };
    this.logger.debug(`Fetching booking stats for contractor: ${contractorId}`);
    return this.contractorsService.getProfessionalBookingStats(dto);
  }
}