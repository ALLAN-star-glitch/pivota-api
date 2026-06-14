/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  IsString, IsNotEmpty, IsOptional, IsUUID, IsArray
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';

/* ======================================================
   CUSTOMER CONFIRMATION DTOS
   ======================================================
   These DTOs handle customer actions after service completion
   
   Customer Confirmation Flow:
   1. Customer confirms satisfaction -> payment released to professional
   2. Customer reports dissatisfaction -> dispute created
   
   Status Transitions:
   COMPLETED -> SATISFIED (customer confirms) -> payment released
   COMPLETED -> DISSATISFIED (customer reports problem) -> dispute created
*/

/* ======================================================
   REQUEST DTOS (for HTTP endpoints)
   =====================================================*/

/**
 * DTO for customer confirming satisfaction with completed work
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a"
 * }
 */
export class ConfirmSatisfactionRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiHideProperty()
  customerId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * DTO for customer reporting dissatisfaction with completed work
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "reason": "Work was not completed properly",
 *   "description": "The plumber did not fix the leak completely. Water is still dripping.",
 *   "evidenceUrls": [
 *     "https://storage.pivotaconnect.com/dispute/evidence1.jpg",
 *     "https://storage.pivotaconnect.com/dispute/evidence2.jpg"
 *   ]
 * }
 */
export class ReportDissatisfactionRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiProperty({ 
    description: 'Short summary of the issue',
    example: 'Work was not completed properly',
    required: true 
  })
  @IsString({ message: 'reason must be a string' })
  @IsNotEmpty({ message: 'reason is required' })
  reason!: string;

  @ApiPropertyOptional({ 
    description: 'Detailed explanation of the issue',
    example: 'The plumber did not fix the leak completely. Water is still dripping.',
    required: false 
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'URLs of photos or videos showing the problem',
    example: ['https://storage.pivotaconnect.com/dispute/evidence1.jpg'],
    type: [String],
    required: false 
  })
  @IsOptional()
  @IsArray({ message: 'evidenceUrls must be an array' })
  @IsString({ each: true, message: 'each evidenceUrl must be a string' })
  evidenceUrls?: string[];

  @ApiHideProperty()
  customerId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/* ======================================================
   RESPONSE DTOS
   =====================================================*/

/**
 * Response for confirm satisfaction action
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "customerSatisfaction": "SATISFIED",
 *   "customerConfirmedAt": "2026-06-13T13:00:00.000Z",
 *   "paymentReleasedAt": "2026-06-13T13:00:00.000Z",
 *   "amountReleased": "KES 4,500",
 *   "bookingStatus": "COMPLETED"
 * }
 */
export class ConfirmSatisfactionResponseDto {
  @ApiProperty({ 
    description: 'Booking internal ID',
    example: 'cmq16vtkb0000cn6nsr8ot0e0'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a'
  })
  externalId!: string;

  @ApiProperty({ 
    description: 'Customer satisfaction status',
    enum: ['PENDING', 'SATISFIED', 'DISSATISFIED'],
    example: 'SATISFIED'
  })
  customerSatisfaction!: string;

  @ApiProperty({ 
    description: 'Timestamp when customer confirmed satisfaction',
    example: '2026-06-13T13:00:00.000Z'
  })
  customerConfirmedAt!: Date | null;

  @ApiProperty({ 
    description: 'Timestamp when payment was released to professional',
    example: '2026-06-13T13:00:00.000Z'
  })
  paymentReleasedAt!: Date | null;

  @ApiProperty({ 
    description: 'Amount released to professional',
    example: 'KES 4,500'
  })
  amountReleased!: string;

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED', 'COMPLETED'],
    example: 'COMPLETED'
  })
  bookingStatus!: string;
}

/**
 * Response for report dissatisfaction action
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "customerSatisfaction": "DISSATISFIED",
 *   "customerDissatisfiedAt": "2026-06-13T13:00:00.000Z",
 *   "disputeId": "dsp_1234567890",
 *   "disputeStatus": "UNDER_REVIEW",
 *   "bookingStatus": "CONFIRMED"
 * }
 */
export class ReportDissatisfactionResponseDto {
  @ApiProperty({ 
    description: 'Booking internal ID',
    example: 'cmq16vtkb0000cn6nsr8ot0e0'
  })
  id!: string;

  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a'
  })
  externalId!: string;

  @ApiProperty({ 
    description: 'Customer satisfaction status',
    enum: ['PENDING', 'SATISFIED', 'DISSATISFIED'],
    example: 'DISSATISFIED'
  })
  customerSatisfaction!: string;

  @ApiProperty({ 
    description: 'Timestamp when customer reported dissatisfaction',
    example: '2026-06-13T13:00:00.000Z'
  })
  customerDissatisfiedAt!: Date | null;

  @ApiProperty({ 
    description: 'Dispute ID for tracking',
    example: 'dsp_1234567890'
  })
  disputeId!: string;

  @ApiProperty({ 
    description: 'Current dispute status',
    enum: ['NONE', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
    example: 'UNDER_REVIEW'
  })
  disputeStatus!: string;

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED', 'COMPLETED'],
    example: 'CONFIRMED'
  })
  bookingStatus!: string;
}

/**
 * gRPC request for confirming satisfaction
 * customerId comes from JWT token
 */
export class ConfirmSatisfactionGrpcRequestDto {
  @ApiProperty({ description: 'Booking external UUID' })
  @IsUUID('4')
  @IsNotEmpty()
  bookingExternalId!: string;

  @ApiHideProperty()
  customerId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * gRPC request for reporting dissatisfaction
 */
export class ReportDissatisfactionGrpcRequestDto {
  @ApiProperty({ description: 'Booking external UUID' })
  @IsUUID('4')
  @IsNotEmpty()
  bookingExternalId!: string;

  @ApiProperty({ description: 'Short summary of the issue' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ description: 'Detailed explanation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URLs of evidence' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];

  @ApiHideProperty()
  customerId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}