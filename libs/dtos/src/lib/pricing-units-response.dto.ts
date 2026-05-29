import { ApiProperty } from '@nestjs/swagger';

export class PricingUnitOptionDto {
  @ApiProperty({ example: 'PER_HOUR', description: 'Price unit code' })
  unit!: string;

  @ApiProperty({ example: 'Per Hour', description: 'Display label for the unit' })
  label!: string;

  @ApiProperty({ example: 'Charged per hour of work', description: 'Description of the pricing unit' })
  description!: string;

  @ApiProperty({ example: 500, description: 'Minimum price for this unit' })
  minPrice!: number;

  @ApiProperty({ example: 5000, description: 'Maximum price for this unit', nullable: true })
  maxPrice!: number | null;

  @ApiProperty({ example: true, description: 'Whether years of experience is required' })
  experienceRequired!: boolean;

  @ApiProperty({ example: false, description: 'Whether additional notes are required' })
  notesRequired!: boolean;

  @ApiProperty({ example: 'KES', description: 'Currency code' })
  currency!: string;
}

export class PricingUnitsByCategoryResponseDto {
  @ApiProperty({ example: 'cmnboid7w006sarihf05x9txr' })
  categoryId!: string;

  @ApiProperty({ example: 'Electricians' })
  categoryName!: string;

  @ApiProperty({ example: 'HOUSING' })
  vertical!: string;

  @ApiProperty({ type: [PricingUnitOptionDto] })
  allowedUnits!: PricingUnitOptionDto[];
}