import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import {
  BaseResponseDto,
  CreateUserRequestDto,
  GetUserByUserUuidDto,
  UpdateFullUserProfileDto,
  UserProfileResponseDto,
  UserSignupDataDto,
  // Add your new DTOs here
  OnboardProviderGrpcRequestDto,
  ContractorProfileResponseDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /** ------------------ Onboard Individual Service Provider ------------------ */
  @GrpcMethod('ProfileService', 'OnboardIndividualProvider')
  async handleOnboardIndividualProvider(
    @Payload() dto: OnboardProviderGrpcRequestDto,
  ): Promise<BaseResponseDto<ContractorProfileResponseDto>> {
    this.logger.log(`[gRPC] Onboarding individual service provider: ${dto.userUuid}`);
    return this.userService.onboardIndividualProvider(dto);
  }

  /** ------------------ Get My Profile (Own Account) ------------------ */
  @GrpcMethod('ProfileService', 'GetMyProfile')
  async handleGetMyProfile(
    @Payload() data: { userUuid: string },
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`[gRPC] GetMyProfile requested for authenticated user: ${data.userUuid}`);
    return this.userService.getMyProfile(data.userUuid);
  }

  /** * ------------------ Update Full User Profile ------------------ 
   * Used by standard users to update their own account information.
   */
  @GrpcMethod('ProfileService', 'UpdateUserProfile')
  async handleUpdateUserProfile(
    @Payload() dto: UpdateFullUserProfileDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`[gRPC] UpdateUserProfile request for: ${dto.userUuid}`);
    return this.userService.updateProfile(dto);
  }

  /** * ------------------ Update Admin User Profile ------------------ 
   * Used by admins to update any user profile with elevated permissions.
   */
  @GrpcMethod('ProfileService', 'UpdateAdminUserProfile')
  async handleUpdateAdminUserProfile(
    @Payload() dto: UpdateFullUserProfileDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto>> {
    this.logger.log(`[gRPC] Admin override update for: ${dto.userUuid}`);
    return this.userService.updateAdminProfile(dto);
  }
  
  /** ------------------ Signup / Create User Profile ------------------ */
  @GrpcMethod('ProfileService', 'CreateUserProfile')
  async handleCreateUserProfile(
    @Payload() dto: CreateUserRequestDto,
  ): Promise<BaseResponseDto<UserSignupDataDto>> {
    this.logger.log(`Creating user profile for email: ${dto.email}`);
    return this.userService.createUserProfile(dto);
  }

  /** ------------------ Get User Profile by Email ------------------ */
  @GrpcMethod('ProfileService', 'GetUserProfileByEmail')
  async handleGetUserProfileByEmail(
    @Payload() data: { email: string },
  ): Promise<BaseResponseDto<UserProfileResponseDto> | null> {
    this.logger.log(`Fetching user profile by email: ${data.email}`);
    return this.userService.getUserProfileByEmail(data);
  }

  /** ------------------ Get User Profile by UserCode ------------------ */
  @GrpcMethod('ProfileService', 'GetUserProfileByUserCode')
  async handleGetUserProfileByUserCode(
    @Payload() data: { userCode: string },
  ): Promise<BaseResponseDto<UserProfileResponseDto> | null> {
    this.logger.log(`Fetching user profile by userCode: ${data.userCode}`);
    return this.userService.getUserProfileByUserCode(data);
  }

  /** ------------------ Get User Profile by UUID ------------------ */
  @GrpcMethod('ProfileService', 'GetUserProfileByUuid')
  async handleGetUserProfileByUuid(
    @Payload() data: GetUserByUserUuidDto,
  ): Promise<BaseResponseDto<UserProfileResponseDto> | null> {
    this.logger.log(`Fetching user profile by UUID: ${data.userUuid}`);
    return this.userService.getUserProfileByUuid(data);
  }
  
  /** ------------------ Get All Users ------------------ */
  @GrpcMethod('ProfileService', 'GetAllUsers')
  async handleGetAllUsers(): Promise<BaseResponseDto<UserProfileResponseDto[]>> {
    this.logger.log('Fetching all users');
    return this.userService.getAllUsers();
  }
}