/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsBoolean
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';


/* ======================================================
   SERVICE EXECUTION DTOS
   ======================================================
   These DTOs handle the service execution phase after booking confirmation
   
   Service Execution Flow:
   1. Professional starts work (IN_PROGRESS)
   2. Professional completes work (COMPLETED)
   3. Professional can upload evidence at any time during or after work
   
   Status Transitions:
   NOT_STARTED -> IN_PROGRESS (professional starts work)
   IN_PROGRESS -> COMPLETED (professional completes work)
   
   NOTE: professionalId, userId, and isPlatformAdmin are NOT in request body.
   They are extracted from JWT token / gRPC metadata by the controller.
   Swagger documentation hides these fields.
*/

/* ======================================================
   REQUEST DTOS (for HTTP endpoints)
   =====================================================*/

/**
 * DTO for starting work on a booking
 * professionalId and isPlatformAdmin come from JWT token / metadata
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a"
 * }
 */
export class StartWorkRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiHideProperty()
  professionalId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * DTO for completing work on a booking
 * professionalId and isPlatformAdmin come from JWT token / metadata
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "evidenceUrls": [
 *     "https://storage.pivotaconnect.com/evidence/photo1.jpg",
 *     "https://storage.pivotaconnect.com/evidence/photo2.jpg"
 *   ]
 * }
 */
export class CompleteWorkRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiPropertyOptional({ 
    description: 'URLs of photos or videos showing completed work',
    example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'evidenceUrls must be an array' })
  @IsString({ each: true, message: 'each evidenceUrl must be a string' })
  evidenceUrls?: string[];

  @ApiHideProperty()
  professionalId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * DTO for uploading evidence (photos/videos) for a booking
 * professionalId and isPlatformAdmin come from JWT token / metadata
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "evidenceUrls": [
 *     "https://storage.pivotaconnect.com/evidence/before.jpg",
 *     "https://storage.pivotaconnect.com/evidence/after.jpg",
 *     "https://storage.pivotaconnect.com/evidence/work-in-progress.jpg"
 *   ]
 * }
 */
export class UploadEvidenceRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiProperty({ 
    description: 'URLs of photos or videos showing work progress or completion',
    example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg'],
    type: [String],
    required: true 
  })
  @IsArray({ message: 'evidenceUrls must be an array' })
  @IsNotEmpty({ message: 'evidenceUrls cannot be empty' })
  @IsString({ each: true, message: 'each evidenceUrl must be a string' })
  evidenceUrls!: string[];

  @ApiHideProperty()
  professionalId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * DTO for getting work status of a booking
 * userId and isPlatformAdmin come from JWT token / metadata
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a"
 * }
 */
export class GetWorkStatusRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiHideProperty()
  userId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/**
 * DTO for checking auto-release eligibility
 * isPlatformAdmin may come from metadata for admin operations
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a"
 * }
 */
export class CheckAutoReleaseEligibilityRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a',
    required: true 
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;

  @ApiHideProperty()
  isPlatformAdmin!: boolean;
}

/* ======================================================
   RESPONSE DTOS
   =====================================================*/

/**
 * Response for start work action
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "serviceExecutionStatus": "IN_PROGRESS",
 *   "workStartedAt": "2026-06-13T10:00:00.000Z",
 *   "status": "CONFIRMED"
 * }
 */
export class StartWorkResponseDto {
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
    description: 'Updated service execution status',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    example: 'IN_PROGRESS'
  })
  serviceExecutionStatus!: string;

  @ApiProperty({ 
    description: 'Timestamp when work started',
    example: '2026-06-13T10:00:00.000Z'
  })
  workStartedAt!: Date | null;

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED'],
    example: 'CONFIRMED'
  })
  status!: string;
}

/**
 * Response for complete work action
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "serviceExecutionStatus": "COMPLETED",
 *   "workCompletedAt": "2026-06-13T12:30:00.000Z",
 *   "autoReleaseAt": "2026-06-15T12:30:00.000Z",
 *   "completionEvidence": ["https://storage.pivotaconnect.com/evidence/photo1.jpg"],
 *   "status": "CONFIRMED"
 * }
 */
export class CompleteWorkResponseDto {
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
    description: 'Updated service execution status',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    example: 'COMPLETED'
  })
  serviceExecutionStatus!: string;

  @ApiProperty({ 
    description: 'Timestamp when work was completed',
    example: '2026-06-13T12:30:00.000Z'
  })
  workCompletedAt!: Date | null;

  @ApiProperty({ 
    description: 'Timestamp when payment will auto-release (48 hours after completion)',
    example: '2026-06-15T12:30:00.000Z'
  })
  autoReleaseAt!: Date | null;

  @ApiProperty({ 
    description: 'URLs of evidence photos/videos',
    example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg'],
    type: [String]
  })
  completionEvidence!: string[];

  @ApiProperty({ 
    description: 'Current booking status',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED'],
    example: 'CONFIRMED'
  })
  status!: string;
}

/**
 * Response for upload evidence action
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "completionEvidence": [
 *     "https://storage.pivotaconnect.com/evidence/photo1.jpg",
 *     "https://storage.pivotaconnect.com/evidence/photo2.jpg"
 *   ],
 *   "evidenceCount": 2
 * }
 */
