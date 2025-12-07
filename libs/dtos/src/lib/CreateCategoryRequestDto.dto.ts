import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryRequestDto {
  @ApiProperty({
    description: 'Name of the category',
    example: 'Software Development',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Jobs related to web, mobile, and software development',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID of the parent category, if this is a subcategory',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
