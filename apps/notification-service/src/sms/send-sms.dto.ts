import { IsString, IsNotEmpty, Matches, MaxLength, IsOptional } from 'class-validator';

export class SendSmsDto {
  /** Recipient phone number in E.164 format */
  @IsString()
  @IsNotEmpty({ message: 'Recipient phone number is required' })
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format, e.g., +254700000000',
  })
  to: string;

  /** SMS message content (max 160 characters) */
  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;

  /** Optional sender ID (up to 11 characters) */
  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'Sender ID cannot exceed 11 characters' })
  senderId?: string;

  /** Optional metadata for logging/tracing */
  @IsOptional()
  metadata?: Record<string, unknown>;
}
