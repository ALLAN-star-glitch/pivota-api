import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  Length, 
  Matches, 
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
    description: 'The new password for the account. Must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])/, { 
    message: 'Password must contain at least one lowercase letter (a-z)' 
  })
  @Matches(/^(?=.*[A-Z])/, { 
    message: 'Password must contain at least one uppercase letter (A-Z)' 
  })
  @Matches(/^(?=.*\d)/, {  
    message: 'Password must contain at least one number (0-9)' 
  })
  @Matches(/^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/, { 
    message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};:\'",.<>/?|)' 
  })
  @Matches(/^[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/, {
    message: 'Password contains invalid characters'
  })
  newPassword!: string;
}