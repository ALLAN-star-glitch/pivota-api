import { Controller, Logger } from '@nestjs/common';
import {GrpcMethod } from '@nestjs/microservices';
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
  RoleIdRequestDto, RoleIdResponse,
} from '@pivota-api/dtos';



type UserAssignDefaultRoleEvent = {
  userUuid: string;
  defaultRoleType: string;
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


  @GrpcMethod('RbacService', 'GetRoleIdByType') // Fix: BaseRoleIdGrpcResponse is a generic type
  async getRoleIdByType(data: RoleIdRequestDto): Promise<BaseResponseDto<RoleIdResponse>> {
    this.logger.log(`gRPC GetRoleIdByType called with type: ${data.roleType}`);
    try {
      
      const result = await this.rbacService.getRoleIdByType(data);
       this.logger.debug(`gRPC GetRoleIdByType full response: ${JSON.stringify(result, null, 2)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get role ID by type: ${error.message}`, error.stack);
      throw error;
    }
  }

  
  
  // -------------------------
// Get roles for user
// -------------------------
@GrpcMethod('RbacService', 'GetUserRole')
async getRoleForUser(
  data: GetUserByUserUuidDto,
) {
  this.logger.log(`gRPC GetUserRole called with userUuid: ${JSON.stringify(data)}`);
  return this.rbacService.getRoleForUser(data);

}
}
