/*
  Warnings:

  - You are about to drop the column `categoryLabel` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `SupportApplication` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `SupportProgram` table. All the data in the column will be lost.
  - You are about to drop the `JobCategory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[vertical,unit,categorySlug]` on the table `PriceUnitRule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoryId` to the `ServiceOffering` table without a default value. This is not possible if the table is not empty.
  - The required column `externalId` was added to the `SupportApplication` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `SupportApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `SupportProgram` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JobCategory" DROP CONSTRAINT "JobCategory_parentId_fkey";

-- DropForeignKey
ALTER TABLE "JobPost" DROP CONSTRAINT "JobPost_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "JobPost" DROP CONSTRAINT "JobPost_subCategoryId_fkey";

-- DropIndex
DROP INDEX "PriceUnitRule_vertical_unit_key";

-- DropIndex
DROP INDEX "SupportProgram_category_idx";

-- AlterTable
ALTER TABLE "PriceUnitRule" ADD COLUMN     "categorySlug" TEXT;

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "categoryLabel",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SupportApplication" DROP COLUMN "notes",
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userNotes" TEXT;

-- AlterTable
ALTER TABLE "SupportProgram" DROP COLUMN "category",
ADD COLUMN     "baseCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "currentBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxBeneficiaries" INTEGER;

-- DropTable
DROP TABLE "JobCategory";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "hasSubcategories" BOOLEAN NOT NULL DEFAULT false,
    "hasParent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_vertical_idx" ON "Category"("vertical");

-- CreateIndex
CREATE UNIQUE INDEX "Category_vertical_slug_key" ON "Category"("vertical", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PriceUnitRule_vertical_unit_categorySlug_key" ON "PriceUnitRule"("vertical", "unit", "categorySlug");

-- CreateIndex
CREATE INDEX "ServiceOffering_categoryId_idx" ON "ServiceOffering"("categoryId");

-- CreateIndex
CREATE INDEX "SupportApplication_beneficiaryId_idx" ON "SupportApplication"("beneficiaryId");

-- CreateIndex
CREATE INDEX "SupportApplication_programId_idx" ON "SupportApplication"("programId");

-- CreateIndex
CREATE INDEX "SupportProgram_categoryId_idx" ON "SupportProgram"("categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportProgram" ADD CONSTRAINT "SupportProgram_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
