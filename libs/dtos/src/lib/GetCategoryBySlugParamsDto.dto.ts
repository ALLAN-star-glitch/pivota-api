import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';
import { VERTICALS } from '@pivota-api/constants';

export class GetCategoryBySlugParamsDto {
  @ApiProperty({
    example: 'HOUSING',
    enum: VERTICALS,
    description: 'The vertical/pillar the category belongs to',
  })
  @IsString()
  @IsIn(VERTICALS)
  vertical!: string;

  @ApiProperty({
    example: 'pool-technician',
    description: 'The URL-friendly slug of the category',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase kebab-case',
  })
  slug!: string;
}