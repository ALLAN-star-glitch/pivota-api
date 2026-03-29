// libs/access_management/src/lib/permissions.config.ts

/**
 * Standardized module slugs across the entire platform
 * SINGLE SOURCE OF TRUTH for module identifiers
 */
export enum ModuleSlug {
  // ============ CORE MODULES (All Users Access) ============
  /** Dashboard - Everyone has access */
  DASHBOARD = 'dashboard',
  
  /** Registry - Unified listings view (read-only for all) */
  REGISTRY = 'registry',
  
  /** Analytics - Basic analytics for all users, advanced for admins */
  ANALYTICS = 'analytics',
  
  // ============ BUSINESS MODULES (Pillars) ============
  /** Housing & Real Estate - Rentals, sales, property management */
  HOUSING = 'housing',
  
  /** Employment - Formal jobs, informal/gig work, contracts, training */
  EMPLOYMENT = 'employment',
  
  /** Social Support - Food aid, cash grants, health services, counseling */
  SOCIAL_SUPPORT = 'social-support',
  
  // ============ HORIZONTAL MODULES ============
  /** 
   * Professional Services - Cross-pillar service marketplace
   * Enables all pillars with bookable professionals:
   * - Employment: Trainers, CV Writers, Career Coaches
   * - Housing: Movers, Electricians, Plumbers, Cleaners
   * - Social Support: Counselors, Social Workers, Caregivers
   */
  PROFESSIONAL_SERVICES = 'professional-services',
  
  // ============ ACCOUNT & TEAM MANAGEMENT ============
  /** Account Management - Profile, settings, subscription */
  ACCOUNT = 'account',
  
  /** Team Management - Invite members, manage roles, team settings */
  TEAM_MANAGEMENT = 'team-management',
  
  // ============ SYSTEM MODULES (Platform Admin Only) ============
  /** User Management - Platform-wide user administration */
  USER_MANAGEMENT = 'user-management',
  
  /** System Settings - Platform configuration, feature flags */
  SYSTEM_SETTINGS = 'system-settings',
  
  /** Module Management - Module configuration, rules */
  MODULE_MANAGEMENT = 'module-management',
  
  // ============ AI/ML TRAINING DATA MODULES ============
  /** Training Data - AI/ML model training datasets */
  TRAINING_DATA = 'training-data',
  
  // ============ CATEGORY MANAGEMENT MODULES ============
  /** Categories - Category management for listings */
  CATEGORIES = 'categories',
}

/**
 * Permission actions
 */
export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  CLOSE = 'close',
  ARCHIVE = 'archive',
  APPROVE = 'approve',
  MODERATE = 'moderate',
  VERIFY = 'verify',
  BOOK = 'book',        // Special action for booking services
  REVIEW = 'review',    // Special action for reviews/ratings
  INVITE = 'invite',    // Special action for inviting members
  REMOVE = 'remove',    // Special action for removing members
  EXPORT = 'export',    // Special action for exporting data
  APPLY = 'apply',      // Special action for applying to jobs
  REQUEST = 'request',  // Special action for requesting aid
  UPGRADE = 'upgrade',  // Special action for upgrading subscription
  ACCESS = 'access',    // Special action for accessing training data
  MANAGE = 'manage',    // Special action for managing resources
}

/**
 * Permission scope (ownership level)
 */
export enum PermissionScope {
  OWN = 'own',  // User's own resources
  ANY = 'any',  // Any resource (admin level)
}

/**
 * Build a permission string
 * @example buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.CREATE, PermissionScope.OWN) 
 * // returns "employment.create.own"
 */
export function buildPermission(
  module: ModuleSlug,
  action: PermissionAction,
  scope?: PermissionScope,
): string {
  return scope ? `${module}.${action}.${scope}` : `${module}.${action}`;
}

/**
 * All system-wide permissions
 */
