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
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';

// Guards & Decorators
import { Permissions } from '../../../decorators/permissions.decorator';
import { PermissionsGuard } from '../../../guards/PermissionGuard.guard';
import { SubscriptionGuard } from '../../../guards/subscription.guard';
import { SetModule } from '../../../decorators/set-module.decorator';
import { JobType, ProfileType } from '@pivota-api/constants';
import { Permissions as P, ModuleSlug } from '@pivota-api/access-management';

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
    description: 'Retrieves the authenticated user\'s complete profile information.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile aggregate retrieved successfully.' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized' 
  })
  async getMe(@Req() req: JwtRequest): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const userUuid = req.user.userUuid;
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
    description: 'Updates the authenticated user\'s profile information.'
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
    const requesterUuid = req.user.userUuid;
    
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
  @ApiOperation({ summary: 'Create job seeker profile' })
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
  @ApiOperation({ summary: 'Create skilled professional profile' })
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
  @ApiOperation({ summary: 'Create intermediary agent profile' })
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
  @ApiOperation({ summary: 'Create housing seeker profile' })
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
  @ApiOperation({ summary: 'Create property owner profile' })
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
  @ApiOperation({ summary: 'Create support beneficiary profile' })
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
  @ApiOperation({ summary: 'Update skilled professional profile' })
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
  @ApiOperation({ summary: 'Remove a profile from the user account' })
  @ApiParam({ 
    name: 'profileType', 
    description: 'Type of profile to remove',
    example: 'JOB_SEEKER',
    enum: ['JOB_SEEKER', 'SKILLED_PROFESSIONAL', 'HOUSING_SEEKER', 'PROPERTY_OWNER', 'SUPPORT_BENEFICIARY', 'INTERMEDIARY_AGENT']
  })
  @ApiResponse({
    status: 200,
    description: 'Profile removed successfully'
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
    this.logger.log(`Admin ${req.user.userUuid} updating profile for ${userUuid}`);
    
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
}