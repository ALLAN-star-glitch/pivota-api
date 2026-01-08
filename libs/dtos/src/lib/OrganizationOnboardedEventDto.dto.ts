// @pivota-api/dtos
import { IsString, IsOptional, IsEmail } from 'class-validator';

/**
 * DTO for the 'organization.onboarded' event pattern.
 * Sent by Profile Service after an organization and its admin are synced.
 */
export class OrganizationOnboardedEventDto {
  
  @IsString()
  accountId!: string;

  @IsString()
  name!: string; // Organization Name

  @IsString()
  adminFirstName!: string;

  @IsEmail()
  adminEmail!: string; // Admin

  @IsEmail()
  orgEmail!: string // Organisation Email 

  @IsOptional()
  @IsString()
  plan?: string; // e.g., 'Business Pro' or 'Free'
}