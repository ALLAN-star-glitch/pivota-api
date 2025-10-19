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

@Controller('admin-service')
export class RbacGatewayController {
  private readonly logger = new Logger(RbacGatewayController.name);

  constructor(private readonly rbacGatewayService: RbacGatewayService) {}

  /**
   *  Create a new role
   * POST /admin-service/v1/roles/create
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')    
  @Version('1')
  @Post('roles/create')
  async createRole(
    @Body() body: CreateRoleRequestDto,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    this.logger.debug(`API-GW received create role request: ${JSON.stringify(body)}`);
    return this.rbacGatewayService.createRole(body);
  }

  /**
   *  Update an existing role
   * PUT /admin-service/v1/roles/:id/update
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')    
  @Version('1')
  @Put('roles/:id/update')
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleRequestDto,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    const payload = { ...body, id };
    this.logger.debug(
      `API-GW received update role request for id=${id}: ${JSON.stringify(payload)}`,
    );
    return this.rbacGatewayService.updateRole(payload);
  }

  /**
   * 🧩 Create a new permission
   * POST /admin-service/v1/permissions/create
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')  
  @Version('1')
  @Post('permissions/create')
  async createPermission(
    @Body() body: CreatePermissionRequestDto,
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    this.logger.debug(`API-GW received create permission request: ${JSON.stringify(body)}`);
    return this.rbacGatewayService.createPermission(body);
  }

  /**
   * 🔗 Assign a specific permission to a specific role
   * POST /admin-service/v1/roles/:roleId/permissions/assign
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian')  
  @Version('1')
  @Post('roles/:roleId/permissions/assign')
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() body: AssignPermissionToRoleRequestDto,
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    const payload: AssignPermissionToRoleRequestDto = { ...body, roleId };
    this.logger.debug(
      `API-GW received assign permission to role request for roleId=${roleId}: ${JSON.stringify(payload)}`,
    );
    return this.rbacGatewayService.assignPermissionToRole(payload);
  }

  /**
   * 👤 Assign a role to a user
   * POST /admin-service/v1/users/:userUuid/roles/assign
   */
  //Assign role to user
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RootGuardian')
@Version('1')
@Post('users/:userUuid/role/assign')
async assignRoleToUser(
  @Param('userUuid') userUuid: string,
  @Body() body: AssignRoleToUserRequestDto,
): Promise<BaseResponseDto<UserRoleResponseDto>> {
  this.logger.debug(
    `API-GW received assign role request for userUuid=${userUuid}: ${JSON.stringify(body)}`,
  );


  // Ensure the DTO includes roleId (or roleName) if needed
  const payload = { ...body, userUuid };

  return this.rbacGatewayService.assignRoleToUser(payload);
}

  /**
   * 📋 Get all roles assigned to a user
   * GET /admin-service/v1/users/:userUuid/roles/list
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('RootGuardian', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @Get('users/:userUuid/roles')
  async getRolesForUser(
    @Param('userUuid') userUuid: string,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    this.logger.debug(`API-GW received get roles for userUuid=${userUuid}`);
    return this.rbacGatewayService.getRoleForUser(userUuid);
  }
}
