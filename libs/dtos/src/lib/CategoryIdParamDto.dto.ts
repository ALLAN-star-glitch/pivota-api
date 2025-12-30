import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CategoryIdParamDto {
  @ApiProperty({
    example: 'cmj_plumb_123',
    description: 'The unique UUID or CUID of the category',
  })
  @IsString()
  @IsNotEmpty()
  // @IsUUID() // Uncomment if you are strictly using UUIDs
  id!: string;
}