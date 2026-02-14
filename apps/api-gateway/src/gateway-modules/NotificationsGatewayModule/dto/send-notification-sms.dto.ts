import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
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
 * Message category classification
 */
export enum SmsCategory {
  SYSTEM = 'system',
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
}

/**
 * Message priority level
 */
export enum SmsPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

/**
 * DTO for sending a single SMS notification
 * Used in:
 * POST /notifications-gateway/sms/send
 */
export class SendNotificationSmsDto {
  @ApiProperty({
    description: 'Recipient phone number in E.164 format',
    example: '+254742748416',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Recipient phone number is required' })
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format, e.g., +254700000000',
  })
  to: string;

  @ApiProperty({
    description: 'SMS message body',
    example: 'Your OTP is 384922',
    maxLength: 160,
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

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
    description: 'Internal receiver ID for tracking',
    example: 'user-uuid-123',
  })
  @IsOptional()
  @IsString({ message: 'receiverId must be a string' })
  receiverId?: string;

  @ApiPropertyOptional({
    enum: SmsCategory,
    example: 'transactional',
    description: 'Message classification',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(SmsCategory, {
    message: 'category must be one of system, transactional, marketing',
  })
  category?: SmsCategory;

  @ApiPropertyOptional({
    enum: SmsPriority,
    example: 'high',
    description: 'Message priority level',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(SmsPriority, {
    message: 'priority must be one of low, normal, high',
  })
  priority?: SmsPriority;

  @ApiPropertyOptional({
    description: 'Schedule SMS for later delivery (ISO date)',
    example: '2026-02-15T10:30:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid Date object' })
  scheduledAt?: Date;

  @ApiPropertyOptional({
    description: 'Language code for template rendering',
    example: 'en',
  })
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Request delivery report',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport = true;

  @ApiPropertyOptional({
    description: 'Internal reference ID',
    example: 'ORD-100293',
  })
  @IsOptional()
  @IsString({ message: 'referenceId must be a string' })
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for tracing or templates',
    example: { orderId: 'ORD-2932', source: 'checkout' },
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, unknown>;
}
