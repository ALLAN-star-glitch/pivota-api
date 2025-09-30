// apps/api-gateway/src/modules/rbac/rbac-gateway.controller.ts

import { Body, Controller, Post, Put, Version } from '@nestjs/common';
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
} from '@pivota-api/dtos';

@Controller('admin-service')
export class RbacGatewayController {
  constructor(private readonly rbacGatewayService: RbacGatewayService) {}

  @Version('1')
  @Post('createRole')
  async createRole(
    @Body() body: CreateRoleRequestDto,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.createRole(body);
  }



   @Version('1')
  @Put('roles/:id')
  async updateRole(
    @Body() body:  UpdateRoleRequestDto,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.updateRole(body);
  }

  @Version('1')
  @Post('permissions')
  async createPermission(
    @Body() body: CreatePermissionRequestDto,
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    return this.rbacGatewayService.createPermission(body);
  }


  //Assign permission to role

   @Version('1')
  @Post('assign-role')
  async assignPermissionToRole(
    @Body() body: AssignPermissionToRoleRequestDto,
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    return this.rbacGatewayService.assignPermissionToRole(body);
  }
}
