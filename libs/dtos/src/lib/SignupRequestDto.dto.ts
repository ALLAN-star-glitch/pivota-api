import { 
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  lastName!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @ApiProperty({ example: 'StrongPassword123!', description: 'User password' })
  password!: string;

  @IsOptional()
  @IsPhoneNumber('KE', { message: 'Invalid Kenyan phone number' })
  @ApiProperty({ example: '+254712345678', description: 'User phone number', required: false })
  phone?: string;
}
