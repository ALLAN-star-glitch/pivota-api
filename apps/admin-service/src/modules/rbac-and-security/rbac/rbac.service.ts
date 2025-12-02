import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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
  GetUserByUserUuidDto,
  RoleIdResponse,
  RoleIdRequestDto,
} from '@pivota-api/dtos';



import {
  BaseUserResponseGrpc,
  BaseRoleResponseGrpc,
  BaseRoleResponsesGrpc,
  BasePermissionResponseGrpc,
  BaseGetUserRoleReponseGrpc,
  BaseRolePermissionResponseGrpc,
  BaseUserRoleResponseGrpc,
} from '@pivota-api/interfaces';

// ------------------ gRPC User Service Interface ------------------
interface UserServiceGrpc {
  getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;
}

// ------------------ RbacService ------------------
@Injectable()
export class RbacService implements OnModuleInit {
  private userServiceGrpc: UserServiceGrpc;
  private readonly logger = new Logger()  
  

  constructor(
    private readonly prisma: PrismaService,
    @Inject('USER_PACKAGE') private readonly grpcClient: ClientGrpc,
  ) {}

  // ------------------ Module Init ------------------
  onModuleInit() {
    this.userServiceGrpc = this.grpcClient.getService<UserServiceGrpc>('UserService');
  }

  private getGrpcService(): UserServiceGrpc {
    if (!this.userServiceGrpc) {
      this.userServiceGrpc = this.grpcClient.getService<UserServiceGrpc>('UserService');
    }
    return this.userServiceGrpc;
  }

  // ------------------ Role Management ------------------
  async createRole(dto: CreateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {
    const role = await this.prisma.role.create({
      data: { name: dto.name, roleType: dto.type, description: dto.description, scope: dto.scope},
    });

    const roleResponse: BaseRoleResponseGrpc<RoleResponseDto> = {
      success: true,
      message: 'Role created successfully',
      role: {
        id: role.id.toString(),
        name: role.name,
        roleType: role.roleType,  
        description: role.description,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      },
      error: null,
      code: 'Ok',
    };

    return roleResponse;
  }

  async updateRole(dto: UpdateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {
    const role = await this.prisma.role.update({
      where: { id: Number(dto.id) },
      data: { description: dto.description, name: dto.name },
    });

    const response: BaseRoleResponseGrpc<RoleResponseDto> = {
      success: true,
      message: 'Role updated successfully',
      role: {
        id: role.id.toString(),
        name: role.name,
        roleType: role.roleType,
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
        id: r.id.toString(),
        name: r.name,
        roleType: r.roleType,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      error: null,
      code: 'Ok',
    };

    return response;
  }
  

  // ------------------ Permission Management ------------------
  async createPermission(
    dto: CreatePermissionRequestDto,
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    const permission = await this.prisma.permission.create({
      data: { action: dto.action, name: dto.name, description: dto.description },
    });

    const permissionResponse: BasePermissionResponseGrpc<PermissionResponseDto> = {
      success: true,
      message: 'Permission created successfully',
      descriptioAction: permission,
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




  // ------------------ User ↔ Role Management ------------------
  // ------------------ Fetch role for a given user ------------------
async getRoleForUser(
  userUuid: GetUserByUserUuidDto,
): Promise<BaseGetUserRoleReponseGrpc<RoleResponseDto | null>> {

  this.logger.debug(`[getRoleForUser] Fetching userRole for UUID: "${userUuid.userUuid}"`);

  // Fetch the single role linked to the user
  const userRole = await this.prisma.userRole.findUnique({
    where: { userUuid: userUuid.userUuid },
    include: { role: true }, // join with role table to get role details
  });

  // Map the role to RoleResponseDto if it exists, otherwise null
  const role: RoleResponseDto | null = userRole?.role
    ? {
        id: userRole.role.id.toString(),
        name: userRole.role.name,
        roleType: userRole.role.roleType,
        description: userRole.role.description,
        createdAt: userRole.role.createdAt.toISOString(),
        updatedAt: userRole.role.updatedAt.toISOString(),
      }
    : null;

  this.logger.debug(`Mapped role: ${JSON.stringify(role, null, 2)}`);

  return {
    success: true,
    message: 'Role fetched successfully',
    code: 'Ok',
    role,
  };

}


// ------------------ Assign role to a user ------------------
async assignRoleToUser(
  dto: AssignRoleToUserRequestDto,
): Promise<BaseGetUserRoleReponseGrpc<RoleResponseDto>> {

  this.logger.log(`[AssignRoleToUser] Request received: ${JSON.stringify(dto)}`);

  //  Validate role exists
  const roleEntity = await this.prisma.role.findUnique({
    where: { id: Number(dto.roleId) },
  });

  this.logger.debug(`Role Entity: ${JSON.stringify(roleEntity, null, 2)}  `);

  if (!roleEntity) {
    this.logger.error(`Role with ID ${dto.roleId} not found`);
    return {
      success: false,
      message: 'Role not found',
      code: 'NotFound',
      role: null,
    };
  }

  // 3. Upsert user role (create if doesn't exist, update if exists)
  await this.prisma.userRole.upsert({
    where: { userUuid: dto.userUuid },
    update: { roleId: Number(dto.roleId) },
    create: { userUuid: dto.userUuid, roleId: Number(dto.roleId) },
  });
  

  // 4. Map role to response
  const role = {
    id: roleEntity.id.toString(),
    name: roleEntity.name,
    roleType: roleEntity.roleType,
    description: roleEntity.description,
    createdAt: roleEntity.createdAt.toISOString(),
    updatedAt: roleEntity.updatedAt.toISOString(),
  };

  this.logger.log(`[AssignRoleToUser] Upserted userRole: ${JSON.stringify(role)}`);

  return {
    success: true,
    message: 'Role assigned/updated successfully',
    code: 'Ok',
    role,
  };
}




 async getRoleIdByType(
  roleIdRequestDto: RoleIdRequestDto,
): Promise<BaseResponseDto<RoleIdResponse>> {
  const role = await this.prisma.role.findFirst({
    where: { roleType: roleIdRequestDto.roleType },
  });
  if (!role) throw new Error(`Role '${roleIdRequestDto.roleType}' not found`);

  const response: BaseResponseDto<RoleIdResponse> = {
    success: true,
    message: 'Role ID fetched successfully',
    code: 'Ok',
    data: { roleId: role.id }, 
  };

  return response;
}




}
