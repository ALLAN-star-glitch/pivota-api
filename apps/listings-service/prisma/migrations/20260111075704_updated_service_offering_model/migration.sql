/*
  Warnings:

  - You are about to drop the column `additionalNotes` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `ServiceOffering` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `JobPost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `ServiceOffering` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractorId` to the `ServiceOffering` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ServiceOffering_providerId_idx";

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "additionalNotes",
DROP COLUMN "providerId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "contractorId" TEXT NOT NULL,
ADD COLUMN     "contractorName" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "providerType" TEXT NOT NULL DEFAULT 'INDIVIDUAL';

-- CreateIndex
CREATE INDEX "ServiceOffering_contractorId_idx" ON "ServiceOffering"("contractorId");

-- CreateIndex
CREATE INDEX "ServiceOffering_accountId_idx" ON "ServiceOffering"("accountId");

-- CreateIndex
CREATE INDEX "ServiceOffering_providerType_idx" ON "ServiceOffering"("providerType");
