import { ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DiscoveryParamsDto {
  @ApiPropertyOptional({
    example: 'HOUSING',
    description: 'The vertical to fetch discovery metadata for',
    enum: VERTICALS,
  })
  @IsOptional()
  @IsString()
  @IsIn(VERTICALS, {
    message: () => `Invalid vertical. Must be one of: ${VERTICALS.join(', ')}`,
  })
  vertical?: string;

  @ApiPropertyOptional({
    example: 'MAIN',
    description: 'Filter by category type (MAIN or COMPLIMENTARY). Omit to get both.',
    enum: ['MAIN', 'COMPLIMENTARY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MAIN', 'COMPLIMENTARY'], {
    message: () => `Invalid type. Must be one of: MAIN, COMPLIMENTARY`,
  })
  type?: 'MAIN' | 'COMPLIMENTARY';
}