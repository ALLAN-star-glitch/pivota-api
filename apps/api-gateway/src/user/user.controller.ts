import { Controller, Get, Param, UseGuards, Logger, Version } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto, UserResponseDto } from '@pivota-api/dtos';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // 🔒 Protected route: Get user by ID
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get('id/:id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto | null> {
    return this.userService.getUserById(id);
  }

  // 🔒 Protected route: Get user by email
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<AuthUserDto | null> {
    return this.userService.getUserByEmail(email);
  }

  // 🔒 Protected route: Get all users
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    return this.userService.getAllUsers();
  }
}
