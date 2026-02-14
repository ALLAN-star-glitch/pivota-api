// -----------------------------------------------------
// PivotaConnect RBAC Seeding — Production Grade (Standardized)
// Includes Organization Membership Logic
// -----------------------------------------------------
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { plans } from './plans.config.js';

const adapter = new PrismaPg({ connectionString: process.env.ADMIN_SERVICE_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const startTime = Date.now();
  console.log('\n🚀 Starting Production-Grade RBAC Seed Process...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ---------- 1) CLEANUP ----------
  const activeModuleSlugs = [
    'houses', 'jobs', 'help-and-support', 'services',
    'dashboard', 'user-management', 'analytics',
    'system-settings', 'module-management'
  ];

  const deletedModules = await prisma.module.deleteMany({
    where: { slug: { notIn: activeModuleSlugs } }
  });
  if (deletedModules.count > 0) {
    console.log(`🧹 Cleaned up ${deletedModules.count} legacy modules via Cascade.`);
  }

  // ---------- 2) ROLES ----------
  console.log('👤 Seeding Roles...');
  const roles = [
    // SYSTEM ROLES (Supersets of Business Roles)
    { name: 'Super Admin', description: 'Full system access', scope: 'SYSTEM', roleType: 'SuperAdmin', status: 'Active', immutable: true },
    { name: 'System Admin', description: 'Full system & org admin privileges', scope: 'SYSTEM', roleType: 'SystemAdmin', status: 'Active', immutable: true },
    { name: 'Compliance Admin', description: 'KYC & verification', scope: 'SYSTEM', roleType: 'ComplianceAdmin', status: 'Active', immutable: true },
    { name: 'Analytics Admin', description: 'View analytics & metrics', scope: 'SYSTEM', roleType: 'AnalyticsAdmin', status: 'Active', immutable: true },
    { name: 'Module Manager', description: 'Manage modules & rules', scope: 'SYSTEM', roleType: 'ModuleManager', status: 'Active', immutable: true },

    // ORGANIZATION ROLES
    { name: 'Business System Admin', description: 'Primary org admin; invite members & manage all content', scope: 'BUSINESS', roleType: 'BusinessSystemAdmin', status: 'Active', immutable: false },
    { name: 'Business Content Manager', description: 'Org content-focused admin; invite members; moderate content', scope: 'BUSINESS', roleType: 'BusinessContentManager', status: 'Active', immutable: false },
    { name: 'General User', description: 'Default org member', scope: 'BUSINESS', roleType: 'GeneralUser', status: 'Active', immutable: false },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { roleType: role.roleType },
      update: { name: role.name, description: role.description, scope: role.scope },
      create: role,
    });
  }

  const dbRoles = await prisma.role.findMany();

  // ---------- 3) MODULES ----------
  console.log('\n📦 Seeding Modules...');
  const modules = [
    { slug: 'houses', name: 'Houses', description: 'Housing & rentals' },
    { slug: 'jobs', name: 'Jobs', description: 'Job listings & hiring' },
    { slug: 'help-and-support', name: 'Help and Support', description: 'Community & social aid services' },
    { slug: 'services', name: 'Contractor Services', description: 'Professional service offerings & SmartMatch' },
    { slug: 'dashboard', name: 'Dashboard', system: true },
    { slug: 'user-management', name: 'User Management', system: true },
    { slug: 'analytics', name: 'Analytics', system: true },
    { slug: 'system-settings', name: 'System Settings', system: true },
    { slug: 'module-management', name: 'Module Management', system: true },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { slug: mod.slug },
      update: { name: mod.name, description: mod.description, system: !!mod.system },
      create: { ...mod, system: !!mod.system },
    });
  }

  const dbModules = await prisma.module.findMany();
  const getModule = (slug: string) => dbModules.find(m => m.slug === slug);

  // ---------- 4) PERMISSIONS ----------
  console.log('\n🔐 Generating Permissions Registry...');
  const systemPermissions = [
    { action: 'role.create', moduleSlug: 'user-management' },
    { action: 'role.update', moduleSlug: 'user-management' },
    { action: 'role.assign', moduleSlug: 'user-management' },
    { action: 'user.view', moduleSlug: 'user-management' },
    { action: 'analytics.view', moduleSlug: 'analytics' },
    { action: 'module.rules.manage', moduleSlug: 'module-management' },
    { action: 'system-settings.manage', moduleSlug: 'system-settings' },
    { action: 'subscription.bypass', moduleSlug: 'dashboard' },
    { action: 'organization.invite-member', moduleSlug: 'user-management' }, // Distinguish between system vs content managers
  ];

  const businessModuleSlugs = ['houses', 'jobs', 'help-and-support', 'services'];
  const permissionData = [...systemPermissions];

  for (const slug of businessModuleSlugs) {
    ['read', 'approve', 'moderate'].forEach(act => {
      permissionData.push({ action: `${slug}.${act}`, moduleSlug: slug });
    });
    ['create', 'update', 'delete'].forEach(act => {
      permissionData.push({ action: `${slug}.${act}.own`, moduleSlug: slug });
      permissionData.push({ action: `${slug}.${act}.any`, moduleSlug: slug });
    });
  }

  for (const p of permissionData) {
    const mod = getModule(p.moduleSlug);
    await prisma.permission.upsert({
      where: { action: p.action },
      update: { moduleId: mod?.id, system: !!mod?.system },
      create: { 
        action: p.action, 
        name: p.action.replace(/\./g, ' '), 
        moduleId: mod?.id, 
        system: !!mod?.system 
      },
    });
  }

  const dbPermissions = await prisma.permission.findMany();

  // ---------- 5) ROLE → PERMISSION MAPPING ----------
  console.log('\n🔗 Mapping Role Permissions (System Supersets & Org Logic)...');
  const roleMapping: Record<string, string[]> = {
    SuperAdmin: dbPermissions.map(p => p.action),
    SystemAdmin: dbPermissions.filter(p => p.action !== 'subscription.bypass').map(p => p.action),
    ModuleManager: ['module.rules.manage','houses.read','jobs.read','help-and-support.read','services.read'],
    AnalyticsAdmin: ['analytics.view','houses.read','jobs.read','help-and-support.read','services.read'],
    ComplianceAdmin: ['user.view','houses.read','jobs.read','help-and-support.read','services.read'],

    BusinessSystemAdmin: [
      ...['houses','jobs','help-and-support','services'].flatMap(slug => [
        `${slug}.read`, `${slug}.create.any`, `${slug}.update.any`, `${slug}.delete.any`,
        `${slug}.approve`, `${slug}.moderate`
      ]),
      'role.assign','role.create','user.view','analytics.view','organization.invite-member'
    ],
    BusinessContentManager: [
      ...['houses','jobs','help-and-support'].flatMap(slug => [
        `${slug}.read`, `${slug}.create.own`, `${slug}.update.own`, `${slug}.delete.own`,
        `${slug}.approve`, `${slug}.moderate`
      ]),
      'services.read','services.update.own','services.moderate',
      'analytics.view','organization.invite-member'
    ],
    GeneralUser: [
      ...['houses','jobs','help-and-support','services'].flatMap(slug => [
        `${slug}.read`, `${slug}.create.own`
      ]),
      'analytics.view'
    ],
  };

  for (const [roleType, actions] of Object.entries(roleMapping)) {
    const role = dbRoles.find(r => r.roleType === roleType);
    if (!role) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permsToAssign = dbPermissions.filter(p => actions.includes(p.action));
    await prisma.rolePermission.createMany({
      data: permsToAssign.map(p => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true
    });
    console.log(`   - ${roleType.padEnd(22)}: ${permsToAssign.length} permissions mapped`);
  }

  // ---------- 6) ROLE MODULE VISIBILITY ----------
  console.log('\n🗺️ Mapping Role Module Visibility...');
  const roleModuleConfig = [
    { roleType: 'SuperAdmin', slugs: dbModules.map(m => m.slug), assignable: false },
    { roleType: 'SystemAdmin', slugs: dbModules.map(m => m.slug), assignable: false },
    { roleType: 'BusinessSystemAdmin', slugs: ['houses','jobs','help-and-support','services','dashboard'], assignable: true },
    { roleType: 'BusinessContentManager', slugs: ['houses','jobs','help-and-support','services','dashboard'], assignable: true },
    { roleType: 'GeneralUser', slugs: ['houses','jobs','help-and-support','services','dashboard'], assignable: false },
  ];

  for (const cfg of roleModuleConfig) {
    const role = dbRoles.find(r => r.roleType === cfg.roleType);
    if (!role) continue;
    for (const slug of cfg.slugs) {
      const mod = getModule(slug);
      if (!mod) continue;
      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: role.id, moduleId: mod.id } },
        update: { assignable: cfg.assignable },
        create: { roleId: role.id, moduleId: mod.id, assignable: cfg.assignable },
      });
    }
  }

  // ---------- 7) PLANS & PLAN MODULES ----------
  console.log('\n💳 Seeding Plans & Module Restrictions...');
  for (const plan of plans) {
    const { modules: planModulesData, ...dbPlanFields } = plan;

    const createdPlan = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        isPremium: plan.isPremium,
        totalListings: plan.totalListings,
        features: JSON.stringify(plan.features),
      },
      create: {
        ...dbPlanFields,
        creatorId: 'system',
        features: JSON.stringify(plan.features),
      },
    });

    console.log(`   ➔ Plan: ${plan.name.padEnd(15)} | Listings: ${plan.totalListings}`);

    for (const mod of planModulesData) {
      const dbMod = getModule(mod.slug);
      if (!dbMod) continue;

      await prisma.planModule.upsert({
        where: { planId_moduleId: { planId: createdPlan.id, moduleId: dbMod.id } },
        update: { restrictions: JSON.stringify(mod.restrictions) },
        create: { planId: createdPlan.id, moduleId: dbMod.id, restrictions: JSON.stringify(mod.restrictions) },
      });

      const duration = mod.restrictions.listingDurationDays ?? '∞';
      console.log(`      └─ ${mod.slug.padEnd(18)} | Duration: ${duration} days`);
    }
  }

  const durationTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Production-grade RBAC Seed Completed in ${durationTime}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(err => { console.error('\n❌ SEED ERROR:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
