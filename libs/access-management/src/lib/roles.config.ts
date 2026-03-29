// libs/access_management/src/lib/roles.config.ts

import { Permissions, ModuleSlug, Permission } from './permissions.config';

export enum RoleType {
  // ============ PLATFORM ROLES (PivotaConnect Team) ============
  /** Full platform control */
  SUPER_ADMIN = 'SuperAdmin',
  
  /** Platform operations, user management, system config */
  PLATFORM_SYSTEM_ADMIN = 'PlatformSystemAdmin',
  
  /** KYC, verification, fraud monitoring */
  PLATFORM_COMPLIANCE_ADMIN = 'PlatformComplianceAdmin',
  
  /** Platform metrics, reporting, insights */
  PLATFORM_ANALYTICS_ADMIN = 'PlatformAnalyticsAdmin',
  
  /** Module configuration, feature flags */
  PLATFORM_MODULE_MANAGER = 'PlatformModuleManager',
  
  /** AI/ML Developer - Training data access for model development */
  AI_DEVELOPER = 'AIDeveloper',
  
  // ============ ACCOUNT ROLES ============
  /** 
   * Individual User - Solo user, personal account
   * - Manage own listings only
   * - Apply for jobs, book services
   * - Cannot invite members
   * - Personal account only
   */
  INDIVIDUAL = 'Individual',
  
  /** 
   * Business Admin - The person who created/owns the business account
   * - Full business account management
   * - Can invite members
   * - Manage subscription
   * - All business listings (.any permissions)
   */
  ADMIN = 'Admin',
  
  /** 
   * Content manager for business accounts
   * - Manage ALL business listings (.any permissions)
   * - CANNOT invite members
   * - Can view team members
   * - Cannot manage subscription or system settings
   */
  CONTENT_MANAGER_ADMIN = 'ContentManagerAdmin',
}

// ============ ROLE METADATA (Single Source of Truth) ============

export interface RoleMetadata {
  name: string;
  description: string;
  scope: 'SYSTEM' | 'BUSINESS';
  immutable: boolean;
  category: 'platform' | 'individual' | 'business';
}

