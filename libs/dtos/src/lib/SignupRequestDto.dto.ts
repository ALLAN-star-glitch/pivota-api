import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  lastName!: string;

  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'StrongPassword123!', description: 'User password' })
  password!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '+254712345678', description: 'User phone number', required: false })
  phone?: string;
}
