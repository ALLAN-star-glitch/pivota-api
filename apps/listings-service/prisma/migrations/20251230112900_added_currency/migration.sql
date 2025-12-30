/*
  Warnings:

  - A unique constraint covering the columns `[vertical,unit,currency,categoryId]` on the table `ProviderPricingRule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProviderPricingRule_vertical_unit_categoryId_key";

-- AlterTable
ALTER TABLE "ProviderPricingRule" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES';

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPricingRule_vertical_unit_currency_categoryId_key" ON "ProviderPricingRule"("vertical", "unit", "currency", "categoryId");
