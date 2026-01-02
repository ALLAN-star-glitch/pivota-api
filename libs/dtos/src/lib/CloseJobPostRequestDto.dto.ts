import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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