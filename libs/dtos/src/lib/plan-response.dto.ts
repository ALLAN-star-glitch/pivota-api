import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PlanFeatures } from '@pivota-api/interfaces';

// ------------------- Basic Creator Info -------------------
class UserBasicDto {
  @ApiProperty({ example: "dsjetjaetjayrw353gs" })
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

// ------------------- Plan Module with Restrictions -------------------
export class PlanModuleDto {
  @ApiProperty({ example: "dsjetjaetjayrw353gs" })
  @IsString()
  moduleId!: string;

  @ApiProperty({ example: 'listings', description: 'Slug of the module'})
  @IsString()
  moduleSlug!: string;

  @ApiProperty({ example: 'Listings', description: 'Human-readable module name' })
  @IsString()
  moduleName!: string;

  @ApiProperty({ type: Object, description: 'JSON object containing all module restrictions (e.g., listingLimit, isAllowed, approval rules, etc.)' })
  @IsObject()
  restrictions!: Record<string, unknown>; // Flexible restrictions JSON
}

// ------------------- Plan Response -------------------
export class PlanResponseDto {
  @ApiProperty({ example: "dsjetjaetjayrw353gs" })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Full access to all modules' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 50, description: 'Total listings allowed globally for this plan' })
  @IsNumber()
  totalListings!: number;

  @ApiPropertyOptional({ type: Object, description: 'Optional JSON features including pricing, analytics, boost, etc.' })
  @IsOptional()
  features?: PlanFeatures;

  @ApiProperty({ type: [PlanModuleDto], description: 'Modules included in the plan with their restrictions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanModuleDto)
  planModules!: PlanModuleDto[];

  @ApiProperty({ description: 'User who created or updated the plan' })
  @ValidateNested()
  @Type(() => UserBasicDto)
  user?: UserBasicDto;
}
