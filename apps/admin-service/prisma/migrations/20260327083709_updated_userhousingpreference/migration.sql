/*
  Warnings:

  - You are about to drop the column `userLat` on the `SmartMatchyBase` table. All the data in the column will be lost.
  - You are about to drop the column `userLng` on the `SmartMatchyBase` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `SmartMatchyBase` table. All the data in the column will be lost.
  - You are about to drop the column `creatorId` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `lastViewedAt` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledFor` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `schedulerId` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `viewerId` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `UserEmploymentPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `petDetails` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredLeaseDuration` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredLocations` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredNeighborhood` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredPropertyType` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `preferredPropertyTypes` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `UserHousingPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `UserProfessionalServicesPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `UserSocialSupportPreferences` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seekerId]` on the table `UserEmploymentPreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seekerId]` on the table `UserHousingPreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seekerId]` on the table `UserProfessionalServicesPreferences` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seekerId]` on the table `UserSocialSupportPreferences` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seekerId` to the `SmartMatchyBase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seekerId` to the `UserEmploymentPreferences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seekerId` to the `UserHousingPreferences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seekerId` to the `UserProfessionalServicesPreferences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seekerId` to the `UserSocialSupportPreferences` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_listingId_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_timestamp_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_creatorId_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_schedulerId_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_viewerId_idx";

-- DropIndex
DROP INDEX "UserEmploymentPreferences_userUuid_idx";

-- DropIndex
DROP INDEX "UserEmploymentPreferences_userUuid_key";

-- DropIndex
DROP INDEX "UserHousingPreferences_userUuid_idx";

-- DropIndex
DROP INDEX "UserHousingPreferences_userUuid_key";

-- DropIndex
DROP INDEX "UserProfessionalServicesPreferences_userUuid_idx";

-- DropIndex
DROP INDEX "UserProfessionalServicesPreferences_userUuid_key";

-- DropIndex
DROP INDEX "UserSocialSupportPreferences_userUuid_idx";

-- DropIndex
DROP INDEX "UserSocialSupportPreferences_userUuid_key";

-- AlterTable
ALTER TABLE "SmartMatchyBase" DROP COLUMN "userLat",
DROP COLUMN "userLng",
DROP COLUMN "userUuid",
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "seekerId" TEXT NOT NULL,
ADD COLUMN     "seekerLat" DOUBLE PRECISION,
ADD COLUMN     "seekerLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SmartMatchyEmployment" ADD COLUMN     "employerId" TEXT;

-- AlterTable
ALTER TABLE "SmartMatchyHousing" DROP COLUMN "creatorId",
DROP COLUMN "lastViewedAt",
DROP COLUMN "scheduledAt",
DROP COLUMN "scheduledFor",
DROP COLUMN "schedulerId",
DROP COLUMN "viewerId",
ADD COLUMN     "listingOwnerId" TEXT,
ADD COLUMN     "viewingDate" TIMESTAMP(3),
ADD COLUMN     "viewingId" TEXT;

-- AlterTable
ALTER TABLE "SmartMatchyProfessional" ADD COLUMN     "providerId" TEXT;

-- AlterTable
ALTER TABLE "SmartMatchySocialSupport" ADD COLUMN     "providerId" TEXT;

-- AlterTable
ALTER TABLE "UserEmploymentPreferences" DROP COLUMN "userUuid",
ADD COLUMN     "seekerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserHousingPreferences" DROP COLUMN "petDetails",
DROP COLUMN "preferredLeaseDuration",
DROP COLUMN "preferredLocations",
DROP COLUMN "preferredNeighborhood",
DROP COLUMN "preferredPropertyType",
DROP COLUMN "preferredPropertyTypes",
DROP COLUMN "userUuid",
ADD COLUMN     "budgetFlexibility" DOUBLE PRECISION,
ADD COLUMN     "favoriteAmenities" JSONB,
ADD COLUMN     "hasAgent" BOOLEAN DEFAULT false,
ADD COLUMN     "householdSize" INTEGER,
ADD COLUMN     "maxBedrooms" INTEGER,
ADD COLUMN     "minBathrooms" INTEGER,
ADD COLUMN     "preferredCities" JSONB,
ADD COLUMN     "preferredTypes" JSONB,
ADD COLUMN     "seekerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserProfessionalServicesPreferences" DROP COLUMN "userUuid",
ADD COLUMN     "seekerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserSocialSupportPreferences" DROP COLUMN "userUuid",
ADD COLUMN     "seekerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SmartMatchyBase_seekerId_listingId_idx" ON "SmartMatchyBase"("seekerId", "listingId");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_seekerId_timestamp_idx" ON "SmartMatchyBase"("seekerId", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_providerId_idx" ON "SmartMatchyBase"("providerId");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_employerId_idx" ON "SmartMatchyEmployment"("employerId");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_listingOwnerId_idx" ON "SmartMatchyHousing"("listingOwnerId");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_providerId_idx" ON "SmartMatchyProfessional"("providerId");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_providerId_idx" ON "SmartMatchySocialSupport"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmploymentPreferences_seekerId_key" ON "UserEmploymentPreferences"("seekerId");

-- CreateIndex
CREATE INDEX "UserEmploymentPreferences_seekerId_idx" ON "UserEmploymentPreferences"("seekerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserHousingPreferences_seekerId_key" ON "UserHousingPreferences"("seekerId");

-- CreateIndex
CREATE INDEX "UserHousingPreferences_seekerId_idx" ON "UserHousingPreferences"("seekerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfessionalServicesPreferences_seekerId_key" ON "UserProfessionalServicesPreferences"("seekerId");

-- CreateIndex
CREATE INDEX "UserProfessionalServicesPreferences_seekerId_idx" ON "UserProfessionalServicesPreferences"("seekerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSocialSupportPreferences_seekerId_key" ON "UserSocialSupportPreferences"("seekerId");

-- CreateIndex
CREATE INDEX "UserSocialSupportPreferences_seekerId_idx" ON "UserSocialSupportPreferences"("seekerId");
