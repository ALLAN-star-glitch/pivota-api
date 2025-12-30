import { ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class GetCategoriesRequestDto {
  @ApiPropertyOptional({
    example: 'JOBS',
    description: 'Filter categories by a specific vertical. If omitted, returns all root categories.',
    enum: VERTICALS,
  })
  @IsOptional()
  @IsString()
  @IsIn(VERTICALS, {
    message: `vertical must be one of: ${VERTICALS.join(', ')}`,
  })
  vertical?: string;
}