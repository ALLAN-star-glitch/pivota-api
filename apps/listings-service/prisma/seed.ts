import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ROOT_CATEGORIES, SUB_CATEGORIES } from './categories.constants';
import { PRICE_UNIT_RULES } from './price-unit-rules.constants';

const adapter = new PrismaPg({
  connectionString: process.env.LISTINGS_SERVICE_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting unified category and pricing seeding...');

  const rootIds: Record<string, string> = {};

  // ======================================================
  // 1. Seed ROOT CATEGORIES
  // ======================================================
  console.log('➡️ Seeding root categories...');
  for (const category of ROOT_CATEGORIES) {
    const created = await prisma.category.upsert({
      where: {
        vertical_slug: { vertical: category.vertical, slug: category.slug },
      },
      update: {
        name: category.name,
        description: category.description,
        hasParent: false,
        hasSubcategories: true,
      },
      create: {
        vertical: category.vertical,
        name: category.name,
        slug: category.slug,
        description: category.description,
        hasParent: false,
        hasSubcategories: true,
      },
    });
    rootIds[`${category.vertical}:${category.slug}`] = created.id;
  }

  // ======================================================
  // 2. Seed SUBCATEGORIES
  // ======================================================
  console.log('➡️ Seeding subcategories...');
  const subCategoriesData = SUB_CATEGORIES(rootIds).map((sub) => ({
    vertical: sub.vertical,
    name: sub.name,
    slug: sub.slug,
    parentId: sub.parentId,
    hasParent: true,
    hasSubcategories: false,
  }));

  await prisma.category.createMany({
    data: subCategoriesData,
    skipDuplicates: true,
  });
  console.log('✅ Categories and Subcategories ready.');

  // ======================================================
  // 3. Seed PROVIDER PRICING RULES
  // ======================================================
  console.log('➡️ Seeding provider pricing rules...');

  for (const rule of PRICE_UNIT_RULES) {
    let targetCategoryId: string | null = null;

    // Resolve categoryId if a slug is provided
    if (rule.categorySlug) {
      const category = await prisma.category.findUnique({
        where: {
          vertical_slug: {
            vertical: rule.vertical,
            slug: rule.categorySlug,
          },
        },
      });

      if (!category) {
        console.warn(`⚠️  Skipping rule: Category '${rule.categorySlug}' not found in '${rule.vertical}'`);
        continue;
      }
      targetCategoryId = category.id;
    }

    /**
     * FIX: Manual Upsert Logic
     * Prisma 'upsert' unique filters do not support 'null'.
     * We find the record first, then branch to update or create.
     */
    const existingRule = await prisma.providerPricingRule.findFirst({
      where: {
        vertical: rule.vertical,
        unit: rule.unit,
        categoryId: targetCategoryId, // findFirst handles null correctly
      },
    });

    const commonData = {
      minPrice: rule.minPrice,
      maxPrice: rule.maxPrice,
      isExperienceRequired: rule.isExperienceRequired ?? false,
      isNotesRequired: rule.isNotesRequired ?? false,
      isActive: true,
    };

    if (existingRule) {
      // Update by unique internal ID
      await prisma.providerPricingRule.update({
        where: { id: existingRule.id },
        data: commonData,
      });
    } else {
      // Create new record
      await prisma.providerPricingRule.create({
        data: {
          ...commonData,
          vertical: rule.vertical,
          unit: rule.unit,
          categoryId: targetCategoryId,
        },
      });
    }
  }

  console.log('✅ Provider pricing rules seeded (including global fallbacks).');
  console.log('🎉 Seeding process completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });