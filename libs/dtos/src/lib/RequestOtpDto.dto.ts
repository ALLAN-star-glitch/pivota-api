import { IsEmail, IsIn, IsNotEmpty, IsOptional, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose, OtpPurposeEnum } from '@pivota-api/shared-redis';
import { KENYAN_PHONE_REGEX } from '@pivota-api/constants';

export class RequestOtpDto {
  @ApiProperty({
    description: 'The email address where the verification code will be sent',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'A valid email is required to receive a code' })
  @IsNotEmpty()
  email!: string;

@ApiPropertyOptional({ 
    description: 'Kenyan phone number in international or local format',
    example: '+254712345678' 
  })
  @IsOptional()
  @ValidateIf((o) => o.phone !== '' && o.phone !== null && o.phone !== undefined)
  @Matches(KENYAN_PHONE_REGEX, { 
    message: 'Please provide a valid Kenyan phone number' 
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