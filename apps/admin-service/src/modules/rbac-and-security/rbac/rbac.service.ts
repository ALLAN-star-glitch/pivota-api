import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom, Observable, timeout } from 'rxjs';

import {
  RoleResponseDto,
  PermissionResponseDto,
  UserResponseDto,
  BaseResponseDto,
  RolePermissionResponseDto,
  CreateRoleRequestDto,
  UpdateRoleRequestDto,
  IdRequestDto,
  CreatePermissionRequestDto,
  AssignPermissionToRoleRequestDto,
  GetUserByUserUuidDto,
  RoleIdResponse,
  RoleIdRequestDto,
  SyncUserRoleRequestDto,
  SyncUserRoleResponseDto,
} from '@pivota-api/dtos';

import {
  BaseUserResponseGrpc,
  BaseRoleResponseGrpc,
  BaseRoleResponsesGrpc,
  BasePermissionResponseGrpc,
  BaseGetUserRoleReponseGrpc,
  BaseRolePermissionResponseGrpc,
} from '@pivota-api/interfaces';

// ------------------ gRPC Profile Service Interface ------------------
interface ProfileServiceGrpc {
  getUserProfileByUuid(
    data: GetUserByUserUuidDto,
  ): Observable<BaseUserResponseGrpc<UserResponseDto> | null>;

  syncUserRole(
    data: SyncUserRoleRequestDto,
  ): Observable<BaseResponseDto<SyncUserRoleResponseDto>>;
}

// ------------------ gRPC Auth Service Interface ------------------
interface AuthServiceGrpc {
  syncUserRole(
    data: SyncUserRoleRequestDto,
  ): Observable<BaseResponseDto<SyncUserRoleResponseDto>>;
}

