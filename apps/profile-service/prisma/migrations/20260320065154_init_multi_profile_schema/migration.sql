/*
  Warnings:

  - The `verifiedFeatures` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `accountId` on the `AccountVerification` table. All the data in the column will be lost.
  - You are about to drop the column `userUuid` on the `JobSeekerProfile` table. All the data in the column will be lost.
  - The `industries` column on the `JobSeekerProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `jobTypes` column on the `JobSeekerProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `skills` column on the `JobSeekerProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `phone` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `organizationUuid` on the `OrganizationProfile` table. All the data in the column will be lost.
  - You are about to drop the column `typeSlug` on the `OrganizationProfile` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `userCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ContractorProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HousingPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProfileCompletion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[accountUuid,type]` on the table `AccountVerification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountUuid]` on the table `JobSeekerProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountUuid]` on the table `OrganizationProfile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountUuid` to the `AccountVerification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountUuid` to the `JobSeekerProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OrganizationMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountUuid` to the `OrganizationProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `OrganizationProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OrganizationProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountUuid` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AccountVerification" DROP CONSTRAINT "AccountVerification_accountId_fkey";

-- DropForeignKey
ALTER TABLE "ContractorProfile" DROP CONSTRAINT "ContractorProfile_accountId_fkey";

-- DropForeignKey
ALTER TABLE "HousingPreference" DROP CONSTRAINT "HousingPreference_userUuid_fkey";

-- DropForeignKey
ALTER TABLE "JobSeekerProfile" DROP CONSTRAINT "JobSeekerProfile_userUuid_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_accountId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_organizationUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_organizationUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationProfile" DROP CONSTRAINT "OrganizationProfile_organizationUuid_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationProfile" DROP CONSTRAINT "OrganizationProfile_typeSlug_fkey";

-- DropForeignKey
ALTER TABLE "ProfileCompletion" DROP CONSTRAINT "ProfileCompletion_organizationUuid_fkey";

-- DropForeignKey
ALTER TABLE "ProfileCompletion" DROP CONSTRAINT "ProfileCompletion_userUuid_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_accountId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_userUuid_fkey";

-- DropIndex
DROP INDEX "AccountVerification_accountId_type_key";

-- DropIndex
DROP INDEX "JobSeekerProfile_userUuid_key";

-- DropIndex
DROP INDEX "OrganizationInvitation_expiresAt_idx";

-- DropIndex
DROP INDEX "OrganizationProfile_organizationUuid_key";

-- DropIndex
DROP INDEX "User_userCode_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "activeProfiles" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "userRole" TEXT NOT NULL DEFAULT 'GeneralUser',
DROP COLUMN "verifiedFeatures",
ADD COLUMN     "verifiedFeatures" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "AccountVerification" DROP COLUMN "accountId",
ADD COLUMN     "accountUuid" TEXT NOT NULL,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "verifiedByUuid" TEXT;

-- AlterTable
ALTER TABLE "JobSeekerProfile" DROP COLUMN "userUuid",
ADD COLUMN     "accountUuid" TEXT NOT NULL,
ADD COLUMN     "agentUuid" TEXT,
ADD COLUMN     "expectedSalary" DOUBLE PRECISION,
ADD COLUMN     "githubUrl" TEXT,
ADD COLUMN     "hasAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedInUrl" TEXT,
ADD COLUMN     "portfolioImages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "workAuthorization" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "industries",
ADD COLUMN     "industries" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "jobTypes",
ADD COLUMN     "jobTypes" JSONB NOT NULL DEFAULT '[]',
DROP COLUMN "skills",
ADD COLUMN     "skills" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP COLUMN "phone",
ADD COLUMN     "acceptedByUserUuid" TEXT;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationProfile" DROP COLUMN "organizationUuid",
DROP COLUMN "typeSlug",
ADD COLUMN     "accountUuid" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountId",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "userCode",
ADD COLUMN     "accountUuid" TEXT NOT NULL,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "ContractorProfile";

-- DropTable
DROP TABLE "HousingPreference";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "OrganizationType";

-- DropTable
DROP TABLE "ProfileCompletion";

-- DropTable
DROP TABLE "UserProfile";

-- CreateTable
CREATE TABLE "IndividualProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndividualProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployerProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "companyName" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "foundedYear" INTEGER,
    "description" TEXT,
    "logo" TEXT,
    "preferredSkills" JSONB NOT NULL DEFAULT '[]',
    "remotePolicy" TEXT,
    "isVerifiedEmployer" BOOLEAN NOT NULL DEFAULT false,
    "worksWithAgents" BOOLEAN NOT NULL DEFAULT false,
    "preferredAgents" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwnerProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "isProfessional" BOOLEAN NOT NULL DEFAULT false,
    "licenseNumber" TEXT,
    "companyName" TEXT,
    "yearsInBusiness" INTEGER,
    "preferredPropertyTypes" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "isVerifiedOwner" BOOLEAN NOT NULL DEFAULT false,
    "usesAgent" BOOLEAN NOT NULL DEFAULT false,
    "managingAgentUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingSeekerProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "minBedrooms" INTEGER NOT NULL DEFAULT 0,
    "maxBedrooms" INTEGER NOT NULL DEFAULT 5,
    "minBudget" DOUBLE PRECISION,
    "maxBudget" DOUBLE PRECISION,
    "preferredTypes" JSONB NOT NULL DEFAULT '[]',
    "preferredCities" JSONB NOT NULL DEFAULT '[]',
    "preferredNeighborhoods" JSONB NOT NULL DEFAULT '[]',
    "moveInDate" TIMESTAMP(3),
    "leaseDuration" TEXT,
    "householdSize" INTEGER DEFAULT 1,
    "hasPets" BOOLEAN DEFAULT false,
    "petDetails" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "searchRadiusKm" INTEGER DEFAULT 10,
    "hasAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingSeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialServiceProviderProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "servicesOffered" JSONB NOT NULL DEFAULT '[]',
    "targetBeneficiaries" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verificationDocument" TEXT,
    "about" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "officeHours" TEXT,
    "physicalAddress" TEXT,
    "peopleServed" INTEGER DEFAULT 0,
    "yearEstablished" INTEGER,
    "acceptsDonations" BOOLEAN NOT NULL DEFAULT false,
    "needsVolunteers" BOOLEAN NOT NULL DEFAULT false,
    "donationInfo" TEXT,
    "volunteerNeeds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialServiceProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportBeneficiaryProfile" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "needs" JSONB NOT NULL DEFAULT '[]',
    "urgentNeeds" JSONB NOT NULL DEFAULT '[]',
    "familySize" INTEGER,
    "dependents" INTEGER,
    "householdComposition" TEXT,
    "vulnerabilityFactors" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "landmark" TEXT,
    "prefersAnonymity" BOOLEAN NOT NULL DEFAULT true,
    "languagePreference" JSONB NOT NULL DEFAULT '[]',
    "consentToShare" BOOLEAN NOT NULL DEFAULT false,
    "consentGivenAt" TIMESTAMP(3),
    "consentExpiresAt" TIMESTAMP(3),
    "referredBy" TEXT,
    "referredByUuid" TEXT,
    "caseWorkerUuid" TEXT,
    "caseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportBeneficiaryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkilledProfessionalProfile" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "title" TEXT,
    "profession" TEXT,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "yearsExperience" INTEGER,
    "licenseNumber" TEXT,
    "insuranceInfo" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "dailyRate" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "availableToday" BOOLEAN DEFAULT false,
    "availableWeekends" BOOLEAN DEFAULT true,
    "emergencyService" BOOLEAN DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION,
    "portfolioImages" JSONB NOT NULL DEFAULT '[]',
    "portfolioVideos" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkilledProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntermediaryAgentProfile" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "specializations" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "licenseNumber" TEXT,
    "licenseBody" TEXT,
    "yearsExperience" INTEGER,
    "agencyName" TEXT,
    "agencyUuid" TEXT,
    "commissionRate" DOUBLE PRECISION,
    "feeStructure" TEXT,
    "minimumFee" DOUBLE PRECISION,
    "typicalFee" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "completedDeals" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "about" TEXT,
    "profileImage" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "clientTypes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntermediaryAgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndividualProfile_accountUuid_key" ON "IndividualProfile"("accountUuid");

-- CreateIndex
CREATE UNIQUE INDEX "IndividualProfile_nationalId_key" ON "IndividualProfile"("nationalId");

-- CreateIndex
CREATE INDEX "IndividualProfile_accountUuid_idx" ON "IndividualProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "IndividualProfile_nationalId_idx" ON "IndividualProfile"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerProfile_accountUuid_key" ON "EmployerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "EmployerProfile_accountUuid_idx" ON "EmployerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "EmployerProfile_industry_idx" ON "EmployerProfile"("industry");

-- CreateIndex
CREATE INDEX "EmployerProfile_isVerifiedEmployer_idx" ON "EmployerProfile"("isVerifiedEmployer");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwnerProfile_accountUuid_key" ON "PropertyOwnerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "PropertyOwnerProfile_accountUuid_idx" ON "PropertyOwnerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "PropertyOwnerProfile_isProfessional_idx" ON "PropertyOwnerProfile"("isProfessional");

-- CreateIndex
CREATE INDEX "PropertyOwnerProfile_isVerifiedOwner_idx" ON "PropertyOwnerProfile"("isVerifiedOwner");

-- CreateIndex
CREATE UNIQUE INDEX "HousingSeekerProfile_accountUuid_key" ON "HousingSeekerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "HousingSeekerProfile_accountUuid_idx" ON "HousingSeekerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "HousingSeekerProfile_maxBudget_idx" ON "HousingSeekerProfile"("maxBudget");

-- CreateIndex
CREATE UNIQUE INDEX "SocialServiceProviderProfile_accountUuid_key" ON "SocialServiceProviderProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SocialServiceProviderProfile_accountUuid_idx" ON "SocialServiceProviderProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SocialServiceProviderProfile_providerType_idx" ON "SocialServiceProviderProfile"("providerType");

-- CreateIndex
CREATE INDEX "SocialServiceProviderProfile_isVerified_idx" ON "SocialServiceProviderProfile"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "SupportBeneficiaryProfile_accountUuid_key" ON "SupportBeneficiaryProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SupportBeneficiaryProfile_accountUuid_idx" ON "SupportBeneficiaryProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SupportBeneficiaryProfile_city_idx" ON "SupportBeneficiaryProfile"("city");

-- CreateIndex
CREATE UNIQUE INDEX "SkilledProfessionalProfile_uuid_key" ON "SkilledProfessionalProfile"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "SkilledProfessionalProfile_accountUuid_key" ON "SkilledProfessionalProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SkilledProfessionalProfile_accountUuid_idx" ON "SkilledProfessionalProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "SkilledProfessionalProfile_profession_idx" ON "SkilledProfessionalProfile"("profession");

-- CreateIndex
CREATE INDEX "SkilledProfessionalProfile_isVerified_idx" ON "SkilledProfessionalProfile"("isVerified");

-- CreateIndex
CREATE INDEX "SkilledProfessionalProfile_averageRating_idx" ON "SkilledProfessionalProfile"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "IntermediaryAgentProfile_uuid_key" ON "IntermediaryAgentProfile"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "IntermediaryAgentProfile_accountUuid_key" ON "IntermediaryAgentProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "IntermediaryAgentProfile_accountUuid_idx" ON "IntermediaryAgentProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "IntermediaryAgentProfile_agentType_idx" ON "IntermediaryAgentProfile"("agentType");

-- CreateIndex
CREATE INDEX "IntermediaryAgentProfile_isVerified_idx" ON "IntermediaryAgentProfile"("isVerified");

-- CreateIndex
CREATE INDEX "IntermediaryAgentProfile_averageRating_idx" ON "IntermediaryAgentProfile"("averageRating");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_isVerified_idx" ON "Account"("isVerified");

-- CreateIndex
CREATE INDEX "Account_userRole_idx" ON "Account"("userRole");

-- CreateIndex
CREATE INDEX "AccountVerification_accountUuid_idx" ON "AccountVerification"("accountUuid");

-- CreateIndex
CREATE INDEX "AccountVerification_status_idx" ON "AccountVerification"("status");

-- CreateIndex
CREATE INDEX "AccountVerification_type_idx" ON "AccountVerification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AccountVerification_accountUuid_type_key" ON "AccountVerification"("accountUuid", "type");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerProfile_accountUuid_key" ON "JobSeekerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "JobSeekerProfile_accountUuid_idx" ON "JobSeekerProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "JobSeekerProfile_isActivelySeeking_idx" ON "JobSeekerProfile"("isActivelySeeking");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_acceptedByUserUuid_idx" ON "OrganizationInvitation"("acceptedByUserUuid");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationUuid_idx" ON "OrganizationMember"("organizationUuid");

-- CreateIndex
CREATE INDEX "OrganizationMember_userUuid_idx" ON "OrganizationMember"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_accountUuid_key" ON "OrganizationProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "OrganizationProfile_accountUuid_idx" ON "OrganizationProfile"("accountUuid");

-- CreateIndex
CREATE INDEX "OrganizationProfile_type_idx" ON "OrganizationProfile"("type");

-- CreateIndex
CREATE INDEX "OrganizationProfile_registrationNo_idx" ON "OrganizationProfile"("registrationNo");

-- CreateIndex
CREATE INDEX "User_accountUuid_idx" ON "User"("accountUuid");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualProfile" ADD CONSTRAINT "IndividualProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationUuid_fkey" FOREIGN KEY ("organizationUuid") REFERENCES "OrganizationProfile"("accountUuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationUuid_fkey" FOREIGN KEY ("organizationUuid") REFERENCES "OrganizationProfile"("accountUuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_acceptedByUserUuid_fkey" FOREIGN KEY ("acceptedByUserUuid") REFERENCES "User"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerProfile" ADD CONSTRAINT "EmployerProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeekerProfile" ADD CONSTRAINT "JobSeekerProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnerProfile" ADD CONSTRAINT "PropertyOwnerProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousingSeekerProfile" ADD CONSTRAINT "HousingSeekerProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialServiceProviderProfile" ADD CONSTRAINT "SocialServiceProviderProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportBeneficiaryProfile" ADD CONSTRAINT "SupportBeneficiaryProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkilledProfessionalProfile" ADD CONSTRAINT "SkilledProfessionalProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntermediaryAgentProfile" ADD CONSTRAINT "IntermediaryAgentProfile_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountVerification" ADD CONSTRAINT "AccountVerification_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
