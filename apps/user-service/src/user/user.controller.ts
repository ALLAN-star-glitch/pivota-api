import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { SignupRequestDto, SignupResponseDto, UserResponseDto, GetUserByIdDto, AuthUserDto } from '@pivota-api/shared-dtos';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ------------------ Signup / Create User ------------------
  @MessagePattern('user.create')
  async handleCreateUser(@Payload() signupDto: SignupRequestDto): Promise<SignupResponseDto | null> {
    return this.userService.createUser(signupDto);
  }

  // ------------------ Get User by ID ------------------
  @MessagePattern('auth.getUserById')
  async handleGetUserById(@Payload() dto: GetUserByIdDto): Promise<UserResponseDto | null> {
    return this.userService.getUserById(dto);
  }

  // ------------------ Get User by Email (for Auth Service only) ------------------
  @MessagePattern('user.getByEmail')
  async handleGetByEmail(@Payload() data: { email: string }): Promise<AuthUserDto | null> {
    return this.userService.getUserByEmail(data.email);
  }

  // ------------------ Get All Users ------------------
  @MessagePattern('user.getAll')
  async handleGetAllUsers(): Promise<UserResponseDto[]> {
    return this.userService.getAllUsers();
  }

  // ------------------ Health Check ------------------
  @MessagePattern('health.check')
  async handleHealthCheck() {
    return { status: 'Status is Good' };
  }
}
