import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Filter for users to view their own job applications.
 * Primarily used by the Client Dashboard and Shared Nav.
 */
export class GetOwnApplicationsFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filter applications by their current status',
    example: 'PENDING',
    enum: ['PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
  })
  @IsOptional()
  @IsString()
  // Ensure this matches the enum naming in your Prisma schema
  status?: string;

  @ApiPropertyOptional({
    description: 'Limit results to applications for a specific job post',
    example: 'clv_job_123'
  })
  @IsOptional()
  @IsString()
  jobPostId?: string;
}