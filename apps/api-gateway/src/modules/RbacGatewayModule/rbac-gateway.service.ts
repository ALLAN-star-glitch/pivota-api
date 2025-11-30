// apps/api-gateway/src/modules/rbac/rbac-gateway.service.ts

import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
  UpdateRoleRequestDto,
  GetUserByUserUuidDto
} from '@pivota-api/dtos';
import {
  
  BaseRoleResponseGrpc,
  BaseUserRoleResponseGrpc,
  BasePermissionResponseGrpc,
  BaseRolePermissionResponseGrpc,
  BaseGetUserRoleReponseGrpc
} from '@pivota-api/interfaces';

interface RbacServiceGrpc {
  createRole(data: CreateRoleRequestDto): Observable<BaseRoleResponseGrpc<RoleResponseDto>>;
  updateRole(data: UpdateRoleRequestDto): Observable<BaseRoleResponseGrpc<RoleResponseDto>>;
  createPermission(data: CreatePermissionRequestDto): Observable<BasePermissionResponseGrpc<PermissionResponseDto>>;
  assignPermissionToRole(data: AssignPermissionToRoleRequestDto): Observable<BaseRolePermissionResponseGrpc<RolePermissionResponseDto>>
  assignRoleToUser(data: AssignRoleToUserRequestDto): Observable<BaseUserRoleResponseGrpc<UserRoleResponseDto>>;
  getUserRole(data: GetUserByUserUuidDto): Observable<BaseGetUserRoleReponseGrpc<RoleResponseDto>>;

  
}

@Injectable()
export class RbacGatewayService implements OnModuleInit {
  private rbacServiceGrpc: RbacServiceGrpc;
  private readonly logger = new Logger()
  
  private getGrpcService(): RbacServiceGrpc {
    if (!this.rbacServiceGrpc){
        this.rbacServiceGrpc = this.grpcClient.getService<RbacServiceGrpc>('RbacService');
    }
    return this.rbacServiceGrpc;
  }

  constructor(@Inject('RBAC_PACKAGE') private readonly grpcClient: ClientGrpc) {}

  onModuleInit() {
    this.rbacServiceGrpc = this.grpcClient.getService<RbacServiceGrpc>('RbacService');
  }


  //Create Role
  async createRole(dto: CreateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {

    const grpcService = this.getGrpcService()

    const response$ = grpcService.createRole({ name: dto.name, scope: dto.scope, type: dto.type, description: dto.description });
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
    const response$ = this.rbacServiceGrpc.createPermission({ action: dto.action, name: dto.name, description: dto.description });
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
        return BaseResponseDto.ok(response.rolePermission, response.message, response.code)
    }
    else {
        return BaseResponseDto.fail(response.message, response.code)
    }
  }




  //Asssign role to user
  async assignRoleToUser(dto: AssignRoleToUserRequestDto): Promise<BaseResponseDto<UserRoleResponseDto>> {


     this.logger.debug('API-GW: calling Admin gRPC assignRoleToUser with:', JSON.stringify(dto));
    const response$ = this.rbacServiceGrpc.assignRoleToUser({ userUuid: dto.userUuid, roleId: dto.roleId });
    const response = await firstValueFrom(response$);

    if (response.success) {
      return BaseResponseDto.ok(response.userRole, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }

  // -------------------------
  // Get Roles for a User
  // -------------------------
  async getRoleForUser(userUuid: string): Promise<BaseResponseDto<RoleResponseDto>> {
    this.logger.debug(`API-GW: Fetching role for userUuid=${userUuid}`);
    const response$ = this.getGrpcService().getUserRole({ userUuid });
    const response = await firstValueFrom(response$);


    if (response.success) {
      return BaseResponseDto.ok(response.role, response.message, response.code);
    } else {
      return BaseResponseDto.fail(response.message, response.code);
    }
  }






}
