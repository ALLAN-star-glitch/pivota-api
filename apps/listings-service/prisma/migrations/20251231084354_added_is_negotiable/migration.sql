/*
  Warnings:

  - You are about to drop the column `isNegotiable` on the `JobPostApplication` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JobPostApplication" DROP COLUMN "isNegotiable";

-- CreateIndex
CREATE INDEX "JobPostApplication_referrerEmail_idx" ON "JobPostApplication"("referrerEmail");
