import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Filter for Administrative views of job applications.
 * Enables system-wide searching and management.
 */
export class GetAdminApplicationsFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter by the UUID of the applicant',
    example: 'user_uuid_123' 
  })
  @IsOptional()
  @IsString()
  applicantId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by the UUID of the employer/organization',
    example: 'org_uuid_456' 
  })
  @IsOptional()
  @IsString()
  employerId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by application status',
    example: 'PENDING',
    enum: ['PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
  })
  @IsOptional()
  @IsString()
  // If you have a shared Enum library, use it here instead of hardcoded strings
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Search by the Job Post CUID',
    example: 'clv123456789' 
  })
  @IsOptional()
  @IsString()
  jobPostId?: string;
}