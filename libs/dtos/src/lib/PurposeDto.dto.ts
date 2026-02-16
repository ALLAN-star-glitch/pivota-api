import { IsNotEmpty, IsIn, IsString } from 'class-validator';
import { Transform } from 'class-transformer'; // Add this
import { ApiProperty } from '@nestjs/swagger';
import { ALLOWED_OTP_PURPOSES } from '@pivota-api/constants';   

export class OtpPurposeQueryDto {
  @ApiProperty({ 
    description: 'The specific reason for the OTP request',
    example: 'ORGANIZATION_SIGNUP',
    enum: ALLOWED_OTP_PURPOSES
  })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value) // Ensure uppercase
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_OTP_PURPOSES, { 
    message: `The provided purpose is invalid. Must be one of: ${ALLOWED_OTP_PURPOSES.join(', ')}` 
  })
  purpose!: string;
}