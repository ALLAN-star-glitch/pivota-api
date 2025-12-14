/*
  Warnings:

  - You are about to drop the column `listingLimit` on the `PlanModule` table. All the data in the column will be lost.
  - You are about to drop the `ModuleRule` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `PlanModule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ModuleRule" DROP CONSTRAINT "ModuleRule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "ModuleRule" DROP CONSTRAINT "ModuleRule_planId_fkey";

-- AlterTable
ALTER TABLE "PlanModule" DROP COLUMN "listingLimit",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "restrictions" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ModuleRule";
