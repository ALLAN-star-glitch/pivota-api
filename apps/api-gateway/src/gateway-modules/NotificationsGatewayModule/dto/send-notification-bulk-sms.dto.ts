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

/**
 * DTO for sending bulk SMS notifications
 */
export class SendNotificationBulkSmsDto {
  /**
   * List of recipients in E.164 format (e.g., +254700000000)
   * Must have at least one recipient
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @Type(() => String)
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, {
    each: true,
    message: 'Each recipient must be in E.164 format, e.g., +254700000000',
  })
  recipients: string[];

  /**
   * SMS message body
   * Max length 160 characters
   */
  @IsString()
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  /**
   * Stop sending to remaining recipients on first error
   * Defaults to false
   */
  @IsOptional()
  @IsBoolean({ message: 'stopOnError must be a boolean' })
  stopOnError?: boolean = false;

  /**
   * Optional sender ID (up to 11 characters)
   */
  @IsOptional()
  @IsString({ message: 'senderId must be a string' })
  @MaxLength(11, { message: 'senderId cannot exceed 11 characters' })
  senderId?: string;

  /**
   * Optional message category for classification
   */
  @IsOptional()
  @IsString({ message: 'category must be a string' })
  category?: 'system' | 'transactional' | 'marketing';

  /**
   * Optional metadata for logging or tracing purposes
   */
  @IsOptional()
  metadata?: Record<string, unknown>;
}
