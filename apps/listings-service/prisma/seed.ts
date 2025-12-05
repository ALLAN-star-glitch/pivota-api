import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ROOT_CATEGORIES, SUB_CATEGORIES } from './categories.constants';


// Initialize Prisma
const adapter = new PrismaPg({ connectionString: process.env.LISTINGS_SERVICE_DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding root categories...');

  const rootIds: Record<string, string> = {};

  // Seed root categories
  for (const category of ROOT_CATEGORIES) {
    const created = await prisma.jobCategory.create({ data: category });
    rootIds[category.name] = created.id; // Save IDs for subcategories
  }

  console.log('Seeding subcategories...');

  // Seed subcategories
  const subCategoriesData = SUB_CATEGORIES(rootIds);
  await prisma.jobCategory.createMany({ data: subCategoriesData });

  console.log('Seeding completed successfully!');
}

// Run the seeder
main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
