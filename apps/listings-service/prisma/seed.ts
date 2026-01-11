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

  // Map to store DB IDs for subcategory linking
  // Format: "VERTICAL:SLUG" -> "CUID_FROM_DB"
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
  const subCategoriesData = SUB_CATEGORIES(rootIds);

  for (const sub of subCategoriesData) {
    await prisma.category.upsert({
      where: {
        vertical_slug: { vertical: sub.vertical, slug: sub.slug },
      },
      update: {
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
      create: {
        vertical: sub.vertical,
        name: sub.name,
        slug: sub.slug,
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
    });
  }
  console.log('✅ Categories and Subcategories synced.');

  // ======================================================
  // 3. Seed CONTRACTOR PRICING RULES
  // ======================================================
  console.log('➡️ Seeding contractor pricing rules...');

  for (const rule of PRICE_UNIT_RULES) {
    let targetCategoryId: string | null = null;

    // Resolve categoryId from the DB if a slug was provided in the constants
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
     * Logic: Match the @unique([vertical, unit, currency, categoryId]) constraint
     */
    const existingRule = await prisma.contractorPricingRule.findFirst({
      where: {
        vertical: rule.vertical,
        unit: rule.unit,
        currency: rule.currency ?? 'KES',
        categoryId: targetCategoryId,
      },
    });

    const commonData = {
      minPrice: rule.minPrice,
      maxPrice: rule.maxPrice,
      isExperienceRequired: rule.isExperienceRequired ?? false,
      isNotesRequired: rule.isNotesRequired ?? false,
      isActive: true,
      currency: rule.currency ?? 'KES',
    };

    if (existingRule) {
      await prisma.contractorPricingRule.update({
        where: { id: existingRule.id },
        data: commonData,
      });
    } else {
      await prisma.contractorPricingRule.create({
        data: {
          ...commonData,
          vertical: rule.vertical,
          unit: rule.unit,
          categoryId: targetCategoryId,
        },
      });
    }
  }

  console.log('✅ Contractor pricing rules seeded.');
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