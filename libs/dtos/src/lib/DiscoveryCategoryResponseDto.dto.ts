import { ApiProperty } from '@nestjs/swagger';

export class DiscoveryCategoryResponseDto {
  @ApiProperty({
    description: 'Unique ID of the category',
    example: 'cmj_plumb_123',
  })
  id!: string;

  @ApiProperty({
    description: 'The pillar/vertical this belongs to',
    example: 'JOBS',
  })
  vertical!: string;

  @ApiProperty({
    description: 'URL-friendly identifier',
    example: 'plumbing',
  })
  slug!: string;

  @ApiProperty({
    description: 'Human-readable name',
    example: 'Plumbing & Pipe Fitting',
  })
  name!: string;

  @ApiProperty({
    description: 'Indicates if there are sub-levels to explore',
    example: true,
  })
  hasSubcategories!: boolean;
}