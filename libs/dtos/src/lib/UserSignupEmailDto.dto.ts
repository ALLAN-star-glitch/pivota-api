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

  @IsString()
  @IsOptional()
  createdAt?: string; // Optional account creation date

  // ---------- New fields for subscription info ----------
  @IsString()
  @IsOptional()
  planName?: string; // Plan assigned to the user (e.g., 'Free')

  @IsString()
  @IsOptional()
  status?: string; // Subscription status (e.g., 'active')

  @IsString()
  @IsOptional()
  billingCycle?: string; // Billing cycle (e.g., 'monthly')

  @IsString()
  @IsOptional()
  expiresAt?: string; // Subscription expiration date 
}
