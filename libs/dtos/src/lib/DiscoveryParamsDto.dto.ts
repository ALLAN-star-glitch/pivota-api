import { ApiProperty } from '@nestjs/swagger';
import { VERTICALS } from '@pivota-api/constants';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class DiscoveryParamsDto {
  @ApiProperty({
    example: 'HOUSING',
    description: 'The vertical to fetch top-level discovery metadata for',
    enum: VERTICALS,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VERTICALS, {
    message: () => `Invalid vertical. Must be one of: ${VERTICALS.join(', ')}`,
  })
  vertical!: string;
}