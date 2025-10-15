import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RbacService } from './rbac.service';
import {
  RoleResponseDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  BaseResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  IdRequestDto,
  CreatePermissionRequestDto,
  AssignPermissionToRoleRequestDto,
  AssignRoleToUserRequestDto,
  UserRoleResponseDto,
} from '@pivota-api/dtos';

@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // -------------------------
  // Role Management
  // -------------------------
  @GrpcMethod('RbacService', 'CreateRole')
  async createRole(
    data: CreateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacService.createRole(data);
  }

  @GrpcMethod('RbacService', 'UpdateRole')
  async updateRole(
    data: UpdateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacService.updateRole(data);
  }

  @GrpcMethod('RbacService', 'DeleteRole')
  async deleteRole(
    data: IdRequestDto
  ): Promise<BaseResponseDto<null>> {
    return this.rbacService.deleteRole(data);
  }

  @GrpcMethod('RbacService', 'GetAllRoles')
  async getAllRoles(): Promise<BaseResponseDto<RoleResponseDto[]>> {
    return this.rbacService.getAllRoles();
  }

  // -------------------------
  // Permission Management
  // -------------------------
  @GrpcMethod('RbacService', 'CreatePermission')
  async createPermission(
    data: CreatePermissionRequestDto
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    return this.rbacService.createPermission(data);
  }

  @GrpcMethod('RbacService', 'AssignPermissionToRole')
  async assignPermissionToRole(
    data: AssignPermissionToRoleRequestDto
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    return this.rbacService.assignPermissionToRole(data);
  }

  // -------------------------
  // User ↔ Role Management
  // -------------------------
  @GrpcMethod('RbacService', 'AssignRoleToUser')
  async assignRoleToUser(
    data: AssignRoleToUserRequestDto
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {
    return this.rbacService.assignRoleToUser(data);
  }
}
