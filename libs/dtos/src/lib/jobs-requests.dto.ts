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
  IsUrl,
  Max,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Import constants from shared library
import { 
  EMPLOYMENT_TYPES,
  PAYMENT_TYPES,
  WORK_ARRANGEMENTS,
  COMMITMENT_LEVELS,
  WORK_SCHEDULES,
  DOCUMENTATION_LEVELS,
  SKILL_LEVELS,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  EmploymentType,
  PaymentType,
  WorkArrangement,
  CommitmentLevel,
  WorkSchedule,
  DocumentationLevel,
  SkillLevel,
  ExperienceLevel,
  EducationLevel
} from '@pivota-api/constants';

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

  // ============================================================
  // JOB CHARACTERISTICS (Using constants)
  // ============================================================

  @ApiProperty({ 
    description: 'How is the worker engaged?', 
    enum: EMPLOYMENT_TYPES,
    example: 'PERMANENT'
  })
  @IsString()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType!: EmploymentType;

  @ApiProperty({ 
    description: 'How is the worker paid?', 
    enum: PAYMENT_TYPES,
    example: 'SALARY'
  })
  @IsString()
  @IsIn(PAYMENT_TYPES)
  paymentType!: PaymentType;

  @ApiProperty({ 
    description: 'Where does the work happen?', 
    enum: WORK_ARRANGEMENTS,
    example: 'ONSITE'
  })
  @IsString()
  @IsIn(WORK_ARRANGEMENTS)
  workArrangement!: WorkArrangement;

  @ApiProperty({ 
    description: 'Time commitment required', 
    enum: COMMITMENT_LEVELS,
    example: 'FULL_TIME'
  })
  @IsString()
  @IsIn(COMMITMENT_LEVELS)
  commitment!: CommitmentLevel;

  @ApiProperty({ 
    description: 'When does the work happen?', 
    enum: WORK_SCHEDULES,
    example: 'DAY_SHIFT'
  })
  @IsString()
  @IsIn(WORK_SCHEDULES)
  workSchedule!: WorkSchedule;

  @ApiProperty({ 
    description: 'Level of formality/documentation', 
    enum: DOCUMENTATION_LEVELS,
    example: 'FORMAL_CONTRACT'
  })
  @IsString()
  @IsIn(DOCUMENTATION_LEVELS)
  documentationLevel!: DocumentationLevel;

  @ApiProperty({ 
    description: 'Required skill level for the job', 
    enum: SKILL_LEVELS,
    example: 'SKILLED'
  })
  @IsString()
  @IsIn(SKILL_LEVELS)
  skillLevel!: SkillLevel;

  @ApiProperty({ 
    description: 'Required years of experience', 
    enum: EXPERIENCE_LEVELS,
    example: 'MID_LEVEL'
  })
  @IsString()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel!: ExperienceLevel;

  @ApiProperty({ 
    description: 'Required education qualification', 
    enum: EDUCATION_LEVELS,
    example: 'BACHELORS'
  })
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel!: EducationLevel;

  // ============================================================
  // LOCATION
  // ============================================================

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

  // ============================================================
  // COMPENSATION
  // ============================================================

  @ApiPropertyOptional({ description: 'Payment amount for the job', example: 5000 })
  @IsOptional()
  @IsNumber()
  payAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Payment rate type', 
    example: 'PER_HOUR',
    enum: ['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_PROJECT', 'FIXED']
  })
  @IsOptional()
  @IsString()
  @IsIn(['PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_PROJECT', 'FIXED'])
  payRate?: string;

  @ApiPropertyOptional({ 
    description: 'If true, applicants can propose a different payAmount. If false, payAmount is fixed.', 
    example: true, 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isNegotiable?: boolean = false;

  // ============================================================
  // REQUIREMENTS
  // ============================================================

  @ApiPropertyOptional({ example: ['React', 'TypeScript'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[] = [];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean = false;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresEquipment?: boolean = false;

  @ApiPropertyOptional({ example: ['CV', 'Cover Letter'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsNeeded?: string[] = [];

  @ApiPropertyOptional({ example: ['Laptop', 'Smartphone'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRequired?: string[] = [];

  @ApiPropertyOptional({ example: 'Start date is flexible' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  // ============================================================
  // REFERRALS
  // ============================================================

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  allowReferrals?: boolean = true;

  @ApiPropertyOptional({ example: 5000, description: 'Bonus for successful referral' })
  @IsOptional()
  @IsNumber()
  referralBonus?: number;

  // ============================================================
  // STATUS
  // ============================================================

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'DRAFT', 'CLOSED', 'EXPIRED'])
  status?: string = 'ACTIVE';


  // ============================================================
  // APPLICATION & START TIMELINE
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'When applications close (ISO 8601 date)',
    example: '2025-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ 
    description: 'When the job actually starts (ISO 8601 date)',
    example: '2026-01-15T09:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'Is the start date flexible?',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  startDateFlexible?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Maximum number of applications to accept',
    example: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxApplications?: number;

  // ============================================================
  // PRIVACY & VISIBILITY
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Hide employer name',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @ApiPropertyOptional({ 
    description: 'Alternative name to display (if anonymous)',
    example: 'Confidential Client'
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ 
    description: 'Specific email for applications',
    example: 'hiring@company.com'
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  // ============================================================
  // WORK DETAILS
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Expected hours per week',
    example: 40
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  hoursPerWeek?: number;

  @ApiPropertyOptional({ 
    description: 'Duration in months (for contract roles)',
    example: 6
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  contractDuration?: number;
}

/* -------------------------------
   ADMIN CREATE JOB POST DTO
--------------------------------- */
export class AdminCreateJobPostDto extends CreateJobPostDto {
  @ApiProperty({ 
    description: 'The UUID of the user posting the job.', 
    example: '8400a033-eb84-4bd6-b87f-f5e11cba1cd3',
  })
  @IsString()
  creatorId!: string;
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

/* -------------------------------
   GET ALL JOBS REQUEST DTO (With Job Characteristics Filters)
--------------------------------- */
export class GetAllJobsRequestDto {
  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Filter by city' 
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    example: 50000, 
    description: 'Minimum pay filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPay?: number;

  @ApiPropertyOptional({ 
    example: 200000, 
    description: 'Maximum pay filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPay?: number;

  @ApiPropertyOptional({ 
    example: 'recent', 
    description: 'Sort order',
    enum: ['recent', 'pay_asc', 'pay_desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'pay_asc', 'pay_desc'])
  sortBy?: 'recent' | 'pay_asc' | 'pay_desc';

  // ============================================================
  // JOB CHARACTERISTICS FILTERS - ALL 9 FIELDS
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by employment type', 
    enum: EMPLOYMENT_TYPES,
    example: 'PERMANENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by payment type', 
    enum: PAYMENT_TYPES,
    example: 'SALARY'
  })
  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_TYPES)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by work arrangement', 
    enum: WORK_ARRANGEMENTS,
    example: 'REMOTE'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_ARRANGEMENTS)
  workArrangement?: WorkArrangement;

  @ApiPropertyOptional({ 
    description: 'Filter by commitment level', 
    enum: COMMITMENT_LEVELS,
    example: 'FULL_TIME'
  })
  @IsOptional()
  @IsString()
  @IsIn(COMMITMENT_LEVELS)
  commitment?: CommitmentLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by work schedule', 
    enum: WORK_SCHEDULES,
    example: 'DAY_SHIFT'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_SCHEDULES)
  workSchedule?: WorkSchedule;

  @ApiPropertyOptional({ 
    description: 'Filter by documentation level', 
    enum: DOCUMENTATION_LEVELS,
    example: 'FORMAL_CONTRACT'
  })
  @IsOptional()
  @IsString()
  @IsIn(DOCUMENTATION_LEVELS)
  documentationLevel?: DocumentationLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by skill level', 
    enum: SKILL_LEVELS,
    example: 'SKILLED'
  })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_LEVELS)
  skillLevel?: SkillLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by experience level', 
    enum: EXPERIENCE_LEVELS,
    example: 'MID_LEVEL'
  })
  @IsOptional()
  @IsString()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by education level', 
    enum: EDUCATION_LEVELS,
    example: 'BACHELORS'
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: EducationLevel;

  // ============================================================
  // REMOTE FILTER
  // ============================================================

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by remote status' 
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRemote?: boolean;

  // ============================================================
  // NEW FILTERS (Optional - add only if you need them)
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by anonymous status',
    example: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with application deadline after this date (ISO 8601)',
    example: '2025-12-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  applicationDeadlineAfter?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with application deadline before this date (ISO 8601)',
    example: '2025-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  applicationDeadlineBefore?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with start date after this date (ISO 8601)',
    example: '2026-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDateAfter?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with start date before this date (ISO 8601)',
    example: '2026-01-15T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDateBefore?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum hours per week',
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMin?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum hours per week',
    example: 40
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMax?: number;

  // ============================================================
  // CACHE CONTROL
  // ============================================================

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 300, 
    description: 'Override cache TTL in seconds (default: 300, min: 10, max: 3600)',
    default: 300
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(3600)
  cacheTTL?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Read-only mode - don\'t write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}

/* -------------------------------
   GET JOBS BY CATEGORY REQUEST DTO
--------------------------------- */
export class GetJobsByCategoryRequestDto {
  @ApiProperty({ 
    example: 'cmnboid7w006sarihf05x9txr', 
    description: 'Category ID to filter by' 
  })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Filter by city' 
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ 
    example: 50000, 
    description: 'Minimum pay filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPay?: number;

  @ApiPropertyOptional({ 
    example: 200000, 
    description: 'Maximum pay filter' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPay?: number;

  @ApiPropertyOptional({ 
    example: 'recent', 
    description: 'Sort order',
    enum: ['recent', 'pay_asc', 'pay_desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'pay_asc', 'pay_desc'])
  sortBy?: 'recent' | 'pay_asc' | 'pay_desc';

  // ============================================================
  // JOB CHARACTERISTICS FILTERS - ALL 9 FIELDS
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by employment type', 
    enum: EMPLOYMENT_TYPES,
    example: 'PERMANENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by payment type', 
    enum: PAYMENT_TYPES,
    example: 'SALARY'
  })
  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_TYPES)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by work arrangement', 
    enum: WORK_ARRANGEMENTS,
    example: 'REMOTE'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_ARRANGEMENTS)
  workArrangement?: WorkArrangement;

  @ApiPropertyOptional({ 
    description: 'Filter by commitment level', 
    enum: COMMITMENT_LEVELS,
    example: 'FULL_TIME'
  })
  @IsOptional()
  @IsString()
  @IsIn(COMMITMENT_LEVELS)
  commitment?: CommitmentLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by work schedule', 
    enum: WORK_SCHEDULES,
    example: 'DAY_SHIFT'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_SCHEDULES)
  workSchedule?: WorkSchedule;

  @ApiPropertyOptional({ 
    description: 'Filter by documentation level', 
    enum: DOCUMENTATION_LEVELS,
    example: 'FORMAL_CONTRACT'
  })
  @IsOptional()
  @IsString()
  @IsIn(DOCUMENTATION_LEVELS)
  documentationLevel?: DocumentationLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by skill level', 
    enum: SKILL_LEVELS,
    example: 'SKILLED'
  })
  @IsOptional()
  @IsString()
  @IsIn(SKILL_LEVELS)
  skillLevel?: SkillLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by experience level', 
    enum: EXPERIENCE_LEVELS,
    example: 'MID_LEVEL'
  })
  @IsOptional()
  @IsString()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by education level', 
    enum: EDUCATION_LEVELS,
    example: 'BACHELORS'
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: EducationLevel;

  // ============================================================
  // REMOTE FILTER
  // ============================================================

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by remote status' 
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRemote?: boolean;

  // ============================================================
  // NEW FILTERS (Optional - add only if you need them)
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by anonymous status',
    example: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with application deadline after this date (ISO 8601)',
    example: '2025-12-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  applicationDeadlineAfter?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with application deadline before this date (ISO 8601)',
    example: '2025-12-31T23:59:59Z'
  })
  @IsOptional()
  @IsDateString()
  applicationDeadlineBefore?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with start date after this date (ISO 8601)',
    example: '2026-01-01T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDateAfter?: string;

  @ApiPropertyOptional({ 
    description: 'Filter jobs with start date before this date (ISO 8601)',
    example: '2026-01-15T00:00:00Z'
  })
  @IsOptional()
  @IsDateString()
  startDateBefore?: string;

  @ApiPropertyOptional({ 
    description: 'Minimum hours per week',
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMin?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum hours per week',
    example: 40
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMax?: number;

  // ============================================================
  // CACHE CONTROL
  // ============================================================

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 300, 
    description: 'Override cache TTL in seconds (default: 300, min: 10, max: 3600)',
    default: 300
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(3600)
  cacheTTL?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Read-only mode - don\'t write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}

/* -------------------------------
   GET JOB BY ID REQUEST DTO
--------------------------------- */
export class GetJobByIdRequestDto {
  @ApiPropertyOptional({ 
    example: 'clv1234567890', 
    description: 'Job post ID (CUID)' 
  })
  @IsOptional()  
  @IsString()
  id?: string;

  // ========== CACHE CONTROL ==========

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data from database (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 600, 
    description: 'Override cache TTL in seconds (default: 600, min: 10, max: 3600)',
    default: 600
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(3600)
  cacheTTL?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Read-only mode - don\'t write to cache (for analytics)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}



/* -------------------------------
   GET JOB LISTINGS BY OWNER DTO
--------------------------------- */
export class GetJobListingsByOwnerDto {
  @ApiProperty({
    description: 'The account ID of the owner',
    example: 'acc_123456'
  })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Filter job listings by status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'])
  status?: string;

  // ========== PAGINATION ==========

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'recent', 
    description: 'Sort order',
    enum: ['recent', 'pay_asc', 'pay_desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'pay_asc', 'pay_desc'])
  sortBy?: 'recent' | 'pay_asc' | 'pay_desc';

  // ========== CACHE CONTROL ==========

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Bypass cache and fetch fresh data (Admin only)',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bypassCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Skip reading from cache but still write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipCache?: boolean;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Force refresh cache even if it exists',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  refreshCache?: boolean;

  @ApiPropertyOptional({ 
    example: 300, 
    description: 'Override cache TTL in seconds (default: 300, min: 10, max: 3600)',
    default: 300
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(3600)
  cacheTTL?: number;

  @ApiPropertyOptional({ 
    example: false, 
    description: 'Read-only mode - don\'t write to cache',
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readOnly?: boolean;
}

/* -------------------------------
   GET ADMIN JOBS FILTER DTO
--------------------------------- */
export class GetAdminJobsFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter by creator ID',
    example: 'user_123456'
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by account ID',
    example: 'acc_123456'
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by job status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by anonymous status', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Filter jobs with application deadline after this date', example: '2025-12-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  applicationDeadlineAfter?: string;

  @ApiPropertyOptional({ description: 'Filter jobs with application deadline before this date', example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  applicationDeadlineBefore?: string;

  @ApiPropertyOptional({ description: 'Filter jobs with start date after this date', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDateAfter?: string;

  @ApiPropertyOptional({ description: 'Filter jobs with start date before this date', example: '2026-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDateBefore?: string;

  @ApiPropertyOptional({ description: 'Minimum hours per week', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMin?: number;

  @ApiPropertyOptional({ description: 'Maximum hours per week', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMax?: number;

  // ============================================================
  // JOB CHARACTERISTICS FILTERS
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by employment type', 
    enum: EMPLOYMENT_TYPES,
    example: 'PERMANENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by payment type', 
    enum: PAYMENT_TYPES,
    example: 'SALARY'
  })
  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_TYPES)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by work arrangement', 
    enum: WORK_ARRANGEMENTS,
    example: 'REMOTE'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_ARRANGEMENTS)
  workArrangement?: WorkArrangement;

  @ApiPropertyOptional({ 
    description: 'Filter by commitment level', 
    enum: COMMITMENT_LEVELS,
    example: 'FULL_TIME'
  })
  @IsOptional()
  @IsString()
  @IsIn(COMMITMENT_LEVELS)
  commitment?: CommitmentLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by experience level', 
    enum: EXPERIENCE_LEVELS,
    example: 'MID_LEVEL'
  })
  @IsOptional()
  @IsString()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by education level', 
    enum: EDUCATION_LEVELS,
    example: 'BACHELORS'
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: EducationLevel;

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Filter by remote status' 
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRemote?: boolean;

  // ========== PAGINATION ==========

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'recent', 
    description: 'Sort order',
    enum: ['recent', 'pay_asc', 'pay_desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'pay_asc', 'pay_desc'])
  sortBy?: 'recent' | 'pay_asc' | 'pay_desc';
}

/* -------------------------------
   GET OWN JOBS FILTER DTO
--------------------------------- */
export class GetOwnJobsFilterDto {
  @ApiPropertyOptional({ 
    example: 'ACTIVE', 
    description: 'Filter by job status',
    enum: ['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED']
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'CLOSED', 'DRAFT', 'EXPIRED'])
  status?: string;

   @ApiPropertyOptional({ description: 'Filter by anonymous status', example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Minimum hours per week', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMin?: number;

  @ApiPropertyOptional({ description: 'Maximum hours per week', example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  hoursPerWeekMax?: number;

  // ============================================================
  // JOB CHARACTERISTICS FILTERS
  // ============================================================

  @ApiPropertyOptional({ 
    description: 'Filter by employment type', 
    enum: EMPLOYMENT_TYPES,
    example: 'PERMANENT'
  })
  @IsOptional()
  @IsString()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by payment type', 
    enum: PAYMENT_TYPES,
    example: 'SALARY'
  })
  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_TYPES)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ 
    description: 'Filter by work arrangement', 
    enum: WORK_ARRANGEMENTS,
    example: 'REMOTE'
  })
  @IsOptional()
  @IsString()
  @IsIn(WORK_ARRANGEMENTS)
  workArrangement?: WorkArrangement;

  @ApiPropertyOptional({ 
    description: 'Filter by commitment level', 
    enum: COMMITMENT_LEVELS,
    example: 'FULL_TIME'
  })
  @IsOptional()
  @IsString()
  @IsIn(COMMITMENT_LEVELS)
  commitment?: CommitmentLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by experience level', 
    enum: EXPERIENCE_LEVELS,
    example: 'MID_LEVEL'
  })
  @IsOptional()
  @IsString()
  @IsIn(EXPERIENCE_LEVELS)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({ 
    description: 'Filter by education level', 
    enum: EDUCATION_LEVELS,
    example: 'BACHELORS'
  })
  @IsOptional()
  @IsString()
  @IsIn(EDUCATION_LEVELS)
  educationLevel?: EducationLevel;

  // ========== PAGINATION ==========

  @ApiPropertyOptional({ 
    example: 20, 
    description: 'Results per page (default: 20, max: 100)' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 0, 
    description: 'Pagination offset' 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ 
    example: 'recent', 
    description: 'Sort order',
    enum: ['recent', 'pay_asc', 'pay_desc']
  })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'pay_asc', 'pay_desc'])
  sortBy?: 'recent' | 'pay_asc' | 'pay_desc';
}