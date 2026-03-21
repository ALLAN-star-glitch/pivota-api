/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `OrganizationProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orgCode]` on the table `OrganizationProfile` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `OrganizationProfile` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "OrganizationProfile" ADD COLUMN     "orgCode" TEXT,
ADD COLUMN     "uuid" TEXT NOT NULL,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_uuid_key" ON "OrganizationProfile"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_orgCode_key" ON "OrganizationProfile"("orgCode");

-- CreateIndex
CREATE INDEX "OrganizationProfile_verificationStatus_idx" ON "OrganizationProfile"("verificationStatus");
