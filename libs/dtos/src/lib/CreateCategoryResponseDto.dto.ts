import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryResponseDto {
  @ApiProperty({
    description: 'Unique ID of the category',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the category',
    example: 'Software Development',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Jobs related to web, mobile, and software development',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Parent category ID if this is a subcategory',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  parentId?: string | null;

  @ApiProperty({
    description: 'Number of job posts associated with this category',
    example: 15,
  })
  jobPostsCount!: number;

  @ApiProperty({
    description: 'Number of subcategories under this category',
    example: 3,
  })
  subcategoriesCount!: number;

  @ApiProperty({
    description: 'Indicates if this category has subcategories',
    example: true,
  })
  hasSubcategories!: boolean;

  @ApiPropertyOptional({
    description: 'Array of subcategories (nested categories)',
    type: [CreateCategoryResponseDto],
  })
  subcategories?: CreateCategoryResponseDto[];

  @ApiProperty({
    description: 'Indicates if this category has a parent category',
    example: false,
  })
  hasParent!: boolean;

  @ApiProperty({
    description: 'ISO timestamp of creation',
    example: '2025-12-06T12:34:56.789Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'ISO timestamp of last update',
    example: '2025-12-06T13:34:56.789Z',
  })
  updatedAt!: string;
}
