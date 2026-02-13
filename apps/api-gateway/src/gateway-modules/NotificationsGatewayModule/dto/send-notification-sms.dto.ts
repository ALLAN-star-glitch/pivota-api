import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class SendNotificationSmsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format, e.g., +254700000000',
  })
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160, { message: 'SMS message cannot exceed 160 characters' })
  message: string;
}
