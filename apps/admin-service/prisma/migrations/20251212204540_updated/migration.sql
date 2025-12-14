/*
  Warnings:

  - Added the required column `creatorId` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "creatorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Plan_creatorId_idx" ON "Plan"("creatorId");
