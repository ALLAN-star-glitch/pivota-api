import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlanFeaturesDto } from './PlanFeaturesDto.dto';
import { ModuleWithRestrictionsDto } from './ModuleWithRestrictionsDto.dto';

export class CreatePlanDto {
  @ApiProperty({ example: 'Premium Plan', description: 'Name of the plan' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Full access to all modules', description: 'Optional description of the plan' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'usr_123', description: 'Creator user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 50, description: 'Global total listings allowed for this plan' })
  @IsOptional()
  @IsNumber()
  totalListings?: number;

  @ApiPropertyOptional({ type: PlanFeaturesDto, description: 'Optional JSON features including pricing, analytics, boost, etc.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  features?: PlanFeaturesDto;


  @ApiPropertyOptional({
    type: [ModuleWithRestrictionsDto],
    description: 'Modules to assign to plan with restrictions',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleWithRestrictionsDto)
  planModules?: ModuleWithRestrictionsDto[];
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Premium Plan Updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'usr_123', description: 'Updator user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  totalListings?: number;

  @ApiPropertyOptional({ type: PlanFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanFeaturesDto)
  features?: PlanFeaturesDto;

  @ApiPropertyOptional({
    type: [ModuleWithRestrictionsDto],
    description: 'Modules to update with restrictions',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleWithRestrictionsDto)
  planModules?: ModuleWithRestrictionsDto[];
}
