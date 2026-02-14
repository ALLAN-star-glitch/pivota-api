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
  IsIn,
} from 'class-validator';

export class SendBulkSmsDto {
  /** List of recipients in E.164 format */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @Type(() => String)
  @IsString({ each: true })
  @Matches(/^\+\d{10,15}$/, {
    each: true,
    message: 'Each recipient must be in E.164 format, e.g., +254700000000',
  })
  recipients: string[];

  /** SMS message content, max 1000 chars */
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(1000, { message: 'SMS message cannot exceed 1000 characters' })
  message: string;

  /** Stop sending if an error occurs for one recipient */
  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean = false;

  /** Optional sender ID (up to 11 characters) */
  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Sender ID cannot exceed 11 characters' })
  senderId?: string;

  /** Optional category/classification */
  @IsOptional()
  @IsString()
  @IsIn(['system', 'transactional', 'marketing'], {
    message: 'Category must be one of system, transactional, or marketing',
  })
  category?: 'system' | 'transactional' | 'marketing';

  /** Optional metadata for logging/tracing, safely typed */
  @IsOptional()
  metadata?: Record<string, unknown>;
}
