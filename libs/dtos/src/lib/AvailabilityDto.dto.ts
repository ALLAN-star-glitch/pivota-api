import { IsString, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DayAvailabilityDto {
  @ApiProperty({ example: 'Monday', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] })
  @IsString()
  @IsIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  day!: string;

  @ApiProperty({ example: '08:00', description: 'Opening time in 24hr format' })
  @IsString()
  open!: string;

  @ApiProperty({ example: '17:00', description: 'Closing time in 24hr format' })
  @IsString()
  close!: string;

  @ApiProperty({ example: false, description: 'Mark true if the provider is closed this day' })
  @IsBoolean()
  isClosed!: boolean;
}