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
  ApiBody,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('RBAC Module - ((Admin-Service) - MICROSERVICE)')
@ApiExtraModels(
  BaseResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  UserRoleResponseDto
)
@Controller('rbac-module')
@ApiExtraModels(
  BaseResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  UserRoleResponseDto
)
export class RbacGatewayController {
  private readonly logger = new Logger(RbacGatewayController.name);

  constructor(private readonly rbacGatewayService: RbacGatewayService) {}

  // =========================================
  // CREATE ROLE
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiBody({ type: CreateRoleRequestDto })
  async createRole(
    @Body() body: CreateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.createRole(body);
  }

  // =========================================
  // UPDATE ROLE
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Put('roles/:id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateRoleRequestDto })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.updateRole({ ...body, id });
  }

  // =========================================
  // CREATE PERMISSION
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  async createPermission(
    @Body() body: CreatePermissionRequestDto
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    return this.rbacGatewayService.createPermission(body);
  }

  // =========================================
  // ASSIGN PERMISSION TO ROLE
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Post('roles/:roleId/permissions')
   @ApiOperation({ summary: 'Assign a permission to a role' })
  @ApiParam({ name: 'roleId', type: String })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() body: AssignPermissionToRoleRequestDto
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    return this.rbacGatewayService.assignPermissionToRole({
      ...body,
      roleId,
    });
  }

  // =========================================
  // ASSIGN ROLE TO USER
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin')
  @Version('1')
  @Post('users/:userUuid/roles')
   @ApiOperation({ summary: 'Assign Role to a user' })
  @ApiParam({ name: 'userUuid', type: String })
  async assignRoleToUser(
    @Param('userUuid') userUuid: string,
    @Body() body: AssignRoleToUserRequestDto
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {
    return this.rbacGatewayService.assignRoleToUser({
      ...body,
      userUuid,
    });
  }

  // =========================================
  // GET ROLE FOR USER
  // =========================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('users/:userUuid/roles')
  @ApiOperation({ summary: 'Get Role for a user' })
  @ApiParam({ name: 'userUuid', type: String })
  async getRoleForUser(
    @Param('userUuid') userUuid: string
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.getRoleForUser(userUuid);
  }


  // -------------------------------------------
  // GET ALL ROLES
  // -------------------------------------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  async getAllRoles(  ): Promise<BaseResponseDto<RoleResponseDto[]>> {
    return this.rbacGatewayService.getAllRoles();
  }


}
