import { IsArray, ArrayNotEmpty, IsString, Matches } from 'class-validator';

export class ValidateJobPostIdsRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^c[a-z0-9]{24,}$/i, {
    each: true,
    message: 'each id must be a valid CUID',
  })
  ids!: string[];
}
