import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  Length, 
  MinLength 
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
        example: 'user@example.com',
        description: 'The email address associated with the account'
    })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

  @ApiProperty({
        example: '123456',
        description: 'The 6-digit OTP code received via email'
    })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
    code!: string;

  @ApiProperty({
        example: 'NewSecurePass123!',
        description: 'The new password for the account'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    newPassword!: string;
}