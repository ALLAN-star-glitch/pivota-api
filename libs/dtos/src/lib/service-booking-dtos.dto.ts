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
   CONFIRMED -> (no other transitions allowed)
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
 *   "clientId": "7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e",
 *   "scheduledDate": "2024-03-25T14:00:00.000Z",
 *   "locationCity": "Nairobi",
 *   "customerNotes": "Please call when you arrive at the gate",
 *   "agreedPrice": 5500,
 *   "currency": "KES"
 * }
 */
export class CreateBookingRequestDto {
  @ApiProperty({ 
    description: 'Service offering ID - references a specific service listing',
    example: 'cmnboid7w006sarihf05x9txr',
    required: true 
  })
  @IsUUID('4', { message: 'serviceId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'serviceId is required' })
  serviceId!: string;

  @ApiProperty({ 
    description: 'Professional\'s UUID from Profile Service - the service provider',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;

  @ApiProperty({ 
    description: 'Date and time when the service should be performed (ISO 8601 format)',
    example: '2024-03-25T14:00:00.000Z',
    required: true 
  })
  @IsDateString({}, { message: 'scheduledDate must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'scheduledDate is required' })
  scheduledDate!: Date;

  @ApiPropertyOptional({ 
    description: 'Override location if different from service offering\'s default location',
    example: 'Westlands',
    default: 'Uses service offering location'
  })
  @IsOptional()
  @IsString({ message: 'locationCity must be a string' })
  locationCity?: string;

  @ApiPropertyOptional({ 
    description: 'Special instructions or notes for the professional about the service',
    example: 'The gate code is 1234. Please call when you arrive.',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'customerNotes must be a string' })
  customerNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Override the listed price - can be used for negotiations',
    example: 5500,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'agreedPrice must be a number' })
  @Min(0, { message: 'agreedPrice must be greater than or equal to 0' })
  agreedPrice?: number;

  @ApiPropertyOptional({ 
    description: 'Currency code for the transaction (ISO 4217)',
    example: 'KES',
    default: 'KES',
    enum: ['KES', 'USD', 'UGX', 'TZS', 'NGN']
  })
  @IsOptional()
  @IsString({ message: 'currency must be a string' })
  currency?: string;

    @ApiPropertyOptional({
    description: 'Duration of the service in hours',
    example: 2,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'durationHours must be a number' })
  @Min(0, { message: 'durationHours must be greater than or equal to 0' })      
  durationHours?: number;
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
 *   "userType": "CLIENT",
 *   "reason": "Found another service provider"
 * }
 */
export class CancelBookingRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking to cancel',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the user cancelling the booking',
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e',
    required: true 
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiProperty({ 
    description: 'Role of the user cancelling (determines permissions)',
    enum: ['CLIENT', 'CONTRACTOR'],
    enumName: 'UserType',
    required: true
  })
  @IsIn(['CLIENT', 'CONTRACTOR'], { message: 'userType must be either CLIENT or CONTRACTOR' })
  userType!: 'CLIENT' | 'CONTRACTOR';

  @ApiPropertyOptional({ 
    description: 'Reason for cancellation (helps with analytics and dispute resolution)',
    example: 'Emergency came up, need to reschedule',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'reason must be a string' })
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
 * Complete booking response DTO
 */
export class BookingResponseDto {
  @ApiProperty({ 
    description: 'Booking unique identifier',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Public-facing booking identifier',
    example: 'BKG-2024-00123'
  })
  externalId!: string;

  @ApiProperty({ 
    description: 'Contractor UUID',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e'
  })
  contractorId!: string;

  @ApiProperty({ 
    description: 'Client UUID',
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e'
  })
  clientId!: string;

  @ApiPropertyOptional({ 
    description: 'Service offering ID (if applicable)',
    example: 'cmnboid7w006sarihf05x9txr'
  })
  serviceId?: string | null;

  @ApiPropertyOptional({ 
    description: 'Service information snapshot',
    type: BookingServiceInfoDto
  })
  service?: BookingServiceInfoDto | null;

  @ApiPropertyOptional({ 
    description: 'Contractor name (denormalized for performance)',
    example: 'Jane Smith'
  })
  contractorName?: string | null;

  @ApiPropertyOptional({ 
    description: 'Service title (denormalized for performance)',
    example: 'Professional House Painting'
  })
  serviceTitle?: string | null;

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
    example: 'CONFIRMED'
  })
  status!: string;

  @ApiPropertyOptional({ 
    description: 'Scheduled date and time for the service',
    example: '2024-03-25T14:00:00.000Z'
  })
  scheduledDate?: Date | null;

  @ApiPropertyOptional({ 
    description: 'City where service will be performed',
    example: 'Nairobi'
  })
  locationCity?: string | null;

  @ApiPropertyOptional({ 
    description: 'Agreed price for the service (may differ from base price)',
    example: 5500
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
    example: '2024-03-20T10:30:00.000Z'
  })
  createdAt!: Date;

  @ApiProperty({ 
    description: 'Last update timestamp',
    example: '2024-03-21T15:45:00.000Z'
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
 *   "id": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "serviceTitle": "House Painting",
 *   "scheduledDate": "2024-03-25T14:00:00.000Z",
 *   "locationCity": "Nairobi",
 *   "clientName": "John Doe",
 *   "clientPhone": "+254712345678",
 *   "agreedPrice": 5500,
 *   "currency": "KES"
 * }
 */
export class UpcomingBookingResponseDto {
  @ApiProperty({ 
    description: 'Booking ID',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Service title',
    example: 'Professional House Painting'
  })
  serviceTitle!: string | null;

  @ApiProperty({ 
    description: 'Scheduled date and time',
    example: '2024-03-25T14:00:00.000Z'
  })
  scheduledDate!: Date | null;

  @ApiProperty({ 
    description: 'Service location city',
    example: 'Nairobi'
  })
  locationCity!: string | null;

  @ApiProperty({ 
    description: 'Client name',
    example: 'John Doe'
  })
  clientName!: string | null;

  @ApiProperty({ 
    description: 'Client phone number (for contact)',
    example: '+254712345678'
  })
  clientPhone!: string | null;

  @ApiProperty({ 
    description: 'Agreed service price',
    example: 5500
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
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e',
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
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "status": "PENDING",
 *   "limit": 10,
 *   "offset": 0
 * }
 */
export class GetContractorBookingsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose bookings to fetch',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
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
 *   "bookingId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "userId": "7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e",
 *   "userType": "CLIENT"
 * }
 */
export class GetBookingDetailsRequestDto {
  @ApiProperty({ 
    description: 'Unique identifier of the booking',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'bookingId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingId is required' })
  bookingId!: string;

  @ApiProperty({ 
    description: 'UUID of the user requesting details',
    example: '7e2c8d4a-6b1e-4d1a-9f3b-5f8d0a3b4c2e',
    required: true 
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiProperty({ 
    description: 'Type of user requesting details (determines authorization)',
    enum: ['CLIENT', 'CONTRACTOR'],
    enumName: 'UserType',
    required: true
  })
  @IsIn(['CLIENT', 'CONTRACTOR'], { message: 'userType must be either CLIENT or CONTRACTOR' })
  userType!: 'CLIENT' | 'CONTRACTOR';
}

/**
 * DTO for getting upcoming bookings for a professional
 * 
 * @example
 * {
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e",
 *   "limit": 10
 * }
 */
export class GetUpcomingBookingsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose upcoming bookings to fetch',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
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
 *   "contractorId": "5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e"
 * }
 */
export class GetProfessionalStatsRequestDto {
  @ApiProperty({ 
    description: 'Contractor UUID - the professional whose statistics to fetch',
    example: '5f8d0a3b-4c2e-4d1a-9f3b-7e2c8d4a6b1e',
    required: true 
  })
  @IsUUID('4', { message: 'contractorId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'contractorId is required' })
  contractorId!: string;
}