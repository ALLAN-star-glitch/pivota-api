import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayAvailabilityDto } from './AvailabilityDto.dto';

export class ServiceOfferingResponseDto {
  @ApiProperty({ example: 'clv123abc', description: 'Internal database ID' })
  id!: string;

  @ApiProperty({ example: 'uuid-456-789', description: 'External public ID' })
  externalId!: string;

  @ApiProperty({ example: 'user_uuid_123', description: 'The provider ID (UUID from Identity Service)' })
  providerId!: string;

  @ApiProperty({ example: 'Professional House Painting' })
  title!: string;

  @ApiProperty({ example: 'High-quality painting services...' })
  description!: string;

  @ApiProperty({ 
    example: ['JOBS', 'HOUSING'], 
    type: [String], 
    description: 'PivotaConnect verticals this service belongs to' 
  })
  verticals!: string[];

  // CHANGED: Replaced categoryLabel with categoryId to match your schema
  @ApiProperty({ 
    example: 'cl3k1n4fj0000xyz', 
    description: 'The ID of the category this service belongs to' 
  })
  categoryId!: string;

  @ApiProperty({ example: 5000 })
  basePrice!: number;

  @ApiProperty({ example: 'FIXED' })
  priceUnit!: string;

  @ApiProperty({ example: 'Nairobi' })
  locationCity!: string;

  @ApiPropertyOptional({ example: 'Westlands' })
  locationNeighborhood?: string;

  @ApiPropertyOptional({ 
    type: [DayAvailabilityDto], 
    description: 'Structured weekly working hours' 
  })
  availability?: DayAvailabilityDto[];

  @ApiProperty({ example: 4.8, description: 'Calculated average rating' })
  averageRating!: number;

  @ApiProperty({ example: 24, description: 'Total number of reviews' })
  reviewCount!: number;

  @ApiPropertyOptional({ example: 5, description: 'Years of professional experience' })
  yearsExperience?: number;

  @ApiProperty({ example: true, description: 'Provider verification status' })
  isVerified!: boolean;

  @ApiPropertyOptional({ example: 'Available on weekends only', description: 'Extra provider notes' })
  additionalNotes?: string;

  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-12-29T12:00:00Z' })
  updatedAt!: Date;
}