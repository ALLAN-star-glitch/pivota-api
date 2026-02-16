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
    'listings.read', // Added unified read for registry access
  ],

  ModuleManager: [
    'module.rules.manage',
    'houses.read', 'jobs.read', 'help-and-support.read', 'services.read',
    'listings.read' // Added unified read
  ],

  AnalyticsAdmin: [
    'analytics.view',
    'houses.read', 'jobs.read', 'help-and-support.read', 'services.read',
    'listings.read' // Added unified read
  ],

  ComplianceAdmin: [
    'user.view',
    'houses.read', 'houses.moderate', 'houses.approve',
    'jobs.read', 'jobs.moderate', 'jobs.approve',
    'help-and-support.read', 'help-and-support.moderate', 'help-and-support.approve',
    'services.read', 'services.moderate', 'services.approve',
    'listings.read' // Added unified read
  ],
  

  /**
   * BUSINESS/ORGANIZATION ROLES
   */
  BusinessSystemAdmin: [
    // Full CRUD + Lifecycle for all modules (Admin Override)
    ...['houses', 'jobs', 'help-and-support', 'services'].flatMap(slug => [
      `${slug}.read`,
      `${slug}.create.any`,
      `${slug}.update.any`,
      `${slug}.delete.any`,
      `${slug}.close.any`,
      `${slug}.archive.any`,
      `${slug}.approve`,
      `${slug}.moderate`,
      `${slug}.verify`
    ]),

    // Management & Organization
    'role.assign', 'role.create', 'user.view', 'analytics.view',
    'subscription.bypass',
    'organization.invite-member',
    'listings.read' // Added unified read
  ],

  BusinessContentManager: [
    // Ownership-based CRUD + Moderation
    ...['houses', 'jobs', 'help-and-support', 'services'].flatMap(slug => [
      `${slug}.read`,
      `${slug}.create.own`,
      `${slug}.update.own`,
      `${slug}.delete.own`,
      `${slug}.close.own`,
      `${slug}.archive.own`,
      `${slug}.moderate`
    ]),

    // Analytics & Org Invite
    'analytics.view',
    'organization.invite-member',
    'listings.read' // Added unified read
  ],

  /**
   * INDIVIDUAL/CLIENT ROLES
   */
  GeneralUser: [
    // Full Self-Service Lifecycle for own content
    ...['houses', 'jobs', 'help-and-support', 'services'].flatMap(slug => [
      `${slug}.read`,
      `${slug}.create.own`,
      `${slug}.update.own`,
      `${slug}.delete.own`,
      `${slug}.close.own`,
      `${slug}.archive.own`
    ]),

    // Analytics
    'analytics.view',
    'listings.read' // Added unified read
  ],
};