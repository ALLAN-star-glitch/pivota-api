import { IsEmail, IsIn, IsNotEmpty, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose, OtpPurposeEnum } from '@pivota-api/shared-redis';

export class RequestOtpDto {
  @ApiProperty({
    description: 'The email address where the verification code will be sent',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'A valid email is required to receive a code' })
  @IsNotEmpty()
  email!: string;

 @ApiPropertyOptional({
  description: 'Phone number (required for signup to check uniqueness)',
  example: '+254712345678',
})
@IsOptional()
@Matches(/^(?:\+254|0)?[17]\d{8}$/, { 
  message: 'Phone number must be a valid Kenyan number (e.g., +254712345678 or 0712345678)' 
})
phone?: string;
}

export class RequestOtpQueryDto {
  @ApiProperty({
    description: 'Purpose of the OTP request',
    enum: OtpPurposeEnum,
    required: true,
    example: 'EMAIL_VERIFICATION'
  })
  @IsIn(Object.values(OtpPurposeEnum), { 
    //Custom messsage to avoid exposing internal enum values
    message: `Invalid OTP purpose`
  })  
  @IsNotEmpty()
  purpose!: OtpPurpose;
}