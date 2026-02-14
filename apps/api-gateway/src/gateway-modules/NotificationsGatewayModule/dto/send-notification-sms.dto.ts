import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * DTO for sending a single SMS notification
 */
export class SendNotificationSmsDto {
  /**
   * Recipient phone number in E.164 format (required)
   * Example: +254700000000
   */
  @IsString()
  @IsNotEmpty({ message: 'Recipient phone number is required' })
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format, e.g., +254700000000',
  })
  to: string;

  /**
   * SMS message content (required)
   * Max length: 160 characters
   */
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  /**
   * Optional sender ID (up to 11 characters)
   */
  @IsOptional()
  @IsString({ message: 'senderId must be a string' })
  @MaxLength(11, { message: 'senderId cannot exceed 11 characters' })
  senderId?: string;

  /**
   * Optional internal receiver ID for tracking
   */
  @IsOptional()
  @IsString({ message: 'receiverId must be a string' })
  receiverId?: string;

  /**
   * Optional category of message
   */
  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'], {
    message: 'category must be one of system, transactional, marketing',
  })
  category?: 'system' | 'transactional' | 'marketing';

  /**
   * Optional priority level of message
   */
  @IsOptional()
  @IsIn(['low', 'normal', 'high'], {
    message: 'priority must be one of low, normal, high',
  })
  priority?: 'low' | 'normal' | 'high';

  /**
   * Optional scheduled date/time for sending
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid Date object' })
  scheduledAt?: Date;

  /**
   * Optional language code for message (e.g., 'en', 'sw', 'fr')
   */
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  /**
   * Whether a delivery report is requested
   * Default: true
   */
  @IsOptional()
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport?: boolean = true;

  /**
   * Optional internal reference ID
   */
  @IsOptional()
  @IsString({ message: 'referenceId must be a string' })
  referenceId?: string;

  /**
   * Optional metadata for logging, template variables, or tracing
   */
  @IsOptional()
  metadata?: Record<string, unknown>;
}
