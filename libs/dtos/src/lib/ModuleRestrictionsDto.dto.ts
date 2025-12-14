import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleRestrictionsDto {
  @ApiPropertyOptional({ example: true, description: 'Whether this module is allowed for the plan' })
  @IsOptional()
  @IsBoolean()
  isAllowed?: boolean;

  @ApiPropertyOptional({ example: 10, description: 'Max listings allowed in this module' })
  @IsOptional()
  @IsNumber()
  listingLimit?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether approval is required to use this module' })
  @IsOptional()
  @IsBoolean()
  approvalRequired?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'Maximum posts allowed per month in this module' })
  @IsOptional()
  @IsNumber()
  maxPostsPerMonth?: number;
}
