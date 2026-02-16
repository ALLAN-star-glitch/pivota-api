import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

// Define the enum to match your database/business logic
export enum JobPostStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  DRAFT = 'DRAFT',
  DELETED = 'DELETED',
}

export class GetOwnJobsFilterDto {
  @ApiPropertyOptional({
    enum: JobPostStatus, // This creates the dropdown in Swagger
    description: 'Filter by job status. If omitted, all jobs are returned.',
  })
  @IsOptional()
  @IsEnum(JobPostStatus)
  status?: JobPostStatus;
}