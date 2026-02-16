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
  IsDateString,
  IsEmail,
  ValidateNested,
  IsUrl
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/* -------------------------------
   JOB APPLICATION ATTACHMENTS
--------------------------------- */
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

/* -------------------------------
   CREATE JOB POST DTO (USER)
--------------------------------- */
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

/* -------------------------------
   ADMIN CREATE JOB POST DTO
--------------------------------- */
export class AdminCreateJobPostDto extends CreateJobPostDto {
@ApiProperty({ 
    description: 'The UUID of the user posting the job. Leave empty for organization-level posts.', 
    example: '8400a033-eb84-4bd6-b87f-f5e11cba1cd3',
    required: false // Highlights in Swagger that this is optional
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

}

export class CreateJobGrpcRequestDto extends CreateJobPostDto {
  @ApiProperty({ description: 'The UUID of the user creating the job post', example: 'user-123-xyz' })
  @IsString()
  creatorId!: string;

  @ApiProperty({ description: 'The account UUID that will own the job post', example: 'acc-789-uvw' })
  @IsString()
  accountId!: string;
}

/* -------------------------------
   VALIDATE MULTIPLE JOB IDS
--------------------------------- */
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

/* -------------------------------

   BASE CLOSE JOB POST DTO
--------------------------------- */

export class CloseAdminJobPostRequestHttpDto {
  @ApiProperty({
    description: 'UUID of the user who originally created the job post',
    example: 'user-123-xyz',
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({
    description: 'UUID of the account that owns the job post',
    example: 'acc-789-uvw',
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;
} 

export class CloseJobGrpcRequestDto {
  @ApiProperty({
    description: 'The unique CUID/ID of the job post to be closed',
    example: 'clv1234567890',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    description: 'UUID of the user who originally created the job post',
    example: 'user-123-xyz',
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({
    description: 'UUID of the account that owns the job post',
    example: 'acc-789-uvw',
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}


/* -------------------------------
   CREATE JOB APPLICATION
--------------------------------- */
export class CreateJobApplicationDto {
  @ApiProperty({ description: 'Confirmation that the worker possesses the tools required by the job post.', example: true })
  @IsBoolean()  
  hasRequiredEquipment!: boolean;

  @ApiPropertyOptional({ description: 'The salary or daily rate the applicant is asking for', example: 2500.00 })
  @IsOptional()
  @IsNumber()
  expectedPay?: number;

  @ApiPropertyOptional({ description: 'ISO 8601 date for when the applicant can start', example: '2025-01-15T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  availabilityDate?: string;

  @ApiPropertyOptional({ description: 'Notes on availability (e.g., night shifts only)', example: 'Available immediately.' })
  @IsOptional()
  @IsString()
  availabilityNotes?: string;

  // Referral Details
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

  // Attachments
  @ApiPropertyOptional({ type: [JobApplicationAttachmentDto], description: 'CV, Pitch, and supporting documents.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobApplicationAttachmentDto)
  attachments?: JobApplicationAttachmentDto[];
}

/* -------------------------------
   UPDATE JOB POST FOR OWN USER
--------------------------------- */
/* -------------------------------
   UPDATE OWN JOB POST HTTP DTO
--------------------------------- */
export class UpdateOwnJobPostRequestHttpDto extends PartialType(CreateJobPostDto) {
  // Body contains ONLY the partial fields the user wants to change.
  // All fields inherited from CreateJobPostDto are now @IsOptional().
}

/* -------------------------------
   UPDATE ADMIN JOB POST HTTP DTO
--------------------------------- */
export class UpdateAdminJobPostRequestHttpDto extends PartialType(CreateJobPostDto) {
  @ApiProperty({
    description: 'UUID of the user who originally created the job post',
    example: 'user-123-xyz',
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({
    description: 'UUID of the account that owns the job post',
    example: 'acc-789-uvw',
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}

/* -------------------------------
   UPDATE JOB GRPC REQUEST DTO
--------------------------------- */
export class UpdateJobGrpcRequestDto extends PartialType(CreateJobPostDto) {
  @ApiProperty({ 
    description: 'The unique CUID/ID of the job post to update', 
    example: 'clv1234567890' 
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ 
    description: 'UUID of the user associated with the record', 
    example: 'user-123-xyz' 
  })
  @IsString()
  @IsNotEmpty()
  creatorId!: string;

  @ApiProperty({ 
    description: 'UUID of the account associated with the record', 
    example: 'acc-789-uvw' 
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}

/* -------------------------------
   UPDATE JOB POST FOR ADMIN
--------------------------------- */
export class UpdateAdminJobPostRequestDto extends PartialType(CreateJobPostDto) {
  @ApiProperty({ description: 'The internal DB ID of the job post to update', example: 'cl3k1n4fj0000xyz123abc' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'UUID of the user the admin is updating the job for', example: 'user-123-xyz' })
  @IsString()
  creatorId!: string;

  @ApiProperty({ description: 'UUID of the account that owns the job', example: 'acc-789-uvw' })
  @IsString()
  accountId!: string;
}
