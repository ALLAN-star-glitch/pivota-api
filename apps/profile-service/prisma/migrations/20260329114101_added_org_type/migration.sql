/*
  Warnings:

  - You are about to drop the column `type` on the `OrganizationProfile` table. All the data in the column will be lost.
  - You are about to drop the `AccountVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HousingSeekerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntermediaryAgentProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobSeekerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyOwnerProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SkilledProfessionalProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SocialServiceProviderProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportBeneficiaryProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AccountVerification" DROP CONSTRAINT "AccountVerification_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "EmployerProfile" DROP CONSTRAINT "EmployerProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "HousingSeekerProfile" DROP CONSTRAINT "HousingSeekerProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "IntermediaryAgentProfile" DROP CONSTRAINT "IntermediaryAgentProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "JobSeekerProfile" DROP CONSTRAINT "JobSeekerProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "PropertyOwnerProfile" DROP CONSTRAINT "PropertyOwnerProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "SkilledProfessionalProfile" DROP CONSTRAINT "SkilledProfessionalProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "SocialServiceProviderProfile" DROP CONSTRAINT "SocialServiceProviderProfile_accountUuid_fkey";

-- DropForeignKey
ALTER TABLE "SupportBeneficiaryProfile" DROP CONSTRAINT "SupportBeneficiaryProfile_accountUuid_fkey";

-- DropIndex
DROP INDEX "OrganizationProfile_type_idx";

-- AlterTable
ALTER TABLE "OrganizationProfile" DROP COLUMN "type",
ADD COLUMN     "typeSlug" TEXT;

-- DropTable
DROP TABLE "AccountVerification";

-- DropTable
DROP TABLE "EmployerProfile";

-- DropTable
DROP TABLE "HousingSeekerProfile";

-- DropTable
DROP TABLE "IntermediaryAgentProfile";

-- DropTable
DROP TABLE "JobSeekerProfile";

-- DropTable
DROP TABLE "PropertyOwnerProfile";

-- DropTable
DROP TABLE "SkilledProfessionalProfile";

-- DropTable
DROP TABLE "SocialServiceProviderProfile";

-- DropTable
DROP TABLE "SupportBeneficiaryProfile";

-- CreateTable
CREATE TABLE "organization_types" (
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_types_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "employer_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "companyName" TEXT,
    "businessName" TEXT,
    "industry" TEXT NOT NULL,
    "companySize" TEXT NOT NULL,
    "preferredSkills" JSONB NOT NULL DEFAULT '[]',
    "foundedYear" INTEGER,
    "description" TEXT,
    "logo" TEXT,
    "remotePolicy" TEXT,
    "isVerifiedEmployer" BOOLEAN NOT NULL DEFAULT false,
    "worksWithAgents" BOOLEAN NOT NULL DEFAULT false,
    "preferredAgents" JSONB NOT NULL DEFAULT '[]',
    "isRegistered" BOOLEAN DEFAULT false,
    "yearsExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_seeker_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "expectedSalary" DOUBLE PRECISION NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "jobTypes" JSONB NOT NULL DEFAULT '[]',
    "isActivelySeeking" BOOLEAN NOT NULL DEFAULT false,
    "industries" JSONB NOT NULL DEFAULT '[]',
    "seniorityLevel" TEXT,
    "noticePeriod" TEXT,
    "workAuthorization" JSONB NOT NULL DEFAULT '[]',
    "cvUrl" TEXT,
    "cvLastUpdated" TIMESTAMP(3),
    "portfolioImages" JSONB NOT NULL DEFAULT '[]',
    "linkedInUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "hasAgent" BOOLEAN NOT NULL DEFAULT false,
    "agentUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_seeker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_owner_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "companyName" TEXT,
    "businessName" TEXT,
    "preferredPropertyTypes" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "isProfessional" BOOLEAN NOT NULL DEFAULT false,
    "licenseNumber" TEXT,
    "yearsInBusiness" INTEGER,
    "isVerifiedOwner" BOOLEAN NOT NULL DEFAULT false,
    "usesAgent" BOOLEAN NOT NULL DEFAULT false,
    "managingAgentUuid" TEXT,
    "propertyCount" INTEGER,
    "propertyTypes" JSONB DEFAULT '[]',
    "propertyPurpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "housing_seeker_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "minBudget" DOUBLE PRECISION NOT NULL,
    "maxBudget" DOUBLE PRECISION NOT NULL,
    "preferredTypes" JSONB NOT NULL DEFAULT '[]',
    "preferredCities" JSONB NOT NULL DEFAULT '[]',
    "minBedrooms" INTEGER NOT NULL DEFAULT 0,
    "maxBedrooms" INTEGER NOT NULL DEFAULT 5,
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

    CONSTRAINT "housing_seeker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_service_provider_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "companyName" TEXT,
    "operatingName" TEXT,
    "providerType" TEXT NOT NULL,
    "servicesOffered" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "targetBeneficiaries" JSONB NOT NULL DEFAULT '[]',
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
    "yearsExperience" INTEGER,
    "qualifications" JSONB DEFAULT '[]',
    "availability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_service_provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_beneficiary_profiles" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "needs" JSONB NOT NULL DEFAULT '[]',
    "city" TEXT NOT NULL,
    "urgentNeeds" JSONB NOT NULL DEFAULT '[]',
    "familySize" INTEGER,
    "dependents" INTEGER,
    "householdComposition" TEXT,
    "vulnerabilityFactors" JSONB NOT NULL DEFAULT '[]',
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

    CONSTRAINT "support_beneficiary_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skilled_professional_profiles" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "yearsExperience" INTEGER NOT NULL,
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

    CONSTRAINT "skilled_professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intermediary_agent_profiles" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "agencyName" TEXT,
    "businessName" TEXT,
    "agentType" TEXT NOT NULL,
    "specializations" JSONB NOT NULL DEFAULT '[]',
    "serviceAreas" JSONB NOT NULL DEFAULT '[]',
    "licenseNumber" TEXT NOT NULL,
    "licenseBody" TEXT,
    "yearsExperience" INTEGER,
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

    CONSTRAINT "intermediary_agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_verifications" (
    "id" TEXT NOT NULL,
    "accountUuid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "documentType" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedByUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_profiles_accountUuid_key" ON "employer_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "employer_profiles_accountUuid_idx" ON "employer_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "employer_profiles_industry_idx" ON "employer_profiles"("industry");

-- CreateIndex
CREATE INDEX "employer_profiles_isVerifiedEmployer_idx" ON "employer_profiles"("isVerifiedEmployer");

-- CreateIndex
CREATE UNIQUE INDEX "job_seeker_profiles_accountUuid_key" ON "job_seeker_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "job_seeker_profiles_accountUuid_idx" ON "job_seeker_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "job_seeker_profiles_isActivelySeeking_idx" ON "job_seeker_profiles"("isActivelySeeking");

-- CreateIndex
CREATE UNIQUE INDEX "property_owner_profiles_accountUuid_key" ON "property_owner_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "property_owner_profiles_accountUuid_idx" ON "property_owner_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "property_owner_profiles_isProfessional_idx" ON "property_owner_profiles"("isProfessional");

-- CreateIndex
CREATE INDEX "property_owner_profiles_isVerifiedOwner_idx" ON "property_owner_profiles"("isVerifiedOwner");

-- CreateIndex
CREATE UNIQUE INDEX "housing_seeker_profiles_accountUuid_key" ON "housing_seeker_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "housing_seeker_profiles_accountUuid_idx" ON "housing_seeker_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "housing_seeker_profiles_maxBudget_idx" ON "housing_seeker_profiles"("maxBudget");

-- CreateIndex
CREATE UNIQUE INDEX "social_service_provider_profiles_accountUuid_key" ON "social_service_provider_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "social_service_provider_profiles_accountUuid_idx" ON "social_service_provider_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "social_service_provider_profiles_providerType_idx" ON "social_service_provider_profiles"("providerType");

-- CreateIndex
CREATE INDEX "social_service_provider_profiles_isVerified_idx" ON "social_service_provider_profiles"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "support_beneficiary_profiles_accountUuid_key" ON "support_beneficiary_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "support_beneficiary_profiles_accountUuid_idx" ON "support_beneficiary_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "support_beneficiary_profiles_city_idx" ON "support_beneficiary_profiles"("city");

-- CreateIndex
CREATE UNIQUE INDEX "skilled_professional_profiles_uuid_key" ON "skilled_professional_profiles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "skilled_professional_profiles_accountUuid_key" ON "skilled_professional_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "skilled_professional_profiles_accountUuid_idx" ON "skilled_professional_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "skilled_professional_profiles_profession_idx" ON "skilled_professional_profiles"("profession");

-- CreateIndex
CREATE INDEX "skilled_professional_profiles_isVerified_idx" ON "skilled_professional_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "skilled_professional_profiles_averageRating_idx" ON "skilled_professional_profiles"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "intermediary_agent_profiles_uuid_key" ON "intermediary_agent_profiles"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "intermediary_agent_profiles_accountUuid_key" ON "intermediary_agent_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "intermediary_agent_profiles_accountUuid_idx" ON "intermediary_agent_profiles"("accountUuid");

-- CreateIndex
CREATE INDEX "intermediary_agent_profiles_agentType_idx" ON "intermediary_agent_profiles"("agentType");

-- CreateIndex
CREATE INDEX "intermediary_agent_profiles_isVerified_idx" ON "intermediary_agent_profiles"("isVerified");

-- CreateIndex
CREATE INDEX "intermediary_agent_profiles_averageRating_idx" ON "intermediary_agent_profiles"("averageRating");

-- CreateIndex
CREATE INDEX "account_verifications_accountUuid_idx" ON "account_verifications"("accountUuid");

-- CreateIndex
CREATE INDEX "account_verifications_status_idx" ON "account_verifications"("status");

-- CreateIndex
CREATE INDEX "account_verifications_type_idx" ON "account_verifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "account_verifications_accountUuid_type_key" ON "account_verifications"("accountUuid", "type");

-- CreateIndex
CREATE INDEX "OrganizationProfile_typeSlug_idx" ON "OrganizationProfile"("typeSlug");

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_typeSlug_fkey" FOREIGN KEY ("typeSlug") REFERENCES "organization_types"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_seeker_profiles" ADD CONSTRAINT "job_seeker_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_owner_profiles" ADD CONSTRAINT "property_owner_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_seeker_profiles" ADD CONSTRAINT "housing_seeker_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_service_provider_profiles" ADD CONSTRAINT "social_service_provider_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_beneficiary_profiles" ADD CONSTRAINT "support_beneficiary_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skilled_professional_profiles" ADD CONSTRAINT "skilled_professional_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intermediary_agent_profiles" ADD CONSTRAINT "intermediary_agent_profiles_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_accountUuid_fkey" FOREIGN KEY ("accountUuid") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
