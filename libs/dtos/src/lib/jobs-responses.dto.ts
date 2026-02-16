import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsObject, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserBasicDto {
  @ApiProperty({ example: 'user_uuid_123', description: 'The UUID of the human creator' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'John Doe', description: 'The First + Last name of the human' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

// New DTO to represent the Brand/Account Anchor
class AccountBasicDto {
  @ApiProperty({ example: 'acc_uuid_456', description: 'The UUID of the root account' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Pivota Tech Ltd', description: 'The Brand name or Organization name' })
  @IsString()
  name!: string;
}

class CategoryBasicDto {
  @ApiProperty({ example: 'cat_98765' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Software Development' })
  @IsString()
  name!: string;
}

export class JobPostResponseDto {
  @ApiProperty({ example: 'cl3k1n4fj0000xyz123abc' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Looking for a Graphic Designer' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Need a designer to create social media visuals for 3 months' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Category of the job post' })
  @IsObject()
  category!: CategoryBasicDto;

  @ApiPropertyOptional({ description: 'Subcategory of the job post' })
  @IsOptional()
  @IsObject()
  subCategory?: CategoryBasicDto;

  /* --- Identity Pillar --- */
  @ApiProperty({ description: 'The Human individual who posted the job' })
  @IsObject()
  creator!: UserBasicDto;

  @ApiProperty({ description: 'The Brand/Organization account owning this post' })
  @IsObject()
  account!: AccountBasicDto;
  /* ---------------------- */

  @ApiProperty({ example: 'INFORMAL' })
  @IsString()
  jobType!: string;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresEquipment?: boolean;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  payAmount?: number;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean;

  @ApiPropertyOptional({ example: ['Photoshop', 'Illustrator'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 'Intermediate' })
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @ApiPropertyOptional({ example: 'Contract' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ example: ['CV', 'Portfolio'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsNeeded?: string[];

  @ApiPropertyOptional({ example: ['Laptop', 'Camera'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRequired?: string[];

  @ApiPropertyOptional({ example: 'Start date is flexible' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiProperty({ example: 'ACTIVE' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  applicationsCount!: number;

  @ApiProperty({ example: '2025-12-06T12:00:00.000Z' })
  @IsString()
  createdAt!: string;

  @ApiProperty({ example: '2025-12-06T12:30:00.000Z' })
  @IsString()
  updatedAt!: string;
}

export class CloseJobPostResponseDto {
  @ApiProperty({
        example: 'clv1234567890',
        description: 'The unique identifier of the job post'
    })
    @IsString()
    id!: string;

  @ApiProperty({
        example: 'CLOSED',
        description: 'The updated status of the job'
    })
    @IsString()
    status!: string;

  @ApiProperty({
        example: true,
        description: 'Boolean flag confirming the job is in a closed state'
    })
    @IsBoolean()
    isClosed!: boolean;

  @ApiProperty({
        example: '2025-12-30T20:36:50.000Z',
        description: 'The timestamp when the job was closed (matches updatedAt)'
    })
    @IsDate()
    closedAt!: Date;
}

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
// Base DTO for Dashboard Lists (Lightweight)
export class JobApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() jobPostId!: string;
  @ApiProperty() applicantId!: string;
  @ApiProperty() status!: string;
  
  // Minimal Timestamps
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: string;

  // Add a lightweight reference for the UI instead of full history
  @ApiPropertyOptional() lastStatusChangeReason?: string;
}

// Extended DTO for the "View Details" Page (Heavyweight)
export class JobApplicationDetailResponseDto extends JobApplicationResponseDto {
  @ApiProperty() externalId!: string;
  @ApiProperty() employerId!: string;
  
  @ApiPropertyOptional() expectedPay?: number;
  @ApiPropertyOptional() availabilityDate?: Date;
  @ApiPropertyOptional() availabilityNotes?: string;

  // Referrer Info
  @ApiPropertyOptional() referrerName?: string;
  @ApiPropertyOptional() referrerPhone?: string;
  @ApiPropertyOptional() referrerEmail?: string;
  @ApiPropertyOptional() referrerRelationship?: string;

  @ApiPropertyOptional() reviewedAt?: Date;

  // Relations (Only included in Detail View)
  @ApiProperty({ type: [AttachmentResponseDto] })
  attachments!: AttachmentResponseDto[];

  @ApiProperty({ type: [StatusHistoryResponseDto] })
  statusHistory!: StatusHistoryResponseDto[];
}

export class ValidateJobPostIdsReponseDto {
  @ApiProperty({
    description: 'Array of valid Job Post IDs',
    type: [String],
    example: ['jobId1', 'jobId2'],
  })
  validIds!: string[];

  @ApiProperty({
    description: 'Array of invalid Job Post IDs that do not exist in the system',
    type: [String],
    example: ['jobId3', 'jobId4'],
  })
  invalidIds!: string[];
}


export class JobPostCreateResponseDto {
  @ApiProperty({ 
    example: 'cl3k1n4fj0000xyz123abc', 
    description: 'The new unique ID generated by the server' 
  })
  @IsString()
  id!: string;

  @ApiProperty({ 
    example: 'ACTIVE', 
    description: 'The initial status assigned by the server' 
  })
  @IsString()
  status!: string;

  @ApiProperty({ 
    example: '2026-02-07T14:30:00Z', 
    description: 'Server-side timestamp of creation' 
  })
  @IsString()
  createdAt!: string;

  // Note: No Category, No Titles, No Descriptions, No Creator IDs.
}
