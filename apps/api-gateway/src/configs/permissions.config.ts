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
    'system-settings.manage',
    'subscription.bypass'
  ],

  ModuleManager: [
    'module.rules.manage',
    'houses.read', 'jobs.read', 'help-and-support.read', 'services.read'
  ],

  AnalyticsAdmin: [
    'analytics.view',
    'houses.read', 'jobs.read', 'help-and-support.read', 'services.read'
  ],

  ComplianceAdmin: [
    'user.view',
    'houses.read', 'jobs.read', 'help-and-support.read', 'services.read'
  ],

  /**
   * BUSINESS/ORGANIZATION ROLES
   */
  BusinessSystemAdmin: [
    // Houses
    'houses.read',
    'houses.create.any', 'houses.update.any', 'houses.delete.any',
    'houses.approve', 'houses.moderate',

    // Jobs
    'jobs.read',
    'jobs.create.any', 'jobs.update.any', 'jobs.delete.any',
    'jobs.approve', 'jobs.moderate',

    // Help & Support
    'help-and-support.read',
    'help-and-support.create.any', 'help-and-support.update.any', 'help-and-support.delete.any',
    'help-and-support.approve', 'help-and-support.moderate',

    // Services (Contractors)
    'services.read',
    'services.create.any', 'services.update.any', 'services.delete.any',
    'services.approve', 'services.moderate',

    // Management & Organization
    'role.assign', 'role.create', 'user.view', 'analytics.view',
    'subscription.bypass',
    'organization.invite-member'
  ],

  BusinessContentManager: [
    // Houses
    'houses.read',
    'houses.create.own', 'houses.update.own', 'houses.delete.own',
    'houses.approve', 'houses.moderate',

    // Jobs
    'jobs.read',
    'jobs.create.own', 'jobs.update.own', 'jobs.delete.own',
    'jobs.approve', 'jobs.moderate',

    // Help & Support
    'help-and-support.read',
    'help-and-support.create.own', 'help-and-support.update.own', 'help-and-support.delete.own',
    'help-and-support.approve', 'help-and-support.moderate',

    // Services (Contractors)
    'services.read', 'services.update.own', 'services.moderate',

    // Analytics & Org Invite
    'analytics.view',
    'organization.invite-member'
  ],

  /**
   * INDIVIDUAL/CLIENT ROLES
   */
  GeneralUser: [
    // Houses
    'houses.read', 'houses.create.own',

    // Jobs
    'jobs.read', 'jobs.create.own',

    // Help & Support
    'help-and-support.read', 'help-and-support.create.own',

    // Services (Contractors)
    'services.read', 'services.create.own',

    // Analytics
    'analytics.view'
  ],
};
