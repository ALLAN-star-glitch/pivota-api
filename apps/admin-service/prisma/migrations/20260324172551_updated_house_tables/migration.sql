/*
  Warnings:

  - You are about to drop the column `userEducation` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userExperience` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userIsFormal` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userIsInformal` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userJobType` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userMaxSalary` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userMinSalary` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userSkills` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `userWorkMode` on the `SmartMatchyEmployment` table. All the data in the column will be lost.
  - You are about to drop the column `amenityMatchScore` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `bathroomsMatch` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `leaseDurationMatch` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `moveInDateMatch` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `petPolicyMatch` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userAmenities` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userBudgetMidpoint` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userFurnished` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userHasPets` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userHouseholdSize` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userHousingType` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userLat` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userLeaseDuration` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userLng` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userMaxBedrooms` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userMaxBudget` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userMinBedrooms` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userMinBudget` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userMoveInDate` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userNeighborhood` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userPetDetails` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userPreferredLocations` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userPreferredNeighborhoods` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userPreferredPropertyTypes` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userPropertyType` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `userSearchRadiusKm` on the `SmartMatchyHousing` table. All the data in the column will be lost.
  - You are about to drop the column `serviceLanguages` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `userBudget` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `userLocation` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `userServiceDate` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `userServiceNeeded` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `userUrgency` on the `SmartMatchyProfessional` table. All the data in the column will be lost.
  - You are about to drop the column `supportApplicationDeadline` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `supportCurrentApplicants` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userFamilySize` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userIncomeLevel` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userLocation` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userNeeds` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userUrgentNeeds` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.
  - You are about to drop the column `userVulnerability` on the `SmartMatchySocialSupport` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SmartMatchyBase_aiEventType_timestamp_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_dayOfWeek_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_experimentId_experimentVariant_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_experimentId_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_isWeekend_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_listingLat_listingLng_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_recommendationId_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_sessionPlatform_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_timestamp_vertical_userConverted_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userConverted_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userLat_userLng_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userSaved_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_userClicked_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_userContacted_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_userConverted_idx";

-- DropIndex
DROP INDEX "SmartMatchyBase_userUuid_userSaved_idx";

-- DropIndex
DROP INDEX "SmartMatchyEmployment_userIsFormal_idx";

-- DropIndex
DROP INDEX "SmartMatchyEmployment_userIsInformal_idx";

-- DropIndex
DROP INDEX "SmartMatchyEmployment_userMinSalary_jobSalaryMax_idx";

-- DropIndex
DROP INDEX "SmartMatchyEmployment_userSkills_jobSkillsReq_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userCompletedViewing_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userHasPets_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userMinBedrooms_userMaxBedrooms_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userMinBudget_userMaxBudget_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userMoveInDate_idx";

-- DropIndex
DROP INDEX "SmartMatchyHousing_userScheduledViewing_idx";

-- DropIndex
DROP INDEX "SmartMatchyProfessional_serviceExperience_idx";

-- DropIndex
DROP INDEX "SmartMatchyProfessional_serviceVerified_idx";

-- DropIndex
DROP INDEX "SmartMatchyProfessional_userCompleted_idx";

-- DropIndex
DROP INDEX "SmartMatchyProfessional_userServiceNeeded_idx";

-- DropIndex
DROP INDEX "SmartMatchySocialSupport_needMatchScore_idx";

-- DropIndex
DROP INDEX "SmartMatchySocialSupport_supportLocation_idx";

-- DropIndex
DROP INDEX "SmartMatchySocialSupport_supportProvider_idx";

-- DropIndex
DROP INDEX "SmartMatchySocialSupport_userReceived_idx";

-- AlterTable
ALTER TABLE "SmartMatchyEmployment" DROP COLUMN "userEducation",
DROP COLUMN "userExperience",
DROP COLUMN "userIsFormal",
DROP COLUMN "userIsInformal",
DROP COLUMN "userJobType",
DROP COLUMN "userMaxSalary",
DROP COLUMN "userMinSalary",
DROP COLUMN "userSkills",
DROP COLUMN "userWorkMode";

-- AlterTable
ALTER TABLE "SmartMatchyHousing" DROP COLUMN "amenityMatchScore",
DROP COLUMN "bathroomsMatch",
DROP COLUMN "leaseDurationMatch",
DROP COLUMN "moveInDateMatch",
DROP COLUMN "petPolicyMatch",
DROP COLUMN "userAmenities",
DROP COLUMN "userBudgetMidpoint",
DROP COLUMN "userFurnished",
DROP COLUMN "userHasPets",
DROP COLUMN "userHouseholdSize",
DROP COLUMN "userHousingType",
DROP COLUMN "userLat",
DROP COLUMN "userLeaseDuration",
DROP COLUMN "userLng",
DROP COLUMN "userMaxBedrooms",
DROP COLUMN "userMaxBudget",
DROP COLUMN "userMinBedrooms",
DROP COLUMN "userMinBudget",
DROP COLUMN "userMoveInDate",
DROP COLUMN "userNeighborhood",
DROP COLUMN "userPetDetails",
DROP COLUMN "userPreferredLocations",
DROP COLUMN "userPreferredNeighborhoods",
DROP COLUMN "userPreferredPropertyTypes",
DROP COLUMN "userPropertyType",
DROP COLUMN "userSearchRadiusKm";

-- AlterTable
ALTER TABLE "SmartMatchyProfessional" DROP COLUMN "serviceLanguages",
DROP COLUMN "userBudget",
DROP COLUMN "userLocation",
DROP COLUMN "userServiceDate",
DROP COLUMN "userServiceNeeded",
DROP COLUMN "userUrgency";

-- AlterTable
ALTER TABLE "SmartMatchySocialSupport" DROP COLUMN "supportApplicationDeadline",
DROP COLUMN "supportCurrentApplicants",
DROP COLUMN "userFamilySize",
DROP COLUMN "userIncomeLevel",
DROP COLUMN "userLocation",
DROP COLUMN "userNeeds",
DROP COLUMN "userUrgentNeeds",
DROP COLUMN "userVulnerability";

-- CreateTable
CREATE TABLE "UserHousingPreferences" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "minBudget" DOUBLE PRECISION,
    "maxBudget" DOUBLE PRECISION,
    "minBedrooms" INTEGER,
    "preferredNeighborhood" TEXT,
    "preferredLat" DOUBLE PRECISION,
    "preferredLng" DOUBLE PRECISION,
    "searchRadiusKm" DOUBLE PRECISION,
    "preferredPropertyType" TEXT,
    "prefersFurnished" BOOLEAN,
    "hasPets" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHousingPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmploymentPreferences" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "preferredJobType" TEXT,
    "minSalary" DOUBLE PRECISION,
    "maxSalary" DOUBLE PRECISION,
    "skills" JSONB,
    "experienceLevel" TEXT,
    "preferredWorkMode" TEXT,
    "educationLevel" TEXT,
    "isFormal" BOOLEAN DEFAULT false,
    "isInformal" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmploymentPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSocialSupportPreferences" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "needs" JSONB,
    "urgentNeeds" JSONB,
    "familySize" INTEGER,
    "incomeLevel" TEXT,
    "vulnerability" JSONB,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSocialSupportPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfessionalServicesPreferences" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "preferredServices" JSONB,
    "budget" DOUBLE PRECISION,
    "location" TEXT,
    "urgency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfessionalServicesPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHousingPreferences_userUuid_key" ON "UserHousingPreferences"("userUuid");

-- CreateIndex
CREATE INDEX "UserHousingPreferences_userUuid_idx" ON "UserHousingPreferences"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmploymentPreferences_userUuid_key" ON "UserEmploymentPreferences"("userUuid");

-- CreateIndex
CREATE INDEX "UserEmploymentPreferences_userUuid_idx" ON "UserEmploymentPreferences"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "UserSocialSupportPreferences_userUuid_key" ON "UserSocialSupportPreferences"("userUuid");

-- CreateIndex
CREATE INDEX "UserSocialSupportPreferences_userUuid_idx" ON "UserSocialSupportPreferences"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfessionalServicesPreferences_userUuid_key" ON "UserProfessionalServicesPreferences"("userUuid");

-- CreateIndex
CREATE INDEX "UserProfessionalServicesPreferences_userUuid_idx" ON "UserProfessionalServicesPreferences"("userUuid");
