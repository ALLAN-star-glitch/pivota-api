// user-signup-email.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserSignupEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to!: string; // Recipient email

  @IsString()
  @IsNotEmpty()
  firstName!: string; // User's first name

  @IsString()
  @IsOptional()
  lastName?: string; // User's last name, optional

  @IsString()
  @IsOptional()
  subject?: string; // Optional custom subject for the email

  @IsString()
  @IsOptional()
  templateId?: string; // Optional Mailjet template ID if using templates
}
