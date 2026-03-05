import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountBaseDto, OrganizationBaseDto } from './organisation-response.dto';

/* ======================================================
   1. PROFILE COMPLETION DTO
   - Matches CompletionResponse in .proto
====================================================== */
export class ProfileCompletionDto {
  @ApiProperty({ example: 80 })
  percentage!: number;

  @ApiProperty({ example: ['nationalId', 'bio'] })
  missingFields!: string[];

  @ApiProperty({ example: false })
  isComplete!: boolean;
}

/* ======================================================
   2. USER BASE DTO (Identity Layer)
   - Matches UserBase in .proto
====================================================== */
export class UserBaseDto {
  @ApiProperty({ example: 'u-1234-uuid-5678' })
  uuid!: string;

  @ApiProperty({ example: 'USR-X8F4C92A' })
  userCode!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@pivota.com' })
  email!: string;

  @ApiProperty({ example: '+254700111222' })
  phone!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'GeneralUser' })
  roleName!: string;
}

/* ======================================================
   3. USER PROFILE METADATA DTO
   - Matches UserProfileMetadata in .proto
====================================================== */
export class UserProfileDataDto {
  @ApiPropertyOptional({ example: 'Software Engineer based in Nairobi.' })
  bio?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  gender?: string;

  @ApiPropertyOptional({ example: '1995-05-15T00:00:00Z' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '32145678' })
  nationalId?: string;

  @ApiPropertyOptional({ example: 'https://cdn.pivota.com/profiles/u123.jpg' })
  profileImage?: string;
}

/* ======================================================
   4. USER SIGNUP DATA DTO / TRIO
   - Matches UserProfileTrio in .proto
====================================================== */
export class UserSignupDataDto {
  @ApiProperty({ type: AccountBaseDto })
  account!: AccountBaseDto;

  @ApiProperty({ type: UserBaseDto })
  user!: UserBaseDto;

  @ApiPropertyOptional({ type: UserProfileDataDto })
  profile?: UserProfileDataDto;

  @ApiPropertyOptional({ type: ProfileCompletionDto })
  completion?: ProfileCompletionDto;
}

/* ======================================================
   5. FULL USER PROFILE RESPONSE
   - Includes timestamps as per UserProfileTrio in .proto
====================================================== */
export class UserProfileResponseDto extends UserSignupDataDto {

  @ApiPropertyOptional({ type: OrganizationBaseDto })
  organization?: OrganizationBaseDto;

  @ApiProperty({ example: '2026-01-06T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-06T12:00:00Z' })
  updatedAt!: string;
}

/* ======================================================
   RESPONSE DTOs (Job Seeker)
====================================================== */

/**
 * Lean & Professional response for Job Seeker profiles.
 * Optimized for UI rendering and recommender system verification.
 */
export class JobSeekerProfileResponseDto {
  @ApiProperty({ example: 'cv_clv123abc' })
  id!: string;

  @ApiProperty({ 
    example: 'Senior Full Stack Developer | NestJS & React',
    description: 'The user’s professional branding statement'
  })
  headline?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Visibility status for recruiters and recommender engines' 
  })
  isActivelySeeking!: boolean;

  @ApiProperty({ 
    example: ['NestJS', 'TypeScript', 'GraphQL'],
    description: 'Verified skills used for matching'
  })
  skills!: string[];

  @ApiProperty({ 
    example: 'SENIOR',
    description: 'The classified seniority level'
  })
  seniorityLevel?: string;

  @ApiPropertyOptional({ 
    example: 'https://storage.pivota.com/cvs/u123/my-resume.pdf',
    description: 'Secure, time-limited access URL to the CV'
  })
  cvUrl?: string;

  @ApiPropertyOptional({ 
    example: '2026-02-26T14:30:00.000Z',
    description: 'Timestamp of the last CV document update'
  })
  cvLastUpdated?: Date;

  @ApiProperty({ 
    example: 85, 
    description: 'Calculated profile strength for recommendations (0-100)' 
  })
  matchScoreWeight?: number;
}

