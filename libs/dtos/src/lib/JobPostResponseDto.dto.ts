import { IsString, IsNumber, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserBasicDto {
  @ApiProperty({ example: 'user_12345' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

class CategoryBasicDto {
  @ApiProperty({ example: 'category_98765' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Software Development' })
  @IsString()
  name!: string;
}

export class JobPostResponseDto {
  @ApiProperty({ example: 'cl3k1n4fj0000xyz123abc' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsString()
  externalId!: string;

  @ApiProperty({ example: 'Looking for a Graphic Designer' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Need a designer to create social media visuals for 3 months' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Category of the job post' })
  category!: CategoryBasicDto;

  @ApiPropertyOptional({ description: 'Subcategory of the job post' })
  @IsOptional()
  subCategory?: CategoryBasicDto;

  @ApiProperty({ description: 'User who created the job post' })
  creator!: UserBasicDto;

  @ApiProperty({ example: 'INFORMAL' })
  @IsString()
  jobType!: string;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  @IsOptional()
  @IsString()
  locationNeighborhood?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresDocuments?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresEquipment?: boolean;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  payAmount?: number;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  payRate?: string;

  @ApiPropertyOptional({ example: ['Photoshop', 'Illustrator'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ example: 'Intermediate' })
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @ApiPropertyOptional({ example: 'Contract' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ example: ['CV', 'Portfolio'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsNeeded?: string[];

  @ApiPropertyOptional({ example: ['Laptop', 'Camera'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentRequired?: string[];

  @ApiPropertyOptional({ example: 'Start date is flexible' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiProperty({ example: 'ACTIVE' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  applicationsCount!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  bookingsCount!: number;

  @ApiProperty({ example: '2025-12-06T12:00:00.000Z' })
  @IsString()
  createdAt!: string;

  @ApiProperty({ example: '2025-12-06T12:30:00.000Z' })
  @IsString()
  updatedAt!: string;
}
