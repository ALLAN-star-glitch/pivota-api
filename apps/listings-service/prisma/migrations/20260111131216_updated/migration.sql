/*
  Warnings:

  - You are about to drop the column `contractorId` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `contractorName` on the `ServiceOffering` table. All the data in the column will be lost.
  - Added the required column `accountName` to the `ServiceOffering` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `ServiceOffering` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ServiceOffering_contractorId_idx";

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "contractorId",
DROP COLUMN "contractorName",
ADD COLUMN     "accountName" TEXT NOT NULL,
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "creatorName" TEXT;

-- CreateIndex
CREATE INDEX "ServiceOffering_creatorId_idx" ON "ServiceOffering"("creatorId");
