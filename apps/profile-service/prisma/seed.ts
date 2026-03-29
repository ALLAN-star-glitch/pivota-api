// -----------------------------------------------------
// PivotaConnect Organization Type Seed
// Target: Profile Microservice Database
// -----------------------------------------------------
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.PROFILE_SERVICE_DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Organization Types (Lookup Table)...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
 
  const organizationTypes = [
    { slug: 'NGO', label: 'Non-Governmental Organization', description: 'Non-profit organizations focused on social causes', order: 10 },
    { slug: 'COMPANY', label: 'Company', description: 'Registered business entity', order: 20 },
    { slug: 'SOCIAL_ENTERPRISE', label: 'Social Enterprise', description: 'Business with social mission', order: 30 },
    { slug: 'GOVERNMENT', label: 'Government Entity', description: 'Government agency or department', order: 40 },
    { slug: 'AGENCY', label: 'Agency', description: 'Professional agency or brokerage', order: 50 },
    { slug: 'COOPERATIVE', label: 'Cooperative', description: 'Member-owned organization', order: 60 },
    { slug: 'INDIVIDUAL', label: 'Individual', description: 'Individual professional', order: 70 },
    { slug: 'PRIVATE_LIMITED', label: 'Private Limited Company', description: 'Ltd company', order: 15 },
    { slug: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship', description: 'Single owner business', order: 25 },
    { slug: 'PARTNERSHIP', label: 'Partnership', description: 'Business with multiple partners', order: 35 },
    { slug: 'COMMUNITY_BASED_ORGANIZATION', label: 'Community Based Organization', description: 'Local community group', order: 45 },
    { slug: 'FAITH_BASED_ORGANIZATION', label: 'Faith Based Organization', description: 'Religious organization', order: 55 },
    { slug: 'FAMILY', label: 'Family', description: 'Family group or household', order: 65 },
  ];

  let createdCount = 0;

  for (const type of organizationTypes) {
    const result = await prisma.organizationType.upsert({
      where: { slug: type.slug },
      update: { 
        label: type.label,
        description: type.description,
        order: type.order
      },
      create: {
        slug: type.slug,
        label: type.label,
        description: type.description,
        order: type.order,
      },
    });
    
    if (result) {
      console.log(`   ✓ ${type.slug.padEnd(30)} - ${type.label}`);
      createdCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Successfully seeded ${createdCount} organization types.`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Optional: Display all seeded types
  const allTypes = await prisma.organizationType.findMany({
    orderBy: { order: 'asc' }
  });
  
  console.log('📋 Seeded Organization Types:');
  for (const type of allTypes) {
    console.log(`   - ${type.slug}: ${type.label}`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding OrganizationTypes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });