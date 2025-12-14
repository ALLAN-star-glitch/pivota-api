import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested } from "class-validator";
import { ModuleRestrictionsDto } from "./ModuleRestrictionsDto.dto";

export class ModuleWithRestrictionsDto {
  @ApiProperty({ example: 'mod_123' })
  @IsString()
  moduleId!: string;

  @ApiPropertyOptional({ type: ModuleRestrictionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModuleRestrictionsDto)
  restrictions?: ModuleRestrictionsDto;
}