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
import { Roles } from '@pivota-api/decorators';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('UserProfile Module - ((User-Service) - MICROSERVICE)')
@ApiExtraModels(BaseResponseDto, UserResponseDto, AuthUserDto)
@Controller('users-module')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   *  Get user by UserCode
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'Landlord',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users/code/:userCode')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by userCode' })
  @ApiParam({
    name: 'userCode',
    type: String,
    description: 'Unique user code of the user',
    example: 'PIV-000123',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a user by userCode',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(UserResponseDto) },
          },
        },
      ],
    },
  })
  async getUserByUserCode(
    @Param('userCode') userCode: string,
  ): Promise<BaseResponseDto<UserResponseDto> | null> {
    this.logger.debug(`API-GW received request for userCode=${userCode}`);
    return this.userService.getUserByUserCode(userCode);
  }

  /**
   * 🔒 Get user by Email
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users/email/:email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by email' })
  @ApiParam({
    name: 'email',
    type: String,
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a user by email',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(AuthUserDto) },
          },
        },
      ],
    },
  })
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<BaseResponseDto<AuthUserDto> | null> {
    this.logger.debug(`API-GW received request for email=${email}`);
    return this.userService.getUserByEmail(email);
  }

  /**
   *  Get all users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SuperAdmin',
    'ContentManagerAdmin',
    'ComplianceAdmin',
    'AnalyticsAdmin',
    'FraudAdmin',
  )
  @Version('1')
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all users',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(UserResponseDto) },
            },
          },
        },
      ],
    },
  })
  async getAllUsers(): Promise<BaseResponseDto<UserResponseDto[]>> {
    this.logger.debug('API-GW received request to fetch all users');
    return this.userService.getAllUsers();
  }
}
