
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';


export class CreateCategoryRequestDto {
  @ApiProperty({
    example: 'Plumbing',
    description: 'Human readable category name',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @ApiPropertyOptional({
    example: 'plumbing',
    description: 'URL-friendly slug (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase kebab-case',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'All plumbing-related jobs',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiProperty({
    example: 'JOBS',
    description: 'Which vertical this category belongs to',
    enum: VERTICALS,
  })
  @IsString()
  @IsIn(VERTICALS, {
    message: `vertical must be one of: ${VERTICALS.join(', ')}`,
  })
  vertical!: string;

  @ApiPropertyOptional({
    example: 'ckxparent123',
    description: 'Parent category ID (for subcategories)',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
