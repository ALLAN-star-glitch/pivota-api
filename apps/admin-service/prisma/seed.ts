// prisma/seed-rbac.js
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.ADMIN_SERVICE_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding PivotaConnect RBAC — subscription-aware, module-based');

  // ---------- 1) ROLES ----------
  const roles = [
    { name: 'Root Guardian', description: 'Full system access', scope: 'SYSTEM', type: 'RootGuardian', status: 'Active', immutable: true },
    { name: 'System Admin', description: 'System administrative tasks', scope: 'SYSTEM', type: 'SystemAdmin', status: 'Active', immutable: true },
    { name: 'Content ManagerAdmin', description: 'Platform-wide content moderation', scope: 'SYSTEM', type: 'ContentManagerAdmin', status: 'Active', immutable: true },
    { name: 'Compliance Admin', description: 'KYC and verification', scope: 'SYSTEM', type: 'ComplianceAdmin', status: 'Active', immutable: true },
    { name: 'Fraud Admin', description: 'Fraud monitoring and actions', scope: 'SYSTEM', type: 'FraudAdmin', status: 'Active', immutable: true },
    { name: 'Analytics Admin', description: 'Access analytics & metrics', scope: 'SYSTEM', type: 'AnalyticsAdmin', status: 'Active', immutable: true },
    { name: 'Category Manager', description: 'Manage modules', scope: 'SYSTEM', type: 'CategoryManager', status: 'Active', immutable: true },

    // Business roles
    { name: 'Business System Admin', description: 'Primary client admin', scope: 'BUSINESS', type: 'BusinessSystemAdmin', status: 'Active', immutable: false },
    { name: 'Business Content Manager', description: 'Module-scoped moderator', scope: 'BUSINESS', type: 'BusinessContentManager', status: 'Active', immutable: false },

    // General
    { name: 'GeneralUser', description: 'Default free-tier user', scope: 'GENERAL', type: 'GeneralUser', status: 'Active', immutable: false },
  ];

  await prisma.role.createMany({ data: roles, skipDuplicates: true });
  const dbRoles = await prisma.role.findMany();
  console.log(`✅ Roles seeded: ${dbRoles.length}`);

  // ---------- 2) MODULES ----------
  const modules = [
    { slug: 'housing', name: 'Housing', description: 'Housing listings & rentals' },
    { slug: 'jobs', name: 'Jobs', description: 'Job listings & hiring' },
    { slug: 'health', name: 'Health', description: 'Health providers & facilities' },
    { slug: 'education', name: 'Education', description: 'Courses & tutors' },
    { slug: 'legal', name: 'Legal', description: 'Legal services' },
    { slug: 'automotive', name: 'Automotive', description: 'Vehicle sales & services' },
    { slug: 'marketplace', name: 'Marketplace', description: 'General product listings' },

    // Internal system modules
    { slug: 'dashboard', name: 'Dashboard', system: true },
    { slug: 'user-management', name: 'User Management', system: true },
    { slug: 'analytics', name: 'Analytics', system: true },
    { slug: 'compliance', name: 'Compliance', system: true },
    { slug: 'fraud', name: 'Fraud Monitoring', system: true },
    { slug: 'system-settings', name: 'System Settings', system: true },
    { slug: 'category-management', name: 'Category Management', system: true },
  ];

  await prisma.module.createMany({ data: modules, skipDuplicates: true });
  const dbModules = await prisma.module.findMany();
  console.log(`✅ Modules seeded: ${dbModules.length}`);

  const getModule = (slug: string) => dbModules.find(m => m.slug === slug);

  // ---------- 3) PERMISSIONS ----------
  const systemPermissions = [
    { action: 'role.create', name: 'Create Role', description: 'Create roles', moduleSlug: 'user-management' },
    { action: 'role.update', name: 'Update Role', description: 'Update roles', moduleSlug: 'user-management' },
    { action: 'role.delete', name: 'Delete Role', description: 'Delete roles', moduleSlug: 'user-management' },
    { action: 'role.assign', name: 'Assign Role', description: 'Assign roles', moduleSlug: 'user-management' },

    { action: 'user.view', name: 'View User', description: 'View user details', moduleSlug: 'user-management' },
    { action: 'user.suspend', name: 'Suspend User', description: 'Suspend user', moduleSlug: 'user-management' },

    { action: 'category.create', name: 'Create Module', description: 'Create modules', moduleSlug: 'category-management' },
    { action: 'category.update', name: 'Update Module', description: 'Update modules', moduleSlug: 'category-management' },
    { action: 'category.rules.manage', name: 'Manage Module Rules', description: 'Manage module rules', moduleSlug: 'category-management' },

    { action: 'system.manage-settings', name: 'Manage System Settings', description: 'Manage settings', moduleSlug: 'system-settings' },
    { action: 'analytics.view', name: 'View Analytics', description: 'View analytics', moduleSlug: 'analytics' },
    { action: 'audit.view', name: 'View Audit Logs', description: 'View audit logs', moduleSlug: 'dashboard' },
  ];

  const businessModuleActions = ['create', 'read', 'update', 'delete', 'approve', 'moderate'];
  const businessModuleSlugs = ['housing', 'jobs', 'health', 'education', 'legal', 'automotive', 'marketplace'];

  const businessModulePermissions = [];
  for (const slug of businessModuleSlugs) {
    for (const act of businessModuleActions) {
      const humanName = `${act.charAt(0).toUpperCase() + act.slice(1)} ${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
      businessModulePermissions.push({
        action: `${slug}.${act}`,
        name: humanName,
        description: `${act.toUpperCase()} ${slug}`,
        moduleSlug: slug,
      });
    }
  }

  const allPermissionsRaw = [...systemPermissions, ...businessModulePermissions];
  const permissionData = allPermissionsRaw.map(p => {
    const mod = getModule(p.moduleSlug);
    return {
      name: p.name,
      action: p.action,
      description: p.description,
      moduleId: mod?.id ?? null,
      system: !!mod?.system,
    };
  });

  await prisma.permission.createMany({ data: permissionData, skipDuplicates: true });
  const dbPermissions = await prisma.permission.findMany();
  console.log(`✅ Permissions seeded: ${dbPermissions.length}`);

  // ---------- 4) PLANS ----------
  const plans = [
    { name: 'Free', description: 'Free plan — limited posting' },
    { name: 'Starter', description: 'Starter — basic modules + small limits' },
    { name: 'Pro', description: 'Pro — advanced modules + higher limits' },
    { name: 'Enterprise', description: 'All modules + high limits' },
  ];

  await prisma.plan.createMany({ data: plans, skipDuplicates: true });
  const dbPlans = await prisma.plan.findMany();
  console.log(`✅ Plans seeded: ${dbPlans.length}`);

  // ---------- 5) PLAN → MODULE LIMITS ----------
  const planModuleConfig = [
    {
      planName: 'Free',
      modules: [
        { slug: 'housing', listingLimit: 1 },
        { slug: 'jobs', listingLimit: 1 },
        { slug: 'marketplace', listingLimit: 2 },
      ],
    },
    {
      planName: 'Starter',
      modules: [
        { slug: 'housing', listingLimit: 10 },
        { slug: 'jobs', listingLimit: 5 },
      ],
    },
    {
      planName: 'Pro',
      modules: [
        { slug: 'housing', listingLimit: 50 },
        { slug: 'jobs', listingLimit: 20 },
        { slug: 'health', listingLimit: 30 },
        { slug: 'marketplace', listingLimit: 200 },
      ],
    },
    {
      planName: 'Enterprise',
      modules: businessModuleSlugs.map(slug => ({ slug, listingLimit: 1000 })),
    },
  ];

  for (const cfg of planModuleConfig) {
    const plan = dbPlans.find(p => p.name === cfg.planName);
    if (!plan) continue;

    for (const modCfg of cfg.modules) {
      const mod = getModule(modCfg.slug);
      if (!mod) continue;

      await prisma.planModule.upsert({
        where: { planId_moduleId: { planId: plan.id, moduleId: mod.id } },
        update: { listingLimit: modCfg.listingLimit },
        create: { planId: plan.id, moduleId: mod.id, listingLimit: modCfg.listingLimit },
      });
    }
  }
  console.log('✅ Plan module limits seeded');

  // ---------- 6) SYSTEM ROLE → PERMISSIONS ----------
  const sysRolePermMapping = {
    RootGuardian: dbPermissions.map(p => p.action),
    SystemAdmin: ['role.create', 'role.update', 'role.assign', 'user.view', 'user.suspend', 'system.manage-settings'],
    ContentManagerAdmin: dbPermissions.filter(p => p.action.includes('moderate') || p.action.includes('approve')).map(p => p.action),
    ComplianceAdmin: ['user.view', 'user.suspend', 'audit.view'],
    FraudAdmin: ['audit.view', 'user.suspend'],
    AnalyticsAdmin: ['analytics.view'],
    CategoryManager: ['category.create','category.update','category.rules.manage'],
  };

  for (const [roleName, actions] of Object.entries(sysRolePermMapping)) {
    const role = dbRoles.find(r => r.name === roleName);
    if (!role) continue;

    const assignPerms = dbPermissions.filter(p => actions.includes(p.action));
    for (const perm of assignPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log('✅ System role permissions assigned');

  // ---------- 7) BUSINESS ROLE MODULE TEMPLATE ----------
  const businessRoles = {
    BSA: dbRoles.find(r => r.name === 'BusinessSystemAdmin'),
    BCM: dbRoles.find(r => r.name === 'BusinessContentManager'),
  };

  for (const slug of businessModuleSlugs) {
    const mod = getModule(slug);
    if (!mod) continue;

    if (businessRoles.BSA) {
      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: businessRoles.BSA.id, moduleId: mod.id } },
        update: { assignable: true },
        create: { roleId: businessRoles.BSA.id, moduleId: mod.id, assignable: true },
      });
    }

    if (businessRoles.BCM) {
      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: businessRoles.BCM.id, moduleId: mod.id } },
        update: { assignable: true },
        create: { roleId: businessRoles.BCM.id, moduleId: mod.id, assignable: true },
      });
    }
  }

  console.log('✅ Business role module templates seeded');

  // ---------- 8) SAMPLE SUBSCRIPTIONS ----------
  const sampleUsers = ['user-uuid-1', 'user-uuid-2', 'user-uuid-3'];
  for (const userUuid of sampleUsers) {
    await prisma.subscription.upsert({
      where: { userUuid },
      update: {},
      create: {
        userUuid,
        plan: 'Free',
        premium: false,
        status: 'Active',
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
      },
    });
  }
  console.log('✅ Sample subscriptions seeded');

  console.log('🌱 PivotaConnect RBAC seeding complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
