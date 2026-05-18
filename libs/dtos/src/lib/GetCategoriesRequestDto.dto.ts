import { ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { IsIn, IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetCategoriesRequestDto {
  @ApiPropertyOptional({
    example: 'JOBS',
    description: 'Filter categories by a specific vertical.',
    enum: VERTICALS,
  })
  @IsOptional()
  @IsString()
  @IsIn(VERTICALS, {
    message: `vertical must be one of: ${VERTICALS.join(', ')}`,
  })
  vertical?: string;

  @ApiPropertyOptional({
    example: 'MAIN',
    description: 'Filter categories by type.',
    enum: ['MAIN', 'COMPLIMENTARY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MAIN', 'COMPLIMENTARY'], {
    message: `type must be one of: MAIN, COMPLIMENTARY`,
  })
  type?: string;

  @ApiPropertyOptional({
    example: 'null',
    description: 'Filter by parent category ID. Use "null" for top-level categories only.',
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter categories that have subcategories.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasSubcategories?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Filter categories that have a parent.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasParent?: boolean;

  @ApiPropertyOptional({
    example: 'apartment',
    description: 'Search categories by name (partial match).',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Include nested subcategories in response.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  includeNested?: boolean = false;
}