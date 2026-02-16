import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({
    description: 'The email address where the verification code will be sent',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'A valid email is required to receive a code' })
  @IsNotEmpty()
  email!: string;
}