export const Permissions = {
  // ============ SUPER ADMIN (Wildcard) ============
  SUPER_ADMIN: '*',
  
  // ============ CORE MODULE PERMISSIONS ============
  
  // Dashboard (everyone has access)
  DASHBOARD_VIEW: buildPermission(ModuleSlug.DASHBOARD, PermissionAction.READ),
  
  // Registry (unified listings view)
  REGISTRY_VIEW: buildPermission(ModuleSlug.REGISTRY, PermissionAction.READ),
  
  // Analytics
  ANALYTICS_VIEW: buildPermission(ModuleSlug.ANALYTICS, PermissionAction.READ),
  ANALYTICS_EXPORT: buildPermission(ModuleSlug.ANALYTICS, PermissionAction.EXPORT),
  
  // ============ HOUSING MODULE PERMISSIONS ============
  // Read
  HOUSING_READ: buildPermission(ModuleSlug.HOUSING, PermissionAction.READ),
  
  // Create
  HOUSING_CREATE_OWN: buildPermission(ModuleSlug.HOUSING, PermissionAction.CREATE, PermissionScope.OWN),
  HOUSING_CREATE_ANY: buildPermission(ModuleSlug.HOUSING, PermissionAction.CREATE, PermissionScope.ANY),
  
  // Update
  HOUSING_UPDATE_OWN: buildPermission(ModuleSlug.HOUSING, PermissionAction.UPDATE, PermissionScope.OWN),
  HOUSING_UPDATE_ANY: buildPermission(ModuleSlug.HOUSING, PermissionAction.UPDATE, PermissionScope.ANY),
  
  // Delete
  HOUSING_DELETE_OWN: buildPermission(ModuleSlug.HOUSING, PermissionAction.DELETE, PermissionScope.OWN),
  HOUSING_DELETE_ANY: buildPermission(ModuleSlug.HOUSING, PermissionAction.DELETE, PermissionScope.ANY),
  
  // Close
  HOUSING_CLOSE_OWN: buildPermission(ModuleSlug.HOUSING, PermissionAction.CLOSE, PermissionScope.OWN),
  HOUSING_CLOSE_ANY: buildPermission(ModuleSlug.HOUSING, PermissionAction.CLOSE, PermissionScope.ANY),
  
  // Archive
  HOUSING_ARCHIVE_OWN: buildPermission(ModuleSlug.HOUSING, PermissionAction.ARCHIVE, PermissionScope.OWN),
  HOUSING_ARCHIVE_ANY: buildPermission(ModuleSlug.HOUSING, PermissionAction.ARCHIVE, PermissionScope.ANY),
  
  // Moderation
  HOUSING_APPROVE: buildPermission(ModuleSlug.HOUSING, PermissionAction.APPROVE),
  HOUSING_MODERATE: buildPermission(ModuleSlug.HOUSING, PermissionAction.MODERATE),
  HOUSING_VERIFY: buildPermission(ModuleSlug.HOUSING, PermissionAction.VERIFY),
  
  // ============ EMPLOYMENT MODULE PERMISSIONS ============
  // Read
  EMPLOYMENT_READ: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.READ),
  
  // Create
  EMPLOYMENT_CREATE_OWN: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.CREATE, PermissionScope.OWN),
  EMPLOYMENT_CREATE_ANY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.CREATE, PermissionScope.ANY),
  
  // Update
  EMPLOYMENT_UPDATE_OWN: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.UPDATE, PermissionScope.OWN),
  EMPLOYMENT_UPDATE_ANY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.UPDATE, PermissionScope.ANY),
  
  // Delete
  EMPLOYMENT_DELETE_OWN: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.DELETE, PermissionScope.OWN),
  EMPLOYMENT_DELETE_ANY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.DELETE, PermissionScope.ANY),
  
  // Close
  EMPLOYMENT_CLOSE_OWN: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.CLOSE, PermissionScope.OWN),
  EMPLOYMENT_CLOSE_ANY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.CLOSE, PermissionScope.ANY),
  
  // Archive
  EMPLOYMENT_ARCHIVE_OWN: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.ARCHIVE, PermissionScope.OWN),
  EMPLOYMENT_ARCHIVE_ANY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.ARCHIVE, PermissionScope.ANY),
  
  // Special actions
  EMPLOYMENT_APPLY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.APPLY),
  
  // Moderation
  EMPLOYMENT_APPROVE: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.APPROVE),
  EMPLOYMENT_MODERATE: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.MODERATE),
  EMPLOYMENT_VERIFY: buildPermission(ModuleSlug.EMPLOYMENT, PermissionAction.VERIFY),
  
  // ============ SOCIAL SUPPORT MODULE PERMISSIONS ============
  // Read
  SOCIAL_SUPPORT_READ: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.READ),
  
  // Create
  SOCIAL_SUPPORT_CREATE_OWN: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.CREATE, PermissionScope.OWN),
  SOCIAL_SUPPORT_CREATE_ANY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.CREATE, PermissionScope.ANY),
  
  // Update
  SOCIAL_SUPPORT_UPDATE_OWN: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.UPDATE, PermissionScope.OWN),
  SOCIAL_SUPPORT_UPDATE_ANY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.UPDATE, PermissionScope.ANY),
  
  // Delete
  SOCIAL_SUPPORT_DELETE_OWN: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.DELETE, PermissionScope.OWN),
  SOCIAL_SUPPORT_DELETE_ANY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.DELETE, PermissionScope.ANY),
  
  // Close
  SOCIAL_SUPPORT_CLOSE_OWN: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.CLOSE, PermissionScope.OWN),
  SOCIAL_SUPPORT_CLOSE_ANY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.CLOSE, PermissionScope.ANY),
  
  // Archive
  SOCIAL_SUPPORT_ARCHIVE_OWN: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.ARCHIVE, PermissionScope.OWN),
  SOCIAL_SUPPORT_ARCHIVE_ANY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.ARCHIVE, PermissionScope.ANY),
  
  // Special actions
  SOCIAL_SUPPORT_REQUEST: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.REQUEST),
  
  // Moderation
  SOCIAL_SUPPORT_APPROVE: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.APPROVE),
  SOCIAL_SUPPORT_MODERATE: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.MODERATE),
  SOCIAL_SUPPORT_VERIFY: buildPermission(ModuleSlug.SOCIAL_SUPPORT, PermissionAction.VERIFY),
  
  // ============ PROFESSIONAL SERVICES MODULE PERMISSIONS ============
  // Read
  PROFESSIONAL_SERVICES_READ: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.READ),
  
  // Create
  PROFESSIONAL_SERVICES_CREATE_OWN: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.CREATE, PermissionScope.OWN),
  PROFESSIONAL_SERVICES_CREATE_ANY: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.CREATE, PermissionScope.ANY),
  
  // Update
  PROFESSIONAL_SERVICES_UPDATE_OWN: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.UPDATE, PermissionScope.OWN),
  PROFESSIONAL_SERVICES_UPDATE_ANY: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.UPDATE, PermissionScope.ANY),
  
  // Delete
  PROFESSIONAL_SERVICES_DELETE_OWN: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.DELETE, PermissionScope.OWN),
  PROFESSIONAL_SERVICES_DELETE_ANY: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.DELETE, PermissionScope.ANY),
  
  // Special actions
  PROFESSIONAL_SERVICES_BOOK: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.BOOK),
  PROFESSIONAL_SERVICES_REVIEW: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.REVIEW),
  
  // Moderation
  PROFESSIONAL_SERVICES_VERIFY: buildPermission(ModuleSlug.PROFESSIONAL_SERVICES, PermissionAction.VERIFY),
  
  // ============ ACCOUNT MODULE PERMISSIONS ============
  ACCOUNT_VIEW: buildPermission(ModuleSlug.ACCOUNT, PermissionAction.READ),
  ACCOUNT_UPDATE: buildPermission(ModuleSlug.ACCOUNT, PermissionAction.UPDATE, PermissionScope.OWN),
  ACCOUNT_DELETE: buildPermission(ModuleSlug.ACCOUNT, PermissionAction.DELETE, PermissionScope.OWN),
  ACCOUNT_UPGRADE: buildPermission(ModuleSlug.ACCOUNT, PermissionAction.UPGRADE),
  
  // ============ TEAM MANAGEMENT MODULE PERMISSIONS ============
  TEAM_VIEW: buildPermission(ModuleSlug.TEAM_MANAGEMENT, PermissionAction.READ),
  TEAM_INVITE: buildPermission(ModuleSlug.TEAM_MANAGEMENT, PermissionAction.INVITE),
  TEAM_REMOVE_MEMBER: buildPermission(ModuleSlug.TEAM_MANAGEMENT, PermissionAction.REMOVE),
  TEAM_UPDATE_ROLE: `${ModuleSlug.TEAM_MANAGEMENT}.update-role`,
  TEAM_UPDATE_SETTINGS: `${ModuleSlug.TEAM_MANAGEMENT}.update-settings`,
  
  // ============ TRAINING DATA PERMISSIONS (AI/ML) ============
  /** Access to training datasets for AI/ML model training */
  TRAINING_DATA_ACCESS: buildPermission(ModuleSlug.TRAINING_DATA, PermissionAction.ACCESS),
  
  /** Export training data as files (CSV, JSON, Parquet) */
  TRAINING_DATA_EXPORT: buildPermission(ModuleSlug.TRAINING_DATA, PermissionAction.EXPORT),
  
  // ============ CATEGORY MANAGEMENT PERMISSIONS ============
  /** View categories */
  CATEGORIES_VIEW: buildPermission(ModuleSlug.CATEGORIES, PermissionAction.READ),
  
  /** Create new categories */
  CATEGORIES_CREATE: buildPermission(ModuleSlug.CATEGORIES, PermissionAction.CREATE),
  
  /** Update existing categories */
  CATEGORIES_UPDATE: buildPermission(ModuleSlug.CATEGORIES, PermissionAction.UPDATE),
  
  /** Delete categories */
  CATEGORIES_DELETE: buildPermission(ModuleSlug.CATEGORIES, PermissionAction.DELETE),
  
  /** Manage category hierarchy and relationships */
  CATEGORIES_MANAGE: buildPermission(ModuleSlug.CATEGORIES, PermissionAction.MANAGE),
  
  // ============ SYSTEM PERMISSIONS ============
  
  // User Management
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_ASSIGN: 'role.assign',
  ROLE_VIEW: 'role.view',
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_SUSPEND: 'user.suspend',
  
  // Module Management
  MODULE_RULES_MANAGE: 'module.rules.manage',
  MODULE_ENABLE: 'module.enable',
  MODULE_DISABLE: 'module.disable',
  MODULE_VIEW: 'module.view',
  MODULE_CREATE: 'module.create',
  MODULE_UPDATE: 'module.update',
  MODULE_DELETE: 'module.delete',
  
  // System Settings
  SYSTEM_SETTINGS_MANAGE: 'system-settings.manage',
  SYSTEM_SETTINGS_VIEW: 'system-settings.view',
  SYSTEM_SETTINGS_UPDATE: 'system-settings.update',
  
  // Registry (admin view)
  LISTINGS_READ: 'listings.read',
  LISTINGS_MODERATE: 'listings.moderate',
  LISTINGS_DELETE: 'listings.delete',
  LISTINGS_UPDATE: 'listings.update',
  
  // Subscription
  SUBSCRIPTION_BYPASS: 'subscription.bypass',
  SUBSCRIPTION_MANAGE: 'subscription.manage',
  SUBSCRIPTION_VIEW: 'subscription.view',
  
  // Account Management
  ACCOUNT_MANAGE: 'account.manage',
  ACCOUNT_SUSPEND: 'account.suspend',
  
  // Audit & Logs
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

