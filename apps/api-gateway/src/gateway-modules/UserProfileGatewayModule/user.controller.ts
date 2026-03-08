import {
  Body,
  Controller,
  Logger,
  Get,
  Param,
  Version,
  UseGuards,
  Req,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  AuthUserDto,
  BaseResponseDto,
  ContractorProfileResponseDto,
  JobSeekerProfileResponseDto,
  OnboardIndividualProviderRequestDto,
  OnboardProviderGrpcRequestDto,
  UpdateAdminProfileRequestDto,
  UpdateFullUserProfileDto,
  UpdateJobSeekerGrpcRequestDto,
  UpdateJobSeekerRequestDto,
  UpdateOwnProfileRequestDto,
  UserProfileResponseDto,
  UserResponseDto, 
  VerifyOtpResponseDataDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { 
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
  getSchemaPath,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';

// Guards & Decorators
import { Permissions } from '../../decorators/permissions.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '@pivota-api/shared-storage';
import { imageFileFilter } from '@pivota-api/filters';

@ApiTags('User Profile') // Main module tag
@ApiBearerAuth() 
@ApiExtraModels(
  BaseResponseDto, 
  UserResponseDto, 
  AuthUserDto, 
  UserProfileResponseDto, 
  VerifyOtpResponseDataDto,
  UpdateOwnProfileRequestDto,
  UpdateAdminProfileRequestDto,
  UpdateFullUserProfileDto,
  OnboardIndividualProviderRequestDto,
  ContractorProfileResponseDto,
  UpdateJobSeekerGrpcRequestDto,
  JobSeekerProfileResponseDto,
  UpdateJobSeekerRequestDto
) 
@SetModule('profile')
@Controller('users-profile-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService, 
    private readonly storageService: StorageService
  ) {}

  // ===========================================================
  // 👤 PROFILE - MY PROFILE
  // ===========================================================

  /**
   * Get current authenticated user's profile
   * 
   * Retrieves the complete profile of the currently authenticated user,
   * including account details, personal information, and profile completion status.
   * 
   * @param req - JWT request containing user information
   * @returns Complete user profile with all metadata
   */
  @Get('me')
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiOperation({ 
    summary: 'Get own profile',
    description: `
      Retrieves the complete profile of the currently authenticated user.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Information returned:**
      • **Account details** - UUID, account code, type (INDIVIDUAL/ORGANIZATION)
      • **User identity** - UUID, user code, email, phone, name
      • **Organization context** - If user belongs to an organization
      • **Profile metadata** - Bio, gender, date of birth, national ID
      • **Profile image** - URL to avatar
      • **Completion status** - Profile completion percentage and missing fields
      
      **Account Types:**
      • **INDIVIDUAL** - Personal account
      • **ORGANIZATION** - Business/Organizational account
      
      **Profile Completion:**
      The response includes a completion object showing:
      • percentage - How complete the profile is (0-100)
      • missingFields - Fields still needed for completion
      • isComplete - Whether profile is fully complete
      
      **Use Cases:**
      • Display user profile in UI
      • Check profile completion for onboarding
      • Show account information
      • Determine user type (individual/organization)
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Profile aggregate retrieved successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(UserProfileResponseDto),
              example: {
                account: {
                  uuid: 'acc_123abc',
                  accountCode: 'ACC-USER123',
                  type: 'INDIVIDUAL'
                },
                user: {
                  uuid: 'usr_456def',
                  userCode: 'USR-ABC123',
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john.doe@example.com',
                  phone: '+254712345678',
                  status: 'ACTIVE',
                  roleName: 'GeneralUser'
                },
                profile: {
                  bio: 'Software developer with 5 years experience',
                  gender: 'Male',
                  dateOfBirth: '1990-01-01',
                  nationalId: '12345678',
                  profileImage: 'https://storage.example.com/profiles/user123.jpg'
                },
                completion: {
                  percentage: 75,
                  missingFields: ['BIO', 'NATIONAL_ID'],
                  isComplete: false
                },
                createdAt: '2026-01-15T00:00:00.000Z',
                updatedAt: '2026-03-05T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or expired token.' })
  async getMe(@Req() req: JwtRequest): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const userUuid = req.user.userUuid;
    const response = await this.userService.getMyProfile(userUuid);
    if (!response.success) throw response;
    return response;
  }

  /**
   * Update own profile
   * 
   * Updates the authenticated user's profile information and optionally uploads a profile image.
   * 
   * @param dto - Profile fields to update
   * @param req - JWT request containing user information
   * @param file - Optional profile image file
   * @returns Updated user profile
   */
  @Patch('users/profile/update/me')
  @Permissions('houses.create.own')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Update own profile metadata and image',
    description: `
      Updates the authenticated user's profile information.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.own
      
      **Updatable Fields:**
      • **firstName** - User's first name
      • **lastName** - User's last name
      • **email** - Email address
      • **phone** - Phone number (Kenyan format)
      • **bio** - Short biography
      • **gender** - Gender
      • **dateOfBirth** - Date of birth (ISO format)
      • **nationalId** - National ID number
      • **profileImage** - URL to profile image (if not uploading file)
      
      **File Upload:**
      • Upload profile image via 'profileImageFile' field
      • Supported formats: JPEG, PNG, GIF
      • Max file size: 2MB
      • Image is automatically uploaded to Supabase storage
      
      **Error Handling:**
      • If profile update fails, uploaded images are automatically cleaned up
      • Partial updates supported - only provided fields are updated
      
      **Notes:**
      • Email changes may require verification
      • Phone numbers are normalized to +254 format
    `
  })
  @ApiBody({
    description: 'Update your own profile details and upload an optional avatar image.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateOwnProfileRequestDto) },
        {
          type: 'object',
          properties: {
            profileImageFile: { 
              type: 'string', 
              format: 'binary',
              description: 'Profile picture (JPEG/PNG, max 2MB)'
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserProfileResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 413, description: 'File too large (max 2MB)' })
  @ApiResponse({ status: 415, description: 'Unsupported file format' })
  async updateOwn(
    @Body() dto: UpdateOwnProfileRequestDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const requesterUuid = req.user.userUuid;
    
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid: requesterUuid 
    };
    
    return await this.executeProfileUpdate(internalDto, file);
  }

  // ===========================================================
  // 👤 PROFILE - ADMIN PROFILE
  // ===========================================================

  /**
   * Get user by user code
   * 
   * Retrieves a user by their unique system code.
   * 
   * @param userCode - Unique user code (e.g., PIV-000123)
   * @returns User details
   */
  @Get('users/code/:userCode')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ 
    summary: 'Admin: Get user by userCode',
    description: `
      Retrieves a user by their unique system code.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permission:** profile.read.any
      
      **User Code Format:**
      • Format: USR-XXXXXX or PIV-XXXXXX
      • Example: USR-ABC123, PIV-000123
      • Generated at account creation
      • Unique across the system
      
      **Information returned:**
      • User identity details
      • Account information
      • Basic profile metadata
      
      **Use Cases:**
      • Customer support lookups
      • User search by code
      • Integration with external systems
      • Manual user verification
    `
  })
  @ApiParam({ 
    name: 'userCode', 
    description: 'The unique system code (e.g., PIV-1234)', 
    example: 'PIV-000123' 
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(UserResponseDto),
              example: {
                uuid: 'usr_123abc',
                userCode: 'PIV-000123',
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+254712345678',
                status: 'ACTIVE',
                roleName: 'GeneralUser',
                createdAt: '2026-01-15T00:00:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUserCode(@Param('userCode') userCode: string): Promise<BaseResponseDto<UserResponseDto>> {
    const response = await this.userService.getUserByUserCode(userCode);
    if (!response.success) throw response;
    return response;
  }

  /**
   * Get user by email
   * 
   * Retrieves a user by their email address.
   * 
   * @param email - User's email address
   * @returns User details including auth information
   */
  @Get('users/email/:email')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ 
    summary: 'Admin: Get user by email',
    description: `
      Retrieves a user by their email address.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permission:** profile.read.any
      
      **Information returned:**
      • User identity details
      • Account information
      • Authentication metadata
      • Account status
      
      **Use Cases:**
      • Customer support by email
      • Account recovery assistance
      • User verification
      • Audit purposes
      
      **Note:**
      Email addresses are case-insensitive and normalized to lowercase.
    `
  })
  @ApiParam({ 
    name: 'email', 
    description: 'Primary email address of the user', 
    example: 'dev@pivota.com' 
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(AuthUserDto),
              example: {
                uuid: 'usr_123abc',
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+254712345678',
                status: 'ACTIVE',
                roleName: 'GeneralUser',
                mfaEnabled: true,
                lastLoginAt: '2026-03-05T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEmail(@Param('email') email: string): Promise<BaseResponseDto<AuthUserDto>> {
    const response = await this.userService.getUserByEmail(email);
    if (!response.success) throw response;
    return response;
  }

  /**
   * Get all users
   * 
   * Retrieves a list of all users in the system.
   * 
   * @returns List of all users
   */
  @Get('users')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ 
    summary: 'Admin: Get all system users',
    description: `
      Retrieves a list of all users in the system.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permission:** profile.read.any
      
      **Information returned:**
      • Basic user information for all users
      • Sorted by creation date
      • Includes account details
      
      **Use Cases:**
      • User management dashboard
      • System-wide reporting
      • User analytics
      • Administrative overview
      
      **Note:**
      For large user bases, consider implementing pagination.
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              type: 'array', 
              items: { $ref: getSchemaPath(UserResponseDto) },
              example: [
                {
                  uuid: 'usr_123abc',
                  userCode: 'USR-ABC123',
                  email: 'user1@example.com',
                  firstName: 'John',
                  lastName: 'Doe',
                  status: 'ACTIVE'
                },
                {
                  uuid: 'usr_456def',
                  userCode: 'USR-DEF456',
                  email: 'user2@example.com',
                  firstName: 'Jane',
                  lastName: 'Smith',
                  status: 'ACTIVE'
                }
              ]
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const response = await this.userService.getAllUsers();
    if (!response.success) throw response;
    return response;
  }

  /**
   * Update any user profile (Admin)
   * 
   * Admin endpoint to update any user's profile information.
   * 
   * @param userUuid - UUID of the user to update
   * @param dto - Profile fields to update
   * @param req - JWT request containing admin information
   * @param file - Optional profile image file
   * @returns Updated user profile
   */
  @Patch('admin/users/profile/:userUuid/update')
  @Permissions('houses.create.any')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Admin: Update any user profile',
    description: `
      Admin endpoint to update any user's profile information.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      **Permission:** houses.create.any
      
      **Admin Capabilities:**
      • Update any user's profile
      • Change email and phone
      • Update personal information
      • Upload profile images
      • Modify sensitive fields
      
      **Updatable Fields:**
      • All fields available in UpdateAdminProfileRequestDto
      • Can update any user regardless of ownership
      
      **Use Cases:**
      • Customer support assistance
      • Manual profile corrections
      • Account recovery help
      • Data cleanup
      
      **Audit:**
      All admin updates are logged with admin UUID for audit trail.
    `
  })
  @ApiParam({ 
    name: 'userUuid', 
    description: 'The UUID of the user to update',
    example: 'usr_123abc'
  })
  @ApiBody({
    description: 'Admin: Update a specific user profile and image.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateAdminProfileRequestDto) },
        {
          type: 'object',
          properties: {
            profileImageFile: { 
              type: 'string', 
              format: 'binary',
              description: 'Profile picture (JPEG/PNG, max 2MB)'
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserProfileResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateAny(
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateAdminProfileRequestDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`👮 Admin ${req.user.userUuid} updating profile for ${userUuid}`);
    
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid 
    };
    
    return await this.executeProfileUpdate(internalDto, file);
  }

  // ===========================================================
  // 👤 PROFILE - PROVIDER PROFILE
  // ===========================================================

  /**
   * Onboard individual as service provider
   * 
   * Converts an individual account into a service provider/contractor.
   * 
   * @param dto - Provider onboarding details
   * @param req - JWT request containing user information
   * @returns Activated contractor profile
   */
  @Patch('onboard-individual-provider')
  @Version('1')
  @ApiTags('Profile - Provider')
  @ApiOperation({ 
    summary: 'Activate Individual Service Provider profile',
    description: `
      Converts an individual account into a searchable Service Provider/Contractor.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **What happens:**
      1. Creates a ContractorProfile linked to the user's account
      2. Adds professional information (specialties, service areas)
      3. Makes user discoverable in provider searches
      4. Enables service offering creation
      
      **Required Information:**
      • **specialties** - List of professional specialties (e.g., ["Plumbing", "Electrical"])
      • **serviceAreas** - Geographic areas served (e.g., ["Nairobi", "Kiambu"])
      • **yearsExperience** - Years of professional experience
      
      **Effects:**
      • User becomes searchable in contractor discovery
      • Can create service offerings
      • Receives provider badge on profile
      • Eligible for provider-specific features
      
      **Use Cases:**
      • "Become a Provider" wizard
      • Professional onboarding
      • Service provider registration
      
      **Note:**
      This is for individual providers. Organizations use a separate flow.
    `
  })
  @ApiBody({ 
    type: OnboardIndividualProviderRequestDto,
    examples: {
      'Plumber onboarding': {
        value: {
          specialties: ['Plumbing', 'Pipe Repair', 'Water Heater Installation'],
          serviceAreas: ['Nairobi', 'Kiambu', 'Machakos'],
          yearsExperience: 8
        }
      },
      'Electrician onboarding': {
        value: {
          specialties: ['Electrical Installation', 'Wiring', 'Appliance Repair'],
          serviceAreas: ['Nairobi CBD', 'Westlands', 'Kilimani'],
          yearsExperience: 5
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Contractor profile activated successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(ContractorProfileResponseDto),
              example: {
                uuid: 'prof_123abc',
                accountId: 'acc_456def',
                specialties: ['Plumbing', 'Pipe Repair'],
                serviceAreas: ['Nairobi', 'Kiambu'],
                yearsExperience: 8,
                isVerified: false,
                averageRating: 0,
                totalReviews: 0,
                createdAt: '2026-03-05T10:30:00.000Z'
              }
            } 
          } 
        },
      ],
    }, 
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'User already has a provider profile' })
  async onboardIndividualProvider(
    @Body() dto: OnboardIndividualProviderRequestDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    const userUuid = req.user.userUuid;
    
    const grpcDto: OnboardProviderGrpcRequestDto = {
      ...dto,
      userUuid
    };
    
    const response = await this.userService.onboardIndividualProvider(grpcDto);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // 👤 PROFILE - JOB SEEKER PROFILE
  // ===========================================================

  /**
   * Update job seeker profile
   * 
   * Updates professional metadata and CV for the job seeker profile.
   * Used by the recommender engine for job matching.
   * 
   * @param dto - Job seeker profile data
   * @param req - JWT request containing user information
   * @param file - Optional CV file (PDF/DOCX)
   * @returns Updated job seeker profile
   */
  @Patch('users/profile/job-seeker/update')
  @Version('1')
  @ApiTags('Profile - Job Seeker')
  @UseInterceptors(FileInterceptor('cvFile', {
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(pdf|docx)$/)) {
        return cb(new Error('Only PDF and DOCX files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } 
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Update job seeker status and upload CV',
    description: `
      Updates professional metadata and CV for the job seeker profile.
      Used by the recommender engine for job matching.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **What is a Job Seeker Profile?**
      A specialized profile for users looking for employment opportunities.
      It feeds the SmartMatch™ recommendation engine to suggest relevant jobs.
      
      **Profile Components:**
      • **Headline** - Professional headline (e.g., "Senior Software Engineer")
      • **IsActivelySeeking** - Whether actively looking for jobs
      • **Skills** - List of professional skills
      • **Industries** - Preferred industries
      • **JobTypes** - Types of jobs desired (FULL_TIME, PART_TIME, CONTRACT, etc.)
      • **SeniorityLevel** - Experience level (ENTRY, MID, SENIOR)
      • **CV** - Professional CV document (PDF/DOCX)
      
      **Skills Array:**
      Example: ["JavaScript", "TypeScript", "React", "Node.js", "Python"]
      
      **Industries Array:**
      Example: ["FinTech", "HealthCare", "E-commerce", "Education"]
      
      **Job Types:**
      • **FULL_TIME** - Permanent position
      • **PART_TIME** - Part-time work
      • **CONTRACT** - Contract/freelance
      • **REMOTE** - Remote work
      • **INTERNSHIP** - Internship position
      
      **Seniority Levels:**
      • **ENTRY** - 0-2 years experience
      • **MID** - 3-5 years experience
      • **SENIOR** - 5+ years experience
      • **LEAD** - Team lead/manager
      
      **CV Upload:**
      • Supported formats: PDF, DOCX
      • Max file size: 5MB
      • Stored in private bucket (pivota-private)
      • Access controlled by user permissions
      
      **Recommender Engine:**
      This data is used to:
      • Match jobs to candidate skills
      • Suggest relevant opportunities
      • Rank search results
      • Personalize job recommendations
      
      **Error Handling:**
      • If profile update fails, uploaded CV is automatically cleaned up
      • Arrays are properly parsed from form data
    `
  })
  @ApiBody({
    description: 'Update professional metadata and upload a CV document.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateJobSeekerRequestDto) },
        {
          type: 'object',
          properties: {
            cvFile: { 
              type: 'string', 
              format: 'binary',
              description: 'Professional CV (PDF or DOCX, max 5MB)'
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Job seeker profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { 
          properties: { 
            data: { 
              $ref: getSchemaPath(JobSeekerProfileResponseDto),
              example: {
                headline: 'Senior Software Engineer',
                isActivelySeeking: true,
                skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
                industries: ['FinTech', 'E-commerce'],
                seniorityLevel: 'SENIOR',
                jobTypes: ['FULL_TIME', 'REMOTE'],
                cvUrl: 'https://storage.example.com/cvs/user123/cv.pdf',
                cvLastUpdated: '2026-03-05T10:30:00.000Z',
                matchScoreWeight: 100
              }
            } 
          } 
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 413, description: 'CV file too large (max 5MB)' })
  @ApiResponse({ status: 415, description: 'Unsupported file format (PDF/DOCX only)' })
  async updateJobSeekerProfile(
    @Body() dto: UpdateJobSeekerRequestDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    const userUuid = req.user.userUuid;
    let cvUrl: string | undefined;

    if (file) {
      const storagePath = `cvs/${userUuid}`;
      cvUrl = await this.userService.uploadToStorage(
        file,
        storagePath,
        'pivota-private' 
      );
    }

    try {
      const grpcPayload: UpdateJobSeekerGrpcRequestDto = {
        ...dto,
        userUuid,
        cvUrl,
        isActivelySeeking: String(dto.isActivelySeeking) === 'true',
        skills: typeof dto.skills === 'string' ? [dto.skills] : (dto.skills ?? []),
        industries: typeof dto.industries === 'string' ? [dto.industries] : (dto.industries ?? []),
        jobTypes: typeof dto.jobTypes === 'string' ? [dto.jobTypes] : (dto.jobTypes ?? []),
      };

      const response = await this.userService.updateJobSeekerProfile(grpcPayload);

      if (!response.success && cvUrl) {
        this.logger.warn(`Job profile update failed. Cleaning up CV: ${cvUrl}`);
        await this.userService.deleteFromStorage([cvUrl], 'pivota-private');
        return response;
      }

      return response;
    } catch (error) {
      if (cvUrl) {
        await this.userService.deleteFromStorage([cvUrl], 'pivota-private');
      }
      this.logger.error('Critical failure in Job Seeker Profile Update', error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  // ===========================================================
  // Core Profile Update Logic (Helper)
  // ===========================================================
  private async executeProfileUpdate(
    dto: UpdateFullUserProfileDto,
    file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    let profileImageUrl = dto.profileImage;
    let newlyUploadedUrl: string | null = null;

    if (file) {
      const storagePath = `profiles/${dto.userUuid}`;
      newlyUploadedUrl = await this.userService.uploadToStorage(
        file,
        storagePath,
        'pivota-public'
      );
      profileImageUrl = newlyUploadedUrl;
    }

    try {
      const sanitizedDto: UpdateFullUserProfileDto = { 
        ...dto, 
        profileImage: profileImageUrl 
      };
      
      const response = await this.userService.updateProfile(sanitizedDto);

      if (!response.success && newlyUploadedUrl) {
        this.logger.warn(`Profile update failed: ${response.message}. Cleaning up storage...`);
        await this.userService.deleteFromStorage([newlyUploadedUrl], 'pivota-public');
        return response;
      }

      return response;
    } catch (error) {
      if (newlyUploadedUrl) {
        this.logger.error(`Critical error during profile update. Rolling back storage.`);
        await this.userService.deleteFromStorage([newlyUploadedUrl], 'pivota-public');
      }
      throw error;
    }
  }
}