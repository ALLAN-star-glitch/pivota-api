// apps/gateway/src/modules/profile/controllers/user.controller.ts

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
  Post,
  Delete,
  Query,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
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
  SkilledProfessionalPublicProfileDto,
  DiscoverSkilledProfessionalsDto,
  SkilledProfessionalDiscoveryResponseDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../../AuthGatewayModule/jwt.guard';
import { 
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiParam,
  getSchemaPath,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';

// Guards & Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { SetModule } from '../../../decorators/set-module.decorator';
import { JobType, ProfileType } from '@pivota-api/constants';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';
import { Public } from '../../../decorators/public.decorator';

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
  SkilledProfessionalProfileResponseDto,
  HousingSeekerProfileResponseDto,
  PropertyOwnerProfileResponseDto,
  SupportBeneficiaryProfileResponseDto,
  IntermediaryAgentProfileResponseDto,
  AccountResponseDto
) 
@SetModule(ModuleSlug.ACCOUNT)
@Controller('users-profile-module')
@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
  ) {}

  // ===========================================================
  // PROFILE - MY PROFILE
  // ===========================================================

  @Get('me')
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiOperation({ 
    summary: 'Get own profile',
    description: 'Retrieves the authenticated user\'s complete profile information including all associated profiles (Job Seeker, Skilled Professional, etc.).'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile aggregate retrieved successfully.',
    schema: {
      example: {
        success: true,
        message: 'User retrieved',
        code: 'OK',
        data: {
          account: { uuid: '...', accountCode: '...', type: 'INDIVIDUAL' },
          user: { uuid: '...', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          skilledProfessionalProfile: {
            id: 'sp_123',
            uuid: 'sp-uuid-123',
            title: 'Master Electrician',
            primaryCategory: {
              id: 'cat_123',
              name: 'Electricians',
              slug: 'electricians',
              vertical: 'HOUSING',
              yearsExperience: 8
            },
            additionalCategories: [
              { id: 'cat_456', name: 'Plumbers', slug: 'plumbers', vertical: 'HOUSING' }
            ],
            specialties: ['Wiring', 'Solar Installation'],
            serviceAreas: ['Nairobi', 'Kiambu'],
            hourlyRate: 800,
            isVerified: true,
            averageRating: 4.8
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  async getMe(@Req() req: JwtRequest): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const userUuid = req.user.sub;
    this.logger.log(`Fetching profile for user ${userUuid}`);
    const response = await this.userService.getMyProfile(userUuid);
    if (!response.success) throw response;
    return response;
  }

  @Patch('users/profile/update/me')
  @Permissions(P.ACCOUNT_UPDATE)
  @Version('1')
  @ApiTags('Profile - My Profile')
  @ApiOperation({ 
    summary: 'Update own profile metadata',
    description: 'Updates the authenticated user\'s basic profile information (name, bio, profile image, etc.).'
  })
  @ApiBody({ type: UpdateOwnProfileRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully' 
  })
  @ApiResponse({ 
    status: 403, 
    description: `Forbidden - Requires ${P.ACCOUNT_UPDATE} permission` 
  })
  async updateOwn(
    @Body() dto: UpdateOwnProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const requesterUuid = req.user.sub;
    
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid: requesterUuid 
    };
    
    const response = await this.userService.updateProfile(internalDto);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // INDIVIDUAL PROFILE CREATION
  // ===========================================================

  @Post('profiles/job-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create job seeker profile',
    description: 'Creates a job seeker profile for finding employment opportunities.'
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating job seeker profile for account ${accountUuid}`);
    const response = await this.userService.createJobSeekerProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  @Post('profiles/skilled-professional')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create skilled professional profile',
    description: `
      Creates a skilled professional profile for offering services. 
      
      **Category System:**
      - Categories are managed in the Listings Service and synced via Kafka
      - Use \`GET /categories-module/categories/discovery?type=COMPLIMENTARY\` to get available categories
      - Categories are organized by vertical: HOUSING, JOBS, SOCIAL_SUPPORT
      
      **Category Fields:**
      - \`primaryCategoryId\`: Main service category (required for discovery)
      - \`yearsExperienceInCategory\`: Years of experience specifically for the primary category
      - \`additionalCategoryIds\`: Other service categories the professional offers (optional)
      
      **Examples:**
      - Electrician: primaryCategoryId = "electricians" category ID
      - Plumber: primaryCategoryId = "plumbers" category ID
      - Handyman: primaryCategoryId = "handyman-services" category ID
      
      **Verification Tiers:**
      - Tier 0: Basic ID verified only
      - Tier 1: Trusted (ID + reference letter)
      - Tier 2: Verified (ID + formal certificate)
      - Tier 3: Professional (formal license)
      - Tier 4: Enterprise (business registration)
    `
  })
  @ApiBody({ type: SkilledProfessionalProfileDataDto })
  @ApiResponse({
    status: 201,
    description: 'Skilled professional profile created successfully',
    schema: {
      example: {
        success: true,
        message: 'Skilled professional profile created successfully',
        code: 'CREATED',
        data: {
          id: 'sp_123',
          uuid: 'sp-uuid-123',
          title: 'Master Electrician',
          primaryCategory: {
            id: 'cmnboid7w006sarihf05x9txr',
            name: 'Electricians',
            slug: 'electricians',
            vertical: 'HOUSING',
            yearsExperience: 8
          },
          additionalCategories: [
            {
              id: 'cmnboiddn006tarihsyral717',
              name: 'Plumbers',
              slug: 'plumbers',
              vertical: 'HOUSING'
            }
          ],
          specialties: ['Wiring', 'Solar Installation'],
          serviceAreas: ['Nairobi', 'Kiambu'],
          yearsExperience: 8,
          licenseNumber: 'EBK/1234/2020',
          hourlyRate: 800,
          dailyRate: 5000,
          isVerified: false,
          portfolioImages: ['https://cdn.pivota.com/portfolio/image1.jpg'],
          certifications: ['https://cdn.pivota.com/certs/license.pdf'],
          completion: { percentage: 65, missingFields: ['insuranceInfo'], isComplete: false }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid category ID or missing required fields' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Profile already exists for this account' 
  })
  async createSkilledProfessionalProfile(
    @Body() data: SkilledProfessionalProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating skilled professional profile for account ${accountUuid}`);
    const response = await this.userService.createSkilledProfessionalProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  @Post('profiles/intermediary-agent')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create intermediary agent profile',
    description: 'Creates an agent profile for representing clients in transactions (real estate, recruitment, etc.).'
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating intermediary agent profile for account ${accountUuid}`);
    const response = await this.userService.createIntermediaryAgentProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  @Post('profiles/housing-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create housing seeker profile',
    description: 'Creates a housing seeker profile for finding rental or purchase properties.'
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating housing seeker profile for account ${accountUuid}`);
    const response = await this.userService.createHousingSeekerProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  @Post('profiles/property-owner')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create property owner profile',
    description: 'Creates a property owner profile for listing properties for rent or sale.'
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating property owner profile for account ${accountUuid}`);
    const response = await this.userService.createPropertyOwnerProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  @Post('profiles/support-beneficiary')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Create support beneficiary profile',
    description: 'Creates a support beneficiary profile for receiving social support services.'
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Creating support beneficiary profile for account ${accountUuid}`);
    const response = await this.userService.createSupportBeneficiaryProfile(accountUuid, data);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // INDIVIDUAL PROFILE UPDATES
  // ===========================================================

  @Patch('profiles/skilled-professional')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Update skilled professional profile',
    description: `
      Updates an existing skilled professional profile.
      
      **Update Rules:**
      - All fields are optional - only send fields you want to update
      - Categories can be updated by sending new category IDs
      - Previous categories are replaced with new ones (not merged)
      - Portfolio images and certifications are managed via separate media endpoints
      
      **Category Update Example:**
      \`\`\`json
      {
        "primaryCategoryId": "new-category-id",
        "additionalCategoryIds": ["cat1", "cat2"],
        "title": "Updated Title",
        "hourlyRate": 1000
      }
      \`\`\`
      
      **Note:** Portfolio images and certifications should be uploaded via:
      - \`POST /profile-media/portfolio/skilled-professional\`
      - \`POST /profile-media/certifications\`
    `
  })
  @ApiBody({ type: SkilledProfessionalProfileDataDto })
  @ApiResponse({
    status: 200,
    description: 'Skilled professional profile updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Skilled professional profile updated',
        code: 'OK',
        data: {
          id: 'sp_123',
          uuid: 'sp-uuid-123',
          title: 'Senior Master Electrician',
          primaryCategory: {
            id: 'cmnboid7w006sarihf05x9txr',
            name: 'Electricians',
            slug: 'electricians',
            vertical: 'HOUSING',
            yearsExperience: 10
          },
          additionalCategories: [
            { id: 'cmnboiddn006tarihsyral717', name: 'Plumbers', slug: 'plumbers', vertical: 'HOUSING' },
            { id: 'cmnboiknh0084arihk7i2lcwt', name: 'Oven & Stove Repair', slug: 'oven-stove-repair', vertical: 'HOUSING' }
          ],
          specialties: ['Wiring', 'Solar Installation', 'Security Systems'],
          hourlyRate: 1000,
          isVerified: true
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid category ID' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Profile not found' 
  })
  async updateSkilledProfessionalProfile(
    @Body() data: SkilledProfessionalProfileDataDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    const dto: UpdateSkilledProfessionalGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`Updating skilled professional profile for account ${accountUuid}`);
    const response = await this.userService.updateSkilledProfessionalProfile(dto);
    if (!response.success) throw response;
    return response;
  }

  @Patch('profiles/housing-seeker')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ summary: 'Update housing seeker profile' })
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    const dto: UpdateHousingSeekerGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`Updating housing seeker profile for account ${accountUuid}`);
    const response = await this.userService.updateHousingSeekerProfile(dto);
    if (!response.success) throw response;
    return response;
  }

  @Patch('profiles/property-owner')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ summary: 'Update property owner profile' })
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    const dto: UpdatePropertyOwnerGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`Updating property owner profile for account ${accountUuid}`);
    const response = await this.userService.updatePropertyOwnerProfile(dto);
    if (!response.success) throw response;
    return response;
  }

  @Patch('profiles/support-beneficiary')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ summary: 'Update support beneficiary profile' })
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    const dto: UpdateSupportBeneficiaryGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`Updating support beneficiary profile for account ${accountUuid}`);
    const response = await this.userService.updateSupportBeneficiaryProfile(dto);
    if (!response.success) throw response;
    return response;
  }

  @Patch('profiles/intermediary-agent')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ summary: 'Update intermediary agent profile' })
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
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    const dto: UpdateIntermediaryAgentGrpcRequestDto = {
      ...data,
      accountUuid
    };

    this.logger.log(`Updating intermediary agent profile for account ${accountUuid}`);
    const response = await this.userService.updateIntermediaryAgentProfile(dto);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // REMOVE PROFILE
  // ===========================================================

  @Delete('profiles/:profileType')
  @Version('1')
  @ApiTags('Profile - Individual')
  @ApiOperation({ 
    summary: 'Remove a profile from the user account',
    description: 'Permanently removes a specific profile type (e.g., SKILLED_PROFESSIONAL, JOB_SEEKER) from the user\'s account.'
  })
  @ApiParam({ 
    name: 'profileType', 
    description: 'Type of profile to remove',
    example: 'SKILLED_PROFESSIONAL',
    enum: ['JOB_SEEKER', 'SKILLED_PROFESSIONAL', 'HOUSING_SEEKER', 'PROPERTY_OWNER', 'SUPPORT_BENEFICIARY', 'INTERMEDIARY_AGENT']
  })
  @ApiResponse({
    status: 200,
    description: 'Profile removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Profile removed successfully',
        code: 'OK',
        data: null
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Profile not found' 
  })
  async removeProfile(
    @Param('profileType') profileType: ProfileType,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<null>> {
    const accountUuid = req.user.accountId;

    if (!accountUuid) {
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }

    this.logger.log(`Removing ${profileType} profile from account ${accountUuid}`);
    const response = await this.userService.removeProfile(accountUuid, profileType);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // PROFILE - ADMIN PROFILE
  // ===========================================================

  @Get('users/code/:userCode')
  @Permissions(P.USER_VIEW)
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
  @Permissions(P.USER_VIEW)
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
  @Permissions(P.USER_VIEW)
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
  @Permissions(P.USER_UPDATE)
  @Version('1')
  @ApiTags('Profile - Admin')
  @ApiOperation({ summary: 'Admin: Update any user profile' })
  @ApiParam({ name: 'userUuid', description: 'The UUID of the user to update', example: 'usr_123abc' })
  @ApiBody({ type: UpdateAdminProfileRequestDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateAny(
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateAdminProfileRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`Admin ${req.user.sub} updating profile for ${userUuid}`);
    
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid 
    };
    
    const response = await this.userService.updateProfile(internalDto);
    if (!response.success) throw response;
    return response;
  }

  @Patch('users/profile/job-seeker/update')
  @Version('1')
  @ApiTags('Profile - Job Seeker')
  @ApiOperation({ summary: 'Update job seeker profile' })
  @ApiBody({ type: UpdateJobSeekerRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Job seeker profile updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(JobSeekerProfileResponseDto) } } }
      ],
    },
  })
  async updateJobSeekerProfile(
    @Body() dto: UpdateJobSeekerRequestDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<JobSeekerProfileResponseDto>> {
    const accountId = req.user.accountId;

    const grpcPayload: UpdateJobSeekerGrpcRequestDto = {
      accountUuid: accountId,
      headline: dto.headline,
      isActivelySeeking: dto.isActivelySeeking,
      skills: dto.skills,
      industries: dto.industries,
      jobTypes: dto.jobTypes as JobType[],
      seniorityLevel: dto.seniorityLevel,
    };

    const response = await this.userService.updateJobSeekerProfile(grpcPayload);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL - GET MY PROFILE (Authenticated User)
  // MUST BE BEFORE WILDCARD ROUTES
  // ===========================================================

  @Get('profiles/skilled-professional/me')
  @Version('1')
  @ApiTags('Profile - Skilled Professional')
  @ApiOperation({ 
    summary: 'Get my skilled professional profile',
    description: 'Retrieves the authenticated user\'s own skilled professional profile.'
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getMySkilledProfessionalProfile(
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    const accountUuid = req.user.accountId;
    
    if (!accountUuid) {
      const response = BaseResponseDto.fail('No account associated with this user', 'BAD_REQUEST');
      throw response;
    }
    
    this.logger.log(`Fetching my skilled professional profile for account: ${accountUuid}`);
    const response = await this.userService.getSkilledProfessionalByAccount(accountUuid);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL - GET BY ACCOUNT (Admin/Owner)
  // MUST BE BEFORE WILDCARD ROUTES
  // ===========================================================

  @Get('profiles/skilled-professional/account')
  @Version('1')
  @ApiTags('Profile - Skilled Professional')
  @ApiOperation({ 
    summary: 'Get skilled professional by account UUID',
    description: 'Retrieves a skilled professional profile by account UUID. If no accountUuid provided, returns the authenticated user\'s profile.'
  })
  @ApiQuery({ 
    name: 'accountUuid', 
    required: false,
    description: 'UUID of the account (optional - defaults to authenticated user)',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Professional retrieved successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  async getSkilledProfessionalByAccount(
    @Query('accountUuid') accountUuid: string,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<SkilledProfessionalProfileResponseDto>> {
    // If no accountUuid provided, use the authenticated user's account
    const targetAccountUuid = accountUuid || req.user.accountId;
    
    // Permission check: allow if own account or admin
    const isOwnAccount = targetAccountUuid === req.user.accountId;
    const isAdmin = req.user.role === 'PlatformSystemAdmin';
    
    if (!isOwnAccount && !isAdmin) {
      const response = BaseResponseDto.fail('Access denied', 'FORBIDDEN');
      throw response;
    }
    
    this.logger.log(`Fetching skilled professional for account: ${targetAccountUuid}`);
    const response = await this.userService.getSkilledProfessionalByAccount(targetAccountUuid);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL - DISCOVERY (Public Search)
  // ===========================================================

  @Get('profiles/skilled-professional/discovery')
  @Public()
  @Version('1')
  @ApiTags('Profile - Skilled Professional')
  @ApiOperation({ 
    summary: 'Discover skilled professionals',
    description: 'Public endpoint to search and discover skilled professionals with filters.'
  })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by service area/city' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum hourly rate' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum hourly rate' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum rating (1-5)' })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean, description: 'Filter by verification status' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['rating', 'price_asc', 'price_desc', 'experience', 'recent'], description: 'Sort order' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'Professionals retrieved successfully' })
  async discoverSkilledProfessionals(
    @Query() query: DiscoverSkilledProfessionalsDto,
  ): Promise<BaseResponseDto<SkilledProfessionalDiscoveryResponseDto>> {
    this.logger.log(`Discovering skilled professionals with filters: ${JSON.stringify(query)}`);
    const response = await this.userService.discoverSkilledProfessionals(query);
    if (!response.success) throw response;
    return response;
  }

  // ===========================================================
  // SKILLED PROFESSIONAL - GET BY UUID (Public)
  // WILDCARD ROUTE - MUST BE LAST
  // ===========================================================

  @Get('profiles/skilled-professional/:uuid')
  @Public()
  @Version('1')
  @ApiTags('Profile - Skilled Professional')
  @ApiOperation({ 
    summary: 'Get skilled professional by UUID',
    description: 'Public endpoint to view a skilled professional\'s public profile by their profile UUID.'
  })
  @ApiParam({ name: 'uuid', description: 'UUID of the skilled professional profile' })
  @ApiResponse({ status: 200, description: 'Professional retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  async getSkilledProfessionalByUuid(
    @Param('uuid') uuid: string,
  ): Promise<BaseResponseDto<SkilledProfessionalPublicProfileDto>> {
    this.logger.log(`Fetching skilled professional profile for UUID: ${uuid}`);
    const response = await this.userService.getSkilledProfessionalByUuid(uuid);
    if (!response.success) throw response;
    return response;
  }

  // Add this after the admin routes section and before the skilled professional routes

// ===========================================================
// ACCOUNT MANAGEMENT
// ===========================================================

@Get('accounts/:accountUuid')
@Permissions(P.USER_VIEW)
@Version('1')
@ApiTags('Profile - Account')
@ApiOperation({ 
  summary: 'Get account by UUID',
  description: 'Retrieves account details by account UUID. Requires USER_VIEW permission.'
})
@ApiParam({ 
  name: 'accountUuid', 
  description: 'UUID of the account to retrieve',
  example: '123e4567-e89b-12d3-a456-426614174000'
})
@ApiResponse({ 
  status: 200, 
  description: 'Account retrieved successfully',
  schema: {
    example: {
      success: true,
      message: 'Account retrieved',
      code: 'OK',
      data: {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        accountCode: 'ACC-ABC123',
        type: 'INDIVIDUAL',
        status: 'ACTIVE',
        userRole: 'Individual',
        name: 'John Doe',
        isVerified: true,
        activeProfiles: ['SKILLED_PROFESSIONAL', 'JOB_SEEKER'],
        individualProfile: {
          accountUuid: '123e4567-e89b-12d3-a456-426614174000',
          firstName: 'John',
          lastName: 'Doe',
          profileImage: 'https://cdn.pivota.com/profiles/john.jpg'
        },
        completion: {
          percentage: 75,
          missingFields: ['bio', 'gender'],
          isComplete: false
        }
      }
    }
  }
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized' 
})
@ApiResponse({ 
  status: 403, 
  description: 'Forbidden - Requires USER_VIEW permission' 
})
@ApiResponse({ 
  status: 404, 
  description: 'Account not found' 
})
async getAccountByUuid(
  @Param('accountUuid') accountUuid: string,
): Promise<BaseResponseDto<AccountResponseDto>> {
  this.logger.log(`Fetching account by UUID: ${accountUuid}`);
  const response = await this.userService.getAccountByUuid(accountUuid);
  if (!response.success) throw response;
  return response;
}
}