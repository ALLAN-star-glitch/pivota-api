import {
  Controller,
  Logger,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';


import {
  BaseResponseDto,
  CreateBookingRequestDto,
  AcceptBookingRequestDto,
  DeclineBookingRequestDto,
  GetCustomerBookingsRequestDto,
  GetContractorBookingsRequestDto,
  GetUpcomingBookingsRequestDto,
  GetProfessionalStatsRequestDto,
  BookingResponseDto,
  BookingStatisticsResponseDto,
  PaginatedBookingsResponseDto,
  UpcomingBookingResponseDto,
  BookingActionResponseDto,
  BookingStatusListResponseDto,
} from '@pivota-api/dtos';

import { JwtAuthGuard } from '../../AuthenticationGatewayModule/jwt.guard';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { JwtRequest } from '@pivota-api/interfaces';
import { BookingGatewayService } from '../services/booking-gateway.service';

// Custom Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { Public } from '../../../decorators/public.decorator';
import { SetModule } from '../../../decorators/set-module.decorator';
import { Permissions as P, ModuleSlug, isPlatformRole, RoleType } from '@pivota-api/access-management';

@ApiTags('Contractors/Professionals Bookings')
@ApiBearerAuth()
@Controller('bookings')
@SetModule(ModuleSlug.PROFESSIONAL_SERVICES)
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class BookingGatewayController {
  private readonly logger = new Logger(BookingGatewayController.name);

  constructor(
    private readonly bookingService: BookingGatewayService,
  ) {}

  /**
   * Helper to check if user has platform role (bypass business logic)
   */
  private hasPlatformRole(user: JwtRequest['user']): boolean {
    const userRole = user.role as RoleType;
    return isPlatformRole(userRole);
  }

  // ===========================================================
  // BOOKING STATUS
  // ===========================================================

  @Get('statuses')
  @Public()
  @Version('1')
  @ApiOperation({ summary: 'Get all booking statuses for dropdown/UI' })
  @ApiResponse({ status: 200, description: 'Booking statuses retrieved successfully' })
  async getBookingStatuses(): Promise<BaseResponseDto<BookingStatusListResponseDto>> {
    this.logger.debug(`Fetching booking statuses`);
    const response = await this.bookingService.getBookingStatuses();
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // BOOKING CRUD OPERATIONS
  // ===========================================================

  @Post()
  @Version('1')
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
    const isPlatformAdmin = this.hasPlatformRole(req.user);
    
    const request = {
      ...dto,
      clientId,
      isPlatformAdmin,
    };

    this.logger.debug(`Creating booking for client: ${clientId}, contractor: ${dto.contractorId}`);

    const response = await this.bookingService.createBooking(request);

    if (!response.success) {
      this.logger.error(`Failed to create booking for client: ${clientId}, contractor: ${dto.contractorId}`);
      throw response;
    }

    return response;
  }

  // ===========================================================
  // GET MY BOOKINGS
  // ===========================================================

  @Get('me/customer')
  @Version('1')
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
    const isPlatformAdmin = this.hasPlatformRole(req.user);
    
    const dto: GetCustomerBookingsRequestDto & { isPlatformAdmin?: boolean } = {
      clientId,
      status,
      limit: limit || 20,
      offset: offset || 0,
      isPlatformAdmin,
    };
    
    this.logger.debug(`Fetching customer bookings for: ${clientId}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.getMyBookingsAsCustomer(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Get('me/contractor')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
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
      isPlatformAdmin,
    };

    this.logger.debug(`Fetching contractor bookings for professional: ${contractorId || 'platform-admin'} (user: ${req.user.sub}), isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.getMyBookingsAsProfessional(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // GET BOOKING DETAILS
  // ===========================================================

  @Get(':bookingId')
  @Version('1')
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
    
    const response = await this.bookingService.getBookingDetails(bookingId, userId, professionalId, isPlatformAdmin);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // BOOKING ACTIONS
  // ===========================================================

  @Patch(':bookingId/accept')
  @Permissions(P.PROFESSIONAL_SERVICES_ACCEPT_OWN)
  @Version('1')
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

    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: AcceptBookingRequestDto & { isPlatformAdmin?: boolean } = {
      bookingId,
      contractorId: contractorId || '',
      isPlatformAdmin,
    };
    
    this.logger.debug(`Accepting booking: ${bookingId} by contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.acceptBooking(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Patch(':bookingId/decline')
  @Permissions(P.PROFESSIONAL_SERVICES_DECLINE_OWN)
  @Version('1')
  @ApiOperation({ summary: 'Decline a booking (Contractor action)' })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', example: 'Schedule conflict', description: 'Reason for declining' }
      }
    }
  })
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

    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: DeclineBookingRequestDto & { isPlatformAdmin?: boolean } = {
      bookingId,
      contractorId: contractorId || '',
      reason,
      isPlatformAdmin,
    };
    
    this.logger.debug(`Declining booking: ${bookingId} by contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.declineBooking(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Patch(':bookingId/cancel')
  @Permissions(P.PROFESSIONAL_SERVICES_CANCEL_OWN)
  @Version('1')
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
    
    const response = await this.bookingService.cancelBooking(bookingId, userId, professionalId, reason, isPlatformAdmin);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  // ===========================================================
  // CONTRACTOR DASHBOARD
  // ===========================================================

  @Get('contractor/upcoming')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
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

    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: GetUpcomingBookingsRequestDto & { isPlatformAdmin?: boolean } = {
      contractorId: contractorId || '',
      limit: limit || 10,
      isPlatformAdmin,
    };
    
    this.logger.debug(`Fetching upcoming bookings for contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.getUpcomingBookingsForProfessional(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }

  @Get('contractor/stats')
  @Permissions(P.PROFESSIONAL_SERVICES_READ)
  @Version('1')
  @ApiOperation({ summary: 'Get booking statistics for contractor dashboard' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfessionalBookingStats(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<BookingStatisticsResponseDto>> {
    const contractorId = req.user.professionalId;
    const isPlatformAdmin = this.hasPlatformRole(req.user);

    
    if (!contractorId && !isPlatformAdmin) {
      const response = BaseResponseDto.fail(
        'No professional profile found. Please create a professional profile first.',
        'PROFILE_NOT_FOUND'
      );
      throw response;
    }

    const dto: GetProfessionalStatsRequestDto & { isPlatformAdmin?: boolean } = {
      contractorId: contractorId || '',
      isPlatformAdmin,
    };
    
    this.logger.debug(`Fetching booking stats for contractor: ${contractorId || 'platform-admin'}, isPlatformAdmin: ${isPlatformAdmin}`);
    const response = await this.bookingService.getProfessionalBookingStats(dto);
    
    if (!response.success) {
      throw response;
    }
    
    return response;
  }
}