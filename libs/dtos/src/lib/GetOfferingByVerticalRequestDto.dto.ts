import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VERTICAL_TYPES = ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT'];

export class GetOfferingByVerticalRequestDto {
  @ApiProperty({ 
    example: 'HOUSING', 
    description: 'The pillar of life to filter by',
    enum: VERTICAL_TYPES 
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VERTICAL_TYPES, { message: 'Vertical must be JOBS, HOUSING, or SOCIAL_SUPPORT' })
  vertical!: string;

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Optional city filter for localized discovery' 
  })
  @IsString()
  @IsOptional()
  city?: string;
}