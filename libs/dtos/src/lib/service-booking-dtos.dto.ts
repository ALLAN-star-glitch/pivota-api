import { 
  IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsDateString, 
  IsIn, Min, IsObject, ValidateNested, IsArray, Max, IsPositive
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/* ======================================================
   BOOKING DTOS
   ======================================================
   These DTOs handle the booking lifecycle for service professionals
   
   Booking Flow:
   1. CLIENT creates booking (PENDING)
   2. CONTRACTOR accepts/declines booking
   3. If accepted: CONFIRMED -> service performed -> COMPLETED
   4. If declined or cancelled: CANCELLED
   
   Status Transitions:
   PENDING -> CONFIRMED (contractor accepts)
   PENDING -> CANCELLED (contractor declines OR client cancels)
   CONFIRMED -> COMPLETED (contractor finishes service)
   CONFIRMED -> CANCELLED (either party cancels)
*/

/* ======================================================
   REQUEST DTOS
   =====================================================*/

/**
 * DTO for creating a new service booking
 * 
 * @example
 * {
 *   "serviceId": "cmnboid7w006sarihf05x9txr",
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "scheduledDate": "2024-03-25T14:00:00",
 *   "locationCity": "Nairobi",
 *   "customerNotes": "Please call when you arrive at the gate",
 *   "durationHours": 2
 * }
 */
export class CreateBookingRequestDto {
  @ApiProperty({ description: 'Service offering external UUID', example: 'cmnboid7w006sarihf05x9txr' })
  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'Professional\'s UUID', example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e' })
  @IsUUID()
  @IsNotEmpty()
  contractorId!: string;

  // Note: clientId comes from JWT, not from request body

  @ApiProperty({ 
    description: 'When the service should be performed (Nairobi local time, EAT UTC+3. Do not include Z or timezone offset)',
    example: '2024-03-25T14:00:00'
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate!: Date;

  @ApiPropertyOptional({ description: 'Override location', example: 'Nairobi' })
  @IsOptional()
  @IsString()
  locationCity?: string;

  @ApiPropertyOptional({ description: 'Special instructions', example: 'Please call when you arrive at the gate' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  // Duration fields (only one should be provided based on priceUnit)
  @ApiPropertyOptional({ description: 'Duration in hours (for PER_HOUR services)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  durationHours?: number;

  @ApiPropertyOptional({ description: 'Duration in days (for PER_DAY services)', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Duration in weeks (for PER_WEEK services)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationWeeks?: number;

  @ApiPropertyOptional({ description: 'Duration in months (for PER_MONTH services)', example: 3 })
  @IsOptional()
  @IsNumber() 
  @Min(1)
  durationMonths?: number;
}

/**
 * DTO for updating booking status (accept/decline/complete)
 * 
 * @example
 * // Accept a booking
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "status": "CONFIRMED",
 *   "performedBy": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e"
 * }
 * 
 * @example
 * // Decline with reason
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "status": "DECLINED",
 *   "reason": "Not available on that date",
 *   "performedBy": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e"
 * }
 */
export class UpdateBookingStatusRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking to update',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'New status for the booking',
    enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'],
    enumName: 'BookingStatus',
    required: true,
    examples: {
      confirm: { summary: 'Contractor accepts', value: 'CONFIRMED' },
      complete: { summary: 'Service finished', value: 'COMPLETED' },
      cancel: { summary: 'Cancel booking', value: 'CANCELLED' },
      decline: { summary: 'Contractor rejects', value: 'DECLINED' }
    }
  })
  @IsIn(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED'], { 
    message: 'status must be one of: CONFIRMED, COMPLETED, CANCELLED, DECLINED' 
  })
  status!: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';

  @ApiPropertyOptional({ 
    description: 'Reason for cancellation or decline (required when status is CANCELLED or DECLINED)',
    example: 'Client requested cancellation due to schedule conflict',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;

  @ApiProperty({ 
    description: 'UUID of the user performing the action (must match contractorId for accept/decline, or either party for cancel)',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'performedBy must be a valid UUID v4' })
  @IsNotEmpty({ message: 'performedBy is required' })
  performedBy!: string;
}

/**
 * DTO for retrieving bookings with filtering and pagination
 * 
 * @example
 * // Get client's confirmed bookings
 * {
 *   "userId": "7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e",
 *   "userType": "CLIENT",
 *   "status": "CONFIRMED",
 *   "limit": 20,
 *   "offset": 0
 * }
 * 
 * @example
 * // Get contractor's pending bookings
 * {
 *   "userId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "userType": "CONTRACTOR",
 *   "status": "PENDING",
 *   "limit": 10,
 *   "offset": 0
 * }
 */
export class GetBookingsRequestDto {
  @ApiProperty({ 
    description: 'User UUID (can be either client or contractor depending on userType)',
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e',
    required: true 
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiProperty({ 
    description: 'Type of user - determines which bookings to fetch',
    enum: ['CLIENT', 'CONTRACTOR'],
    enumName: 'UserType',
    required: true,
    examples: {
      client: 'Get bookings made by this user',
      contractor: 'Get bookings requested to this professional'
    }
  })
  @IsIn(['CLIENT', 'CONTRACTOR'], { message: 'userType must be either CLIENT or CONTRACTOR' })
  userType!: 'CLIENT' | 'CONTRACTOR';

  @ApiPropertyOptional({ 
    description: 'Filter bookings by status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'PENDING'
  })
  @IsOptional()
  @IsString({ message: 'status must be a string' })
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Number of records to return (pagination)',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'limit must be a number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Number of records to skip (pagination)',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'offset must be a number' })
  @Min(0, { message: 'offset must be at least 0' })
  offset?: number = 0;
}

/**
 * DTO for cancelling a booking (can be initiated by either party)
 * 
 * @example
 * // Client cancels
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "userId": "7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e",
 *   "reason": "Found another service provider"
 * }
 */
export class CancelBookingRequestDto {
  @ApiProperty({ description: 'Booking external ID (UUID)' })
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({ description: 'User UUID cancelling the booking' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ description: 'UUID of the professional associated with the booking' })
  @IsUUID()
  @IsOptional()
  professionalId?: string;  

  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for accepting a booking (contractor action)
 * 
 * @example
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e"
 * }
 */
export class AcceptBookingRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking to accept',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the contractor accepting the booking (must match booking.contractorId)',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;
}

/**
 * DTO for declining a booking (contractor action)
 * 
 * @example
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "reason": "Schedule conflict - already booked for that time"
 * }
 */
export class DeclineBookingRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking to decline',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the contractor declining the booking (must match booking.contractorId)',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;

  @ApiPropertyOptional({ 
    description: 'Reason for declining (helps client understand and improves matching)',
    example: 'Not available on that date, please choose another date',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
  reason?: string;
}

/**
 * DTO for completing a booking (contractor action)
 * 
 * @example
 * {
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e"
 * }
 */
export class CompleteBookingRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking to mark as completed',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the contractor completing the service (must match booking.contractorId)',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;
}

/* ======================================================
   RESPONSE DTOS
   =====================================================*/

/**
 * Minimal response for booking actions (accept, decline, cancel, complete)
 * Used when the client only needs confirmation, not full booking details
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "status": "CANCELLED",
 *   "updatedAt": "2026-06-05T18:22:00.000Z"
 * }
 */
export class BookingActionResponseDto {
  @ApiProperty({ 
    description: 'Booking unique identifier',
    example: 'cmq16vtkb0000cn6nsr8ot0e0'
  })
  id!: string;

  @ApiProperty({ 
    description: 'New booking status',
    enum: ['CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'CANCELLED'
  })
  status!: string;

  @ApiProperty({ 
    description: 'Last update timestamp',
    example: '2026-06-05T18:22:00.000Z'
  })
  updatedAt!: Date;
}

/**
 * Basic service information included in booking response
 */
export class BookingServiceInfoDto {
  @ApiProperty({ 
    description: 'Service offering unique identifier',
    example: 'cmnboid7w006sarihf05x9txr'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Title of the service',
    example: 'Professional House Painting'
  })
  title!: string;

  @ApiProperty({ 
    description: 'Base price of the service',
    example: 5000
  })
  basePrice!: number;

  @ApiProperty({ 
    description: 'Pricing unit (PER_HOUR, PER_DAY, FIXED, etc.)',
    example: 'PER_HOUR'
  })
  priceUnit!: string;

  @ApiProperty({ 
    description: 'Currency code',
    example: 'KES'
  })
  currency!: string;
}

/**
 * Client information included in booking response
 */
export class BookingClientInfoDto {
  @ApiProperty({ 
    description: 'Client\'s unique identifier',
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e'
  })
  uuid!: string;

  @ApiProperty({ 
    description: 'Client\'s full name',
    example: 'John Doe'
  })
  name!: string;

  @ApiProperty({ 
    description: 'Client\'s email address (for communication)',
    example: 'john.doe@example.com'
  })
  email!: string;

  @ApiProperty({ 
    description: 'Client\'s phone number (for M-PESA and SMS)',
    example: '+254712345678'
  })
  phone!: string;
}

/**
 * Contractor information included in booking response
 */
export class BookingContractorInfoDto {
  @ApiProperty({ 
    description: 'Contractor\'s unique identifier',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e'
  })
  uuid!: string;

  @ApiProperty({ 
    description: 'Contractor\'s display name',
    example: 'Jane Smith - Professional Painter'
  })
  name!: string;

  @ApiPropertyOptional({ 
    description: 'URL to contractor\'s profile image',
    example: 'https://storage.pivotaconnect.com/profiles/jane-smith.jpg'
  })
  profileImage?: string;

  @ApiProperty({ 
    description: 'Whether the contractor is verified by the platform',
    example: true
  })
  isVerified!: boolean;

  @ApiProperty({ 
    description: 'Contractor\'s average rating (0-5)',
    example: 4.8,
    minimum: 0,
    maximum: 5
  })
  rating!: number;

  @ApiProperty({ 
    description: 'Contractor\'s phone number (for direct contact)',
    example: '+254798765432'
  })
  phone!: string;

  @ApiProperty({ 
    description: 'Contractor\'s email address',
    example: 'jane.smith@painter.com'
  })
  email!: string;
}

/**
 * Detailed service information for booking response
 */
export class BookingServiceDetailsDto {
  @ApiProperty({ 
    description: 'Service offering ID',
    example: 'cmnboid7w006sarihf05x9txr'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Service title',
    example: 'Professional House Painting'
  })
  title!: string;

  @ApiPropertyOptional({ 
    description: 'Detailed service description',
    example: 'High-quality interior and exterior painting services using premium paints.'
  })
  description?: string;

  @ApiProperty({ 
    description: 'Base price of the service',
    example: 5000
  })
  basePrice!: number;

  @ApiProperty({ 
    description: 'Pricing unit',
    example: 'PER_HOUR'
  })
  priceUnit!: string;

  @ApiPropertyOptional({ 
    description: 'Service category name',
    example: 'Painting'
  })
  category?: string;

  @ApiProperty({ 
    description: 'City where service is offered',
    example: 'Nairobi'
  })
  locationCity!: string;

  @ApiPropertyOptional({ 
    description: 'Specific neighborhood',
    example: 'Westlands'
  })
  locationNeighborhood?: string;
}

/**
 * Complete booking response DTO (for GET endpoints and POST /bookings)
 */
export class BookingResponseDto {
  @ApiProperty({ 
    description: 'Booking unique identifier',
    example: 'cmq16vtkb0000cn6nsr8ot0e0'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Public-facing booking identifier',
    example: '3784904e-0524-4146-bcee-22009a0a748a'
  })
  externalId!: string;

  @ApiProperty({ 
    description: 'Contractor UUID',
    example: '4bedf398-3649-4653-9e99-2a9a4efdb3ee'
  })
  contractorId!: string;

  @ApiProperty({ 
    description: 'Client UUID',
    example: 'b9668188-c98d-4deb-af8a-232ea9a78702'
  })
  clientId!: string;

  @ApiPropertyOptional({ 
    description: 'Service offering ID (if applicable)',
    example: 'cmpr6hgen0003dt84f83qtl2o'
  })
  serviceId?: string | null;

  @ApiPropertyOptional({ 
    description: 'Service information snapshot',
    type: BookingServiceInfoDto
  })
  service?: BookingServiceInfoDto | null;

  @ApiPropertyOptional({ 
    description: 'Contractor name (denormalized for performance)',
    example: 'Allantezz Mathenge'
  })
  contractorName?: string | null;

  @ApiPropertyOptional({ 
    description: 'Service title (denormalized for performance)',
    example: 'House Cleaning Services'
  })
  serviceTitle?: string | null;

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'PENDING'
  })
  status!: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled date and time for the service',
    example: '2026-08-25T15:00:00.000Z'
  })
  scheduledDate?: Date | null;

  @ApiPropertyOptional({ 
    description: 'City where service will be performed',
    example: 'Nairobi'
  })
  locationCity?: string | null;

  @ApiPropertyOptional({ 
    description: 'Agreed price for the service',
    example: 90000
  })
  agreedPrice?: number | null;

  @ApiProperty({ 
    description: 'Currency code',
    example: 'KES'
  })
  currency!: string;

  @ApiPropertyOptional({ 
    description: 'Customer notes/instructions',
    example: 'Please call when you arrive at the gate'
  })
  customerNotes?: string | null;

  @ApiProperty({ 
    description: 'Booking creation timestamp',
    example: '2026-06-05T20:19:39.000Z'
  })
  createdAt!: Date;

  @ApiProperty({ 
    description: 'Last update timestamp',
    example: '2026-06-05T21:22:00.000Z'
  })
  updatedAt!: Date;

  @ApiPropertyOptional({ 
    description: 'Client information (populated when requested)',
    type: BookingClientInfoDto
  })
  client?: BookingClientInfoDto;

  @ApiPropertyOptional({ 
    description: 'Contractor information (populated when requested)',
    type: BookingContractorInfoDto
  })
  contractor?: BookingContractorInfoDto;

  @ApiPropertyOptional({ 
    description: 'Service details (populated when requested)',
    type: BookingServiceDetailsDto
  })
  serviceDetails?: BookingServiceDetailsDto;
}

/**
 * Booking statistics for contractor dashboard
 * 
 * @example
 * {
 *   "total": 45,
 *   "pending": 3,
 *   "confirmed": 12,
 *   "completed": 28,
 *   "cancelled": 2,
 *   "upcoming": 8,
 *   "completedThisMonth": 5
 * }
 */
export class BookingStatisticsResponseDto {
  @ApiProperty({ 
    description: 'Total number of bookings (all time)',
    example: 45,
    minimum: 0
  })
  total!: number;

  @ApiProperty({ 
    description: 'Number of pending bookings awaiting contractor response',
    example: 3,
    minimum: 0
  })
  pending!: number;

  @ApiProperty({ 
    description: 'Number of confirmed bookings (accepted but not completed)',
    example: 12,
    minimum: 0
  })
  confirmed!: number;

  @ApiProperty({ 
    description: 'Number of successfully completed bookings',
    example: 28,
    minimum: 0
  })
  completed!: number;

  @ApiProperty({ 
    description: 'Number of cancelled/declined bookings',
    example: 2,
    minimum: 0
  })
  cancelled!: number;

  @ApiProperty({ 
    description: 'Number of upcoming confirmed bookings (future dates)',
    example: 8,
    minimum: 0
  })
  upcoming!: number;

  @ApiProperty({ 
    description: 'Number of bookings completed in current month',
    example: 5,
    minimum: 0
  })
  completedThisMonth!: number;
}

/**
 * Simplified booking info for dashboard display
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "serviceTitle": "House Cleaning Services",
 *   "scheduledDate": "2026-08-25T15:00:00.000Z",
 *   "locationCity": "Nairobi",
 *   "clientName": "Allan Muthoni",
 *   "clientPhone": "254790123456",
 *   "agreedPrice": 90000,
 *   "currency": "KES"
 * }
 */
export class UpcomingBookingResponseDto {
  @ApiProperty({ 
    description: 'Booking ID',
    example: 'cmq16vtkb0000cn6nsr8ot0e0'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Service title',
    example: 'House Cleaning Services'
  })
  serviceTitle!: string | null;

  @ApiProperty({ 
    description: 'Scheduled date and time',
    example: '2026-08-25T15:00:00.000Z'
  })
  scheduledDate!: Date | null;

  @ApiProperty({ 
    description: 'Service location city',
    example: 'Nairobi'
  })
  locationCity!: string | null;

  @ApiProperty({ 
    description: 'Client name',
    example: 'Allan Muthoni'
  })
  clientName!: string | null;

  @ApiProperty({ 
    description: 'Client phone number (for contact)',
    example: '254790123456'
  })
  clientPhone!: string | null;

  @ApiProperty({ 
    description: 'Agreed service price',
    example: 90000
  })
  agreedPrice!: number | null;

  @ApiProperty({ 
    description: 'Currency code',
    example: 'KES'
  })
  currency!: string;
}

/**
 * Paginated response for booking lists
 */
export class PaginatedBookingsResponseDto {
  @ApiProperty({ 
    description: 'Array of booking items for current page',
    type: [BookingResponseDto]
  })
  items!: BookingResponseDto[];

  @ApiProperty({ 
    description: 'Total number of bookings matching the query',
    example: 45
  })
  total!: number;

  @ApiProperty({ 
    description: 'Number of items per page',
    example: 20
  })
  limit!: number;

  @ApiProperty({ 
    description: 'Number of items skipped',
    example: 0
  })
  offset!: number;

  @ApiProperty({ 
    description: 'Whether there are more items available',
    example: true
  })
  hasMore!: boolean;
}

/**
 * DTO for getting customer bookings (client view)
 * 
 * @example
 * {
 *   "clientId": "7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e",
 *   "status": "CONFIRMED",
 *   "limit": 20,
 *   "offset": 0
 * }
 */
export class GetCustomerBookingsRequestDto {
  @ApiProperty({ 
    description: 'Client UUID - the customer whose bookings to fetch',
    example: 'b9668188-c98d-4deb-af8a-232ea9a78702',
    required: true 
  })
  @IsUUID('4', { message: 'clientId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'clientId is required' })
  clientId!: string;

  @ApiPropertyOptional({ 
    description: 'Filter bookings by status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'CONFIRMED'
  })
  @IsOptional()
  @IsString({ message: 'status must be a string' })
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Number of records to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'limit must be a number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Number of records to skip',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'offset must be a number' })
  @Min(0, { message: 'offset must be at least 0' })
  offset?: number = 0;
}

/**
 * DTO for getting contractor bookings (professional view)
 * 
 * @example
 * {
 *   "contractorId": "4bedf398-3649-4653-9e99-2a9a4efdb3ee",
 *   "status": "PENDING",
 *   "limit": 10,
 *   "offset": 0
 * }
 */
export class GetContractorBookingsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose bookings to fetch',
    example: '4bedf398-3649-4653-9e99-2a9a4efdb3ee',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;

  @ApiPropertyOptional({ 
    description: 'Filter bookings by status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'PENDING'
  })
  @IsOptional()
  @IsString({ message: 'status must be a string' })
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Number of records to return',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'limit must be a number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Number of records to skip',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'offset must be a number' })
  @Min(0, { message: 'offset must be at least 0' })
  offset?: number = 0;
}

/**
 * DTO for getting booking details
 * 
 * @example
 * {
 *   "bookingId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "userId": "b9668188-c98d-4deb-af8a-232ea9a78702"
 * }
 */
export class GetBookingDetailsRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking (external ID)',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the user requesting details',
    example: 'b9668188-c98d-4deb-af8a-232ea9a78702',
    required: true 
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiPropertyOptional({
    description: 'UUID of the professional associated with the booking',
    example: '4bedf398-3649-4653-9e99-2a9a4efdb3ee',
  })
  @IsUUID('4', { message: 'professionalId must be a valid UUID v4' })
  professionalId?: string;  
}

/**
 * DTO for getting upcoming bookings for a professional
 * 
 * @example
 * {
 *   "contractorId": "4bedf398-3649-4653-9e99-2a9a4efdb3ee",
 *   "limit": 10
 * }
 */
export class GetUpcomingBookingsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose upcoming bookings to fetch',
    example: '4bedf398-3649-4653-9e99-2a9a4efdb3ee',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;

  @ApiPropertyOptional({ 
    description: 'Maximum number of upcoming bookings to return',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber({}, { message: 'limit must be a number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit cannot exceed 50' })
  limit?: number = 10;
}

/**
 * DTO for getting professional booking statistics
 * 
 * @example
 * {
 *   "contractorId": "4bedf398-3649-4653-9e99-2a9a4efdb3ee"
 * }
 */
export class GetProfessionalStatsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose statistics to fetch',
    example: '4bedf398-3649-4653-9e99-2a9a4efdb3ee',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;
}


export class BookingStatusDto {
  @ApiProperty({ 
    description: 'Status value (stored in database)',
    example: 'PENDING'
  })
  value!: string;

  @ApiProperty({ 
    description: 'Display label for UI',
    example: 'Pending'
  })
  label!: string;

  @ApiProperty({ 
    description: 'Description of what this status means',
    example: 'Booking created, waiting for contractor response'
  })
  description!: string;

  @ApiProperty({ 
    description: 'CSS class or badge variant for UI',
    example: 'warning',
    enum: ['warning', 'success', 'info', 'danger', 'secondary']
  })
  badgeVariant!: string;

  @ApiProperty({ 
    description: 'Order for display in dropdown',
    example: 1,
    minimum: 1
  })
  order!: number;
}

export class BookingStatusListResponseDto {
  @ApiProperty({ 
    description: 'List of all booking statuses',
    type: [BookingStatusDto]
  })
  statuses!: BookingStatusDto[];
}