export class UploadEvidenceResponseDto {
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
    description: 'All evidence URLs for this booking',
    example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg'],
    type: [String]
  })
  completionEvidence!: string[];

  @ApiProperty({ 
    description: 'Total number of evidence files',
    example: 2,
    minimum: 0
  })
  evidenceCount!: number;
}

/**
 * Response for getting work status
 * 
 * @example
 * {
 *   "id": "cmq16vtkb0000cn6nsr8ot0e0",
 *   "externalId": "3784904e-0524-4146-bcee-22009a0a748a",
 *   "serviceExecutionStatus": "COMPLETED",
 *   "workStartedAt": "2026-06-13T10:00:00.000Z",
 *   "workCompletedAt": "2026-06-13T12:30:00.000Z",
 *   "autoReleaseAt": "2026-06-15T12:30:00.000Z",
 *   "autoReleaseTriggered": false,
 *   "completionEvidence": ["https://storage.pivotaconnect.com/evidence/photo1.jpg"],
 *   "customerSatisfaction": "PENDING",
 *   "customerConfirmedAt": null,
 *   "paymentReleasedAt": null,
 *   "professionalName": "John Doe Plumbing",
 *   "professionalIsVerified": true
 * }
 */
export class WorkStatusResponseDto {
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
    description: 'Current service execution status',
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    example: 'COMPLETED'
  })
  serviceExecutionStatus!: string;

  @ApiPropertyOptional({ 
    description: 'Timestamp when work started',
    example: '2026-06-13T10:00:00.000Z'
  })
  workStartedAt?: Date | null;

  @ApiPropertyOptional({ 
    description: 'Timestamp when work was completed',
    example: '2026-06-13T12:30:00.000Z'
  })
  workCompletedAt?: Date | null;

  @ApiPropertyOptional({ 
    description: 'Timestamp when auto-release will occur (48 hours after completion)',
    example: '2026-06-15T12:30:00.000Z'
  })
  autoReleaseAt?: Date | null;

  @ApiProperty({ 
    description: 'Whether auto-release has been triggered',
    example: false
  })
  autoReleaseTriggered!: boolean;

  @ApiProperty({ 
    description: 'URLs of evidence photos/videos',
    example: ['https://storage.pivotaconnect.com/evidence/photo1.jpg'],
    type: [String]
  })
  completionEvidence!: string[];

  @ApiProperty({ 
    description: 'Customer satisfaction status',
    enum: ['PENDING', 'SATISFIED', 'DISSATISFIED'],
    example: 'PENDING'
  })
  customerSatisfaction!: string;

  @ApiPropertyOptional({ 
    description: 'Timestamp when customer confirmed satisfaction',
    example: '2026-06-13T13:00:00.000Z'
  })
  customerConfirmedAt?: Date | null;

  @ApiPropertyOptional({ 
    description: 'Timestamp when payment was released to professional',
    example: '2026-06-13T13:00:00.000Z'
  })
  paymentReleasedAt?: Date | null;

  @ApiPropertyOptional({ 
    description: 'Professional\'s display name',
    example: 'John Doe Plumbing'
  })
  professionalName?: string | null;

  @ApiProperty({ 
    description: 'Whether the professional is verified by the platform',
    example: true
  })
  professionalIsVerified!: boolean;
}

/**
 * Response for checking auto-release eligibility
 * 
 * @example
 * {
 *   "isEligible": true,
 *   "autoReleaseAt": "2026-06-15T12:30:00.000Z"
 * }
 */
export class AutoReleaseEligibilityResponseDto {
  @ApiProperty({ 
    description: 'Whether the booking is eligible for auto-release',
    example: true
  })
  isEligible!: boolean;

  @ApiPropertyOptional({ 
    description: 'Timestamp when auto-release is scheduled',
    example: '2026-06-15T12:30:00.000Z'
  })
  autoReleaseAt?: Date | null;
}

// ======================================================
// EVIDENCE UPLOAD DTOS
// ======================================================

/**
 * HTTP request for uploading evidence files
 * files are sent as multipart/form-data
 * 
 * @example
 * {
 *   "bookingExternalId": "3784904e-0524-4146-bcee-22009a0a748a"
 * }
 */
export class UploadEvidenceHttpRequestDto {
  @ApiProperty({ 
    description: 'Booking external UUID',
    example: '3784904e-0524-4146-bcee-22009a0a748a'
  })
  @IsUUID('4', { message: 'bookingExternalId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'bookingExternalId is required' })
  bookingExternalId!: string;
}

/**
 * Response for evidence upload
 */
export class EvidenceUploadResponseDto {
  @ApiProperty({ description: 'Uploaded file URL' })
  url!: string;

  @ApiProperty({ description: 'Original file name' })
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({ description: 'MIME type of the file' })
  mimeType!: string;
}

/**
 * Response for multiple evidence uploads
 */
export class MultipleEvidenceUploadResponseDto {
  @ApiProperty({ description: 'Success message' })
  message!: string;

  @ApiProperty({ description: 'List of uploaded files', type: [EvidenceUploadResponseDto] })
  items!: EvidenceUploadResponseDto[];
}