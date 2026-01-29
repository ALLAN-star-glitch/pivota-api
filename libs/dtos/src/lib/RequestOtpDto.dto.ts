import { IsEmail, IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({
    description: 'The email address where the verification code will be sent',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'A valid email is required to receive a code' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'The reason for requesting the OTP',
    enum: ['SIGNUP', 'PASSWORD_RESET', '2FA', 'CHANGE_EMAIL', 'CHANGE_PHONE'],
    example: 'SIGNUP',
  })
  @IsString()
  @IsOptional()
  @IsIn(['SIGNUP', 'PASSWORD_RESET', '2FA', 'CHANGE_EMAIL', 'CHANGE_PHONE'], 
    {
    message: 'Purpose must be either SIGNUP, PASSWORD_RESET, CHANGE_EMAIL, CHANGE_PHONE, or 2FA'
  })
  purpose!: string;
}