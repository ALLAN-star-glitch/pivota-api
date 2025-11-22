import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js'; // path to your generated client
import { PrismaPg } from '@prisma/adapter-pg';

type Permission = import('../generated/prisma/index.js').Permission;

// Use adapter for Postgres
const adapter = new PrismaPg({
  connectionString: process.env.ADMIN_SERVICE_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding RBAC...');

  // ------------------ 1️⃣ Roles ------------------
  const roleData = [
    { name: 'RegisteredUser', description: 'Default user role with basic access' },
    { name: 'ServiceProvider', description: 'Provides services or listings' },
    { name: 'CategoryManager', description: 'Moderates specific categories' },
    { name: 'AnalyticsAdmin', description: 'Access analytics dashboards and KPIs' },
    { name: 'FraudAdmin', description: 'Monitors and acts on fraud reports' },
    { name: 'ComplianceAdmin', description: 'Handles verification and compliance' },
    { name: 'ContentManagerAdmin', description: 'Moderates content across the platform' },
    { name: 'RootGuardian', description: 'Super Admin with full control' },
  ];

  await prisma.role.createMany({ data: roleData, skipDuplicates: true });
  const roles = await prisma.role.findMany();
  console.log(`✅ Seeded ${roles.length} roles`);

  // ------------------ 2️⃣ Permissions ------------------
  const permissionData = [
    { action: 'user.view', description: 'View user details' },
    { action: 'user.suspend', description: 'Suspend user accounts' },
    { action: 'user.verify', description: 'Verify service providers' },
    { action: 'listing.create', description: 'Create listings' },
    { action: 'listing.update', description: 'Update listings' },
    { action: 'listing.delete', description: 'Delete listings' },
    { action: 'listing.approve', description: 'Approve/reject listings' },
    { action: 'payment.view', description: 'View payments' },
    { action: 'payment.refund', description: 'Refund customer payments' },
    { action: 'analytics.view', description: 'View analytics dashboards' },
    { action: 'audit.view', description: 'View audit logs' },
  ];

  await prisma.permission.createMany({ data: permissionData, skipDuplicates: true });
  const permissions = await prisma.permission.findMany();
  console.log(`✅ Seeded ${permissions.length} permissions`);

  // ------------------ 3️⃣ Role Hierarchy ------------------
  const roleHierarchy = [
    'RegisteredUser',
    'ServiceProvider',
    'CategoryManager',
    'AnalyticsAdmin',
    'FraudAdmin',
    'ComplianceAdmin',
    'ContentManagerAdmin',
    'RootGuardian',
  ];

  const rolePermissions: Record<string, string[]> = {
    RegisteredUser: ['listing.create'],
    ServiceProvider: ['listing.update', 'listing.delete'],
    CategoryManager: ['listing.approve'],
    AnalyticsAdmin: ['analytics.view'],
    FraudAdmin: ['audit.view', 'user.suspend'],
    ComplianceAdmin: ['user.verify', 'user.view'],
    ContentManagerAdmin: ['listing.delete', 'listing.approve', 'user.suspend'],
    RootGuardian: permissions.map((p: Permission) => p.action),
  };

  // ------------------ 4️⃣ Seed role-permissions ------------------
  for (let i = 0; i < roleHierarchy.length; i++) {
    const roleName = roleHierarchy[i];
    const role = roles.find(r => r.name === roleName);
    if (!role) continue;

    const inheritedActions = roleHierarchy
      .slice(0, i + 1)
      .flatMap(rn => rolePermissions[rn] || []);

    const uniqueActions = Array.from(new Set(inheritedActions));
    const allowedPermissions = permissions.filter(p => uniqueActions.includes(p.action));

    for (const perm of allowedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log('✅ Role-permission mapping completed');
  console.log('🌱 RBAC seeding finished!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
