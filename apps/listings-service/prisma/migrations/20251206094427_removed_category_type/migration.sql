/*
  Warnings:

  - You are about to drop the column `categoryType` on the `JobCategory` table. All the data in the column will be lost.
  - You are about to drop the column `formalCategoryId` on the `JobPost` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "JobPost" DROP CONSTRAINT "JobPost_formalCategoryId_fkey";

-- AlterTable
ALTER TABLE "JobCategory" DROP COLUMN "categoryType";

-- AlterTable
ALTER TABLE "JobPost" DROP COLUMN "formalCategoryId";

-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
