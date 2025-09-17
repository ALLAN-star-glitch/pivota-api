import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  SignupRequestDto,
  SignupResponseDto,
  UserResponseDto,
  GetUserByIdDto,
  AuthUserDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ------------------ Signup / Create User via gRPC ------------------
  @GrpcMethod('UserService', 'CreateUser')
  async handleCreateUser(@Payload() signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.userService.createUser(signupDto);
  }

  // ------------------ Get User by ID ------------------
  @GrpcMethod('UserService', 'GetUserById')
  async handleGetUserById(@Payload() dto: GetUserByIdDto): Promise<UserResponseDto | null> {
    return this.userService.getUserById(dto);
  }

  // ------------------ Get User by Email (for Auth Service only) ------------------
  @GrpcMethod('UserService', 'GetUserByEmail')
  async handleGetByEmail(@Payload() data: { email: string }): Promise<AuthUserDto | null> {
    return this.userService.getUserByEmail(data.email);
  }

  // ------------------ Get All Users ------------------
  @GrpcMethod('UserService', 'GetAllUsers')
  async handleGetAllUsers(): Promise<{ users: UserResponseDto[] }> {
    const users = await this.userService.getAllUsers();
    return { users }; // wrap in an object
  }
}
