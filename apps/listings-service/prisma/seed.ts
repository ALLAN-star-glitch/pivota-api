/* eslint-disable @nx/enforce-module-boundaries */
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ROOT_CATEGORIES, SUB_CATEGORIES } from '../../../libs/constants/src/lib/categories.constants';
import { PRICE_UNIT_RULES } from '../../../libs/constants/src/lib/price-unit-rules.constants';



const adapter = new PrismaPg({
  connectionString: process.env.LISTINGS_SERVICE_DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting unified category and pricing seeding...\n');

  // Map to store DB IDs for subcategory linking
  // Format: "VERTICAL:SLUG" -> "CUID_FROM_DB"
  const rootIds: Record<string, string> = {};

  // ======================================================
  // 1. Seed ROOT CATEGORIES (with type field)
  // ======================================================
  console.log('📁 Seeding root categories...');
  let rootCount = 0;

  for (const category of ROOT_CATEGORIES) {
    const created = await prisma.category.upsert({
      where: {
        vertical_slug: { vertical: category.vertical, slug: category.slug },
      },
      update: {
        name: category.name,
        description: category.description,
        type: category.type,
        hasParent: false,
        hasSubcategories: true,
      },
      create: {
        vertical: category.vertical,
        type: category.type,
        name: category.name,
        slug: category.slug,
        description: category.description,
        hasParent: false,
        hasSubcategories: true,
      },
    });
    rootIds[`${category.vertical}:${category.slug}`] = created.id;
    rootCount++;
    
    // Optional: Show progress every 20 categories
    if (rootCount % 20 === 0) {
      console.log(`   Processed ${rootCount} root categories...`);
    }
  }
  console.log(`   ✅ Created/updated ${rootCount} root categories.\n`);

  // ======================================================
  // 2. Seed SUBCATEGORIES (with type field)
  // ======================================================
  console.log('📂 Seeding subcategories...');
  const subCategoriesData = SUB_CATEGORIES(rootIds);
  let subCount = 0;
  let skippedCount = 0;

  for (const sub of subCategoriesData) {
    // Verify parent exists before attempting upsert
    if (sub.parentId && !Object.values(rootIds).includes(sub.parentId)) {
      console.warn(`   ⚠️ Parent not found for subcategory: ${sub.vertical}:${sub.slug}`);
      skippedCount++;
      continue;
    }

    await prisma.category.upsert({
      where: {
        vertical_slug: { vertical: sub.vertical, slug: sub.slug },
      },
      update: {
        name: sub.name,
        description: sub.description,
        type: sub.type,
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
      create: {
        vertical: sub.vertical,
        type: sub.type,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        parentId: sub.parentId,
        hasParent: true,
        hasSubcategories: false,
      },
    });
    subCount++;
    
    // Optional: Show progress every 50 subcategories
    if (subCount % 50 === 0) {
      console.log(`   Processed ${subCount} subcategories...`);
    }
  }
  console.log(`   ✅ Created/updated ${subCount} subcategories.`);
  if (skippedCount > 0) {
    console.log(`   ⚠️ Skipped ${skippedCount} subcategories due to missing parents.\n`);
  } else {
    console.log('');
  }

  // ======================================================
  // 3. Seed CONTRACTOR PRICING RULES
  // ======================================================
  console.log('💰 Seeding contractor pricing rules...');
  let ruleCount = 0;
  let failedRules = 0;

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
        console.warn(`   ⚠️ Skipping rule: Category '${rule.categorySlug}' not found in '${rule.vertical}'`);
        failedRules++;
        continue;
      }
      targetCategoryId = category.id;
    }

    const commonData = {
      minPrice: rule.minPrice,
      maxPrice: rule.maxPrice,
      isExperienceRequired: rule.isExperienceRequired ?? false,
      isNotesRequired: rule.isNotesRequired ?? false,
      isActive: true,
      currency: rule.currency ?? 'KES',
    };

    try {
      const existingRule = await prisma.contractorPricingRule.findFirst({
        where: {
          vertical: rule.vertical,
          unit: rule.unit,
          currency: rule.currency ?? 'KES',
          categoryId: targetCategoryId,
        },
      });

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
      ruleCount++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to seed rule for ${rule.vertical} - ${rule.unit}${rule.categorySlug ? ` (${rule.categorySlug})` : ''}:`, errorMessage);
      failedRules++;
    }
  }

  console.log(`   ✅ Seeded ${ruleCount} contractor pricing rules.`);
  if (failedRules > 0) {
    console.log(`   ⚠️ Failed ${failedRules} rules.\n`);
  } else {
    console.log('');
  }

  // ======================================================
  // 4. Summary Statistics
  // ======================================================
  const totalCategories = await prisma.category.count();
  const mainCategories = await prisma.category.count({ where: { type: 'MAIN' } });
  const complimentaryCategories = await prisma.category.count({ where: { type: 'COMPLIMENTARY' } });
  const housingCategories = await prisma.category.count({ where: { vertical: 'HOUSING' } });
  const jobsCategories = await prisma.category.count({ where: { vertical: 'JOBS' } });
  const socialCategories = await prisma.category.count({ where: { vertical: 'SOCIAL_SUPPORT' } });
  
  const totalRules = await prisma.contractorPricingRule.count();
  const housingRules = await prisma.contractorPricingRule.count({ where: { vertical: 'HOUSING' } });
  const jobsRules = await prisma.contractorPricingRule.count({ where: { vertical: 'JOBS' } });
  const socialRules = await prisma.contractorPricingRule.count({ where: { vertical: 'SOCIAL_SUPPORT' } });

  console.log('📊 Seeding Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏷️  Categories:`);
  console.log(`   Total: ${totalCategories}`);
  console.log(`   ├─ MAIN: ${mainCategories}`);
  console.log(`   └─ COMPLIMENTARY: ${complimentaryCategories}`);
  console.log(`   By Vertical:`);
  console.log(`   ├─ HOUSING: ${housingCategories}`);
  console.log(`   ├─ JOBS: ${jobsCategories}`);
  console.log(`   └─ SOCIAL_SUPPORT: ${socialCategories}`);
  console.log('');
  console.log(`💰 Pricing Rules:`);
  console.log(`   Total: ${totalRules}`);
  console.log(`   ├─ HOUSING: ${housingRules}`);
  console.log(`   ├─ JOBS: ${jobsRules}`);
  console.log(`   └─ SOCIAL_SUPPORT: ${socialRules}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seeding process completed successfully!');
}

main()
  .catch((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('❌ Seeding failed:', errorMessage);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });