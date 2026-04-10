import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { INDIVIDUAL_PURPOSES, IndividualPurpose } from '@pivota-api/constants';
import { Type } from 'class-transformer';
import { JobSeekerProfileDataDto, SkilledProfessionalProfileDataDto, IntermediaryAgentProfileDataDto, HousingSeekerProfileDataDto, SupportBeneficiaryProfileDataDto, EmployerProfileDataDto, PropertyOwnerProfileDataDto } from './user-request.dto';

export class GoogleOnboardingDataDto {
  @ApiPropertyOptional({ 
    description: 'Primary purpose selected during onboarding',
    enum: INDIVIDUAL_PURPOSES,
    example: 'FIND_JOB'
  })
  @IsOptional()
  @IsIn(INDIVIDUAL_PURPOSES)
  primaryPurpose?: IndividualPurpose;

  @ApiPropertyOptional({ 
    description: 'Job seeker profile data (when primaryPurpose is FIND_JOB)',
    type: JobSeekerProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobSeekerProfileDataDto)
  jobSeekerData?: JobSeekerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Skilled professional profile data (when primaryPurpose is OFFER_SKILLED_SERVICES)',
    type: SkilledProfessionalProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SkilledProfessionalProfileDataDto)
  skilledProfessionalData?: SkilledProfessionalProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Intermediary agent profile data (when primaryPurpose is WORK_AS_AGENT)',
    type: IntermediaryAgentProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntermediaryAgentProfileDataDto)
  intermediaryAgentData?: IntermediaryAgentProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Housing seeker profile data (when primaryPurpose is FIND_HOUSING)',
    type: HousingSeekerProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HousingSeekerProfileDataDto)
  housingSeekerData?: HousingSeekerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Support beneficiary profile data (when primaryPurpose is GET_SOCIAL_SUPPORT)',
    type: SupportBeneficiaryProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupportBeneficiaryProfileDataDto)
  supportBeneficiaryData?: SupportBeneficiaryProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Employer profile data (when primaryPurpose is HIRE_EMPLOYEES)',
    type: EmployerProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployerProfileDataDto)
  employerData?: EmployerProfileDataDto;

  @ApiPropertyOptional({ 
    description: 'Property owner profile data (when primaryPurpose is LIST_PROPERTIES)',
    type: PropertyOwnerProfileDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyOwnerProfileDataDto)
  propertyOwnerData?: PropertyOwnerProfileDataDto;
}

// Updated Google Login Request DTO
export class GoogleLoginRequestDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY0Z...', 
    description: 'The id_token received from the Google OAuth popup' 
  })
  @IsString({ message: 'Google token must be a string' })
  @IsNotEmpty({ message: 'Google token is required' })
  token!: string;

  @ApiPropertyOptional({ 
    description: 'Onboarding data collected from previous steps',
    type: GoogleOnboardingDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GoogleOnboardingDataDto)
  onboardingData?: GoogleOnboardingDataDto;
}