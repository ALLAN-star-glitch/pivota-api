import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Nested Attachment Response ---
class AttachmentResponseDto {
  @ApiProperty({ example: 'CV' })
  type!: string;

  @ApiPropertyOptional({ example: 'https://storage.pivota.com/cv.pdf' })
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'My_Resume.pdf' })
  fileName?: string;

  @ApiPropertyOptional({ example: 'I am a certified plumber with 10 years experience...' })
  contentText?: string;

  @ApiProperty({ example: true })
  isPrimary!: boolean;
}

// --- Nested Status History Response ---
class StatusHistoryResponseDto {
  @ApiProperty({ example: 'PENDING' })
  oldStatus!: string;

  @ApiProperty({ example: 'SHORTLISTED' })
  newStatus!: string;

  @ApiProperty({ example: '2025-12-30T10:00:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: 'Candidate has great references' })
  reason?: string;
}

// --- Main Application Response ---
export class JobApplicationResponseDto {
  @ApiProperty({ example: 'clv1234567890' })
  id!: string;

  @ApiProperty({ example: 'uuid-abc-123' })
  externalId!: string;

  @ApiProperty({ example: 'clv_job_post_001' })
  jobPostId!: string;

  @ApiProperty({ example: 'applicant_uuid_999' })
  applicantId!: string;

  @ApiProperty( {example: 'employer_uuid_555' })
  employerId!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  // Financials & Time
  @ApiPropertyOptional({ example: 1500.00 })
  expectedPay?: number;

  @ApiPropertyOptional({ example: '2025-01-05T08:00:00Z' })
  availabilityDate?: Date;

  @ApiPropertyOptional({ example: 'Available after 5 PM' })
  availabilityNotes?: string;

  @ApiPropertyOptional({ example: 'John Kamau' })
  referrerName?: string;

  @ApiPropertyOptional({ example: '+254711223344' })
  referrerPhone?: string;

  @ApiPropertyOptional({ example: 'john.kamau@example.com' })
  referrerEmail?: string; 

  @ApiPropertyOptional({ example: 'Former Site Manager' })
  referrerRelationship?: string;

  // Timestamps
  @ApiProperty({ example: '2025-12-30T09:00:00Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2025-12-30T14:00:00Z' })
  reviewedAt?: Date;

  // Relations
  @ApiProperty({ type: [AttachmentResponseDto] })
  attachments!: AttachmentResponseDto[];

  @ApiProperty({ type: [StatusHistoryResponseDto] })
  statusHistory!: StatusHistoryResponseDto[];
}