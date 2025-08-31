import { IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class UserDto {
  @IsInt()
  id!: number;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;
}
