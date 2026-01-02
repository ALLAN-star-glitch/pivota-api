import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsOptional, IsNumber, IsBoolean, IsString,
  IsArray, ValidateNested, IsEmail, IsDateString 
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobApplicationAttachmentDto } from './JobApplicationAttachmentDto.dto';

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