import { ALLOWED_OTP_PURPOSES } from '@pivota-api/constants';
import { IsEmail, IsString, IsNotEmpty, Length, IsIn } from 'class-validator';

/**
 * Payload emitted by Auth Service when an OTP is generated.
 * Listened to by Notification Service to trigger emails.
 */
export class SendOtpEventDto {
  @IsEmail()
    @IsNotEmpty()
    email!: string;

  @IsString()
    @Length(6, 6)
    @IsNotEmpty()
    code!: string;

  @IsString()
    @IsNotEmpty()
    @IsIn(ALLOWED_OTP_PURPOSES)
    purpose!: string;
}