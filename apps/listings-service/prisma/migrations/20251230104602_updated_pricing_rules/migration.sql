/*
  Warnings:

  - You are about to drop the `PriceUnitRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PriceUnitRule";

-- CreateTable
CREATE TABLE "ProviderPricingRule" (
    "id" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "categoryId" TEXT,
    "minPrice" DOUBLE PRECISION DEFAULT 0,
    "maxPrice" DOUBLE PRECISION,
    "isExperienceRequired" BOOLEAN NOT NULL DEFAULT false,
    "isNotesRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPricingRule_vertical_unit_categoryId_key" ON "ProviderPricingRule"("vertical", "unit", "categoryId");

-- AddForeignKey
ALTER TABLE "ProviderPricingRule" ADD CONSTRAINT "ProviderPricingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
