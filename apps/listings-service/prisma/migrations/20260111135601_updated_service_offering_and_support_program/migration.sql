/*
  Warnings:

  - You are about to drop the column `contractorType` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `isProviderVerified` on the `SupportProgram` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `SupportProgram` table. All the data in the column will be lost.
  - You are about to drop the column `providerType` on the `SupportProgram` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `SupportProgram` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountName` to the `SupportProgram` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ServiceOffering_contractorType_idx";

-- DropIndex
DROP INDEX "SupportProgram_organizationId_idx";

-- DropIndex
DROP INDEX "SupportProgram_providerType_idx";

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "contractorType",
DROP COLUMN "isVerified";

-- AlterTable
ALTER TABLE "SupportProgram" DROP COLUMN "isProviderVerified",
DROP COLUMN "organizationId",
DROP COLUMN "providerType",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "accountName" TEXT NOT NULL,
ADD COLUMN     "creatorName" TEXT;

-- CreateIndex
CREATE INDEX "SupportProgram_accountId_idx" ON "SupportProgram"("accountId");
