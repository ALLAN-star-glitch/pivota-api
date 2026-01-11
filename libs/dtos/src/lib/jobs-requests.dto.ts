import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsArray, 
  IsIn,
  ArrayNotEmpty,
  Matches,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  IsEmail,
  ValidateNested,
  IsUrl
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';


export class JobApplicationAttachmentDto {
  @ApiProperty({
    description: 'The category of the attachment. Use COVER_LETTER for written pitches.',
    enum: ['CV', 'COVER_LETTER', 'ID', 'CERTIFICATE', 'LICENSE', 'PORTFOLIO', 'OTHER'],
    example: 'CV'
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ 
    description: 'The secure URL of the uploaded file. Required if contentText is empty.',
    example: 'https://storage.pivota.connect/docs/user123-cv.pdf' 
  })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ 
    description: 'The original name of the file for display purposes.',
    example: 'John_Doe_Resume_2025.pdf' 
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'Raw text content. Used for "Quick Pitch" or typed cover letters instead of a file upload.',
    example: 'I have extensive experience in electrical wiring for residential buildings.' 
  })
  @IsOptional()
  @IsString()
  contentText?: string;

  @ApiPropertyOptional({ 
    description: 'If true, this attachment will be highlighted as the main document for the employer to see first.',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateJobPostDto {
  @ApiProperty({ description: 'Title of the job post', example: 'Frontend Developer Needed' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Description of the job post', example: 'Looking for an experienced React developer' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'ID of the category this job belongs to', example: 'cl3k1n4fj0000xyz123abc' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'ID of the subcategory for the job (optional)', example: 'subcat_98765' })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiProperty({ description: 'Type of job', example: 'FORMAL' })
  @IsString()
  @IsIn(['FORMAL', 'INFORMAL'])
  jobType!: string;

  @ApiProperty({ description: 'City where the job is located', example: 'Nairobi' })
  @IsString()
  locationCity!: string;

  @ApiPropertyOptional({ description: 'Neighborhood of the job location', example: 'Westlands' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean = false;

  /* --- Financial Logic --- */

  @ApiPropertyOptional({ description: 'Payment amount for the job', example: 5000 })
  @IsOptional()
  @IsNumber()
  payAmount?: number;

  @ApiPropertyOptional({ description: 'Payment rate type', example: 'fixed' })
  @IsOptional()
  @IsString()
  @IsIn(['hourly', 'daily', 'weekly', 'monthly', 'fixed'])
  payRate?: string;

  @ApiPropertyOptional({ 
    description: 'If true, applicants can propose a different payAmount. If false, payAmount is fixed.', 
    example: true, 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean = false;

  /* ------------------------ */

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresEquipment?: boolean = false;

  @ApiPropertyOptional({ example: ['React', 'TypeScript'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[] = [];

  @ApiPropertyOptional({ example: 'Intermediate' })
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @ApiPropertyOptional({ example: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ example: ['CV'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsNeeded?: string[] = [];

  @ApiPropertyOptional({ example: ['Laptop'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRequired?: string[] = [];

  @ApiPropertyOptional({ example: 'Start date is flexible' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'DRAFT', 'CLOSED'])
  status?: string = 'ACTIVE';
}

export class CreateJobPostGrpcDto extends CreateJobPostDto {

  @ApiPropertyOptional({ 
    description: 'The unique UUID of the root account (Individual or Org)', 
    example: 'acc-789-uvw' 
  })  
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ 
    description: 'The Brand/Organization name or Individual name for the account', 
    example: 'Pivota Tech Ltd' 
  })  
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ 
    description: 'The unique UUID of the specific human user who is performing the action', 
    example: 'user-123-xyz' 
  })  
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ 
    description: 'The full name (First + Last) of the human user', 
    example: 'Jane Doe' 
  })  
  @IsOptional()
  @IsString()
  creatorName?: string;
}

export class ValidateJobPostIdsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^c[a-z0-9]{24,}$/i, {
    each: true,
    message: 'each id must be a valid CUID',
  })
  ids!: string[];
}


export class CloseJobPostRequestDto {
  @ApiProperty({ 
    description: 'The unique CUID/ID of the job post to be closed', 
    example: 'clv1234567890' 
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ 
    description: 'The UUID of the employer/creator authorized to close this post', 
    example: 'user-uuid-999' 
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiPropertyOptional({ 
    description: 'Optional reason for closing the job post', 
    example: 'Position filled internally',
    maxLength: 255 
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}


export class CreateJobApplicationDto {
  @ApiProperty({
    description: 'Confirmation that the worker possesses the tools required by the job post.',
    example: true
  })
  @IsBoolean()  
  hasRequiredEquipment!: boolean;

  @ApiPropertyOptional({ 
    description: 'The salary or daily rate the applicant is asking for',
    example: 2500.00
  })
  @IsOptional()
  @IsNumber()
  expectedPay?: number;

  @ApiPropertyOptional({ 
    description: 'ISO 8601 date for when the applicant can start',
    example: '2025-01-15T09:00:00Z' 
  })
  @IsOptional()
  @IsDateString()
  availabilityDate?: string;

  @ApiPropertyOptional({ 
    description: 'Notes on availability (e.g., night shifts only)',
    example: 'Available immediately.' 
  })
  @IsOptional()
  @IsString()
  availabilityNotes?: string;

  // --- Referral Details ---
  @ApiPropertyOptional({ example: 'Jane Kamau' })
  @IsOptional()
  @IsString()
  referrerName?: string;

  @ApiPropertyOptional({ example: '+254712345678' })
  @IsOptional()
  @IsString()
  referrerPhone?: string;

  @ApiPropertyOptional({ example: 'jane.k@pivota.com' })
  @IsOptional()
  @IsEmail()
  referrerEmail?: string;

  @ApiPropertyOptional({ example: 'Former Line Manager' })
  @IsOptional()
  @IsString()
  referrerRelationship?: string;

  // --- Attachments ---
  @ApiPropertyOptional({ 
    type: [JobApplicationAttachmentDto],
    description: 'CV, Pitch, and supporting documents.' 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobApplicationAttachmentDto)
  attachments?: JobApplicationAttachmentDto[];
}


export class UpdateJobPostRequestDto extends PartialType(CreateJobPostGrpcDto) {
    @ApiPropertyOptional({ 
      description: 'The internal DB ID of the job post', 
      example: 'cl3k1n4fj0000xyz123abc' 
    })
    id?: string;
}