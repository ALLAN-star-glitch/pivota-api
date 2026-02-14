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

// -------------------- Single SMS --------------------
/**
 * DTO for sending a single SMS notification
 */
export class SendNotificationSmsDto {
  /** Recipient phone number in E.164 format, e.g., +254700000000 */
  @IsString()
  @IsNotEmpty({ message: 'Recipient phone number is required' })
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format, e.g., +254700000000',
  })
  to: string;

  /** SMS message content (max 160 characters) */
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  /** Optional sender ID (up to 11 characters) */
  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'senderId cannot exceed 11 characters' })
  senderId?: string;

  /** Optional internal receiver ID for tracking */
  @IsOptional()
  @IsString()
  receiverId?: string;

  /** Optional internal reference ID */
  @IsOptional()
  @IsString()
  referenceId?: string;

  /** Optional category of message */
  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'], {
    message: 'category must be one of system, transactional, marketing',
  })
  category?: 'system' | 'transactional' | 'marketing';

  /** Optional priority level */
  @IsOptional()
  @IsIn(['low', 'normal', 'high'], { message: 'priority must be one of low, normal, high' })
  priority?: 'low' | 'normal' | 'high';

  /** Optional scheduled date/time for sending */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid date' })
  scheduledAt?: Date;

  /** Optional language code (e.g., 'en', 'sw', 'fr') */
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  /** Whether to request a delivery report (default: true) */
  @IsOptional()
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport?: boolean = true;

  /** Optional metadata for logging, template variables, or tracing */
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// -------------------- Bulk SMS --------------------
/**
 * DTO for sending bulk SMS notifications
 */
export class SendNotificationBulkSmsDto {
  /** List of recipients in E.164 format (at least one required) */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, {
    each: true,
    message: 'Each recipient must be in E.164 format, e.g., +254700000000',
  })
  recipients: string[];

  /** SMS message content (max 160 characters) */
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  /** Stop sending to remaining recipients on first error (default: false) */
  @IsOptional()
  @IsBoolean({ message: 'stopOnError must be a boolean' })
  stopOnError?: boolean = false;

  /** Optional sender ID (up to 11 characters) */
  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'senderId cannot exceed 11 characters' })
  senderId?: string;

  /** Optional category of message */
  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'], {
    message: 'category must be one of system, transactional, marketing',
  })
  category?: 'system' | 'transactional' | 'marketing';

  /** Optional priority level */
  @IsOptional()
  @IsIn(['low', 'normal', 'high'], { message: 'priority must be one of low, normal, high' })
  priority?: 'low' | 'normal' | 'high';

  /** Optional scheduled date/time for sending */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid date' })
  scheduledAt?: Date;

  /** Optional language code */
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  /** Whether to request a delivery report (default: true) */
  @IsOptional()
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport?: boolean = true;

  /** Optional metadata for logging, template variables, or tracing */
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// -------------------- SMS Activity Query --------------------
/**
 * DTO for querying SMS activity logs
 */
export class SmsActivityQueryDto {
  /** Filter by SMS status */
  @IsOptional()
  @IsIn(['success', 'error'], { message: 'status must be either success or error' })
  status?: 'success' | 'error';

  /** Filter by recipient phone number */
  @IsOptional()
  @IsString({ message: 'to must be a string' })
  to?: string;

  /** Pagination limit (default: 50, min: 1, max: 200) */
  @IsOptional()
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? 50 : num;
  })
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(200, { message: 'limit cannot exceed 200' })
  limit?: number = 50;

  /** Optional start date filter */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid date' })
  startDate?: Date;

  /** Optional end date filter */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid date' })
  endDate?: Date;
}
