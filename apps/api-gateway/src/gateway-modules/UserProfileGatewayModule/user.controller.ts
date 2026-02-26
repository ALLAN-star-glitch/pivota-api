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
  OnboardIndividualProviderRequestDto,
  OnboardProviderGrpcRequestDto,
  UpdateAdminProfileRequestDto,
  UpdateFullUserProfileDto,
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

@ApiTags('UserProfile Module - ((Profile-Service) - MICROSERVICE)')
@ApiBearerAuth() 
// Register all DTOs so Swagger can reference them via getSchemaPath
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
  ContractorProfileResponseDto
)
@SetModule('profile')
@Controller('users-profile-module')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService, private readonly storageService: StorageService) {}

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

 

 // ===========================================================
  // Core Profile Update Logic (Helper)
  // ===========================================================
  private async executeProfileUpdate(
    dto: UpdateFullUserProfileDto,
    file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    let profileImageUrl = dto.profileImage;
    let newlyUploadedUrl: string | null = null;

    // 1. Handle File Upload if provided
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
      // 2. Prepare and send DTO to Microservice (Using the internal gRPC DTO)
      const sanitizedDto: UpdateFullUserProfileDto = { 
        ...dto, 
        profileImage: profileImageUrl 
      };
      
      const response = await this.userService.updateProfile(sanitizedDto);

      // 3. Rollback storage if microservice returns failure
      if (!response.success && newlyUploadedUrl) {
        this.logger.warn(`Profile update failed: ${response.message}. Cleaning up storage...`);
        await this.userService.deleteFromStorage([newlyUploadedUrl], 'pivota-public');
        return response;
      }

      return response;
    } catch (error) {
      // 4. Rollback storage on critical crash (gRPC timeout, etc.)
      if (newlyUploadedUrl) {
        this.logger.error(`Critical error during profile update. Rolling back storage.`);
        await this.userService.deleteFromStorage([newlyUploadedUrl], 'pivota-public');
      }
      throw error;
    }
  }


  // ===========================================================
  // UPDATE OWN PROFILE
  // ===========================================================
  @Patch('users/profile/update/me')
  @Permissions('houses.create.own')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Update own profile metadata and image' })
  async updateOwn(
    @Body() dto: UpdateOwnProfileRequestDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    const requesterUuid = req.user.userUuid;
    
    // Convert to the internal gRPC DTO type
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid: requesterUuid 
    };
    
    return await this.executeProfileUpdate(internalDto, file);
  }

  // ===========================================================
  // UPDATE ANY PROFILE (ADMIN)
  // ===========================================================
  @Patch('admin/users/profile/:userUuid/update')
  @Permissions('houses.create.any')
  @UseInterceptors(FileInterceptor('profileImageFile', {
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }))
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Admin: Update any user profile' })
  @ApiParam({ name: 'userUuid', description: 'The UUID of the user to update' })
  async updateAny(
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateAdminProfileRequestDto,
    @Req() req: JwtRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`👮 Admin ${req.user.userUuid} updating profile for ${userUuid}`);
    
    // Ensure the ID from the URL param takes precedence
    const internalDto: UpdateFullUserProfileDto = { 
      ...dto, 
      userUuid 
    };
    
    return await this.executeProfileUpdate(internalDto, file);
  }

  /**
   * ONBOARD INDIVIDUAL AS SERVICE PROVIDER
   * This is the endpoint called by your "Become a Provider" Wizard.
   */
  @Version('1')
  @Patch('onboard-individual-provider')
  @ApiOperation({ 
    summary: 'Activate Individual Service Provider profile', 
    description: 'Converts the authenticated individual account into a searchable Service Provider/Contractor.' 
  })
  @ApiBody({ type: OnboardIndividualProviderRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Contractor profile activated successfully.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(ContractorProfileResponseDto) } } },
      ],
    }, 
  })
  async onboardIndividualProvider(
    @Body() dto: OnboardIndividualProviderRequestDto,
    @Req() req: JwtRequest
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    const userUuid = req.user.userUuid;
    
    // Map the HTTP Body + the JWT User ID to the gRPC DTO
    const grpcDto: OnboardProviderGrpcRequestDto = {
      ...dto,
      userUuid
    };
    

    const response = await this.userService.onboardIndividualProvider(grpcDto);
    if (!response.success) throw response;
    return response;
  }

}