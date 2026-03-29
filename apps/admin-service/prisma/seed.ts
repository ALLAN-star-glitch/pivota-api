// -----------------------------------------------------
// PivotaConnect RBAC Seeding — Production Grade (Standardized)
// Using Shared Access Management Library
// -----------------------------------------------------
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { plans } from './plans.config.js';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { 
  ModuleSlug, 
  Permissions, 
  RolePermissionsMap, 
  RoleType,
  RoleMetadataMap,
  getRoleModules
} from '../../../libs/access-management/src/index';

const adapter = new PrismaPg({ connectionString: process.env.ADMIN_SERVICE_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const startTime = Date.now();
  console.log('\n🚀 Starting Production-Grade RBAC Seed Process...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ---------- 1) CLEANUP ----------
  const activeModuleSlugs = Object.values(ModuleSlug);

  const deletedModules = await prisma.module.deleteMany({
    where: { slug: { notIn: activeModuleSlugs } }
  });
  if (deletedModules.count > 0) {
    console.log(`🧹 Cleaned up ${deletedModules.count} legacy modules via Cascade.`);
  }

  // ---------- 2) ROLES (from RoleMetadataMap) ----------
  console.log('\n👤 Seeding Roles...');
  
  // Get roles directly from RoleMetadataMap - Single Source of Truth
  for (const [roleType, metadata] of Object.entries(RoleMetadataMap)) {
    await prisma.role.upsert({
      where: { roleType },
      update: {
        name: metadata.name,
        description: metadata.description,
        scope: metadata.scope,
      },
      create: {
        id: roleType, // Using roleType as ID for consistency
        roleType: roleType,
        name: metadata.name,
        description: metadata.description,
        scope: metadata.scope,
        status: 'Active',
        immutable: metadata.immutable,
      },
    });
  }

  const dbRoles = await prisma.role.findMany();
  console.log(`   ✓ ${dbRoles.length} roles seeded`);

  // ---------- 3) MODULES ----------
  console.log('\n📦 Seeding Modules...');
  
  const moduleDefinitions = [
    // Core modules
    { slug: ModuleSlug.DASHBOARD, name: 'Dashboard', description: 'User dashboard', system: false },
    { slug: ModuleSlug.REGISTRY, name: 'Registry', description: 'Unified listings view', system: false },
    { slug: ModuleSlug.ANALYTICS, name: 'Analytics', description: 'Platform analytics', system: false },
    
    // Business modules
    { slug: ModuleSlug.HOUSING, name: 'Housing', description: 'Housing & real estate listings', system: false },
    { slug: ModuleSlug.EMPLOYMENT, name: 'Employment', description: 'Job listings & hiring', system: false },
    { slug: ModuleSlug.SOCIAL_SUPPORT, name: 'Social Support', description: 'Community & social aid services', system: false },
    { slug: ModuleSlug.PROFESSIONAL_SERVICES, name: 'Professional Services', description: 'Bookable professional services', system: false },
    
    // Account & Team
    { slug: ModuleSlug.ACCOUNT, name: 'Account', description: 'Account management', system: false },
    { slug: ModuleSlug.TEAM_MANAGEMENT, name: 'Team Management', description: 'Team & member management', system: false },
    
    // System modules
    { slug: ModuleSlug.USER_MANAGEMENT, name: 'User Management', description: 'Platform-wide user administration', system: true },
    { slug: ModuleSlug.SYSTEM_SETTINGS, name: 'System Settings', description: 'Platform configuration', system: true },
    { slug: ModuleSlug.MODULE_MANAGEMENT, name: 'Module Management', description: 'Module configuration', system: true },
  ];

  for (const mod of moduleDefinitions) {
    await prisma.module.upsert({
      where: { slug: mod.slug },
      update: {
        name: mod.name,
        description: mod.description,
        system: mod.system,
      },
      create: {
        slug: mod.slug,
        name: mod.name,
        description: mod.description,
        system: mod.system,
      },
    });
  }

  const dbModules = await prisma.module.findMany();
  const getModule = (slug: string) => dbModules.find(m => m.slug === slug);
  console.log(`   ✓ ${dbModules.length} modules seeded`);

  // ---------- 4) PERMISSIONS ----------
  console.log('\n🔐 Generating Permissions Registry...');
  
  // Get all permissions from the shared config
  const allPermissions = Object.values(Permissions);
  let permissionCount = 0;
  
  // Create permission records
  for (const action of allPermissions) {
    if (action === '*') continue; // Skip wildcard permission
    
    // Determine module slug from permission action
    let moduleSlug: string | null = null;
    
    if (action.startsWith('dashboard')) moduleSlug = ModuleSlug.DASHBOARD;
    else if (action.startsWith('registry')) moduleSlug = ModuleSlug.REGISTRY;
    else if (action.startsWith('analytics')) moduleSlug = ModuleSlug.ANALYTICS;
    else if (action.startsWith('housing')) moduleSlug = ModuleSlug.HOUSING;
    else if (action.startsWith('employment')) moduleSlug = ModuleSlug.EMPLOYMENT;
    else if (action.startsWith('social-support')) moduleSlug = ModuleSlug.SOCIAL_SUPPORT;
    else if (action.startsWith('professional-services')) moduleSlug = ModuleSlug.PROFESSIONAL_SERVICES;
    else if (action.startsWith('account')) moduleSlug = ModuleSlug.ACCOUNT;
    else if (action.startsWith('team')) moduleSlug = ModuleSlug.TEAM_MANAGEMENT;
    else if (action.startsWith('user') || action.startsWith('role')) moduleSlug = ModuleSlug.USER_MANAGEMENT;
    else if (action.startsWith('module')) moduleSlug = ModuleSlug.MODULE_MANAGEMENT;
    else if (action.startsWith('system-settings')) moduleSlug = ModuleSlug.SYSTEM_SETTINGS;
    else if (action.startsWith('listings')) moduleSlug = ModuleSlug.REGISTRY;
    else if (action.startsWith('subscription')) moduleSlug = ModuleSlug.DASHBOARD;
    
    const mod = moduleSlug ? getModule(moduleSlug) : null;
    
    await prisma.permission.upsert({
      where: { action },
      update: {
        moduleId: mod?.id,
        system: mod?.system || false,
      },
      create: {
        id: action, // Using action as ID for consistency
        action,
        name: action.replace(/\./g, ' '),
        moduleId: mod?.id,
        system: mod?.system || false,
      },
    });
    permissionCount++;
  }
  
  const dbPermissions = await prisma.permission.findMany();
  console.log(`   ✓ ${permissionCount} permissions seeded`);

  // ---------- 5) ROLE → PERMISSION MAPPING ----------
  console.log('\n🔗 Mapping Role Permissions...');
  
  // Use the RolePermissionsMap from the shared config
  for (const [roleType, actions] of Object.entries(RolePermissionsMap)) {
    const role = dbRoles.find(r => r.roleType === roleType);
    if (!role) {
      console.log(`   ⚠️ Role ${roleType} not found, skipping`);
      continue;
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permsToAssign = dbPermissions.filter(p => actions.includes(p.action));
    if (permsToAssign.length > 0) {
      await prisma.rolePermission.createMany({
        data: permsToAssign.map(p => ({ 
          id: `${role.id}_${p.id}`,
          roleId: role.id, 
          permissionId: p.id 
        })),
        skipDuplicates: true
      });
    }
    console.log(`   - ${roleType.padEnd(25)}: ${permsToAssign.length} permissions mapped`);
  }

  // ---------- 6) ROLE MODULE VISIBILITY ----------
  console.log('\n🗺️ Mapping Role Module Visibility...');
  
  // Use getRoleModules from shared config to determine module access
  for (const role of dbRoles) {
    const roleType = role.roleType as RoleType;
    const modules = getRoleModules(roleType);
    
    for (const slug of modules) {
      const mod = getModule(slug);
      if (!mod) continue;
      
      // Determine if role can assign this module to users
      const assignable = roleType === RoleType.ADMIN || roleType === RoleType.CONTENT_MANAGER_ADMIN;
      
      await prisma.roleModule.upsert({
        where: { roleId_moduleId: { roleId: role.id, moduleId: mod.id } },
        update: { assignable },
        create: { 
          id: `${role.id}_${mod.id}`,
          roleId: role.id, 
          moduleId: mod.id, 
          assignable 
        },
      });
    }
    console.log(`   - ${role.roleType.padEnd(25)}: ${modules.length} modules accessible`);
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
        id: plan.slug, // Using slug as ID for consistency
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
        create: { 
          id: `${createdPlan.id}_${dbMod.id}`,
          planId: createdPlan.id, 
          moduleId: dbMod.id, 
          restrictions: JSON.stringify(mod.restrictions) 
        },
      });

      const duration = mod.restrictions.listingDurationDays ?? '∞';
      console.log(`      └─ ${mod.slug.padEnd(22)} | Duration: ${duration} days`);
    }
  }

  // ---------- 8) SUMMARY ----------
  const durationTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SEED SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Roles:        ${dbRoles.length}`);
  console.log(`   Modules:      ${dbModules.length}`);
  console.log(`   Permissions:  ${permissionCount}`);
  console.log(`   Plans:        ${plans.length}`);
  console.log(`   Time:         ${durationTime}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Production-grade RBAC Seed Completed Successfully! ✨');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch(err => { 
    console.error('\n❌ SEED ERROR:', err); 
    process.exit(1); 
  })
  .finally(() => prisma.$disconnect());