/**
 * Helper to check if a permission exists
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permissions).includes(permission as Permission);
}

/**
 * Get all permissions for a specific module
 */
export function getModulePermissions(moduleSlug: ModuleSlug): Permission[] {
  return Object.values(Permissions).filter(permission => 
    permission.startsWith(moduleSlug) || permission === '*'
  );
}

/**
 * Get all modules
 */
export const ALL_MODULES = Object.values(ModuleSlug);

/**
 * Check if a permission is a wildcard (super admin)
 */
export function isWildcardPermission(permission: Permission): boolean {
  return permission === Permissions.SUPER_ADMIN;
}

/**
 * Get permission scope (OWN or ANY) from a permission string
 */
export function getPermissionScope(permission: string): PermissionScope | null {
  if (permission.endsWith('.own')) return PermissionScope.OWN;
  if (permission.endsWith('.any')) return PermissionScope.ANY;
  return null;
}

/**
 * Get permission action from a permission string
 */
export function getPermissionAction(permission: string): PermissionAction | null {
  const parts = permission.split('.');
  if (parts.length >= 2) {
    const action = parts[1] as PermissionAction;
    if (Object.values(PermissionAction).includes(action)) {
      return action;
    }
  }
  return null;
}

/**
 * Get module slug from a permission string
 */
export function getModuleFromPermission(permission: string): ModuleSlug | null {
  const moduleSlug = permission.split('.')[0] as ModuleSlug;
  if (Object.values(ModuleSlug).includes(moduleSlug)) {
    return moduleSlug;
  }
  return null;
}