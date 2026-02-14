import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * SMS category classification
 */
export enum SmsCategory {
  SYSTEM = 'system',
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
}

/**
 * DTO for sending bulk SMS notifications
 * Used in:
 * POST /notifications-gateway/sms/send/bulk
 */
export class SendNotificationBulkSmsDto {
  @ApiProperty({
    description: 'List of recipients in E.164 format',
    example: ['+254742748416', '+254711000000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @Type(() => String)
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => String(v).trim())
      : value,
  )
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, {
    each: true,
    message: 'Each recipient must be in E.164 format, e.g., +254700000000',
  })
  recipients: string[];

  @ApiProperty({
    description: 'SMS message body',
    example: 'Your OTP is 123456',
    maxLength: 160,
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  @ApiPropertyOptional({
    description: 'Stop sending remaining SMS if one fails',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'stopOnError must be a boolean' })
  stopOnError = false;

  @ApiPropertyOptional({
    description: 'Optional sender ID (max 11 chars)',
    example: 'PIVOTA',
  })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'senderId must be a string' })
  @MaxLength(11, { message: 'senderId cannot exceed 11 characters' })
  senderId?: string;

  @ApiPropertyOptional({
    enum: SmsCategory,
    description: 'Message classification',
    example: 'transactional',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(SmsCategory, {
    message: 'category must be one of: system, transactional, marketing',
  })
  category?: SmsCategory;

  @ApiPropertyOptional({
    description: 'Optional metadata for tracing, logs, or auditing',
    example: { orderId: 'ORD-123', source: 'checkout' },
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, unknown>;
}
