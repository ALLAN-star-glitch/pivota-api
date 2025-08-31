import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from '@pivota-api/shared-dtos';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Optional REST endpoint: fetch a user by ID
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserDto | null> {
    return this.userService.getUserById({ id: Number(id) });
  }

  // Optional: list all users (admin/testing)
  @Get()
  async getAllUsers(): Promise<UserDto[]> {
    // This requires creating a prisma query inside UserService
    return this.userService.getAllUsers();
  }
}