export const RoleMetadataMap: Record<RoleType, RoleMetadata> = {
  // Platform Roles (System Scope)
  [RoleType.SUPER_ADMIN]: {
    name: 'Super Admin',
    description: 'Full platform control',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  [RoleType.PLATFORM_SYSTEM_ADMIN]: {
    name: 'Platform System Admin',
    description: 'Platform operations, user management, system config',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  [RoleType.PLATFORM_COMPLIANCE_ADMIN]: {
    name: 'Platform Compliance Admin',
    description: 'KYC, verification, fraud monitoring',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  [RoleType.PLATFORM_ANALYTICS_ADMIN]: {
    name: 'Platform Analytics Admin',
    description: 'Platform metrics, reporting, insights',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  [RoleType.PLATFORM_MODULE_MANAGER]: {
    name: 'Platform Module Manager',
    description: 'Module configuration, feature flags',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  [RoleType.AI_DEVELOPER]: {
    name: 'AI Developer',
    description: 'AI/ML developer with access to training datasets',
    scope: 'SYSTEM',
    immutable: true,
    category: 'platform',
  },
  
  // Account Roles (Business Scope)
  [RoleType.INDIVIDUAL]: {
    name: 'Individual',
    description: 'Individual user with personal account',
    scope: 'BUSINESS',
    immutable: false,
    category: 'individual',
  },
  [RoleType.ADMIN]: {
    name: 'Admin',
    description: 'Business account owner with full control',
    scope: 'BUSINESS',
    immutable: false,
    category: 'business',
  },
  [RoleType.CONTENT_MANAGER_ADMIN]: {
    name: 'Content Manager Admin',
    description: 'Business content manager (manages all organization listings)',
    scope: 'BUSINESS',
    immutable: false,
    category: 'business',
  },
};

// Helper functions using metadata with safe navigation
export function getRoleName(roleType: RoleType): string {
  return RoleMetadataMap[roleType]?.name || roleType;
}

export function getRoleDescription(roleType: RoleType): string {
  return RoleMetadataMap[roleType]?.description || '';
}

export function getRoleScope(roleType: RoleType): 'SYSTEM' | 'BUSINESS' {
  return RoleMetadataMap[roleType]?.scope || 'BUSINESS';
}

export function isRoleImmutable(roleType: RoleType): boolean {
  return RoleMetadataMap[roleType]?.immutable || false;
}

export function getRoleCategory(roleType: RoleType): 'platform' | 'individual' | 'business' {
  return RoleMetadataMap[roleType]?.category || 'individual';
}

// Role category helpers using metadata with safe navigation
export function isPlatformRole(role: RoleType): boolean {
  return RoleMetadataMap[role]?.category === 'platform';
}

export function isIndividualRole(role: RoleType): boolean {
  return RoleMetadataMap[role]?.category === 'individual';
}

export function isBusinessRole(role: RoleType): boolean {
  return RoleMetadataMap[role]?.category === 'business';
}

export function isBusinessAdminRole(role: RoleType): boolean {
  return role === RoleType.ADMIN;
}

export function isContentManagerRole(role: RoleType): boolean {
  return role === RoleType.CONTENT_MANAGER_ADMIN;
}

export function isAIDeveloperRole(role: RoleType): boolean {
  return role === RoleType.AI_DEVELOPER;
}

/**
 * Role permissions mapping
 * Platform roles inherit ALL business role capabilities plus their specific system permissions
 */
export const RolePermissionsMap: Record<RoleType, string[]> = {
  // ============ PLATFORM ROLES ============
  // Super Admin - Full access to everything
  [RoleType.SUPER_ADMIN]: [Permissions.SUPER_ADMIN],
  
  // Platform System Admin - All business capabilities + system management
  [RoleType.PLATFORM_SYSTEM_ADMIN]: [
    // ============ Business Capabilities (Same as ADMIN) ============
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.HOUSING_CREATE_ANY,
    Permissions.HOUSING_UPDATE_ANY,
    Permissions.HOUSING_DELETE_ANY,
    Permissions.HOUSING_CLOSE_ANY,
    Permissions.HOUSING_ARCHIVE_ANY,
    Permissions.EMPLOYMENT_READ,
    Permissions.EMPLOYMENT_CREATE_ANY,
    Permissions.EMPLOYMENT_UPDATE_ANY,
    Permissions.EMPLOYMENT_DELETE_ANY,
    Permissions.EMPLOYMENT_CLOSE_ANY,
    Permissions.EMPLOYMENT_ARCHIVE_ANY,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.SOCIAL_SUPPORT_CREATE_ANY,
    Permissions.SOCIAL_SUPPORT_UPDATE_ANY,
    Permissions.SOCIAL_SUPPORT_DELETE_ANY,
    Permissions.SOCIAL_SUPPORT_CLOSE_ANY,
    Permissions.SOCIAL_SUPPORT_ARCHIVE_ANY,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.PROFESSIONAL_SERVICES_CREATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_UPDATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_DELETE_ANY,
    Permissions.PROFESSIONAL_SERVICES_BOOK,
    Permissions.PROFESSIONAL_SERVICES_REVIEW,
    Permissions.ACCOUNT_VIEW,
    Permissions.ACCOUNT_UPDATE,
    Permissions.ACCOUNT_UPGRADE,
    Permissions.TEAM_VIEW,
    Permissions.TEAM_INVITE,
    Permissions.TEAM_REMOVE_MEMBER,
    Permissions.TEAM_UPDATE_ROLE,
    Permissions.TEAM_UPDATE_SETTINGS,
    Permissions.LISTINGS_READ,
    Permissions.SUBSCRIPTION_BYPASS,
    
    // ============ Platform Specific Capabilities ============
    Permissions.ROLE_DELETE,
    Permissions.CATEGORIES_CREATE,
    Permissions.CATEGORIES_UPDATE,
    Permissions.CATEGORIES_DELETE,
    Permissions.CATEGORIES_MANAGE,
    Permissions.USER_VIEW,
    Permissions.USER_SUSPEND,
    Permissions.SYSTEM_SETTINGS_MANAGE,
    Permissions.LISTINGS_MODERATE,
  ],
  
  // Platform Compliance Admin - All business capabilities + compliance
  [RoleType.PLATFORM_COMPLIANCE_ADMIN]: [
    // ============ Business Capabilities (Same as CONTENT_MANAGER_ADMIN) ============
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.HOUSING_CREATE_ANY,
    Permissions.HOUSING_UPDATE_ANY,
    Permissions.HOUSING_DELETE_ANY,
    Permissions.HOUSING_CLOSE_ANY,
    Permissions.HOUSING_ARCHIVE_ANY,
    Permissions.HOUSING_MODERATE,
    Permissions.HOUSING_APPROVE,
    Permissions.EMPLOYMENT_READ,
    Permissions.EMPLOYMENT_CREATE_ANY,
    Permissions.EMPLOYMENT_UPDATE_ANY,
    Permissions.EMPLOYMENT_DELETE_ANY,
    Permissions.EMPLOYMENT_CLOSE_ANY,
    Permissions.EMPLOYMENT_ARCHIVE_ANY,
    Permissions.EMPLOYMENT_MODERATE,
    Permissions.EMPLOYMENT_APPROVE,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.SOCIAL_SUPPORT_CREATE_ANY,
    Permissions.SOCIAL_SUPPORT_UPDATE_ANY,
    Permissions.SOCIAL_SUPPORT_DELETE_ANY,
    Permissions.SOCIAL_SUPPORT_CLOSE_ANY,
    Permissions.SOCIAL_SUPPORT_ARCHIVE_ANY,
    Permissions.SOCIAL_SUPPORT_MODERATE,
    Permissions.SOCIAL_SUPPORT_APPROVE,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.PROFESSIONAL_SERVICES_CREATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_UPDATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_DELETE_ANY,
    Permissions.PROFESSIONAL_SERVICES_BOOK,
    Permissions.PROFESSIONAL_SERVICES_REVIEW,
    Permissions.PROFESSIONAL_SERVICES_VERIFY,
    Permissions.TEAM_VIEW,
    Permissions.LISTINGS_READ,
    
    // ============ Platform Specific Capabilities ============
    Permissions.USER_VIEW,
    Permissions.LISTINGS_MODERATE,
    Permissions.HOUSING_VERIFY,
    Permissions.EMPLOYMENT_VERIFY,
    Permissions.SOCIAL_SUPPORT_VERIFY,
    Permissions.PROFESSIONAL_SERVICES_VERIFY,
  ],
  
  // Platform Analytics Admin - All business read capabilities + analytics
  [RoleType.PLATFORM_ANALYTICS_ADMIN]: [
    // ============ Business Capabilities (Read-only for all modules) ============
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.EMPLOYMENT_READ,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.LISTINGS_READ,
    
    // ============ Platform Specific Capabilities ============
    Permissions.ANALYTICS_EXPORT,
  ],
  
  // Platform Module Manager - All business capabilities + module management
  [RoleType.PLATFORM_MODULE_MANAGER]: [
    // ============ Business Capabilities (Read-only for all modules) ============
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.EMPLOYMENT_READ,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.LISTINGS_READ,
    
    // ============ Platform Specific Capabilities ============
    Permissions.MODULE_RULES_MANAGE,
    Permissions.MODULE_ENABLE,
    Permissions.MODULE_DISABLE,
  ],
  
  // ============ AI DEVELOPER ROLE ============
  [RoleType.AI_DEVELOPER]: [
    // Core access
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.ANALYTICS_EXPORT,
    
    // Read-only access to business modules (for data understanding)
    Permissions.HOUSING_READ,
    Permissions.EMPLOYMENT_READ,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.PROFESSIONAL_SERVICES_READ,
    
    // Training data permissions
    Permissions.TRAINING_DATA_ACCESS,
    Permissions.TRAINING_DATA_EXPORT,
    
    // Registry access
    Permissions.LISTINGS_READ,
  ],
  
  // ============ INDIVIDUAL ROLE (Personal Account) ============
  [RoleType.INDIVIDUAL]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.HOUSING_CREATE_OWN,
    Permissions.HOUSING_UPDATE_OWN,
    Permissions.HOUSING_DELETE_OWN,
    Permissions.HOUSING_CLOSE_OWN,
    Permissions.HOUSING_ARCHIVE_OWN,
    Permissions.EMPLOYMENT_READ,
    Permissions.EMPLOYMENT_CREATE_OWN,
    Permissions.EMPLOYMENT_UPDATE_OWN,
    Permissions.EMPLOYMENT_DELETE_OWN,
    Permissions.EMPLOYMENT_CLOSE_OWN,
    Permissions.EMPLOYMENT_ARCHIVE_OWN,
    Permissions.EMPLOYMENT_APPLY,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.SOCIAL_SUPPORT_CREATE_OWN,
    Permissions.SOCIAL_SUPPORT_UPDATE_OWN,
    Permissions.SOCIAL_SUPPORT_DELETE_OWN,
    Permissions.SOCIAL_SUPPORT_CLOSE_OWN,
    Permissions.SOCIAL_SUPPORT_ARCHIVE_OWN,
    Permissions.SOCIAL_SUPPORT_REQUEST,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.PROFESSIONAL_SERVICES_CREATE_OWN,
    Permissions.PROFESSIONAL_SERVICES_UPDATE_OWN,
    Permissions.PROFESSIONAL_SERVICES_DELETE_OWN,
    Permissions.PROFESSIONAL_SERVICES_BOOK,
    Permissions.PROFESSIONAL_SERVICES_REVIEW,
    Permissions.ACCOUNT_VIEW,
    Permissions.ACCOUNT_UPDATE,
    Permissions.LISTINGS_READ,
  ],
  
  // ============ BUSINESS ADMIN ROLE (Business Account Owner) ============
  [RoleType.ADMIN]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.HOUSING_CREATE_ANY,
    Permissions.HOUSING_UPDATE_ANY,
    Permissions.HOUSING_DELETE_ANY,
    Permissions.HOUSING_CLOSE_ANY,
    Permissions.HOUSING_ARCHIVE_ANY,
    Permissions.EMPLOYMENT_READ,
    Permissions.EMPLOYMENT_CREATE_ANY,
    Permissions.EMPLOYMENT_UPDATE_ANY,
    Permissions.EMPLOYMENT_DELETE_ANY,
    Permissions.EMPLOYMENT_CLOSE_ANY,
    Permissions.EMPLOYMENT_ARCHIVE_ANY,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.SOCIAL_SUPPORT_CREATE_ANY,
    Permissions.SOCIAL_SUPPORT_UPDATE_ANY,
    Permissions.SOCIAL_SUPPORT_DELETE_ANY,
    Permissions.SOCIAL_SUPPORT_CLOSE_ANY,
    Permissions.SOCIAL_SUPPORT_ARCHIVE_ANY,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.PROFESSIONAL_SERVICES_CREATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_UPDATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_DELETE_ANY,
    Permissions.PROFESSIONAL_SERVICES_BOOK,
    Permissions.PROFESSIONAL_SERVICES_REVIEW,
    Permissions.ACCOUNT_VIEW,
    Permissions.ACCOUNT_UPDATE,
    Permissions.ACCOUNT_UPGRADE,
    Permissions.TEAM_VIEW,
    Permissions.TEAM_INVITE,
    Permissions.TEAM_REMOVE_MEMBER,
    Permissions.TEAM_UPDATE_ROLE,
    Permissions.TEAM_UPDATE_SETTINGS,
    Permissions.LISTINGS_READ,
    Permissions.SUBSCRIPTION_BYPASS,
  ],
  
  // ============ CONTENT MANAGER ROLE ============
  [RoleType.CONTENT_MANAGER_ADMIN]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.REGISTRY_VIEW,
    Permissions.ANALYTICS_VIEW,
    Permissions.HOUSING_READ,
    Permissions.HOUSING_CREATE_ANY,
    Permissions.HOUSING_UPDATE_ANY,
    Permissions.HOUSING_DELETE_ANY,
    Permissions.HOUSING_CLOSE_ANY,
    Permissions.HOUSING_ARCHIVE_ANY,
    Permissions.HOUSING_MODERATE,
    Permissions.HOUSING_APPROVE,
    Permissions.EMPLOYMENT_READ,
    Permissions.EMPLOYMENT_CREATE_ANY,
    Permissions.EMPLOYMENT_UPDATE_ANY,
    Permissions.EMPLOYMENT_DELETE_ANY,
    Permissions.EMPLOYMENT_CLOSE_ANY,
    Permissions.EMPLOYMENT_ARCHIVE_ANY,
    Permissions.EMPLOYMENT_MODERATE,
    Permissions.EMPLOYMENT_APPROVE,
    Permissions.SOCIAL_SUPPORT_READ,
    Permissions.SOCIAL_SUPPORT_CREATE_ANY,
    Permissions.SOCIAL_SUPPORT_UPDATE_ANY,
    Permissions.SOCIAL_SUPPORT_DELETE_ANY,
    Permissions.SOCIAL_SUPPORT_CLOSE_ANY,
    Permissions.SOCIAL_SUPPORT_ARCHIVE_ANY,
    Permissions.SOCIAL_SUPPORT_MODERATE,
    Permissions.SOCIAL_SUPPORT_APPROVE,
    Permissions.PROFESSIONAL_SERVICES_READ,
    Permissions.PROFESSIONAL_SERVICES_CREATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_UPDATE_ANY,
    Permissions.PROFESSIONAL_SERVICES_DELETE_ANY,
    Permissions.PROFESSIONAL_SERVICES_BOOK,
    Permissions.PROFESSIONAL_SERVICES_REVIEW,
    Permissions.PROFESSIONAL_SERVICES_VERIFY,
    Permissions.TEAM_VIEW,
    Permissions.LISTINGS_READ,
  ],
};

/**
 * Get modules accessible by a role
 */
export function getRoleModules(roleType: RoleType): ModuleSlug[] {
  // Platform roles have access to all modules
  if (isPlatformRole(roleType)) {
    return Object.values(ModuleSlug);
  }
  
  // AI Developer role - access to training data and read-only business modules
  if (isAIDeveloperRole(roleType)) {
    return [
      ModuleSlug.DASHBOARD,
      ModuleSlug.REGISTRY,
      ModuleSlug.ANALYTICS,
      ModuleSlug.HOUSING,
      ModuleSlug.EMPLOYMENT,
      ModuleSlug.SOCIAL_SUPPORT,
      ModuleSlug.PROFESSIONAL_SERVICES,
      ModuleSlug.TRAINING_DATA,
    ];
  }
  
  // Individual role - personal account modules only
  if (isIndividualRole(roleType)) {
    return [
      ModuleSlug.DASHBOARD,
      ModuleSlug.REGISTRY,
      ModuleSlug.ANALYTICS,
      ModuleSlug.HOUSING,
      ModuleSlug.EMPLOYMENT,
      ModuleSlug.SOCIAL_SUPPORT,
      ModuleSlug.PROFESSIONAL_SERVICES,
      ModuleSlug.ACCOUNT,
    ];
  }
  
  // Business admin role - full business modules (includes team management)
  if (isBusinessAdminRole(roleType)) {
    return [
      ModuleSlug.DASHBOARD,
      ModuleSlug.REGISTRY,
      ModuleSlug.ANALYTICS,
      ModuleSlug.HOUSING,
      ModuleSlug.EMPLOYMENT,
      ModuleSlug.SOCIAL_SUPPORT,
      ModuleSlug.PROFESSIONAL_SERVICES,
      ModuleSlug.ACCOUNT,
      ModuleSlug.TEAM_MANAGEMENT,
    ];
  }
  
  // Content manager role - business modules without team management
  if (isContentManagerRole(roleType)) {
    return [
      ModuleSlug.DASHBOARD,
      ModuleSlug.REGISTRY,
      ModuleSlug.ANALYTICS,
      ModuleSlug.HOUSING,
      ModuleSlug.EMPLOYMENT,
      ModuleSlug.SOCIAL_SUPPORT,
      ModuleSlug.PROFESSIONAL_SERVICES,
      ModuleSlug.ACCOUNT,
    ];
  }
  
  // Default fallback for unknown roles
  console.warn(`Unknown role type: ${roleType}, using default modules`);
  return [
    ModuleSlug.DASHBOARD,
    ModuleSlug.REGISTRY,
    ModuleSlug.ANALYTICS,
    ModuleSlug.ACCOUNT,
  ];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  roleType: RoleType,
  permission: Permission,
): boolean {
  const permissions = RolePermissionsMap[roleType];
  if (!permissions) return false;
  
  // Super admin has all permissions
  if (permissions.includes(Permissions.SUPER_ADMIN)) return true;
  
  return permissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleType: RoleType): Permission[] {
  const permissions = RolePermissionsMap[roleType];
  if (!permissions) return [];
  
  // If super admin, return all permissions
  if (permissions.includes(Permissions.SUPER_ADMIN)) {
    return Object.values(Permissions);
  }
  
  return permissions as Permission[];
}