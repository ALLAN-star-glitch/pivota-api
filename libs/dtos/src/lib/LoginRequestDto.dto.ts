import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'StrongPassword123!', description: 'User password' })
  password!: string;
}
