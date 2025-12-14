import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ApiProperty({ example: 'allanmathenge67@gmail.com', description: 'User email address' })
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @ApiProperty({ example: 'Brav1997@#', description: 'User password' })
  password!: string;
}

