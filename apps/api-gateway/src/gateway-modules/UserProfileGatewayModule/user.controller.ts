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
  Post,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  AuthUserDto,
  BaseResponseDto,
  JobSeekerProfileResponseDto,
  UpdateAdminProfileRequestDto,
  UpdateFullUserProfileDto,
  UpdateJobSeekerGrpcRequestDto,
  UpdateJobSeekerRequestDto,
  UpdateOwnProfileRequestDto,
  UserProfileResponseDto,
  UserResponseDto, 
  VerifyOtpResponseDataDto,
  // Individual Profile Data DTOs
  JobSeekerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  IntermediaryAgentProfileDataDto,
  HousingSeekerProfileDataDto,
  PropertyOwnerProfileDataDto,
  SupportBeneficiaryProfileDataDto,
  // Individual Profile Response DTOs
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  // Individual Profile Update DTOs
  UpdateSkilledProfessionalGrpcRequestDto,
  UpdateHousingSeekerGrpcRequestDto,
  UpdatePropertyOwnerGrpcRequestDto,
  UpdateSupportBeneficiaryGrpcRequestDto,
  UpdateIntermediaryAgentGrpcRequestDto,

  AccountResponseDto,
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
import { imageFileFilter, documentFileFilter } from '@pivota-api/filters';
import { JobType, ProfileType } from '@pivota-api/constants';

