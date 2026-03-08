import {
  Body,
  Controller,
  Post,
  Put,
  Get,
  Param,
  Version,
  Logger,
  UseGuards,
} from '@nestjs/common';
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
  AssignRoleToUserRequestDto,
  UserRoleResponseDto,
} from '@pivota-api/dtos';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiExtraModels,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';

@ApiTags('RBAC') // Main module tag
@ApiExtraModels(
  BaseResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  RolePermissionResponseDto,
  UserRoleResponseDto
)
@Controller('rbac-module')
export class RbacGatewayController {
  private readonly logger = new Logger(RbacGatewayController.name);

  constructor(private readonly rbacGatewayService: RbacGatewayService) {}

  // ===========================================================
  // 🔐 RBAC - ROLE MANAGEMENT
  // ===========================================================

  /**
   * Create a new role
   * 
   * Creates a new role in the RBAC system. Roles are used to group permissions
   * and assign them to users.
   * 
   * @param body - Role creation details (name, description, roleType, scope, etc.)
   * @returns Created role details
   */
  @Post('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Roles')
  @ApiOperation({ 
    summary: 'Create a new role',
    description: `
      Creates a new role in the RBAC system.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **What are Roles?**
      Roles are collections of permissions that define what actions a user can perform.
      They are the primary mechanism for access control in the system.
      
      **Role Properties:**
      • **name** - Display name (e.g., "Content Manager")
      • **roleType** - Unique identifier for the role (e.g., "content-manager")
      • **description** - Detailed description of the role's purpose
      • **scope** - Scope of the role (e.g., "GLOBAL", "ORGANIZATION", "MODULE")
      • **immutable** - Whether the role can be modified (system roles are immutable)
      • **status** - Active/Inactive status
      
      **Role Types (roleType):**
      • System roles: 'super-admin', 'system-admin', 'module-manager'
      • Business roles: 'content-manager', 'compliance-admin', 'analytics-admin'
      • Custom roles: Defined by organizations
      
      **Scope Options:**
      • **GLOBAL** - Applies across the entire platform
      • **ORGANIZATION** - Applies within an organization
      • **MODULE** - Applies to a specific module
      
      **Important Notes:**
      • roleType must be unique across the system
      • Immutable roles cannot be modified or deleted
      • System roles are automatically created during installation
    `
  })
  @ApiBody({ 
    type: CreateRoleRequestDto,
    examples: {
      'Content Manager Role': {
        value: {
          name: 'Content Manager',
          roleType: 'content-manager',
          description: 'Can create and manage content across the platform',
          scope: 'GLOBAL',
          status: 'Active',
          immutable: false
        }
      },
      'Organization Admin Role': {
        value: {
          name: 'Organization Admin',
          roleType: 'org-admin',
          description: 'Full access within their organization',
          scope: 'ORGANIZATION',
          status: 'Active',
          immutable: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Role created successfully',
    type: RoleResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Role created successfully',
        code: 'CREATED',
        data: {
          id: 'role_123abc',
          name: 'Content Manager',
          roleType: 'content-manager',
          description: 'Can create and manage content across the platform',
          scope: 'GLOBAL',
          status: 'Active',
          immutable: false,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Role with same roleType already exists' })
  async createRole(
    @Body() body: CreateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.createRole(body);
  }

  /**
   * Update an existing role
   * 
   * Updates properties of an existing role.
   * 
   * @param id - Role ID
   * @param body - Fields to update
   * @returns Updated role details
   */
  @Put('roles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Roles')
  @ApiOperation({ 
    summary: 'Update a role',
    description: `
      Updates an existing role's properties.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **Updatable Fields:**
      • **name** - Display name
      • **description** - Role description
      • **status** - Active/Inactive status
      
      **Restrictions:**
      • Cannot change roleType (unique identifier)
      • Cannot change scope
      • Immutable roles cannot be modified
      • System roles have restricted updates
      
      **Impact:**
      Changes affect all users with this role immediately.
      Consider communication before updating role definitions.
    `
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    description: 'ID of the role to update',
    example: 'role_123abc'
  })
  @ApiBody({ 
    type: UpdateRoleRequestDto,
    examples: {
      'Update name and description': {
        value: {
          name: 'Senior Content Manager',
          description: 'Advanced content management with approval rights',
          status: 'Active'
        }
      },
      'Deactivate role': {
        value: {
          status: 'Inactive'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Role updated successfully',
    type: RoleResponseDto
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot modify immutable role' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleRequestDto
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.updateRole({ ...body, id });
  }

  /**
   * Get all roles
   * 
   * Retrieves a list of all roles in the system.
   * 
   * @returns List of all roles
   */
  @Get('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Roles')
  @ApiOperation({ 
    summary: 'Get all roles',
    description: `
      Retrieves a list of all roles available in the system.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **Information returned:**
      • All system roles and custom roles
      • Role details (name, type, scope, status)
      • Creation and update timestamps
      • Immutable flag
      
      **Use Cases:**
      • Role management UI
      • Permission assignment
      • User role selection
      • Audit and compliance
      
      **Filtering:**
      To filter by status or scope, implement client-side filtering
      or extend the API with query parameters.
    `
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Roles retrieved successfully',
    type: [RoleResponseDto],
    schema: {
      example: {
        success: true,
        message: 'Roles retrieved successfully',
        code: 'OK',
        data: [
          {
            id: 'role_super_admin',
            name: 'Super Admin',
            roleType: 'super-admin',
            description: 'Full system access',
            scope: 'GLOBAL',
            status: 'Active',
            immutable: true
          },
          {
            id: 'role_content_manager',
            name: 'Content Manager',
            roleType: 'content-manager',
            description: 'Manage content across platform',
            scope: 'GLOBAL',
            status: 'Active',
            immutable: false
          },
          {
            id: 'role_analytics_viewer',
            name: 'Analytics Viewer',
            roleType: 'analytics-viewer',
            description: 'View reports and analytics',
            scope: 'ORGANIZATION',
            status: 'Active',
            immutable: false
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getAllRoles(): Promise<BaseResponseDto<RoleResponseDto[]>> {
    return this.rbacGatewayService.getAllRoles();
  }

  // ===========================================================
  // 🔐 RBAC - PERMISSION MANAGEMENT
  // ===========================================================

  /**
   * Create a new permission
   * 
   * Creates a new permission in the RBAC system. Permissions define
   * specific actions that can be performed.
   * 
   * @param body - Permission creation details (name, action, description, moduleId)
   * @returns Created permission details
   */
  @Post('permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Permissions')
  @ApiOperation({ 
    summary: 'Create a new permission',
    description: `
      Creates a new permission in the RBAC system.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **What are Permissions?**
      Permissions are the smallest unit of access control.
      They define specific actions that can be performed on resources.
      
      **Permission Structure:**
      • **name** - Display name (e.g., "Create Listing")
      • **action** - Unique action identifier (e.g., "listing.create")
      • **description** - Detailed description of what the permission allows
      • **moduleId** - Optional module this permission belongs to
      • **system** - Whether this is a system permission (immutable)
      
      **Action Naming Convention:**
      Format: \`resource.operation\`
      Examples:
      • \`listing.create\` - Create a listing
      • \`listing.update\` - Update a listing
      • \`listing.delete\` - Delete a listing
      • \`user.view\` - View user details
      • \`settings.manage\` - Manage system settings
      
      **Operation Types:**
      • **create** - Create new resources
      • **read/view** - View resources
      • **update/edit** - Modify resources
      • **delete** - Remove resources
      • **manage** - Full management access
      • **approve** - Approval actions
      
      **Important Notes:**
      • action must be unique across the system
      • System permissions cannot be modified or deleted
      • Permissions are typically created during module installation
    `
  })
  @ApiBody({ 
    type: CreatePermissionRequestDto,
    examples: {
      'Listing Permission': {
        value: {
          name: 'Create Listing',
          action: 'listing.create',
          description: 'Allows user to create new listings',
          moduleId: 'module_housing'
        }
      },
      'User Management Permission': {
        value: {
          name: 'Manage Users',
          action: 'user.manage',
          description: 'Full user management capabilities',
          moduleId: 'module_admin',
          system: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Permission created successfully',
    type: PermissionResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Permission created successfully',
        code: 'CREATED',
        data: {
          id: 'perm_123abc',
          name: 'Create Listing',
          action: 'listing.create',
          description: 'Allows user to create new listings',
          moduleId: 'module_housing',
          system: false,
          createdAt: '2026-03-05T10:30:00.000Z',
          updatedAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Conflict - Permission with same action already exists' })
  async createPermission(
    @Body() body: CreatePermissionRequestDto
  ): Promise<BaseResponseDto<PermissionResponseDto>> {
    return this.rbacGatewayService.createPermission(body);
  }

  // ===========================================================
  // 🔐 RBAC - ROLE-PERMISSION ASSIGNMENTS
  // ===========================================================

  /**
   * Assign a permission to a role
   * 
   * Grants a specific permission to a role.
   * 
   * @param roleId - ID of the role
   * @param body - Permission assignment details
   * @returns Assignment confirmation
   */
  @Post('roles/:roleId/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Assignments')
  @ApiOperation({ 
    summary: 'Assign a permission to a role',
    description: `
      Grants a specific permission to a role.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **How it works:**
      When a permission is assigned to a role, all users with that role
      automatically gain that permission.
      
      **Assignment Rules:**
      • A permission can be assigned to multiple roles
      • A role can have multiple permissions
      • Duplicate assignments are prevented
      • System permissions have special handling
      
      **Impact:**
      Changes take effect immediately for all users with this role.
      No need for users to log out and back in.
      
      **Use Cases:**
      • Building role-based access control
      • Customizing role capabilities
      • Implementing feature flags
      • Gradual permission rollout
      
      **Best Practices:**
      • Group related permissions
      • Use role templates for consistency
      • Document permission assignments
      • Regular audit of assignments
    `
  })
  @ApiParam({ 
    name: 'roleId', 
    type: String,
    description: 'ID of the role to assign permission to',
    example: 'role_123abc'
  })
  @ApiBody({ 
    type: AssignPermissionToRoleRequestDto,
    examples: {
      'Assign single permission': {
        value: {
          permissionId: 'perm_123abc'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Permission assigned successfully',
    type: RolePermissionResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Permission assigned successfully',
        code: 'CREATED',
        data: {
          id: 'rp_123abc',
          roleId: 'role_123abc',
          permissionId: 'perm_123abc',
          createdAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role or Permission not found' })
  @ApiResponse({ status: 409, description: 'Permission already assigned to this role' })
  async assignPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() body: AssignPermissionToRoleRequestDto
  ): Promise<BaseResponseDto<RolePermissionResponseDto>> {
    return this.rbacGatewayService.assignPermissionToRole({
      ...body,
      roleId,
    });
  }

  // ===========================================================
  // 🔐 RBAC - USER-ROLE ASSIGNMENTS
  // ===========================================================

  /**
   * Assign a role to a user
   * 
   * Grants a specific role to a user.
   * 
   * @param userUuid - UUID of the user
   * @param body - Role assignment details
   * @returns Assignment confirmation
   */
  @Post('users/:userUuid/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin')
  @Version('1')
  @ApiTags('RBAC - Assignments')
  @ApiOperation({ 
    summary: 'Assign Role to a user',
    description: `
      Assigns a specific role to a user.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin only
      
      **How it works:**
      When a role is assigned to a user, they gain all permissions
      associated with that role.
      
      **Assignment Rules:**
      • A user can have multiple roles
      • A role can be assigned to multiple users
      • Duplicate assignments are prevented
      • System roles have special handling
      
      **Impact:**
      Changes take effect immediately.
      User's permissions are updated without requiring logout.
      
      **Use Cases:**
      • Onboarding new team members
      • Role changes (promotions, transfers)
      • Temporary access grants
      • Project-based assignments
      
      **Best Practices:**
      • Follow principle of least privilege
      • Regular access reviews
      • Document role assignments
      • Audit trail for compliance
      
      **Important:**
      This is a sensitive operation restricted to SuperAdmin only.
      All assignments are logged for audit purposes.
    `
  })
  @ApiParam({ 
    name: 'userUuid', 
    type: String,
    description: 'UUID of the user to assign role to',
    example: 'usr_123abc'
  })
  @ApiBody({ 
    type: AssignRoleToUserRequestDto,
    examples: {
      'Assign role to user': {
        value: {
          roleId: 'role_123abc'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Role assigned successfully',
    type: UserRoleResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Role assigned successfully',
        code: 'CREATED',
        data: {
          id: 'ur_123abc',
          userUuid: 'usr_123abc',
          roleId: 'role_123abc',
          createdAt: '2026-03-05T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - SuperAdmin only' })
  @ApiResponse({ status: 404, description: 'User or Role not found' })
  @ApiResponse({ status: 409, description: 'Role already assigned to this user' })
  async assignRoleToUser(
    @Param('userUuid') userUuid: string,
    @Body() body: AssignRoleToUserRequestDto
  ): Promise<BaseResponseDto<UserRoleResponseDto>> {
    return this.rbacGatewayService.assignRoleToUser({
      ...body,
      userUuid,
    });
  }

  /**
   * Get role for a user
   * 
   * Retrieves the role assigned to a specific user.
   * 
   * @param userUuid - UUID of the user
   * @returns User's role details
   */
  @Get('users/:userUuid/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'ContentManagerAdmin', 'ComplianceAdmin', 'AnalyticsAdmin', 'FraudAdmin')
  @Version('1')
  @ApiTags('RBAC - Assignments')
  @ApiOperation({ 
    summary: 'Get Role for a user',
    description: `
      Retrieves the role(s) assigned to a specific user.
      
      **Microservice:** Admin Service (RBAC Module)
      **Authentication:** Required (JWT cookie)
      **Permissions:** SuperAdmin, ContentManagerAdmin, ComplianceAdmin, AnalyticsAdmin, FraudAdmin
      
      **Information returned:**
      • Role details (name, type, scope)
      • Assignment timestamp
      • Role status
      
      **Use Cases:**
      • User profile page
      • Permission debugging
      • Access verification
      • Audit purposes
      
      **Note:**
      If a user has multiple roles, consider extending this endpoint
      to return an array or adding a dedicated endpoint for multiple roles.
    `
  })
  @ApiParam({ 
    name: 'userUuid', 
    type: String,
    description: 'UUID of the user',
    example: 'usr_123abc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Role retrieved successfully',
        code: 'OK',
        data: {
          id: 'role_123abc',
          name: 'Content Manager',
          roleType: 'content-manager',
          description: 'Can create and manage content',
          scope: 'GLOBAL',
          status: 'Active',
          immutable: false
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found or no role assigned' })
  async getRoleForUser(
    @Param('userUuid') userUuid: string
  ): Promise<BaseResponseDto<RoleResponseDto>> {
    return this.rbacGatewayService.getRoleForUser(userUuid);
  }
}