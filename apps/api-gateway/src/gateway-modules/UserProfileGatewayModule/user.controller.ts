import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  Version,
  Patch,
  Body,
  Req,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  AuthUserDto,
  BaseResponseDto,
  RequestOtpDto,
  UpdateFullUserProfileDto,
  UserProfileResponseDto,
  UserResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDataDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { JwtRequest } from '@pivota-api/interfaces';

@ApiTags('UserProfile Module - ((Profile-Service) - MICROSERVICE)')
@ApiExtraModels(BaseResponseDto, UserResponseDto, AuthUserDto)
@Controller('users-profile-module')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  
  constructor(private readonly userService: UserService) {}

  /**
   *  Get user by UserCode
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users/code/:userCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by userCode' })
  @ApiParam({
    name: 'userCode',
    type: String,
    description: 'Unique user code of the user',
    example: 'PIV-000123',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a user by userCode',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserResponseDto) },
          },
        },
      ],
    },
  })
  async getUserByUserCode(
    @Param('userCode') userCode: string,
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.debug(`API-GW received request for userCode=${userCode}`);
    return this.userService.getUserByUserCode(userCode);
  }

  /**
   * 🔒 Get user by Email
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users/email/:email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by email' })
  @ApiParam({
    name: 'email',
    type: String,
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a user by email',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AuthUserDto) },
          },
        },
      ],
    },
  })
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<BaseResponseDto<AuthUserDto> | null> {
    this.logger.debug(`API-GW received request for email=${email}`);
    return this.userService.getUserByEmail(email);
  }

  /**
   *  Get all users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(UserResponseDto) },
            },
          },
        },
      ],
    },
  })
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.debug('API-GW received request to fetch all users');
    return this.userService.getAllUsers();
  }

  /**
   *  Step 1: Request OTP for Profile/Identity Update
   * Public-facing (Can be used at login screen or while logged in)
   */
  @Version('1')
  @Post('users/profile/request-otp')
  @ApiOperation({ summary: 'Request OTP for email/phone update or recovery' })
  async requestUpdateOtp(@Body() dto: RequestOtpDto): Promise<BaseResponseDto<null>> {
    return this.userService.requestUpdateOtp(dto);
  }

  /**
   *  Step 2: Verify OTP for Profile/Identity Update
   */
  @Version('1')
  @Post('users/profile/verify-otp')
  @ApiOperation({ summary: 'Verify OTP for email/phone update' })
  async verifyUpdateOtp(@Body() dto: VerifyOtpDto): Promise<BaseResponseDto<VerifyOtpResponseDataDto>> {
    return this.userService.verifyUpdateOtp(dto);
  }

  /**
   * 📝 Step 3: Final Profile Update
   * Supports metadata updates (direct) and identity updates (verified)
   */
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Patch('users/profile/update')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update profile (Names, Bio, or Verified Identity)',
    description: 'Updates user metadata. Users can update their own profile. Admins can update any profile by providing a userUuid.'
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.', type: UserProfileResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to update another user\'s profile.' })
  async updateProfile(
    @Body() dto: UpdateFullUserProfileDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;

    // 1. Identify Target: Use body UUID if Admin, otherwise force self
    const targetUserUuid = dto.userUuid || requesterUuid;

    // 2. Permission Check (The "Revoke Session" logic pattern)
    if (targetUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(requesterRole);
      
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized update attempt by ${requesterUuid} on ${targetUserUuid}`);
        return BaseResponseDto.fail(
          'You do not have permission to update profiles for other users.',
          'FORBIDDEN',
        );
      }
      
      this.logger.log(`👮 Admin ${requesterRole} (${requesterUuid}) is updating profile for: ${targetUserUuid}`);
    }

    // 3. Sanitization: Ensure the Service receives the correct UUID
    const sanitizedDto = { ...dto, userUuid: targetUserUuid };

    this.logger.debug(`Processing update for ${targetUserUuid} initiated by ${requesterUuid}`);

    try {
      const result = await this.userService.updateProfile(sanitizedDto);
      
      // If the service returns a failure (e.g., email already exists)
      if (!result.success) {
        this.logger.warn(`⚠️ Profile update failed for ${targetUserUuid}: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`🔥 Critical error during profile update for ${targetUserUuid}`, error.stack);
      return BaseResponseDto.fail('An unexpected error occurred while updating the profile.', 'INTERNAL_ERROR');
    }
  }

  
}
