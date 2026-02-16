import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { JobPostStatus } from './GetOwnJobFiltersDto.dto';


export class GetAdminJobsFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by the ID of the user who created the job',
  })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by the ID of the organization/account',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    enum: JobPostStatus,
    description: 'Filter by job status (dropdown)',
  })
  @IsOptional()
  @IsEnum(JobPostStatus)
  status?: JobPostStatus;
}