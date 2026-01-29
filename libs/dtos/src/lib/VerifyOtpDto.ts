import { IsEmail, IsString, IsNotEmpty, Length, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'The email address associated with the OTP request',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'The 6-digit verification code received via email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  
  @IsString()
  @Length(6, 6, { message: 'The verification code must be exactly 6 digits' })
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'The reason for which the OTP was issued',
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
export class VerifyOtpResponseDataDto {
  @ApiProperty({
    description: 'Whether the code is valid and belongs to the user',
    example: true,
  })
  verified!: boolean;
}