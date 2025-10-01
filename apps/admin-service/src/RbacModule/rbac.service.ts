// apps/admin-service/src/modules/rbac/rbac.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
//import { lastValueFrom, Observable } from 'rxjs';

import {
  RoleResponseDto,
  PermissionResponseDto,
  UserResponseDto,
  BaseResponseDto,
  RolePermissionResponseDto,
  UserRoleResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  IdRequestDto,
  CreatePermissionRequestDto,
  AssignPermissionToRoleRequestDto,
  AssignRoleToUserRequestDto,
  
} from '@pivota-api/dtos';
import {
  BaseUserResponseGrpc,
  BaseRoleResponseGrpc,
  BaseRoleResponsesGrpc,
  BasePermissionResponseGrpc,
  BaseRolePermissionResponseGrpc,
  BaseUserRoleResponseGrpc,
} from '@pivota-api/interfaces';
import { Observable } from 'rxjs';

interface UserServiceGrpc {
  getUserProfileById(
    data: { id: string },
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

@Injectable()
export class RbacService implements OnModuleInit {
  private userServiceGrpc: UserServiceGrpc;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userServiceGrpc =
      this.grpcClient.getService<UserServiceGrpc>('UserService');
  }

  // -------------------------
  // Role Management
  // -------------------------

  //Create role

  async createRole(
  dto: CreateRoleRequestDto
): Promise<BaseResponseDto<RoleResponseDto>> {
  const role = await this.prisma.role.create({
    data: { name: dto.name, description: dto.description },
  });

  const roleResponse: BaseRoleResponseGrpc<RoleResponseDto> = {
    success: true,
    message: 'Role created successfully',
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    },
    error: null,
    code: 'Ok',
  };

  return roleResponse;
}



  //Update role
  async updateRole(
  dto: UpdateRoleRequestDto
): Promise<BaseResponseDto<RoleResponseDto>> {
  const role = await this.prisma.role.update({
    where: { id: Number(dto.id) },
    data: { description: dto.description },
  });

  const response: BaseRoleResponseGrpc<RoleResponseDto> = {
    success: true,
    message: 'Role updated successfully',
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    },
    error: null,
    code: 'Ok',
  };

  return response;
}



  //Delete Role
  async deleteRole(dto: IdRequestDto): Promise<BaseResponseDto<null>> {
    await this.prisma.role.delete({ where: { id: Number(dto.id) } });

    const response: BaseRoleResponseGrpc<null> = {
      success: true,
      message: 'Role deleted successfully',
      role: null,
      error: null,
      code: 'Ok',
    };

    return response;
  }


  //Get all roles
  async getAllRoles(): Promise<BaseResponseDto<RoleResponseDto[]>> {
  const roles = await this.prisma.role.findMany();

  const response: BaseRoleResponsesGrpc<RoleResponseDto> = {
    success: true,
    message: 'Roles fetched successfully',
    roles: roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    error: null,
    code: 'Ok',
  };

  return response;
}



  // -------------------------
  // Permission Management
  // -------------------------

  //Create permission
  async createPermission(
    dto: CreatePermissionRequestDto

  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    const permission = await this.prisma.permission.create({
      data: { action: dto.action, description: dto.description },
    });

    const permissionResponse: BasePermissionResponseGrpc<PermissionResponseDto> =
      {
        success: true,
        descriptioAction: permission,
        message: "Permission Created Successfully!",
        error: null,
        code: 'Ok',
      };

    return permissionResponse;
  }


  //Assign permission to role
  async assignPermissionToRole(
  dto: AssignPermissionToRoleRequestDto

): Promise<BaseResponseDto<RolePermissionResponseDto>> {
  const rolePermission = await this.prisma.rolePermission.create({
    data: { roleId: Number(dto.roleId), permissionId: Number(dto.permissionId)},
  });

  const permissionResponse: BaseRolePermissionResponseGrpc<RolePermissionResponseDto> = {
    success: true,
    message: 'Permission assigned to role successfully',
    rolePermission: rolePermission,
    error: null,
    code: 'Ok',
  };

  return permissionResponse;
}



  

  // async getRolePermissions(
  //   roleId: number,
  // ): Promise<BaseResponseDto<PermissionResponseDto[]>> {
  //   const permissions = await this.prisma.permission.findMany({
  //     where: { rolePermissions: { some: { roleId } } },
  //   });

  //   const permissionResponse: BasePermissionResponseGrpc<
  //     PermissionResponseDto[]
  //   > = {
  //     success: true,
  //     message: 'Role permissions fetched successfully',
  //     permission: permissions,
  //     error: null,
  //     code: 'Ok',
  //   };

  //   return permissionResponse;
  // }

  // -------------------------
  // User ↔ Role Management
  // -------------------------
  async assignRoleToUser(
    dto: AssignRoleToUserRequestDto
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {


    const userRole = await this.prisma.userRole.create({
      data: { userId: Number(dto.userId), roleId: Number(dto.roleId) },
    });

    const userRoleResponse: BaseUserRoleResponseGrpc<UserRoleResponseDto> = {
      success: true,
      message: 'Role assigned to user successfully',
      userRole: userRole,
      error: null,
      code: 'Ok',
    };

    return userRoleResponse;
  }

  

  // async getUserRoles(
  //   userId: number,
  // ): Promise<BaseResponseDto<RoleResponseDto[]>> {
  //   const roles = await this.prisma.role.findMany({
  //     where: { userRoles: { some: { userId } } },
  //   });

  //   const response: BaseRoleResponsesGrpc<RoleResponseDto> = {
  //     success: true,
  //     message: 'User roles fetched successfully',
  //     roles: roles,
  //     error: null,
  //     code: 'Ok',
  //   };

  //   return response;
  // }

  // async removeUserRole(
  //   userId: number,
  //   roleId: number,
  // ): Promise<BaseResponseDto<null>> {
  //   await this.prisma.userRole.deleteMany({ where: { userId, roleId } });

  //   const response: BaseUserRoleResponseGrpc<null> = {
  //     success: true,
  //     message: 'User role removed successfully',
  //     userRole: null,
  //     error: null,
  //     code: 'Ok',
  //   };

  //   return response;
  // }

  // // -------------------------
  // // Example of UserService gRPC Call
  // // -------------------------
  // async getUserProfile(userId: string) {
  //   const user = await lastValueFrom(
  //     this.userServiceGrpc.getUserProfileById({ id: userId }),
  //   );
  //   return user;
  // }
}
