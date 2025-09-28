import { Controller, Get, Param, UseGuards, Logger, Version } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto, BaseResponseDto, UserResponseDto } from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';

@Controller('user-service')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // 🔒 Protected route: Get user by ID
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get('getUserProfileById/:id')
  async getUserById(@Param('id') id: string): Promise<BaseResponseDto<UserResponseDto >| null> {
    return this.userService.getUserById(id);
  }

  // 🔒 Protected route: Get user by email
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get('getUserProfileByEmail/:email')
  async getUserByEmail(@Param('email') email: string): Promise<BaseResponseDto<AuthUserDto >| null> {
    return this.userService.getUserByEmail(email);
  }

  // 🔒 Protected route: Get all users
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get('getAllUserProfiles')
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    return this.userService.getAllUsers();
  }
}
