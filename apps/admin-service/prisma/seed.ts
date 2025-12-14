// -----------------------------------------------------
// PivotaConnect RBAC Seeding — Updated to use `houses`
// No plans or module rules seeding
// -----------------------------------------------------
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.ADMIN_SERVICE_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding PivotaConnect RBAC — system + business modules (MVP1)');

  // ---------- 1) ROLES ----------
  const roles = [
    { name: 'Super Admin', description: 'Full system access', scope: 'SYSTEM', roleType: 'SuperAdmin', status: 'Active', immutable: true },
    { name: 'System Admin', description: 'System administrative tasks', scope: 'SYSTEM', roleType: 'SystemAdmin', status: 'Active', immutable: true },
    { name: 'Compliance Admin', description: 'KYC & verification', scope: 'SYSTEM', roleType: 'ComplianceAdmin', status: 'Active', immutable: true },
    { name: 'Analytics Admin', description: 'View analytics & metrics', scope: 'SYSTEM', roleType: 'AnalyticsAdmin', status: 'Active', immutable: true },
    { name: 'Module Manager', description: 'Manage modules & rules', scope: 'SYSTEM', roleType: 'ModuleManager', status: 'Active', immutable: true },
    { name: 'Business System Admin', description: 'Primary client admin', scope: 'BUSINESS', roleType: 'BusinessSystemAdmin', status: 'Active', immutable: false },
    { name: 'Business Content Manager', description: 'Module-scoped moderator', scope: 'BUSINESS', roleType: 'BusinessContentManager', status: 'Active', immutable: false },
    { name: 'General User', description: 'Default user', scope: 'BUSINESS', roleType: 'GeneralUser', status: 'Active', immutable: false },
  ];

  await prisma.role.createMany({ data: roles, skipDuplicates: true });
  const dbRoles = await prisma.role.findMany();
  console.log(`Roles seeded: ${dbRoles.length}`);

  // ---------- 2) MODULES ----------
  const modules = [
    { slug: 'houses', name: 'Houses', description: 'Housing & rentals' },
    { slug: 'jobs', name: 'Jobs', description: 'Job listings & hiring' },
    { slug: 'social-support', name: 'Social Support', description: 'Community & social aid services' },
    { slug: 'dashboard', name: 'Dashboard', system: true },
    { slug: 'user-management', name: 'User Management', system: true },
    { slug: 'analytics', name: 'Analytics', system: true },
    { slug: 'system-settings', name: 'System Settings', system: true },
    { slug: 'module-management', name: 'Module Management', system: true },
  ];

  await prisma.module.createMany({ data: modules, skipDuplicates: true });
  const dbModules = await prisma.module.findMany();
  console.log(`Modules seeded: ${dbModules.length}`);

  const getModule = (slug: string) => dbModules.find(m => m.slug === slug);

  // ---------- 3) PERMISSIONS ----------
  const systemPermissions = [
    { action: 'role.create', name: 'Create Role', description: 'Create roles', moduleSlug: 'user-management' },
    { action: 'role.update', name: 'Update Role', description: 'Update roles', moduleSlug: 'user-management' },
    { action: 'role.assign', name: 'Assign Role', description: 'Assign roles', moduleSlug: 'user-management' },
    { action: 'user.view', name: 'View User', description: 'View users', moduleSlug: 'user-management' },
    { action: 'analytics.view', name: 'View Analytics', description: 'View analytics', moduleSlug: 'analytics' },
    { action: 'module.rules.manage', name: 'Manage Rules', description: 'Manage module rules', moduleSlug: 'module-management' },
    { action: 'system-settings.manage', name: 'Manage System Settings', description: 'Manage system-wide settings', moduleSlug: 'system-settings' },
  ];

  const businessModuleSlugs = ['houses', 'jobs', 'social-support'];
  const businessModuleActions = ['create', 'read', 'update', 'delete', 'approve', 'moderate'];
  const businessModulePermissions = [];

  for (const slug of businessModuleSlugs) {
    for (const act of businessModuleActions) {
      businessModulePermissions.push({
        action: `${slug}.${act}`,
        name: `${act.charAt(0).toUpperCase() + act.slice(1)} ${slug}`,
        description: `${act.toUpperCase()} ${slug}`,
        moduleSlug: slug,
      });
    }
  }

  // Listing-specific permissions
  const listingActions = ['view', 'create', 'update', 'delete'];
  const listingPermissions = [];
  for (const slug of businessModuleSlugs) {
    for (const act of listingActions) {
      listingPermissions.push({
        action: `listings.${slug}.${act}`,
        name: `${act.toUpperCase()} ${slug} Listing`,
        description: `${act.toUpperCase()} listing for ${slug}`,
        moduleSlug: slug,
      });
    }
  }
  // Global listing controls
  for (const act of listingActions) {
    listingPermissions.push({
      action: `listings.${act}`,
      name: `${act.toUpperCase()} Listings`,
      description: `${act.toUpperCase()} all listings`,
      moduleSlug: null,
    });
  }

  const permissionData = [...systemPermissions, ...businessModulePermissions, ...listingPermissions].map(p => {
    const mod = p.moduleSlug ? getModule(p.moduleSlug) : null;
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
  console.log(`Permissions seeded: ${dbPermissions.length}`);

  // ---------- 4) SYSTEM ROLE PERMISSIONS ----------
  const sysRolePermMapping = {
    SuperAdmin: dbPermissions.map(p => p.action),
    SystemAdmin: ['role.create','role.update','role.assign','user.view','system-settings.manage'],
    ModuleManager: ['module.rules.manage'],
    AnalyticsAdmin: ['analytics.view'],
    ComplianceAdmin: ['user.view'],
  };

  for (const [roleType, actions] of Object.entries(sysRolePermMapping)) {
    const role = dbRoles.find(r => r.roleType === roleType);
    if (!role) continue;

    const assignPerms = dbPermissions.filter(p => actions.includes(p.action));
    console.log(`Assigning permissions for role ${roleType}:`, assignPerms.map(p => p.action));

    for (const perm of assignPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log('✅ System role permissions assigned');

  // ---------- 5) ROLE → MODULES ----------
  const roleModuleConfig = [
    { roleType: 'SuperAdmin', moduleSlugs: dbModules.map(m => m.slug), assignable: false },
    { roleType: 'SystemAdmin', moduleSlugs: ['user-management', 'system-settings', 'analytics', 'module-management'], assignable: false },
    { roleType: 'ModuleManager', moduleSlugs: ['module-management'], assignable: true },
    { roleType: 'AnalyticsAdmin', moduleSlugs: ['analytics'], assignable: false },
    { roleType: 'ComplianceAdmin', moduleSlugs: ['user-management'], assignable: false },
    { roleType: 'BusinessSystemAdmin', moduleSlugs: ['houses', 'jobs', 'social-support'], assignable: true },
    { roleType: 'BusinessContentManager', moduleSlugs: ['houses', 'jobs', 'social-support'], assignable: true },
  ];

  for (const cfg of roleModuleConfig) {
    const role = dbRoles.find(r => r.roleType === cfg.roleType);
    if (!role) continue;

    for (const slug of cfg.moduleSlugs) {
      const mod = getModule(slug);
      if (!mod) continue;

      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: role.id, moduleId: mod.id } },
        update: { assignable: cfg.assignable },
        create: { roleId: role.id, moduleId: mod.id, assignable: cfg.assignable },
      });
    }
  }

  console.log('✅ RoleModule assignments seeded');
  console.log('🌱 PivotaConnect RBAC seeding complete (no plans or module rules)');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
