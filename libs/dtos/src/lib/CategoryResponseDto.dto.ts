import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Unique ID of the category',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  id!: string;

  @ApiProperty({
    description: 'The vertical this category belongs to',
    example: 'JOBS',
    enum: ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT', 'LAND', 'FACILITIES'],
  })
  vertical!: string;

  @ApiProperty({
    description: 'URL-friendly identifier',
    example: 'software-development',
  })
  slug!: string;

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

  // --- Unified Stats ---

  @ApiProperty({
    description: 'Number of job posts in this category',
    example: 15,
  })
  jobPostsCount!: number;

  @ApiProperty({
    description: 'Number of service offerings (professionals) in this category',
    example: 8,
  })
  servicesCount!: number;

  @ApiProperty({
    description: 'Number of social support programs in this category',
    example: 2,
  })
  supportCount!: number;

  // --- Hierarchy Info ---

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

  @ApiProperty({
    description: 'Indicates if this category has a parent category',
    example: false,
  })
  hasParent!: boolean;

  @ApiPropertyOptional({
    description: 'Array of subcategories (nested categories)',
    type: [CategoryResponseDto],
  })
  subcategories?: CategoryResponseDto[];

  // --- Timestamps ---

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