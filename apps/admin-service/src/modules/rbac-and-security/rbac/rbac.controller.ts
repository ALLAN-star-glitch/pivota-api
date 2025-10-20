import { Controller, Logger } from '@nestjs/common';
import { EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
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
  GetUserByUserUuidDto,
} from '@pivota-api/dtos';


type UserAssignDefaultRoleEvent = {
  userUuid: string;
  defaultRole: string;
};
@Controller()
export class RbacController {
  logger: Logger = new Logger(RbacController.name)  ;
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
  data: AssignRoleToUserRequestDto,
): Promise<BaseResponseDto<UserRoleResponseDto>> {
  this.logger.log(`Received Payload: ${JSON.stringify(data, null, 2)}`);

  try {
    const result = await this.rbacService.assignRoleToUser(data);
    return result;
  } catch (error) {
    this.logger.error('❌ Error in assignRoleToUser:', error);
  }
}

  // -------------------------
  // Kafka Listener for default role assignment
  // -------------------------
  @EventPattern('user.assign.default.role')
  async handleAssignDefaultRole(
    @Payload() message: UserAssignDefaultRoleEvent, 

  ) {

    this.logger.log(`Payload received: ${JSON.stringify(message)}`);

    const { userUuid, defaultRole } = message;

    this.logger.log(`Received Kafka event: assign default role '${defaultRole}' for userUuid=${userUuid}`);

    const assignDto: AssignRoleToUserRequestDto = {
      userUuid,
      roleId: (await this.rbacService.getRoleIdByName(defaultRole)),
    };
    try {
      const result = await this.rbacService.assignRoleToUser(assignDto);
      this.logger.log(`Default role assigned successfully: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Failed to assign default role: ${error.message}`, error.stack);
    }
  }

  // -------------------------
// Get roles for user
// -------------------------
@GrpcMethod('RbacService', 'getUserRole')
async getRoleForUser(
  data: GetUserByUserUuidDto,
) {
  this.logger.log(`gRPC GetUserRole called with userUuid: ${JSON.stringify(data)}`);
  return this.rbacService.getRoleForUser(data);
}
}
