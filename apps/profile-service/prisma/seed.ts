// -----------------------------------------------------
// PivotaConnect Organization Type Seed
// Target: Profile Microservice Database
// -----------------------------------------------------
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

// Note: Ensure your .env has PROFILE_SERVICE_DATABASE_URL
const connectionString = process.env.PROFILE_SERVICE_DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Organization Types (Lookup Table)...');

  const types = [
    { slug: 'PRIVATE_LIMITED', label: 'Private Limited Company' },
    { slug: 'NGO', label: 'Non-Governmental Organization' },
    { slug: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
    { slug: 'GOVERNMENT', label: 'Government Entity' },
    { slug: 'PARTNERSHIP', label: 'Partnership' },
    { slug: 'INDIVIDUAL', label: 'Individual / Freelancer' },
  ];

  for (const item of types) {
    await prisma.organizationType.upsert({
      where: { slug: item.slug },
      update: { label: item.label },
      create: {
        slug: item.slug,
        label: item.label,
      },
    });
  }

  console.log(`✅ Successfully seeded ${types.length} organization types.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding OrganizationTypes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });