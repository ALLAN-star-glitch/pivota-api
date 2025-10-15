import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

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

interface UserServiceGrpc {
  getUserProfileById(
    data: { id: string },
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

@Injectable()
export class RbacService implements OnModuleInit {
  private userServiceGrpc: UserServiceGrpc;
  private getGrpcService(): UserServiceGrpc {
    if (!this.userServiceGrpc){
        this.userServiceGrpc = this.grpcClient.getService<UserServiceGrpc>('UserService');
    }
    return this.userServiceGrpc;
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc, // added gRPC client injection
  ) {}

  onModuleInit() {
    //  get gRPC service reference for user service
    this.userServiceGrpc = this.grpcClient.getService<UserServiceGrpc>('UserService');
  }

  // -------------------------
  // Role Management
  // -------------------------

  async createRole(
    dto: CreateRoleRequestDto,
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

  async updateRole(
    dto: UpdateRoleRequestDto,
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    const role = await this.prisma.role.update({
      where: { id: Number(dto.id) },
      data: { description: dto.description, name: dto.name },
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

  async getAllRoles(): Promise<BaseResponseDto<RoleResponseDto[]>> {
    const roles = await this.prisma.role.findMany();

    const response: BaseRoleResponsesGrpc<RoleResponseDto> = {
      success: true,
      message: 'Roles fetched successfully',
      roles: roles.map((r) => ({
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

  async createPermission(
    dto: CreatePermissionRequestDto,
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    const permission = await this.prisma.permission.create({
      data: { action: dto.action, description: dto.description },
    });

    const permissionResponse: BasePermissionResponseGrpc<PermissionResponseDto> = {
      success: true,
      descriptioAction: permission,
      message: 'Permission Created Successfully!',
      error: null,
      code: 'Ok',
    };

    return permissionResponse;
  }

  async assignPermissionToRole(
    dto: AssignPermissionToRoleRequestDto,
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        roleId: Number(dto.roleId),
        permissionId: Number(dto.permissionId),
      },
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

  // -------------------------
  // User ↔ Role Management
  // -------------------------
  async assignRoleToUser(
    dto: AssignRoleToUserRequestDto,
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {
    // 👇 Step 1: Fetch user from UserService before assigning
    const userServiceGrpc = this.getGrpcService();  

    const userResponse = await lastValueFrom(
      userServiceGrpc.getUserProfileById({ id: dto.userId }),
    );

   if (!userResponse || !userResponse.success || !userResponse.user) {
      const failedResponse: BaseUserRoleResponseGrpc<UserRoleResponseDto> = {
        success: false,
        message: 'User not found or unavailable',
        userRole: null,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or unavailable',
        },
        code: 'NotFound',
      };
      return failedResponse;
    }



    //  Step 2: Proceed with assignment if user exists
    const userRole = await this.prisma.userRole.create({
      data: { userId: Number(dto.userId), roleId: Number(dto.roleId) },
    });

    const userRoleResponse: BaseUserRoleResponseGrpc<UserRoleResponseDto> = {
      success: true,
      message: 'Role assigned to user successfully',
      userRole: userRole,
      error: undefined,
      code: 'Ok',
    };

    return userRoleResponse;
  }

  // -------------------------
  // Example gRPC Helper
  // -------------------------
  async getUserProfile(userId: string) {
    const user = await lastValueFrom(
      this.userServiceGrpc.getUserProfileById({ id: userId }),
    );
    return user;
  }
}
