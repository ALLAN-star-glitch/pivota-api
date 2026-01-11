/*
  Warnings:

  - You are about to drop the column `ownerId` on the `HouseListing` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `HouseListing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `HouseListing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorName` to the `JobPost` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HouseListing_ownerId_idx";

-- AlterTable
ALTER TABLE "HouseListing" DROP COLUMN "ownerId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "creatorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "creatorName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "HouseListing_creatorId_idx" ON "HouseListing"("creatorId");

-- CreateIndex
CREATE INDEX "HouseListing_accountId_idx" ON "HouseListing"("accountId");

-- CreateIndex
CREATE INDEX "JobPost_accountId_idx" ON "JobPost"("accountId");
