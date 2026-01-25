import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginRequestDto {
  @IsString({ message: 'Google token must be a string' })
  @IsNotEmpty({ message: 'Google token is required' })
  @ApiProperty({ 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...', 
    description: 'The id_token received from the Google OAuth popup' 
  })
  token!: string;
}