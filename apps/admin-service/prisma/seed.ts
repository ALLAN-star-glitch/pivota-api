import pkg from '../generated/prisma/index.js';

const { PrismaClient } = pkg;
type Permission = pkg.Permission;
type Role = pkg.Role;

const prisma = new PrismaClient();
 
async function main() {
  console.log('🌱 Seeding RBAC...');
 
  // 1️⃣ Roles
  const roleData = [
    { name: 'RootGuardian', description: 'Super Admin with full control' },
    { name: 'ContentManagerAdmin', description: 'Moderates content across the platform' },
    { name: 'ComplianceAdmin', description: 'Handles verification and compliance' },
    { name: 'FraudAdmin', description: 'Monitors and acts on fraud reports' },
    { name: 'AnalyticsAdmin', description: 'Access analytics dashboards and KPIs' },
    { name: 'CategoryManager', description: 'Moderates specific categories' },
    { name: 'ServiceProvider', description: 'Provides services or listings' },
    { name: 'RegisteredUser', description: 'Default user role with basic access' },
  ];
 
  await prisma.role.createMany({
    data: roleData,
    skipDuplicates: true,
  });
 
  const roles = await prisma.role.findMany();
  console.log(`✅ Seeded ${roles.length} roles`);
 
  // 2️⃣ Permissions
  const permissionData = [
    // User management
    { action: 'user.view', description: 'View user details' },
    { action: 'user.suspend', description: 'Suspend user accounts' },
    { action: 'user.verify', description: 'Verify service providers' },
 
    // Listing management
    { action: 'listing.create', description: 'Create listings' },
    { action: 'listing.update', description: 'Update listings' },
    { action: 'listing.delete', description: 'Delete listings' },
    { action: 'listing.approve', description: 'Approve/reject listings' },
 
    // Payments
    { action: 'payment.view', description: 'View payments' },
    { action: 'payment.refund', description: 'Refund customer payments' },
 
    // Analytics
    { action: 'analytics.view', description: 'View analytics dashboards' },
 
    // Audit
    { action: 'audit.view', description: 'View audit logs' },
  ];
 
  await prisma.permission.createMany({
    data: permissionData,
    skipDuplicates: true,
  });
 
  const permissions = await prisma.permission.findMany();
  console.log(`✅ Seeded ${permissions.length} permissions`);
 
  // 3️⃣ Role-Permission Mapping
  const permissionMap: Record<string, string[]> = {
    RootGuardian: permissions.map((p: Permission) => p.action), // all permissions
    ContentManagerAdmin: ['listing.approve', 'listing.delete', 'user.suspend'],
    ComplianceAdmin: ['user.verify', 'user.view'],
    FraudAdmin: ['user.suspend', 'audit.view'],
    AnalyticsAdmin: ['analytics.view'],
    CategoryManager: ['listing.approve', 'listing.update'],
    ServiceProvider: ['listing.create', 'listing.update', 'listing.delete'],
    RegisteredUser: ['listing.create'], // minimal (e.g., post applications/bookings)
  };
 
  for (const [roleName, allowedActions] of Object.entries(permissionMap)) {
    const role = roles.find((r: Role) => r.name === roleName);
    if (!role) continue;
 
    const allowedPermissions = permissions.filter((p) =>
      allowedActions.includes(p.action),
    );
 
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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });