import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  BaseResponseDto,
  GetUserByUserUuidDto,
  SignupRequestDto,
  UserResponseDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /** ------------------ Signup / Create User Profile ------------------ */
  @GrpcMethod('UserService', 'CreateUserProfile')
async handleCreateUserProfile(
  @Payload() signupDto: SignupRequestDto,
): Promise<BaseResponseDto<UserResponseDto>> {
  this.logger.log(`Creating user profile for email: ${signupDto.email}`);
  return this.userService.createUserProfile(signupDto);
}


  /** ------------------ Get User Profile by Email ------------------ */
  @GrpcMethod('UserService', 'GetUserProfileByEmail')
  async handleGetUserProfileByEmail(
    @Payload() data: { email: string },
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.log(`Fetching user profile by email: ${data.email}`);
    return this.userService.getUserProfileByEmail(data);
  }

  /** ------------------ Get User Profile by UserCode ------------------ */
  @GrpcMethod('UserService', 'GetUserProfileByUserCode')
  async handleGetUserProfileByUserCode(
    @Payload() data: { userCode: string },
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.log(`Fetching user profile by userCode: ${data.userCode}`);
    return this.userService.getUserProfileByUserCode(data);
  }

  /** ------------------ Get User Profile by UUID ------------------ */
  @GrpcMethod('UserService', 'GetUserProfileByUuid')
  async handleGetUserProfileByUuid(
    @Payload() data: GetUserByUserUuidDto,
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.log(`Fetching user profile by UUID: ${data.userUuid}`);
    return this.userService.getUserProfileByUuid(data);
  }
  
  /** ------------------ Get All Users ------------------ */
  @GrpcMethod('UserService', 'GetAllUsers')
  async handleGetAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.log('Fetching all users');
    return this.userService.getAllUsers();
  }
}
