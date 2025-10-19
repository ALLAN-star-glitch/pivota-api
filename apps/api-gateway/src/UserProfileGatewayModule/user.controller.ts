import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  Version,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  AuthUserDto,
  BaseResponseDto,
  UserResponseDto,
} from '@pivota-api/dtos';
import { RolesGuard } from '@pivota-api/guards';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { Roles } from '@pivota-api/decorators';

@Controller('user-service')
export class UserController {
  private readonly logger = new Logger();

  constructor(private readonly userService: UserService) {}

  /**
   * 🔒 Get user by UserCode
   * Accessible by: RootGuardian, ContentManagerAdmin, ComplianceAdmin
   * Example: GET /api/v1/user-service/users/code/:userCode
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('users/code/:userCode')
  async getUserByUserCode(
    @Param('userCode') userCode: string,
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.debug(
      `API-GW received request for user by userCode=${userCode}`,
    );
    return this.userService.getUserByUserCode(userCode);
  }


  /**
   * Get user by Email
   * Accessible by: admin
   * Example: GET /api/v1/user-service/users/email/:email
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('users/email/:email')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<BaseResponseDto<AuthUserDto> | null> {
    this.logger.debug(`API-GW received request for user by email=${email}`);
    return this.userService.getUserByEmail(email);
  }

  /**
   *  Get all users
   * Accessible by: RootGuardian
   * Example: GET /api/v1/user-service/users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('users')
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.debug('API-GW received request to fetch all users');
    return this.userService.getAllUsers();
  }
}
