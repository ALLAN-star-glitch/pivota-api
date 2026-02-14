import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ---------------- Single SMS ----------------
export class SendNotificationSmsDto {
  @ApiProperty({ example: '+254742748416', description: 'Recipient phone number in E.164 format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{10,15}$/)
  to: string;

  @ApiProperty({ example: 'Your verification code is 123456', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  message: string;

  @ApiPropertyOptional({ example: 'PIVOTA', maxLength: 11 })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  senderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ enum: ['system', 'transactional', 'marketing'] })
  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'])
  category?: 'system' | 'transactional' | 'marketing';

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requestDeliveryReport?: boolean = true;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ---------------- Bulk SMS ----------------
export class SendNotificationBulkSmsDto {
  @ApiProperty({ type: [String], example: ['+254742748416', '+254712345678'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, { each: true })
  recipients: string[];

  @ApiProperty({ example: 'System maintenance tonight', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  message: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean = false;

  @ApiPropertyOptional({ example: 'PIVOTA', maxLength: 11 })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  senderId?: string;

  @ApiPropertyOptional({ enum: ['system', 'transactional', 'marketing'] })
  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'])
  category?: 'system' | 'transactional' | 'marketing';

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requestDeliveryReport?: boolean = true;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ---------------- SMS Activity Query ----------------
export class SmsActivityQueryDto {
  @ApiPropertyOptional({ enum: ['success', 'error'] })
  @IsOptional()
  @IsIn(['success', 'error'])
  status?: 'success' | 'error';

  @ApiPropertyOptional({ example: '+254742748416' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? 50 : num;
  })
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
