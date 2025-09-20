import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  SignupRequestDto,
  SignupResponseDto,
  UserResponseDto,
  GetUserByIdDto,
  AuthUserDto,
  LoginRequestDto,
  UserCredentialsDto,
} from '@pivota-api/dtos';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // ------------------ Signup / Create User ------------------
  @GrpcMethod('UserService', 'CreateUser')
  async handleCreateUser(@Payload() signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    return this.userService.createUser(signupDto);
  }

  // ------------------ Get User by ID (safe) ------------------
  @GrpcMethod('UserService', 'GetUserById')
  async handleGetUserById(@Payload() dto: GetUserByIdDto): Promise<UserResponseDto | null> {
    return this.userService.getUserById(dto.id);
  }

  // ------------------ Get User by ID Internal (with password + sessions) ------------------
  @GrpcMethod('UserService', 'GetUserByIdInternal')
  async handleGetUserByIdInternal(@Payload() dto: GetUserByIdDto): Promise<UserCredentialsDto | null> {
    return this.userService.getUserByIdInternal({ id: dto.id });
  }

  // ------------------ Get User by Email (for AuthService login) ------------------
  @GrpcMethod('UserService', 'GetUserByEmail')
  async handleGetByEmail(@Payload() dto: { email: string }): Promise<AuthUserDto | null> {
    return this.userService.getUserByEmail({ email: dto.email });
  }

  // ------------------ Validate User Credentials (for AuthService login) ------------------
  @GrpcMethod('UserService', 'ValidateUserCredentials')
  async handleValidateUserCredentials(@Payload() dto: LoginRequestDto): Promise<AuthUserDto> {
    return this.userService.validateUserCredentials(dto);
  }

  // ------------------ Get All Users ------------------
  @GrpcMethod('UserService', 'GetAllUsers')
  async handleGetAllUsers(): Promise<{ users: UserResponseDto[] }> {
    const users = await this.userService.getAllUsers();
    return { users };
  }

  // ------------------ Refresh Token Operations ------------------

  @GrpcMethod('UserService', 'GetRefreshTokenByTokenId')
  async handleGetRefreshTokenByTokenId(@Payload() data: { tokenId: string }) {
    return this.userService.getRefreshTokenByTokenId(data.tokenId);
  }

  @GrpcMethod('UserService', 'RevokeRefreshToken')
  async handleRevokeRefreshToken(@Payload() data: { tokenId: string }) {
    return this.userService.revokeRefreshToken(data.tokenId);
  }

  @GrpcMethod('UserService', 'ListUserSessions')
  async handleListUserSessions(@Payload() data: { id: string }) {
    return this.userService.listUserSessions(data.id);
  }
}
