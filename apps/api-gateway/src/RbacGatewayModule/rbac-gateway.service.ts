// apps/api-gateway/src/modules/rbac/rbac-gateway.service.ts

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import {
  RoleResponseDto,
  PermissionResponseDto,
  UserRoleResponseDto,
  BaseResponseDto,
  RolePermissionResponseDto,
  AssignPermissionToRoleRequestDto,
  AssignRoleToUserRequestDto,
  CreatePermissionRequestDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto
} from '@pivota-api/dtos';
import {
  BaseRoleResponseGrpc,
  BasePermissionResponseGrpc,
  BaseUserRoleResponseGrpc,
  BaseRolePermissionResponseGrpc
} from '@pivota-api/interfaces';

interface RbacServiceGrpc {
  createRole(data: CreateRoleRequestDto): Observable<BaseRoleResponseGrpc<RoleResponseDto>>;
  updateRole(data: UpdateRoleRequestDto): Observable<BaseRoleResponseGrpc<RoleResponseDto>>;
  createPermission(data: CreatePermissionRequestDto): Observable<BasePermissionResponseGrpc<PermissionResponseDto>>;
  assignPermissionToRole(data: AssignPermissionToRoleRequestDto): Observable<BaseRolePermissionResponseGrpc<RolePermissionResponseDto>>
  assignRoleToUser(data: AssignRoleToUserRequestDto): Observable<BaseUserRoleResponseGrpc<UserRoleResponseDto>>;
  
}

@Injectable()
export class RbacGatewayService implements OnModuleInit {
  private rbacServiceGrpc: RbacServiceGrpc;

  constructor(@Inject('RBAC_PACKAGE') private readonly grpcClient: ClientGrpc) {}

  onModuleInit() {
    this.rbacServiceGrpc = this.grpcClient.getService<RbacServiceGrpc>('RbacService');
  }


  //Create Role
  async createRole(dto: CreateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {
    const response$ = this.rbacServiceGrpc.createRole({ name: dto.name, description: dto.description });
    const response = await firstValueFrom(response$);

    if (response.success) {
      return BaseResponseDto.ok(response.role, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }


  //Update role
  async updateRole(dto: UpdateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {
    const response$ = this.rbacServiceGrpc.updateRole({ id: dto.id, description: dto.description });
    const response = await firstValueFrom(response$);

    if (response.success) {
      return BaseResponseDto.ok(response.role, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }


  //Create Permission
  async createPermission(dto: CreatePermissionRequestDto): Promise<BaseResponseDto<PermissionResponseDto>> {
    const response$ = this.rbacServiceGrpc.createPermission({ action: dto.action, description: dto.description });
    const response = await firstValueFrom(response$);

    if (response.success) {
      return BaseResponseDto.ok(response.descriptioAction, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }


  //Assign permission to role

  async assignPermissionToRole(dto: AssignPermissionToRoleRequestDto): Promise<BaseResponseDto<RolePermissionResponseDto>>{

    const response = await firstValueFrom(
        this.rbacServiceGrpc.assignPermissionToRole({roleId: dto.roleId, permissionId: dto.permissionId})
    )

    if(response.success){
        BaseResponseDto.ok(response.rolePermission, response.message, response.code)
    }
    else {
        return BaseResponseDto.fail(response.message, response.code)
    }
  }




  //Asssign role to user
  async assignRoleToUser(dto: AssignRoleToUserRequestDto): Promise<BaseResponseDto<UserRoleResponseDto>> {
    const response$ = this.rbacServiceGrpc.assignRoleToUser({ userId: dto.userId, roleId: dto.roleId });
    const response = await firstValueFrom(response$);

    if (response.success) {
      return BaseResponseDto.ok(response.userRole, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }



}
