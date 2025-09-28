import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  BaseResponseDto,
  SignupRequestDto,
  UserResponseDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // ------------------ Signup / Create User Profile ------------------
  @GrpcMethod('UserService', 'CreateUserProfile')
  async handleCreateUserProfile(@Payload() signupDto: SignupRequestDto): Promise<UserResponseDto> {
    this.logger.log(`Creating user profile for email: ${signupDto.email}`);
    return this.userService.createUserProfile(signupDto);
  }

  // ------------------ Get User Profile by Email ------------------
  @GrpcMethod('UserService', 'GetUserProfileByEmail')
  async handleGetUserProfileByEmail(@Payload() data: { email: string }): Promise<BaseResponseDto<UserResponseDto >| null> {
    this.logger.log(`Fetching user profile by email: ${data.email}`);
    return this.userService.getUserProfileByEmail(data);
  }

  // ------------------ Get User Profile by ID ------------------
  @GrpcMethod('UserService', 'GetUserProfileById')
  async handleGetUserProfileById(@Payload() data: { id: string }): Promise<BaseResponseDto<UserResponseDto >| null> {
    this.logger.log(`Fetching user profile by ID: ${data.id}`);
    return this.userService.getUserProfileById(data);
  }


  // ------------------ Get All Users ------------------
  @GrpcMethod('UserService', 'GetAllUsers')
  async handleGetAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    const users = await this.userService.getAllUsers();
    return  users ;
  }
}
