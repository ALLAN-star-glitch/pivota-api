import { IsOptional, IsBoolean, IsEnum, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class PlanPricesDto {
  @ApiPropertyOptional({ example: 100, description: 'Monthly price' })
  @IsOptional()
  @IsNumber()
  monthly?: number;

  @ApiPropertyOptional({ example: 250, description: 'Quarterly price' })
  @IsOptional()
  @IsNumber()
  quarterly?: number;

  @ApiPropertyOptional({ example: 500, description: 'Half-yearly price' })
  @IsOptional()
  @IsNumber()
  halfYearly?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Annual price' })
  @IsOptional()
  @IsNumber()
  annually?: number;
}

export class PlanFeaturesDto {
  @ApiPropertyOptional({ type: PlanPricesDto, description: 'Pricing options for the plan' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanPricesDto)
  prices?: PlanPricesDto;

  @ApiPropertyOptional({ enum: ['standard', 'priority', 'dedicated'], description: 'Support level' })
  @IsOptional()
  @IsEnum(['standard', 'priority', 'dedicated'])
  support?: 'standard' | 'priority' | 'dedicated';

  @ApiPropertyOptional({ example: true, description: 'Whether boost feature is enabled' })
  @IsOptional()
  @IsBoolean()
  boost?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether analytics feature is enabled' })
  @IsOptional()
  @IsBoolean()
  analytics?: boolean;
}
