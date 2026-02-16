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
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  AuthUserDto,
  BaseResponseDto,
  UpdateFullUserProfileDto,
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
} from '@nestjs/swagger';
import { JwtRequest } from '@pivota-api/interfaces';

// Guards & Decorators
import { Permissions } from '../../decorators/permissions.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { SubscriptionGuard } from '../../guards/subscription.guard';
import { SetModule } from '../../decorators/set-module.decorator';

@ApiTags('UserProfile Module - ((Profile-Service) - MICROSERVICE)')
@ApiBearerAuth()
// Register all DTOs so Swagger can reference them via getSchemaPath
@ApiExtraModels(
  BaseResponseDto, 
  UserResponseDto, 
  AuthUserDto, 
  UserProfileResponseDto, 
  VerifyOtpResponseDataDto
)
@SetModule('profile')
@Controller('users-profile-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   *  Get Current Authenticated User Profile
   */
  @Version('1')
  @Get('me')
  @ApiOperation({ 
    summary: 'Get own profile', 
    description: 'Retrieves the full aggregate data for the logged-in user, including Account details, User metadata, Organization context, and Profile completion status.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Profile aggregate retrieved successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserProfileResponseDto) } } },
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
   *  Get user by UserCode
   */
  @Permissions('profile.read.any')
  @Version('1')
  @Get('users/code/:userCode')
  @ApiOperation({ summary: 'Admin: Get user by userCode' })
  @ApiParam({ name: 'userCode', description: 'The unique system code (e.g., PIV-1234)', example: 'PIV-000123' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserResponseDto) } } },
      ],
    },
  })
  async getUserByUserCode(@Param('userCode') userCode: string): Promise<BaseResponseDto<UserResponseDto>> {
    const response = await this.userService.getUserByUserCode(userCode);
    if (!response.success) throw response;
    return response;
  }

  /**
   *  Get user by Email
   */
  @Permissions('profile.read.any')
  @Version('1')
  @Get('users/email/:email')
  @ApiOperation({ summary: 'Admin: Get user by email' })
  @ApiParam({ name: 'email', description: 'Primary email address of the user', example: 'dev@pivota.com' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(AuthUserDto) } } },
      ],
    },
  })
  async getUserByEmail(@Param('email') email: string): Promise<BaseResponseDto<AuthUserDto>> {
    const response = await this.userService.getUserByEmail(email);
    if (!response.success) throw response;
    return response;
  }

  /**
   *  Get all users
   */
  @Permissions('profile.read.any')
  @Version('1')
  @Get('users')
  @ApiOperation({ summary: 'Admin: Get all system users' })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { type: 'array', items: { $ref: getSchemaPath(UserResponseDto) } } } },
      ],
    },
  })
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const response = await this.userService.getAllUsers();
    if (!response.success) throw response;
    return response;
  }

 

  /**
   * Profile Update
   */
  @Permissions('profile.update.own', 'profile.update.any')
  @Version('1')
  @Patch('users/profile/update')
  @ApiOperation({ 
    summary: 'Update profile metadata',
    description: 'Updates names, bio, gender, and profile images. Admins can update any user by providing a userUuid.' 
  })
  @ApiResponse({
    status: 200,
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserProfileResponseDto) } } },
      ],
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Attempted to update another user without administrative privileges.' })
  async updateProfile(
    @Body() dto: UpdateFullUserProfileDto,
    @Req() req: JwtRequest,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const requesterUuid = req.user.userUuid;
    const requesterRole = req.user.role;
    const targetUserUuid = dto.userUuid || requesterUuid;

    if (targetUserUuid !== requesterUuid) {
      const isAdmin = ['SuperAdmin', 'SystemAdmin'].includes(requesterRole);
      if (!isAdmin) {
        this.logger.warn(`🚫 Unauthorized update attempt by ${requesterUuid}`);
        throw BaseResponseDto.fail('Forbidden - Insufficient permissions.', 'FORBIDDEN');
      }
    }
  

    const sanitizedDto = { ...dto, userUuid: targetUserUuid };
    const response = await this.userService.updateProfile(sanitizedDto);
    if (!response.success) throw response;
    return response;
  }
}