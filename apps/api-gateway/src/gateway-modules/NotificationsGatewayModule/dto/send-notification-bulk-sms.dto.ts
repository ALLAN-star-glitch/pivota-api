import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SendNotificationBulkSmsDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => String)
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, {
    each: true,
    message: 'Each recipient must be in E.164 format, e.g., +254700000000',
  })
  recipients: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean = false;
}
