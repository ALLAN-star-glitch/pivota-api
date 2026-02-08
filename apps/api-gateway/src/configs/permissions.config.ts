// gateway/src/config/permissions.config.ts

export const RolePermissionsMap: Record<string, string[]> = {
  /**
   * FULL SYSTEM BYPASS
   */
  SuperAdmin: ['*'],

  /**
   * SYSTEM LEVEL ROLES
   */
  SystemAdmin: [
    'role.create', 
    'role.update', 
    'role.assign', 
    'user.view', 
    'system-settings.manage'
  ],
  ModuleManager: [
    'module.rules.manage'
  ],
  AnalyticsAdmin: [
    'analytics.view'
  ],
  ComplianceAdmin: [
    'user.view'
  ],

  /**
   * BUSINESS/ORGANIZATION ROLES
   */
  BusinessSystemAdmin: [
    // Houses
    'houses.read', 'houses.create', 'houses.update', 'houses.delete', 'houses.approve', 'houses.moderate',
    // Jobs
    'jobs.read', 'jobs.create', 'jobs.update', 'jobs.delete', 'jobs.approve', 'jobs.moderate',
    // Help & Support
    'help-and-support.read', 'help-and-support.create', 'help-and-support.update', 'help-and-support.delete',
    // Management
    'role.assign', 'role.create', 'user.view', 'analytics.view'
  ],

  BusinessContentManager: [
    // Houses
    'houses.read', 'houses.create', 'houses.update', 'houses.delete', 'houses.approve', 'houses.moderate',
    // Jobs
    'jobs.read', 'jobs.create', 'jobs.update', 'jobs.delete', 'jobs.approve', 'jobs.moderate',
    // Help & Support
    'help-and-support.read', 'help-and-support.create', 'help-and-support.update', 'help-and-support.delete',
    // Analytics
    'analytics.view'
  ],

  /**
   * INDIVIDUAL/CLIENT ROLES
   */
  GeneralUser: [
    'houses.read', 
    'houses.create',
    'jobs.read', 
    'jobs.create',
    'help-and-support.read', 
    'help-and-support.create',
    'analytics.view'

  ],
};
