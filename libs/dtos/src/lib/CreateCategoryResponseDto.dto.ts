import { IsString, IsOptional, IsIn, IsISO8601 } from 'class-validator';

export class CreateCategoryResponseDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsIn(['INFORMAL', 'FORMAL'])
  categoryType!: 'INFORMAL' | 'FORMAL';

  @IsISO8601()
  createdAt!: string;

  @IsISO8601()
  updatedAt!: string;
}
