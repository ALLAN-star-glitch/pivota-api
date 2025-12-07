import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProviderJobDto {
  @ApiPropertyOptional({
    description: 'ID of the provider creating the job (overridden by API gateway)',
    example: 'usr_1234567890',
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({
    description: 'Title of the provider job',
    example: 'Electrician Available for Installation',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Description of the provider job',
    example: 'Experienced electrician available for residential work',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'ID of the job category',
    example: 'cl3k1n4fj0000xyz123abc',
  })
  @IsString()
  categoryId!: string;

  @ApiProperty({
    description: 'Price for the service',
    example: 3500,
  })
  @IsNumber()
  price!: number;

  @ApiProperty({
    description: 'Location of the service',
    example: 'Nairobi, Westlands',
  })
  @IsString()
  location!: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the job',
    example: 'Available on weekends only',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
