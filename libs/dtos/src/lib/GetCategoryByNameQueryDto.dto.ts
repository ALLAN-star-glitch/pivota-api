import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class GetCategoryByNameQueryDto {
  @ApiProperty({
    example: 'Plumbing',
    description: 'The exact name of the category (case-insensitive)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    example: 'JOBS',
    enum: VERTICALS,
    description: 'Filter by vertical to narrow down results',
  })
  @IsOptional()
  @IsString()
  @IsIn(VERTICALS)
  vertical?: string;
}