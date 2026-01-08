import {  IsString, IsEmail, IsOptional } from "class-validator";

export class UserOnboardedEventDto {
  @IsString()
  accountId!: string;

  @IsString()
  firstName!: string;

  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  plan?: string; // e.g., 'Free Forever'

  
}