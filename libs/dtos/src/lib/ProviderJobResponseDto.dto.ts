import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


class CategoryBasicDto {
  @ApiProperty({ example: 'category_98765' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Software Development' })
  @IsString()
  name!: string;
}

export class ProviderJobResponseDto {
  @ApiProperty({
    description: 'Unique internal ID of the provider job',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  @IsString()
  id!: string;

  @ApiProperty({
    description: 'External UUID for public reference',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  externalId!: string;

  @ApiProperty({
    description: 'ID of the provider who created the job',
    example: 'user_12345',
  })
  @IsString()
  providerId!: string;

  @ApiProperty({
    description: 'Title of the provider job',
    example: 'Plumbing Services for Residential Area',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the provider job',
    example: 'Looking for a plumber to fix kitchen and bathroom sinks',
  })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Category of the job post' })
    category!: CategoryBasicDto;

  @ApiProperty({
    description: 'Price quoted for the provider job',
    example: 150.0,
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    description: 'Location where the provider job will be executed',
    example: 'Nairobi, Kenya',
  })
  @IsString()
  location!: string;

  @ApiPropertyOptional({
    description: 'Optional additional notes for the provider job',
    example: 'Please bring your own tools.',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiProperty({
    description: 'ISO timestamp when the provider job was created',
    example: '2025-12-06T12:00:00.000Z',
  })
  @IsString()
  createdAt!: string;

  @ApiProperty({
    description: 'ISO timestamp when the provider job was last updated',
    example: '2025-12-06T12:30:00.000Z',
  })
  @IsString()
  updatedAt!: string;
}
