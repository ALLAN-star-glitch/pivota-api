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
  // 1. Seed ROOT CATEGORIES (with type field)
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
        type: category.type, // Added type field
        hasParent: false,
        hasSubcategories: true,
      },
      create: {
        vertical: category.vertical,
        type: category.type, // Added type field
        name: category.name,
        slug: category.slug,
        description: category.description,
        hasParent: false,
        hasSubcategories: true,
      },
    });
    rootIds[`${category.vertical}:${category.slug}`] = created.id;
    console.log(`  ✅ Created root category: ${category.vertical} - ${category.name} (${category.type})`);
  }

  // ======================================================
  // 2. Seed SUBCATEGORIES (with type field)
  // ======================================================
  console.log('➡️ Seeding subcategories...');
  const subCategoriesData = SUB_CATEGORIES(rootIds);
  let subCount = 0;

  for (const sub of subCategoriesData) {
    await prisma.category.upsert({
      where: {
        vertical_slug: { vertical: sub.vertical, slug: sub.slug },
      },
      update: {
        name: sub.name,
        description: sub.description,
        type: sub.type, // Added type field
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
      create: {
        vertical: sub.vertical,
        type: sub.type, // Added type field
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
    });
    subCount++;
  }
  console.log(`✅ Created/updated ${subCount} subcategories.`);

  // ======================================================
  // 3. Seed CONTRACTOR PRICING RULES
  // ======================================================
  console.log('➡️ Seeding contractor pricing rules...');
  let ruleCount = 0;

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
      console.log(`  🔄 Updated pricing rule for ${rule.vertical} - ${rule.unit}${rule.categorySlug ? ` (${rule.categorySlug})` : ''}`);
    } else {
      await prisma.contractorPricingRule.create({
        data: {
          ...commonData,
          vertical: rule.vertical,
          unit: rule.unit,
          categoryId: targetCategoryId,
        },
      });
      console.log(`  ✅ Created pricing rule for ${rule.vertical} - ${rule.unit}${rule.categorySlug ? ` (${rule.categorySlug})` : ''}`);
    }
    ruleCount++;
  }

  console.log(`✅ Seeded ${ruleCount} contractor pricing rules.`);
  
  // ======================================================
  // 4. Summary Statistics
  // ======================================================
  const totalCategories = await prisma.category.count();
  const mainCategories = await prisma.category.count({ where: { type: 'MAIN' } });
  const complimentaryCategories = await prisma.category.count({ where: { type: 'COMPLIMENTARY' } });
  const housingCategories = await prisma.category.count({ where: { vertical: 'HOUSING' } });
  const jobsCategories = await prisma.category.count({ where: { vertical: 'JOBS' } });
  const socialCategories = await prisma.category.count({ where: { vertical: 'SOCIAL_SUPPORT' } });

  console.log('\n📊 Seeding Summary:');
  console.log(`   Total Categories: ${totalCategories}`);
  console.log(`   ├─ MAIN: ${mainCategories}`);
  console.log(`   └─ COMPLIMENTARY: ${complimentaryCategories}`);
  console.log(`   By Vertical:`);
  console.log(`   ├─ HOUSING: ${housingCategories}`);
  console.log(`   ├─ JOBS: ${jobsCategories}`);
  console.log(`   └─ SOCIAL_SUPPORT: ${socialCategories}`);
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