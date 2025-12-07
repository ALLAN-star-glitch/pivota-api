import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsArray, 
  IsIn 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  // -----------------------------
  // NEW: Subcategory ID (optional)
  // -----------------------------
  @ApiPropertyOptional({ description: 'ID of the subcategory for the job (optional)', example: 'subcat_98765' })
  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @ApiPropertyOptional({ description: 'ID of the user creating the job (overridden by API gateway)', example: 'usr_1234567890' })
  @IsOptional()
  @IsString()
  creatorId?: string;

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

  @ApiPropertyOptional({ description: 'Whether the job can be done remotely', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether documents are required', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether equipment is required', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  requiresEquipment?: boolean = false;

  @ApiPropertyOptional({ description: 'Payment amount for the job', example: 5000 })
  @IsOptional()
  @IsNumber()
  payAmount?: number;

  @ApiPropertyOptional({ description: 'Payment rate type', example: 'hourly' })
  @IsOptional()
  @IsString()
  @IsIn(['hourly', 'daily', 'weekly', 'fixed'])
  payRate?: string;

  @ApiPropertyOptional({ description: 'Required skills for the job', example: ['React', 'TypeScript'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[] = [];

  @ApiPropertyOptional({ description: 'Required experience level', example: 'Intermediate' })
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @ApiPropertyOptional({ description: 'Employment type (e.g., full-time, part-time)', example: 'Full-time' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ description: 'Documents needed for the job', example: ['CV', 'Portfolio'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsNeeded?: string[] = [];

  @ApiPropertyOptional({ description: 'Equipment required for the job', example: ['Laptop', 'Headphones'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRequired?: string[] = [];

  @ApiPropertyOptional({ description: 'Additional notes about the job', example: 'Remote work allowed after 3 months' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({ description: 'Status of the job post', example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'DRAFT', 'CLOSED'])
  status?: string;
}
