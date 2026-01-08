import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from '../services/user.service';
import {
  BaseResponseDto,
  CreateUserRequestDto,
  GetUserByUserUuidDto,
  UserProfileResponseDto,
  UserSignupDataDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

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
