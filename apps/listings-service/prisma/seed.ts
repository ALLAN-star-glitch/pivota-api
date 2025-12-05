import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ROOT_CATEGORIES, SUB_CATEGORIES } from './categories.constants';

const adapter = new PrismaPg({
  connectionString: process.env.LISTINGS_SERVICE_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting category seeding...');

  const rootIds: Record<string, string> = {};

  // ===============================
  // 1. Seed ROOT categories
  // ===============================
  console.log('➡️ Seeding root categories...');

  for (const category of ROOT_CATEGORIES) {
    const created = await prisma.jobCategory.upsert({
      where: { name: category.name },
      update: {},
      create: {
        ...category,
        hasParent: false,
        hasSubcategories: true, // roots normally have subcategories
      },
    });

    rootIds[category.name] = created.id;
  }

  console.log('✅ Root categories seeded.');

  // ===============================
  // 2. Seed SUBCATEGORIES
  // ===============================
  console.log('➡️ Seeding subcategories...');

  const subCategoriesData = SUB_CATEGORIES(rootIds).map((sub) => ({
    ...sub,
    hasParent: true,
    hasSubcategories: false,
  }));

  await prisma.jobCategory.createMany({
    data: subCategoriesData,
    skipDuplicates: true, // prevent re-seed conflicts
  });

  console.log('✅ Subcategories seeded.');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
