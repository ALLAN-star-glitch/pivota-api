import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Notification delivery channels supported
 */
export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
}

/**
 * Notification status values
 */
export enum NotificationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
}

/**
 * DTO for querying notification activities
 * Used in:
 * GET /notifications-gateway/notifications/activities
 */
export class NotificationActivityQueryDto {
  @ApiPropertyOptional({
    enum: NotificationChannel,
    description: 'Filter by notification channel',
    example: 'sms',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(NotificationChannel, {
    message: 'channel must be one of: sms, email',
  })
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    enum: NotificationStatus,
    description: 'Filter by delivery status',
    example: 'success',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(NotificationStatus, {
    message: 'status must be one of: success, error, pending',
  })
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: 'Recipient phone or email',
    example: '+254742748416',
  })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString({ message: 'recipient must be a string' })
  recipient?: string;

  @ApiPropertyOptional({
    description: 'Max results to return (1–200)',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 50;
    const parsed = Number(value);
    return isNaN(parsed) ? 50 : parsed;
  })
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(200, { message: 'limit cannot exceed 200' })
  limit = 50;

  @ApiPropertyOptional({
    description: 'Start date (ISO format)',
    example: '2026-02-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO format)',
    example: '2026-02-14T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;
}