@ApiTags('User Profile')
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
  UpdateJobSeekerGrpcRequestDto,
  JobSeekerProfileResponseDto,
  UpdateJobSeekerRequestDto,
  // Individual Profile Response DTOs
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  AccountResponseDto
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

  @Get('me')
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, description: 'Profile aggregate retrieved successfully.' })
  async getMe(@Req() req: JwtRequest): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const userUuid = req.user.userUuid;
    const response = await this.userService.getMyProfile(userUuid);
    if (!response.success) throw response;
    return response;
  }

  @Patch('users/profile/update/me')
  @Permissions('houses.create.own')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update own profile metadata and image' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
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
  // 👤 INDIVIDUAL PROFILE CREATION
  // ===========================================================

  /**
   * Create Job Seeker Profile
   */
  @Post('profiles/job-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create job seeker profile',
    description: `
      Creates a job seeker profile for the authenticated user.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User wants to find a job
      • Completing job seeker onboarding
      • Adding job search capabilities
      
      **Note:**
      A user can have multiple profile types (e.g., job seeker AND skilled professional)
    `
  })
  @ApiBody({ type: JobSeekerProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Job seeker profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(JobSeekerProfileResponseDto) } } }
      ],
    },
  })
  async createJobSeekerProfile(
    @Body() data: JobSeekerProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating job seeker profile for account ${accountUuid}`);
    return this.userService.createJobSeekerProfile(accountUuid, data);
  }

  /**
   * Create Skilled Professional Profile
   */
  @Post('profiles/skilled-professional')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create skilled professional profile',
    description: `
      Creates a skilled professional profile (e.g., electrician, plumber, trainer).
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User wants to offer skilled services
      • Professional service provider onboarding
      • Adding service offerings
    `
  })
  @ApiBody({ type: SkilledProfessionalProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Skilled professional profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SkilledProfessionalProfileResponseDto) } } }
      ],
    },
  })
  async createSkilledProfessionalProfile(
    @Body() data: SkilledProfessionalProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating skilled professional profile for account ${accountUuid}`);
    return this.userService.createSkilledProfessionalProfile(accountUuid, data);
  }

  /**
   * Create Intermediary Agent Profile
   */
  @Post('profiles/intermediary-agent')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create intermediary agent profile',
    description: `
      Creates an intermediary agent profile (housing agent, recruitment agent, etc.).
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User wants to work as an agent
      • Professional agent onboarding
      • Representing clients
    `
  })
  @ApiBody({ type: IntermediaryAgentProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Intermediary agent profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(IntermediaryAgentProfileResponseDto) } } }
      ],
    },
  })
  async createIntermediaryAgentProfile(
    @Body() data: IntermediaryAgentProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating intermediary agent profile for account ${accountUuid}`);
    return this.userService.createIntermediaryAgentProfile(accountUuid, data);
  }

  /**
   * Create Housing Seeker Profile
   */
  @Post('profiles/housing-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create housing seeker profile',
    description: `
      Creates a housing seeker profile for finding properties.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User wants to find housing
      • Setting housing preferences
      • Property search optimization
    `
  })
  @ApiBody({ type: HousingSeekerProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Housing seeker profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(HousingSeekerProfileResponseDto) } } }
      ],
    },
  })
  async createHousingSeekerProfile(
    @Body() data: HousingSeekerProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating housing seeker profile for account ${accountUuid}`);
    return this.userService.createHousingSeekerProfile(accountUuid, data);
  }

  /**
   * Create Property Owner Profile
   */
  @Post('profiles/property-owner')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create property owner profile',
    description: `
      Creates a property owner profile for listing properties.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User wants to list properties
      • Property management onboarding
      • Rental property listing
    `
  })
  @ApiBody({ type: PropertyOwnerProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Property owner profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(PropertyOwnerProfileResponseDto) } } }
      ],
    },
  })
  async createPropertyOwnerProfile(
    @Body() data: PropertyOwnerProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating property owner profile for account ${accountUuid}`);
    return this.userService.createPropertyOwnerProfile(accountUuid, data);
  }

  /**
   * Create Support Beneficiary Profile
   */
  @Post('profiles/support-beneficiary')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create support beneficiary profile',
    description: `
      Creates a support beneficiary profile for receiving social support.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Use Cases:**
      • User seeking social support
      • Needs assessment
      • Matching with service providers
      
      **Privacy:**
      • Anonymity options available
      • Consent-based data sharing
      • Protected personal information
    `
  })
  @ApiBody({ type: SupportBeneficiaryProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Support beneficiary profile created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SupportBeneficiaryProfileResponseDto) } } }
      ],
    },
  })
  async createSupportBeneficiaryProfile(
    @Body() data: SupportBeneficiaryProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Creating support beneficiary profile for account ${accountUuid}`);
    return this.userService.createSupportBeneficiaryProfile(accountUuid, data);
  }

  // ===========================================================
  // 👤 INDIVIDUAL PROFILE UPDATES
  // ===========================================================

  /**
   * Update Skilled Professional Profile
   */
  @Patch('profiles/skilled-professional')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update skilled professional profile',
    description: `
      Updates an existing skilled professional profile.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Updatable Fields:**
      • title - Professional title
      • profession - Profession category
      • specialties - Specialties
      • serviceAreas - Service areas
      • yearsExperience - Years of experience
      • licenseNumber - License number
      • hourlyRate - Hourly rate
      • dailyRate - Daily rate
      • portfolioImages - Portfolio image URLs
      • certifications - Certificate URLs
    `
  })
  @ApiBody({ type: SkilledProfessionalProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Skilled professional profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SkilledProfessionalProfileResponseDto) } } }
      ],
    },
  })
  async updateSkilledProfessionalProfile(
    @Body() data: SkilledProfessionalProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`API-GW: Updating skilled professional profile for account ${accountUuid}`);
    return this.userService.updateSkilledProfessionalProfile(dto);
  }

  /**
   * Update Housing Seeker Profile
   */
  @Patch('profiles/housing-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update housing seeker profile',
    description: `
      Updates an existing housing seeker profile.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Updatable Fields:**
      • minBedrooms - Minimum bedrooms
      • maxBedrooms - Maximum bedrooms
      • minBudget - Minimum budget
      • maxBudget - Maximum budget
      • preferredTypes - Preferred property types
      • preferredCities - Preferred cities
      • moveInDate - Move-in date
      • hasAgent - Whether using an agent
    `
  })
  @ApiBody({ type: HousingSeekerProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Housing seeker profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(HousingSeekerProfileResponseDto) } } }
      ],
    },
  })
  async updateHousingSeekerProfile(
    @Body() data: HousingSeekerProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<HousingSeekerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    const dto: UpdateHousingSeekerGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`API-GW: Updating housing seeker profile for account ${accountUuid}`);
    return this.userService.updateHousingSeekerProfile(dto);
  }

  /**
   * Update Property Owner Profile
   */
  @Patch('profiles/property-owner')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update property owner profile',
    description: `
      Updates an existing property owner profile.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Updatable Fields:**
      • isProfessional - Whether licensed professional
      • licenseNumber - License number
      • companyName - Company name
      • yearsInBusiness - Years in business
      • preferredPropertyTypes - Preferred property types
      • serviceAreas - Service areas
      • usesAgent - Whether using an agent
    `
  })
  @ApiBody({ type: PropertyOwnerProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Property owner profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(PropertyOwnerProfileResponseDto) } } }
      ],
    },
  })
  async updatePropertyOwnerProfile(
    @Body() data: PropertyOwnerProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<PropertyOwnerProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    const dto: UpdatePropertyOwnerGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`API-GW: Updating property owner profile for account ${accountUuid}`);
    return this.userService.updatePropertyOwnerProfile(dto);
  }

  /**
   * Update Support Beneficiary Profile
   */
  @Patch('profiles/support-beneficiary')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update support beneficiary profile',
    description: `
      Updates an existing support beneficiary profile.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Updatable Fields:**
      • needs - Needs
      • urgentNeeds - Urgent needs
      • familySize - Family size
      • city - City
      • neighborhood - Neighborhood
      • prefersAnonymity - Prefer anonymity
      • consentToShare - Consent to share data
    `
  })
  @ApiBody({ type: SupportBeneficiaryProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Support beneficiary profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(SupportBeneficiaryProfileResponseDto) } } }
      ],
    },
  })
  async updateSupportBeneficiaryProfile(
    @Body() data: SupportBeneficiaryProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SupportBeneficiaryProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    const dto: UpdateSupportBeneficiaryGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`API-GW: Updating support beneficiary profile for account ${accountUuid}`);
    return this.userService.updateSupportBeneficiaryProfile(dto);
  }

  /**
   * Update Intermediary Agent Profile
   */
  @Patch('profiles/intermediary-agent')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update intermediary agent profile',
    description: `
      Updates an existing intermediary agent profile.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Updatable Fields:**
      • agentType - Type of agent
      • specializations - Specializations
      • serviceAreas - Service areas
      • licenseNumber - License number
      • yearsExperience - Years of experience
      • agencyName - Agency name
      • commissionRate - Commission rate
      • about - About the agent
      • profileImage - Profile image URL
      • contactEmail - Contact email
      • contactPhone - Contact phone
    `
  })
  @ApiBody({ type: IntermediaryAgentProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Intermediary agent profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(IntermediaryAgentProfileResponseDto) } } }
      ],
    },
  })
  async updateIntermediaryAgentProfile(
    @Body() data: IntermediaryAgentProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<IntermediaryAgentProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    const dto: UpdateIntermediaryAgentGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`API-GW: Updating intermediary agent profile for account ${accountUuid}`);
    return this.userService.updateIntermediaryAgentProfile(dto);
  }

  // ===========================================================
  // 🗑️ REMOVE PROFILE
  // ===========================================================

  /**
   * Remove a profile
   */
  @Delete('profiles/:profileType')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Remove a profile from the user account',
    description: `
      Removes a specific profile type from the user account.
      
      **Microservice:** Profile Service
      **Authentication:** Required (JWT cookie)
      
      **Supported Profile Types:**
      • JOB_SEEKER
      • SKILLED_PROFESSIONAL
      • HOUSING_SEEKER
      • PROPERTY_OWNER
      • SUPPORT_BENEFICIARY
      • INTERMEDIARY_AGENT
      
      **What happens:**
      • Profile data is permanently deleted
      • Account activeProfiles list is updated
      • Related files are cleaned up from storage
      • Profile completion percentage is recalculated
      
      **Warning:**
      This action is irreversible. All profile data will be permanently deleted.
    `
  })
  @ApiParam({ 
    name: 'profileType', 
    description: 'Type of profile to remove',
    example: 'JOB_SEEKER',
    enum: ['JOB_SEEKER', 'SKILLED_PROFESSIONAL', 'HOUSING_SEEKER', 'PROPERTY_OWNER', 'SUPPORT_BENEFICIARY', 'INTERMEDIARY_AGENT']
  })
  @ApiResponse({
    status: 200,
    description: 'Profile removed successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          example: {
            success: true,
            message: 'Profile removed successfully',
            code: 'OK'
          }
        }
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Unsupported profile type' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async removeProfile(
    @Param('profileType') profileType: ProfileType,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      return BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
    }

    this.logger.log(`API-GW: Removing ${profileType} profile from account ${accountUuid}`);
    return this.userService.removeProfile(accountUuid, profileType);
  }

  // ===========================================================
  // 👤 PROFILE - ADMIN PROFILE
  // ===========================================================

  @Get('users/code/:userCode')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ summary: 'Admin: Get user by userCode' })
  @ApiParam({ name: 'userCode', description: 'The unique system code', example: 'PIV-000123' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUserByUserCode(@Param('userCode') userCode: string): Promise<BaseResponseDto<UserResponseDto>> {
    const response = await this.userService.getUserByUserCode(userCode);
    if (!response.success) throw response;
    return response;
  }

  @Get('users/email/:email')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ summary: 'Admin: Get user by email' })
  @ApiParam({ name: 'email', description: 'Primary email address of the user', example: 'dev@pivota.com' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUserByEmail(@Param('email') email: string): Promise<BaseResponseDto<AuthUserDto>> {
    const response = await this.userService.getUserByEmail(email);
    if (!response.success) throw response;
    return response;
  }

  @Get('users')
  @Permissions('profile.read.any')
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ summary: 'Admin: Get all system users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const response = await this.userService.getAllUsers();
    if (!response.success) throw response;
    return response;
  }

  @Patch('admin/users/profile/:userUuid/update')
  @Permissions('houses.create.any')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Admin: Update any user profile' })
  @ApiParam({ name: 'userUuid', description: 'The UUID of the user to update', example: 'usr_123abc' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
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

  

@Patch('users/profile/job-seeker/update')
@Version('1')
@ApiTags('Profile - Job Seeker')
@UseInterceptors(FileInterceptor('cvFile', {
  fileFilter: documentFileFilter,
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
    
    **Job Types:**
    • FULL_TIME - Permanent position
    • PART_TIME - Part-time work
    • CONTRACT - Contract/freelance
    • INTERNSHIP - Internship position
    • CASUAL - Casual/Gig work
    • GIG - Short-term projects
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
            description: 'Professional CV (PDF, DOC, DOCX, TXT, max 5MB)'
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
@ApiResponse({ status: 415, description: 'Unsupported file format (PDF/DOC/DOCX/TXT only)' })
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
    // Convert string arrays to proper types
    const skills = Array.isArray(dto.skills) 
      ? dto.skills 
      : (typeof dto.skills === 'string' ? [dto.skills] : []);
    
    const industries = Array.isArray(dto.industries) 
      ? dto.industries 
      : (typeof dto.industries === 'string' ? [dto.industries] : []);
    
    // Convert jobTypes to the proper enum type
    const jobTypes = Array.isArray(dto.jobTypes) 
      ? dto.jobTypes.filter((type): type is JobType => 
          ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CASUAL', 'GIG'].includes(type)
        )
      : [];

    const grpcPayload: UpdateJobSeekerGrpcRequestDto = {
      userUuid,
      headline: dto.headline,
      isActivelySeeking: dto.isActivelySeeking, // Already a boolean, no conversion needed
      skills: skills,
      industries: industries,
      jobTypes: jobTypes,
      seniorityLevel: dto.seniorityLevel,
      cvUrl: cvUrl,
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