import { IsString, IsEmail, IsOptional, IsObject } from "class-validator";

export class UserOnboardedEventDto {
  @IsString()
  accountId!: string;

  @IsString()
  firstName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  plan?: string; // e.g., 'Free Forever'

  @IsOptional()
  @IsString()
  profileType?: string; // JOB_SEEKER, SKILLED_PROFESSIONAL, INTERMEDIARY_AGENT, HOUSING_SEEKER, SUPPORT_BENEFICIARY, EMPLOYER, PROPERTY_OWNER

  @IsOptional()
  @IsObject()
  profileData?: {
    // Job Seeker fields
    skills?: string[];
    jobTypes?: string[];
    expectedSalary?: number;
    headline?: string;
    
    // Skilled Professional fields
    profession?: string;
    specialties?: string[];
    serviceAreas?: string[];
    yearsExperience?: number;
    
    // Intermediary Agent fields
    agentType?: string;
    specializations?: string[];
    
    // Housing Seeker fields
    preferredTypes?: string[];
    preferredCities?: string[];
    minBudget?: number;
    maxBudget?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
    
    // Support Beneficiary fields
    needs?: string[];
    urgentNeeds?: string[];
    city?: string;
    familySize?: number;
    
    // Employer fields
    businessName?: string;
    industry?: string;
    companySize?: string;
    isRegistered?: boolean;
    
    // Property Owner fields
    propertyCount?: number;
    propertyTypes?: string[];
    propertyPurpose?: string;
    isProfessional?: boolean;
  };
}