// ------------------ RbacService ------------------
@Injectable()
export class RbacService implements OnModuleInit {
  private profileServiceGrpc: ProfileServiceGrpc;
  private authServiceGrpc: AuthServiceGrpc;
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('PROFILE_PACKAGE') private readonly profileGrpcClient: ClientGrpc,
    @Inject('AUTH_PACKAGE') private readonly authGrpcClient: ClientGrpc,
  ) {
    // Initialize in constructor as well for immediate availability
    this.profileServiceGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
    this.authServiceGrpc = this.authGrpcClient.getService<AuthServiceGrpc>('AuthService');
  }

  // ------------------ Module Init ------------------
  onModuleInit() {
    // Re-initialize to ensure fresh connection
    this.profileServiceGrpc = this.profileGrpcClient.getService<ProfileServiceGrpc>('ProfileService');
    this.authServiceGrpc = this.authGrpcClient.getService<AuthServiceGrpc>('AuthService');
    
    this.logger.log('✅ ProfileService gRPC client initialized');
    this.logger.log('✅ AuthService gRPC client initialized');
    
    // Debug: Log available methods
    if (this.profileServiceGrpc) {
      this.logger.log(`✅ ProfileService methods: ${Object.keys(this.profileServiceGrpc).join(', ')}`);
    }
    if (this.authServiceGrpc) {
      this.logger.log(`✅ AuthService methods: ${Object.keys(this.authServiceGrpc).join(', ')}`);
    }
  }

  // ------------------ Role Management ------------------
  async createRole(dto: CreateRoleRequestDto): Promise<BaseResponseDto<RoleResponseDto>> {
    const role = await this.prisma.role.create({
      data: { 
        name: dto.name, 
        roleType: dto.type, 
        description: dto.description, 
        scope: dto.scope
      },
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
      where: { id: dto.id },
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
    await this.prisma.role.delete({ where: { id: dto.id } });

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

    const response: BaseRoleResponsesGrpc<RoleResponseDto[]> = {
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
        roleId: dto.roleId,
        permissionId: dto.permissionId,
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
  async getRoleForUser(
    userUuid: GetUserByUserUuidDto,
  ): Promise<BaseGetUserRoleReponseGrpc<RoleResponseDto | null>> {
    this.logger.debug(`[getRoleForUser] Fetching userRole for UUID: "${userUuid.userUuid}"`);

    const userRole = await this.prisma.userRole.findUnique({
      where: { userUuid: userUuid.userUuid },
      include: { role: true },
    });

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

  // ------------------ Assign role to a user (with multi-service sync) ------------------
  async assignRoleToUser(
    dto: { userUuid: string; roleType: string },
  ): Promise<BaseGetUserRoleReponseGrpc<RoleResponseDto>> {
    this.logger.log(`[AssignRoleToUser] User: ${dto.userUuid}, Role Type: ${dto.roleType}`);

    try {
      // 1. Get role entity by roleType
      const roleEntity = await this.prisma.role.findUnique({
        where: { roleType: dto.roleType },
        select: {
          id: true,
          name: true,
          scope: true,
          roleType: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!roleEntity) {
        return {
          success: false,
          message: `Role type '${dto.roleType}' not found`,
          code: 'NotFound',
          role: null,
        };
      }

      // 2. Upsert user role in Admin DB
      await this.prisma.userRole.upsert({
        where: { userUuid: dto.userUuid },
        update: { roleId: roleEntity.id },
        create: { userUuid: dto.userUuid, roleId: roleEntity.id },
      });

      this.logger.log(`✅ Role ${roleEntity.name} assigned to user ${dto.userUuid} in Admin DB`);

      const syncPayload = {
        userUuid: dto.userUuid,
        roleName: roleEntity.name,
        roleType: roleEntity.roleType,
        scope: roleEntity.scope,
      };

      // 3. Sync to Profile Service
      let profileSyncSuccess = false;
      let profileSyncMessage = '';

      try {
        this.logger.log(`🔄 Syncing role to Profile Service for user ${dto.userUuid}...`);
        
        const syncResult = await lastValueFrom(
          this.profileServiceGrpc.syncUserRole(syncPayload).pipe(timeout(10000))
        );

        if (syncResult?.success && syncResult.data?.success) {
          profileSyncSuccess = true;
          profileSyncMessage = 'Role synced to Profile Service';
          this.logger.log(`✅ Role synced to Profile Service for user ${dto.userUuid}`);
        } else {
          profileSyncMessage = syncResult?.message || 'Profile Service sync returned failure';
          this.logger.warn(`⚠️ ${profileSyncMessage}`);
        }
      } catch (grpcError) {
        profileSyncMessage = `Profile Service gRPC sync failed: ${grpcError.message}`;
        this.logger.error(`❌ ${profileSyncMessage}`);
      }

      // 4. Sync to Auth Service
      let authSyncSuccess = false;
      let authSyncMessage = '';

      try {
        this.logger.log(`🔄 Syncing role to Auth Service for user ${dto.userUuid}...`);
        
        const authSyncResult = await lastValueFrom(
          this.authServiceGrpc.syncUserRole(syncPayload).pipe(timeout(10000))
        );

        if (authSyncResult?.success && authSyncResult.data?.success) {
          authSyncSuccess = true;
          authSyncMessage = 'Role synced to Auth Service';
          this.logger.log(`✅ Role synced to Auth Service for user ${dto.userUuid}`);
        } else {
          authSyncMessage = authSyncResult?.message || 'Auth Service sync returned failure';
          this.logger.warn(`⚠️ ${authSyncMessage}`);
        }
      } catch (grpcError) {
        authSyncMessage = `Auth Service gRPC sync failed: ${grpcError.message}`;
        this.logger.error(`❌ ${authSyncMessage}`);
      }

      // 5. Build response
      const role = {
        id: roleEntity.id,
        userUuid: dto.userUuid,
        roleId: roleEntity.id,
        name: roleEntity.name,
        scope: roleEntity.scope,
        roleType: roleEntity.roleType,
        description: roleEntity.description,
        status: roleEntity.status,
        createdAt: roleEntity.createdAt.toISOString(),
        updatedAt: roleEntity.updatedAt.toISOString(),
      };

      const syncStatus = [];
      if (profileSyncSuccess) syncStatus.push('Profile');
      if (authSyncSuccess) syncStatus.push('Auth');
      
      const successMessage = syncStatus.length === 2
        ? 'Role assigned and synced to all services successfully'
        : `Role assigned but synced to: ${syncStatus.join(', ')} (${profileSyncMessage} ${authSyncMessage})`;

      this.logger.log(`✅ ${successMessage}`);

      return {
        success: true,
        message: successMessage,
        code: 'Ok',
        role,
      };
    } catch (error) {
      this.logger.error(`Failed to assign role to user ${dto.userUuid}: ${error.message}`);
      return {
        success: false,
        message: 'Failed to assign role',
        code: 'InternalError',
        role: null,
      };
    }
  }

  async getRoleIdByType(
    roleIdRequestDto: RoleIdRequestDto,
  ): Promise<BaseResponseDto<RoleIdResponse>> {
    this.logger.debug(`GetRoleIdByType called with type: ${roleIdRequestDto.roleType}`);

    try {
      const role = await this.prisma.role.findFirst({
        where: { roleType: roleIdRequestDto.roleType },
        select: { id: true },
      });

      if (!role) {
        this.logger.error(`Role '${roleIdRequestDto.roleType}' not found`);
        return {
          success: false,
          message: `Role '${roleIdRequestDto.roleType}' not found`,
          code: 'NOT_FOUND',
          data: null,
        };
      }

      this.logger.debug(`Role ID fetched: ${role.id}`);

      return {
        success: true,
        message: 'Role ID fetched successfully',
        code: 'OK',
        data: { roleId: role.id },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch role ID: ${error.message}`);
      return {
        success: false,
        message: 'Failed to fetch role ID',
        code: 'INTERNAL_ERROR',
        data: null,
      };
    }
  }
}