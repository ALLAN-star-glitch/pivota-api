import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsString, 
} from 'class-validator';
import { CreateCategoryRequestDto } from './CreateCategoryRequestDto.dto';


export class UpdateCategoryRequestDto extends PartialType(CreateCategoryRequestDto) {
  // All fields from CreateCategoryRequestDto are inherited as optional
  // We can add specific update-only properties here if needed.
  
  @ApiPropertyOptional({
    example: 'cl3k1n4fj0000xyz',
    description: 'The unique ID of the category being updated (if passed in body)',
  })
  @IsOptional()
  @IsString()
  id?: string;
}