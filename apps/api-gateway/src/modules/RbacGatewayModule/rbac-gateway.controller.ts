import {
  Body,
  Controller,
  Post,
  Put,
  Get,
  Param,
  Version,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { RbacGatewayService } from './rbac-gateway.service';
import {
  RoleResponseDto,
  PermissionResponseDto,
  BaseResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  CreatePermissionRequestDto,
  AssignPermissionToRoleRequestDto,
  RolePermissionResponseDto,
  AssignRoleToUserRequestDto,
  UserRoleResponseDto,
} from '@pivota-api/dtos';
import { Roles } from '@pivota-api/decorators';
import { RolesGuard } from '@pivota-api/guards';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('RBAC')
@ApiExtraModels(
  BaseResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  UserRoleResponseDto
)
@Controller('admin-service')
export class RbacGatewayController {
  private readonly logger = new Logger(RbacGatewayController.name);

  constructor(private readonly rbacGatewayService: RbacGatewayService) {}

  // ===================== CREATE ROLE =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')
  @Version('1')
  @Post('roles/create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateRoleRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RoleResponseDto) } } },
      ],
    },
  })
  async createRole(
    @Body() body: CreateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    this.logger.debug(`📩 Create role request: ${JSON.stringify(body)}`);
    return this.rbacGatewayService.createRole(body);
  }

  // ===================== UPDATE ROLE =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')
  @Version('1')
  @Put('roles/:id/update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing role' })
  @ApiParam({ name: 'id', type: String, description: 'Role ID to update' })
  @ApiBody({ type: UpdateRoleRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RoleResponseDto) } } },
      ],
    },
  })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    const payload = { ...body, id };
    this.logger.debug(`📩 Update role request for id=${id}: ${JSON.stringify(payload)}`);
    return this.rbacGatewayService.updateRole(payload);
  }

  // ===================== CREATE PERMISSION =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')
  @Version('1')
  @Post('permissions/create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiBody({ type: CreatePermissionRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Permission created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(PermissionResponseDto) } } },
      ],
    },
  })
  async createPermission(
    @Body() body: CreatePermissionRequestDto
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    this.logger.debug(`📩 Create permission request: ${JSON.stringify(body)}`);
    return this.rbacGatewayService.createPermission(body);
  }

  // ===================== ASSIGN PERMISSION TO ROLE =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')
  @Version('1')
  @Post('roles/:roleId/permissions/assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a permission to a role' })
  @ApiParam({ name: 'roleId', type: String, description: 'Role ID' })
  @ApiBody({ type: AssignPermissionToRoleRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Permission assigned successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(RolePermissionResponseDto) } } },
      ],
    },
  })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() body: AssignPermissionToRoleRequestDto
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    const payload: AssignPermissionToRoleRequestDto = { ...body, roleId };
    this.logger.debug(`📩 Assign permission to role request for roleId=${roleId}: ${JSON.stringify(payload)}`);
    return this.rbacGatewayService.assignPermissionToRole(payload);
  }

  // ===================== ASSIGN ROLE TO USER =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')
  @Version('1')
  @Post('users/:userUuid/role/assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'userUuid', type: String, description: 'User UUID' })
  @ApiBody({ type: AssignRoleToUserRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Role assigned successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(BaseResponseDto) },
        { properties: { data: { $ref: getSchemaPath(UserRoleResponseDto) } } },
      ],
    },
  })
  async assignRoleToUser(
    @Param('userUuid') userUuid: string,
    @Body() body: AssignRoleToUserRequestDto
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {
    const payload = { ...body, userUuid };
    this.logger.debug(`📩 Assign role request for userUuid=${userUuid}: ${JSON.stringify(payload)}`);
    return this.rbacGatewayService.assignRoleToUser(payload);
  }

  // ===================== GET ROLES FOR USER =====================
  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RootGuardian', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
@Version('1')
@Get('users/:userUuid/role')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get the role assigned to a user' })
@ApiParam({ name: 'userUuid', type: String, description: 'User UUID' })
@ApiResponse({
  status: 200,
  description: 'Role retrieved successfully',
  schema: {
    allOf: [
      { $ref: getSchemaPath(BaseResponseDto) },
      {
        properties: {
          data: { $ref: getSchemaPath(RoleResponseDto) }, // single role
        },
      },
    ],
  },
})
async getRolesForUser(
  @Param('userUuid') userUuid: string
): Promise<BaseResponseDto<RoleResponseDto>> {
  this.logger.debug(`📩 Get role request for userUuid=${userUuid}`);
  return this.rbacGatewayService.getRoleForUser(userUuid);
}

}
