/*
  Warnings:

  - You are about to drop the `SmartMatchInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SmartMatchy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SmartMatchInsight";

-- DropTable
DROP TABLE "SmartMatchy";

-- DropTable
DROP TABLE "UserEvent";

-- CreateTable
CREATE TABLE "SmartMatchyBase" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featureSetVersion" TEXT NOT NULL,
    "userLat" DOUBLE PRECISION,
    "userLng" DOUBLE PRECISION,
    "listingLat" DOUBLE PRECISION,
    "listingLng" DOUBLE PRECISION,
    "locationDistance" DOUBLE PRECISION,
    "listingPrice" DOUBLE PRECISION,
    "listingCurrency" TEXT DEFAULT 'KES',
    "sessionDevice" TEXT,
    "sessionPlatform" TEXT,
    "deviceType" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "isBot" BOOLEAN DEFAULT false,
    "interactionType" TEXT,
    "scrollDepth" INTEGER,
    "viewDuration" INTEGER,
    "dwellTime" INTEGER,
    "hourOfDay" INTEGER,
    "dayOfWeek" INTEGER,
    "isWeekend" BOOLEAN,
    "overallMatchScore" DOUBLE PRECISION,
    "locationScore" DOUBLE PRECISION,
    "priceScore" DOUBLE PRECISION,
    "recencyScore" DOUBLE PRECISION,
    "userClicked" BOOLEAN DEFAULT false,
    "userSaved" BOOLEAN DEFAULT false,
    "userContacted" BOOLEAN DEFAULT false,
    "userConverted" BOOLEAN DEFAULT false,
    "engagementScore" DOUBLE PRECISION,
    "aiEventType" TEXT,
    "recommendationId" TEXT,
    "experimentId" TEXT,
    "experimentVariant" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartMatchyBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatchyEmployment" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "userJobType" TEXT,
    "userMinSalary" DOUBLE PRECISION,
    "userMaxSalary" DOUBLE PRECISION,
    "userSkills" JSONB,
    "userExperience" TEXT,
    "userWorkMode" TEXT,
    "userEducation" TEXT,
    "userIsFormal" BOOLEAN DEFAULT false,
    "userIsInformal" BOOLEAN DEFAULT false,
    "jobType" TEXT,
    "jobSalaryMin" DOUBLE PRECISION,
    "jobSalaryMax" DOUBLE PRECISION,
    "jobSalaryPeriod" TEXT,
    "jobSkillsReq" JSONB,
    "jobExperienceReq" TEXT,
    "jobWorkMode" TEXT,
    "jobEducationReq" TEXT,
    "jobUrgency" TEXT,
    "jobIsFormal" BOOLEAN DEFAULT false,
    "jobIsInformal" BOOLEAN DEFAULT false,
    "salaryMatchRatio" DOUBLE PRECISION,
    "skillsMatchScore" DOUBLE PRECISION,
    "experienceMatch" BOOLEAN,
    "educationMatch" BOOLEAN,
    "userApplied" BOOLEAN DEFAULT false,

    CONSTRAINT "SmartMatchyEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatchyHousing" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "userMinBudget" DOUBLE PRECISION,
    "userMaxBudget" DOUBLE PRECISION,
    "userMinBedrooms" INTEGER,
    "userMaxBedrooms" INTEGER,
    "userPropertyType" TEXT,
    "userNeighborhood" TEXT,
    "userFurnished" BOOLEAN,
    "userAmenities" JSONB,
    "userHousingType" TEXT,
    "housingType" TEXT,
    "housingBedrooms" INTEGER,
    "housingBathrooms" INTEGER,
    "housingPropertyType" TEXT,
    "housingNeighborhood" TEXT,
    "housingIsFurnished" BOOLEAN DEFAULT false,
    "housingAmenities" JSONB,
    "housingMinimumStay" TEXT,
    "housingSquareFootage" INTEGER,
    "housingYearBuilt" INTEGER,
    "priceToBudgetRatio" DOUBLE PRECISION,
    "isWithinBudget" BOOLEAN,
    "bedroomsMatch" BOOLEAN,
    "bathroomsMatch" BOOLEAN,
    "propertyTypeMatch" BOOLEAN,
    "furnishedMatch" BOOLEAN,
    "amenityMatchScore" DOUBLE PRECISION,
    "userScheduledViewing" BOOLEAN DEFAULT false,
    "userCompletedViewing" BOOLEAN DEFAULT false,

    CONSTRAINT "SmartMatchyHousing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatchySocialSupport" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "userNeeds" JSONB,
    "userUrgentNeeds" JSONB,
    "userFamilySize" INTEGER,
    "userIncomeLevel" TEXT,
    "userVulnerability" JSONB,
    "userLocation" TEXT,
    "supportType" TEXT,
    "supportProvider" TEXT,
    "supportAmount" DOUBLE PRECISION,
    "supportItems" JSONB,
    "supportEligibility" JSONB,
    "supportCapacity" INTEGER,
    "supportCurrentApplicants" INTEGER,
    "supportIsUrgent" BOOLEAN DEFAULT false,
    "supportApplicationDeadline" TIMESTAMP(3),
    "supportLocation" TEXT,
    "needMatchScore" DOUBLE PRECISION,
    "urgencyMatch" BOOLEAN,
    "eligibilityMatch" BOOLEAN,
    "locationMatch" BOOLEAN,
    "userApplied" BOOLEAN DEFAULT false,
    "userReceived" BOOLEAN DEFAULT false,

    CONSTRAINT "SmartMatchySocialSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatchyProfessional" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "userServiceNeeded" TEXT,
    "userBudget" DOUBLE PRECISION,
    "userLocation" TEXT,
    "userUrgency" TEXT,
    "userServiceDate" TIMESTAMP(3),
    "serviceType" TEXT,
    "serviceHourlyRate" DOUBLE PRECISION,
    "serviceFixedPrice" DOUBLE PRECISION,
    "serviceAreas" JSONB,
    "serviceExperience" INTEGER,
    "serviceVerified" BOOLEAN DEFAULT false,
    "serviceRating" DOUBLE PRECISION,
    "serviceAvailability" JSONB,
    "serviceLanguages" JSONB,
    "priceMatchRatio" DOUBLE PRECISION,
    "locationMatch" BOOLEAN,
    "experienceMatch" BOOLEAN,
    "availabilityMatch" BOOLEAN,
    "userBooked" BOOLEAN DEFAULT false,
    "userCompleted" BOOLEAN DEFAULT false,
    "userRating" INTEGER,
    "userReview" TEXT,

    CONSTRAINT "SmartMatchyProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_listingId_idx" ON "SmartMatchyBase"("userUuid", "listingId");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_timestamp_idx" ON "SmartMatchyBase"("userUuid", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_listingId_timestamp_idx" ON "SmartMatchyBase"("listingId", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_userConverted_idx" ON "SmartMatchyBase"("userUuid", "userConverted");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_userClicked_idx" ON "SmartMatchyBase"("userUuid", "userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_userSaved_idx" ON "SmartMatchyBase"("userUuid", "userSaved");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userUuid_userContacted_idx" ON "SmartMatchyBase"("userUuid", "userContacted");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_vertical_timestamp_idx" ON "SmartMatchyBase"("vertical", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_timestamp_vertical_userConverted_idx" ON "SmartMatchyBase"("timestamp", "vertical", "userConverted");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_overallMatchScore_idx" ON "SmartMatchyBase"("overallMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userClicked_idx" ON "SmartMatchyBase"("userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userConverted_idx" ON "SmartMatchyBase"("userConverted");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userSaved_idx" ON "SmartMatchyBase"("userSaved");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_deviceType_idx" ON "SmartMatchyBase"("deviceType");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_sessionPlatform_idx" ON "SmartMatchyBase"("sessionPlatform");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_isBot_idx" ON "SmartMatchyBase"("isBot");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_hourOfDay_idx" ON "SmartMatchyBase"("hourOfDay");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_dayOfWeek_idx" ON "SmartMatchyBase"("dayOfWeek");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_isWeekend_idx" ON "SmartMatchyBase"("isWeekend");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_experimentId_idx" ON "SmartMatchyBase"("experimentId");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_experimentId_experimentVariant_idx" ON "SmartMatchyBase"("experimentId", "experimentVariant");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_recommendationId_idx" ON "SmartMatchyBase"("recommendationId");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_aiEventType_timestamp_idx" ON "SmartMatchyBase"("aiEventType", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_listingLat_listingLng_idx" ON "SmartMatchyBase"("listingLat", "listingLng");

-- CreateIndex
CREATE INDEX "SmartMatchyBase_userLat_userLng_idx" ON "SmartMatchyBase"("userLat", "userLng");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMatchyEmployment_baseId_key" ON "SmartMatchyEmployment"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_baseId_idx" ON "SmartMatchyEmployment"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_jobType_idx" ON "SmartMatchyEmployment"("jobType");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_userIsFormal_idx" ON "SmartMatchyEmployment"("userIsFormal");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_userIsInformal_idx" ON "SmartMatchyEmployment"("userIsInformal");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_skillsMatchScore_idx" ON "SmartMatchyEmployment"("skillsMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_userApplied_idx" ON "SmartMatchyEmployment"("userApplied");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_userMinSalary_jobSalaryMax_idx" ON "SmartMatchyEmployment"("userMinSalary", "jobSalaryMax");

-- CreateIndex
CREATE INDEX "SmartMatchyEmployment_userSkills_jobSkillsReq_idx" ON "SmartMatchyEmployment"("userSkills", "jobSkillsReq");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMatchyHousing_baseId_key" ON "SmartMatchyHousing"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_baseId_idx" ON "SmartMatchyHousing"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_housingType_idx" ON "SmartMatchyHousing"("housingType");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_housingNeighborhood_idx" ON "SmartMatchyHousing"("housingNeighborhood");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_isWithinBudget_idx" ON "SmartMatchyHousing"("isWithinBudget");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userMinBudget_userMaxBudget_idx" ON "SmartMatchyHousing"("userMinBudget", "userMaxBudget");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userMinBedrooms_userMaxBedrooms_idx" ON "SmartMatchyHousing"("userMinBedrooms", "userMaxBedrooms");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userScheduledViewing_idx" ON "SmartMatchyHousing"("userScheduledViewing");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userCompletedViewing_idx" ON "SmartMatchyHousing"("userCompletedViewing");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMatchySocialSupport_baseId_key" ON "SmartMatchySocialSupport"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_baseId_idx" ON "SmartMatchySocialSupport"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_supportType_idx" ON "SmartMatchySocialSupport"("supportType");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_supportIsUrgent_idx" ON "SmartMatchySocialSupport"("supportIsUrgent");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_needMatchScore_idx" ON "SmartMatchySocialSupport"("needMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_userApplied_idx" ON "SmartMatchySocialSupport"("userApplied");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_userReceived_idx" ON "SmartMatchySocialSupport"("userReceived");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_supportProvider_idx" ON "SmartMatchySocialSupport"("supportProvider");

-- CreateIndex
CREATE INDEX "SmartMatchySocialSupport_supportLocation_idx" ON "SmartMatchySocialSupport"("supportLocation");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMatchyProfessional_baseId_key" ON "SmartMatchyProfessional"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_baseId_idx" ON "SmartMatchyProfessional"("baseId");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_serviceType_idx" ON "SmartMatchyProfessional"("serviceType");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_serviceVerified_idx" ON "SmartMatchyProfessional"("serviceVerified");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_userBooked_idx" ON "SmartMatchyProfessional"("userBooked");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_userCompleted_idx" ON "SmartMatchyProfessional"("userCompleted");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_serviceRating_idx" ON "SmartMatchyProfessional"("serviceRating");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_serviceExperience_idx" ON "SmartMatchyProfessional"("serviceExperience");

-- CreateIndex
CREATE INDEX "SmartMatchyProfessional_userServiceNeeded_idx" ON "SmartMatchyProfessional"("userServiceNeeded");
