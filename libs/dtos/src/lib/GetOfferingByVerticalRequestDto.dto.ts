import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';



export class GetOfferingByVerticalRequestDto {
  @ApiProperty({ 
    example: 'HOUSING', 
    description: 'The pillar of life to filter by',
    enum: VERTICALS
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VERTICALS, { message: 'Vertical must be JOBS, HOUSING, or SOCIAL_SUPPORT' })
  vertical!: string;

  @ApiPropertyOptional({ 
    example: 'Nairobi', 
    description: 'Optional city filter for localized discovery' 
  })
  @IsString()
  @IsOptional()
  city?: string;
}
