/*
  Warnings:

  - You are about to drop the column `avgPrice` on the `CategoryMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `jobsCompleted` on the `CategoryMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `jobsCreated` on the `CategoryMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `jobCount` on the `CountyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `revenue` on the `CountyMetrics` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[categorySlug,vertical,date]` on the table `CategoryMetrics` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `CategoryMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TrustMetrics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventAction` to the `UserEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventCategory` to the `UserEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CategoryMetrics_categorySlug_date_key";

-- DropIndex
DROP INDEX "UserEvent_eventType_idx";

-- DropIndex
DROP INDEX "UserEvent_userUuid_idx";

-- DropIndex
DROP INDEX "UserEvent_vertical_idx";

-- AlterTable
ALTER TABLE "CategoryMetrics" DROP COLUMN "avgPrice",
DROP COLUMN "jobsCompleted",
DROP COLUMN "jobsCreated",
ADD COLUMN     "activeListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgListingsPerProvider" DOUBLE PRECISION,
ADD COLUMN     "avgSearchPosition" DOUBLE PRECISION,
ADD COLUMN     "avgTransactionValue" DOUBLE PRECISION,
ADD COLUMN     "avgViewDuration" INTEGER,
ADD COLUMN     "categoryHealth" DOUBLE PRECISION,
ADD COLUMN     "contactCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creatorAccounts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expiredListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingAmenitiesCount" DOUBLE PRECISION,
ADD COLUMN     "housingApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingAvgBathrooms" DOUBLE PRECISION,
ADD COLUMN     "housingAvgBedrooms" DOUBLE PRECISION,
ADD COLUMN     "housingAvgPhotosPerListing" DOUBLE PRECISION,
ADD COLUMN     "housingAvgPricePerSqm" DOUBLE PRECISION,
ADD COLUMN     "housingAvgRentPrice" DOUBLE PRECISION,
ADD COLUMN     "housingAvgSalePrice" DOUBLE PRECISION,
ADD COLUMN     "housingAvgSize" DOUBLE PRECISION,
ADD COLUMN     "housingCommercialListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingDaysOnMarket" DOUBLE PRECISION,
ADD COLUMN     "housingFurnishedPercent" DOUBLE PRECISION,
ADD COLUMN     "housingListingsWithViewings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingMapExplores" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingMaxPrice" DOUBLE PRECISION,
ADD COLUMN     "housingMinPrice" DOUBLE PRECISION,
ADD COLUMN     "housingPhotoSwipeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingPhotoViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingPriceReductionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingPriceVolatility" DOUBLE PRECISION,
ADD COLUMN     "housingRentalListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingSaleListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingShortstayListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingTopAmenities" JSONB,
ADD COLUMN     "housingTurnoverRate" DOUBLE PRECISION,
ADD COLUMN     "housingViewingRequests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingViewingToApplicationRate" DOUBLE PRECISION,
ADD COLUMN     "jobsApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsApplicationsPerJob" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgEmployerRating" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgReferralBonus" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgSkillsPerJob" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgTimeToFill" DOUBLE PRECISION,
ADD COLUMN     "jobsAvgTimeToFirstApplication" DOUBLE PRECISION,
ADD COLUMN     "jobsContract" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsEducationLevels" JSONB,
ADD COLUMN     "jobsExperienceLevels" JSONB,
ADD COLUMN     "jobsFillRate" DOUBLE PRECISION,
ADD COLUMN     "jobsFilled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsFreelance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsFullTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsHybrid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsInternship" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsMaxReferralBonus" DOUBLE PRECISION,
ADD COLUMN     "jobsMaxSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsMinSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsNegotiated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsOnSite" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsPartTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsReferral" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsRemote" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsRepeatEmployers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsSalaryCurrency" TEXT DEFAULT 'KES',
ADD COLUMN     "jobsTemporary" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsTopSkills" JSONB,
ADD COLUMN     "jobsWithApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsWithBenefits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locationBreakdown" JSONB,
ADD COLUMN     "momGrowth" DOUBLE PRECISION,
ADD COLUMN     "newListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newUsersFromCategory" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "peakDays" JSONB,
ADD COLUMN     "peakHours" JSONB,
ADD COLUMN     "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "providerConcentration" DOUBLE PRECISION,
ADD COLUMN     "repeatCreatorAccounts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "savesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchAppearances" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seasonalTrend" DOUBLE PRECISION,
ADD COLUMN     "servicesActive" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesAreaCoverage" JSONB,
ADD COLUMN     "servicesAvgHourlyRate" DOUBLE PRECISION,
ADD COLUMN     "servicesAvgPrice" DOUBLE PRECISION,
ADD COLUMN     "servicesAvgProviderRating" DOUBLE PRECISION,
ADD COLUMN     "servicesAvgRating" DOUBLE PRECISION,
ADD COLUMN     "servicesBookingCompletionRate" DOUBLE PRECISION,
ADD COLUMN     "servicesCancelledBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesCompletedBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesFixedPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesHourlyRate" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesMaxPrice" DOUBLE PRECISION,
ADD COLUMN     "servicesMinPrice" DOUBLE PRECISION,
ADD COLUMN     "servicesNew" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesProvidersWithReviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesRatingDistribution" JSONB,
ADD COLUMN     "servicesTopSpecialties" JSONB,
ADD COLUMN     "servicesTotalBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesTotalProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesTotalReviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesVerifiedProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportApprovedApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportAvailableSlots" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportAvgAwardAmount" DOUBLE PRECISION,
ADD COLUMN     "supportAvgCost" DOUBLE PRECISION,
ADD COLUMN     "supportBeneficiaryCompletions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportBudgetUtilization" DOUBLE PRECISION,
ADD COLUMN     "supportCompletionRate" DOUBLE PRECISION,
ADD COLUMN     "supportCurrentBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportEducationPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportEmergencyRelief" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportFoodPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportFreePrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportGrantPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportHealthPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportHousingAssistance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportMaxAwardAmount" DOUBLE PRECISION,
ADD COLUMN     "supportMinAwardAmount" DOUBLE PRECISION,
ADD COLUMN     "supportPaidPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportProgramProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportProgramsRequiringId" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportProgramsRequiringProof" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportRejectionRate" DOUBLE PRECISION,
ADD COLUMN     "supportRemainingBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "supportRepeatProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportTargetAudiences" JSONB,
ADD COLUMN     "supportTotalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "supportTotalCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportTotalDisbursed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "supportTrainingPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportUtilizationRate" DOUBLE PRECISION,
ADD COLUMN     "supportVerifiedProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topLocations" JSONB,
ADD COLUMN     "totalListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verifiedCreatorAccounts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewToActionRate" DOUBLE PRECISION,
ADD COLUMN     "yoyGrowth" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CountyMetrics" DROP COLUMN "jobCount",
DROP COLUMN "revenue",
ADD COLUMN     "activeUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgSessionDuration" DOUBLE PRECISION,
ADD COLUMN     "avgTransactionValue" DOUBLE PRECISION,
ADD COLUMN     "beneficiaryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedIncome" DOUBLE PRECISION,
ADD COLUMN     "housingActiveListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingAvgBedrooms" DOUBLE PRECISION,
ADD COLUMN     "housingAvgRent" DOUBLE PRECISION,
ADD COLUMN     "housingAvgSalePrice" DOUBLE PRECISION,
ADD COLUMN     "housingFurnishedPercent" DOUBLE PRECISION,
ADD COLUMN     "housingListingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingListingViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingMaxRent" DOUBLE PRECISION,
ADD COLUMN     "housingMinRent" DOUBLE PRECISION,
ADD COLUMN     "housingNewListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingRentalListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingSaleListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "housingViewingRequests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsActiveJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsAvgSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsContract" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsCreated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsFilled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsFullTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsJobCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsMaxSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsMinSalary" DOUBLE PRECISION,
ADD COLUMN     "jobsNewJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsPartTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsRemote" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mobileUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "peakActivityDay" TEXT,
ADD COLUMN     "peakActivityHour" INTEGER,
ADD COLUMN     "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "populationDensity" DOUBLE PRECISION,
ADD COLUMN     "servicesActiveListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesAvgRating" DOUBLE PRECISION,
ADD COLUMN     "servicesCompletedBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesProviderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesTotalBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportActivePrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportApprovedApplications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportAvgAwardAmount" DOUBLE PRECISION,
ADD COLUMN     "supportBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportNewPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supportProgramsByType" JSONB,
ADD COLUMN     "supportTotalAidDisbursed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "supportTotalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalPopulation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "webUsers" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MarketplaceStats" ADD COLUMN     "activeBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeJobs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activePrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeServices" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgMatchScore" DOUBLE PRECISION,
ADD COLUMN     "avgSessionDuration" DOUBLE PRECISION,
ADD COLUMN     "avgSwipeCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "commissionsByVertical" JSONB,
ADD COLUMN     "completedBookings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contactRequests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "conversionByRecommendationType" JSONB,
ADD COLUMN     "ctrByRecommendationType" JSONB,
ADD COLUMN     "devicesByOS" JSONB,
ADD COLUMN     "endedPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gmvByVertical" JSONB,
ADD COLUMN     "implicitDriftScore" DOUBLE PRECISION,
ADD COLUMN     "jobsByType" JSONB,
ADD COLUMN     "listingsByType" JSONB,
ADD COLUMN     "mapExploreRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "newBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "newUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payoutVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "photoViewRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "programsByType" JSONB,
ADD COLUMN     "refunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rentedListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "returningUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "savedItemsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchPivotRate" DOUBLE PRECISION,
ADD COLUMN     "searchesWithSuggestions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchesWithoutSuggestions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesByCategory" JSONB,
ADD COLUMN     "sessionsByPlatform" JSONB,
ADD COLUMN     "sharedItemsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "soldListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suggestionAcceptanceRate" DOUBLE PRECISION,
ADD COLUMN     "suggestionsAccepted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suggestionsShown" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMapExplores" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPhotoViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPrograms" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalProviders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalScreenViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalServices" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSwipeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedProviders" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TrustMetrics" ADD COLUMN     "actionsByReason" JSONB,
ADD COLUMN     "autoFlagged" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "autoRemoved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgTrustScore" DOUBLE PRECISION,
ADD COLUMN     "avgVerificationTime" DOUBLE PRECISION,
ADD COLUMN     "confirmedFraud" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dataDeletions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disputeOutcomeRate" DOUBLE PRECISION,
ADD COLUMN     "disputesByReason" JSONB,
ADD COLUMN     "disputesByVertical" JSONB,
ADD COLUMN     "disputesEscalated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disputesInFavorOfConsumer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "disputesInFavorOfProvider" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "falsePositives" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "flaggedListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fraudByType" JSONB,
ADD COLUMN     "gdprRequests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "highRiskListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "highRiskUsers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "humanReviewed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "legalHolds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingVerifications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "permanentBans" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reinstatedListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectedVerifications" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "removedListings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportsByType" JSONB,
ADD COLUMN     "riskDistribution" JSONB,
ADD COLUMN     "temporaryLocks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustScoreByVertical" JSONB,
ADD COLUMN     "uniqueReporters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userReports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationByType" JSONB,
ADD COLUMN     "verificationRate" DOUBLE PRECISION,
ADD COLUMN     "verifiedAccounts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warningsIssued" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserEvent" ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "browserVersion" TEXT,
ADD COLUMN     "categorySlug" TEXT,
ADD COLUMN     "comparedToAvg" DOUBLE PRECISION,
ADD COLUMN     "deviceBrand" TEXT,
ADD COLUMN     "dwellTime" INTEGER,
ADD COLUMN     "eventAction" TEXT NOT NULL,
ADD COLUMN     "eventCategory" TEXT NOT NULL,
ADD COLUMN     "eventsInSession" INTEGER,
ADD COLUMN     "experimentId" TEXT,
ADD COLUMN     "experimentVariant" TEXT,
ADD COLUMN     "filters" JSONB,
ADD COLUMN     "locationAccuracy" INTEGER,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCounty" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "networkType" TEXT,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "photoIndices" INTEGER[],
ADD COLUMN     "priceCurrency" TEXT DEFAULT 'KES',
ADD COLUMN     "priceViewed" DOUBLE PRECISION,
ADD COLUMN     "recommendationId" TEXT,
ADD COLUMN     "recommendationScore" DOUBLE PRECISION,
ADD COLUMN     "recommendationType" TEXT,
ADD COLUMN     "referrerType" TEXT,
ADD COLUMN     "referrerUrl" TEXT,
ADD COLUMN     "screenSize" TEXT,
ADD COLUMN     "scrollDepth" INTEGER,
ADD COLUMN     "searchId" TEXT,
ADD COLUMN     "searchPosition" INTEGER,
ADD COLUMN     "searchQuery" TEXT,
ADD COLUMN     "searchResultsCount" INTEGER,
ADD COLUMN     "sessionNumber" INTEGER,
ADD COLUMN     "sortBy" TEXT,
ADD COLUMN     "subCategorySlug" TEXT,
ADD COLUMN     "swipeCount" INTEGER,
ADD COLUMN     "targetId" TEXT,
ADD COLUMN     "targetOwnerId" TEXT,
ADD COLUMN     "targetType" TEXT,
ADD COLUMN     "timeInSession" INTEGER,
ADD COLUMN     "userAcceptedSuggestion" BOOLEAN,
ADD COLUMN     "userTrustScore" DOUBLE PRECISION,
ADD COLUMN     "userType" TEXT,
ADD COLUMN     "userVerificationLevel" TEXT,
ADD COLUMN     "videoDuration" INTEGER,
ADD COLUMN     "videoWatched" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "SmartMatchFeature" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "interactionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featureSetVersion" TEXT NOT NULL,
    "userMaxBudget" DOUBLE PRECISION,
    "userMinBudget" DOUBLE PRECISION,
    "userBudgetMidpoint" DOUBLE PRECISION,
    "userMinBedrooms" INTEGER,
    "userMaxBedrooms" INTEGER,
    "userPropertyType" TEXT,
    "userPreferredNeighborhood" TEXT,
    "userPreferredLat" DOUBLE PRECISION,
    "userPreferredLng" DOUBLE PRECISION,
    "userPreferredRadius" DOUBLE PRECISION,
    "listingPrice" DOUBLE PRECISION,
    "listingPriceCurrency" TEXT DEFAULT 'KES',
    "listingBedrooms" INTEGER,
    "listingBathrooms" INTEGER,
    "listingPropertyType" TEXT,
    "listingNeighborhood" TEXT,
    "listingLat" DOUBLE PRECISION,
    "listingLng" DOUBLE PRECISION,
    "listingAge" INTEGER,
    "listingPhotoCount" INTEGER,
    "listingVerified" BOOLEAN DEFAULT false,
    "listingStatus" TEXT,
    "sessionReferrer" TEXT,
    "sessionReferrerType" TEXT,
    "sessionDevice" TEXT,
    "sessionPlatform" TEXT,
    "sessionSearchMaxBudget" DOUBLE PRECISION,
    "sessionSearchNeighborhood" TEXT,
    "sessionSearchFilters" JSONB,
    "isWithinBudget" BOOLEAN,
    "priceToBudgetDiff" DOUBLE PRECISION,
    "priceToBudgetRatio" DOUBLE PRECISION,
    "bedroomDiff" INTEGER,
    "meetsBedroomRequirement" BOOLEAN,
    "locationDistance" DOUBLE PRECISION,
    "isPreferredNeighborhood" BOOLEAN,
    "propertyTypeMatch" BOOLEAN,
    "overallMatchScore" DOUBLE PRECISION,
    "priceScore" DOUBLE PRECISION,
    "locationScore" DOUBLE PRECISION,
    "propertyScore" DOUBLE PRECISION,
    "recencyScore" DOUBLE PRECISION,
    "userClicked" BOOLEAN DEFAULT false,
    "userSaved" BOOLEAN DEFAULT false,
    "userContacted" BOOLEAN DEFAULT false,
    "userConverted" BOOLEAN DEFAULT false,
    "dwellTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartMatchFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartMatchInsight" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "userType" TEXT,
    "accountAge" INTEGER,
    "trustScore" DOUBLE PRECISION,
    "isVerified" BOOLEAN DEFAULT false,
    "explicitPrefs" JSONB NOT NULL,
    "explicitPrefsUpdatedAt" TIMESTAMP(3),
    "implicitPrefs" JSONB NOT NULL,
    "avgSessionDuration" DOUBLE PRECISION,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "peakActivityHours" INTEGER[],
    "peakActivityDays" INTEGER[],
    "avgSwipeRate" DOUBLE PRECISION,
    "photoPreference" DOUBLE PRECISION,
    "mapUsageRate" DOUBLE PRECISION,
    "categoryAffinities" JSONB NOT NULL,
    "verticalAffinities" JSONB NOT NULL,
    "conversionProbability" JSONB NOT NULL,
    "recommendationsShown" INTEGER NOT NULL DEFAULT 0,
    "recommendationsClicked" INTEGER NOT NULL DEFAULT 0,
    "recommendationsConverted" INTEGER NOT NULL DEFAULT 0,
    "ctrByType" JSONB,
    "positiveFeedback" JSONB,
    "negativeFeedback" JSONB,
    "feedbackUpdatedAt" TIMESTAMP(3),
    "lastComputed" TIMESTAMP(3) NOT NULL,
    "matchVersion" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "topHousingMatches" JSONB,
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "uniqueListingsViewed" INTEGER NOT NULL DEFAULT 0,
    "savedListingsCount" INTEGER NOT NULL DEFAULT 0,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "userStage" TEXT,
    "stageLastUpdated" TIMESTAMP(3),
    "churnRisk" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartMatchInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "activeListings" INTEGER NOT NULL DEFAULT 0,
    "newListings" INTEGER NOT NULL DEFAULT 0,
    "expiredListings" INTEGER NOT NULL DEFAULT 0,
    "rentalListings" INTEGER NOT NULL DEFAULT 0,
    "saleListings" INTEGER NOT NULL DEFAULT 0,
    "shortstayListings" INTEGER NOT NULL DEFAULT 0,
    "furnishedListings" INTEGER NOT NULL DEFAULT 0,
    "unfurnishedListings" INTEGER NOT NULL DEFAULT 0,
    "studioListings" INTEGER NOT NULL DEFAULT 0,
    "oneBedListings" INTEGER NOT NULL DEFAULT 0,
    "twoBedListings" INTEGER NOT NULL DEFAULT 0,
    "threeBedListings" INTEGER NOT NULL DEFAULT 0,
    "fourPlusBedListings" INTEGER NOT NULL DEFAULT 0,
    "totalSearches" INTEGER NOT NULL DEFAULT 0,
    "uniqueSearchers" INTEGER NOT NULL DEFAULT 0,
    "avgSearchPrice" DOUBLE PRECISION,
    "searchPriceRange" JSONB,
    "topSearchTerms" JSONB,
    "listingViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "photoViews" INTEGER NOT NULL DEFAULT 0,
    "avgPhotosPerListing" DOUBLE PRECISION,
    "viewsPerListing" DOUBLE PRECISION,
    "savedListings" INTEGER NOT NULL DEFAULT 0,
    "savedPerUser" DOUBLE PRECISION,
    "contactRequests" INTEGER NOT NULL DEFAULT 0,
    "viewingRequests" INTEGER NOT NULL DEFAULT 0,
    "applications" INTEGER NOT NULL DEFAULT 0,
    "viewToContactRate" DOUBLE PRECISION,
    "contactToViewingRate" DOUBLE PRECISION,
    "viewingToApplicationRate" DOUBLE PRECISION,
    "listingsWithViewings" INTEGER NOT NULL DEFAULT 0,
    "listingsWithApplications" INTEGER NOT NULL DEFAULT 0,
    "listingsRented" INTEGER NOT NULL DEFAULT 0,
    "listingsSold" INTEGER NOT NULL DEFAULT 0,
    "avgRent" DOUBLE PRECISION,
    "avgRentByType" JSONB,
    "avgRentByBedroom" JSONB,
    "avgSalePrice" DOUBLE PRECISION,
    "avgSalePriceByType" JSONB,
    "pricePerSqm" DOUBLE PRECISION,
    "priceTrend" DOUBLE PRECISION,
    "priceDistribution" JSONB,
    "daysOnMarket" DOUBLE PRECISION,
    "medianDaysOnMarket" INTEGER,
    "turnoverRate" DOUBLE PRECISION,
    "vacancyRate" DOUBLE PRECISION,
    "priceReductionCount" INTEGER NOT NULL DEFAULT 0,
    "avgPriceReduction" DOUBLE PRECISION,
    "uniqueProviders" INTEGER NOT NULL DEFAULT 0,
    "newProviders" INTEGER NOT NULL DEFAULT 0,
    "activeProviders" INTEGER NOT NULL DEFAULT 0,
    "professionalProviders" INTEGER NOT NULL DEFAULT 0,
    "providerHHI" DOUBLE PRECISION,
    "topCounties" JSONB,
    "topNeighborhoods" JSONB,
    "priceByCounty" JSONB,
    "monthlyTrend" JSONB,
    "quarterlyGrowth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobsMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "activeJobs" INTEGER NOT NULL DEFAULT 0,
    "newJobs" INTEGER NOT NULL DEFAULT 0,
    "expiredJobs" INTEGER NOT NULL DEFAULT 0,
    "fullTimeJobs" INTEGER NOT NULL DEFAULT 0,
    "partTimeJobs" INTEGER NOT NULL DEFAULT 0,
    "contractJobs" INTEGER NOT NULL DEFAULT 0,
    "temporaryJobs" INTEGER NOT NULL DEFAULT 0,
    "internshipJobs" INTEGER NOT NULL DEFAULT 0,
    "remoteJobs" INTEGER NOT NULL DEFAULT 0,
    "hybridJobs" INTEGER NOT NULL DEFAULT 0,
    "onSiteJobs" INTEGER NOT NULL DEFAULT 0,
    "entryLevelJobs" INTEGER NOT NULL DEFAULT 0,
    "midLevelJobs" INTEGER NOT NULL DEFAULT 0,
    "seniorLevelJobs" INTEGER NOT NULL DEFAULT 0,
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "uniqueApplicants" INTEGER NOT NULL DEFAULT 0,
    "avgApplicantsPerJob" DOUBLE PRECISION,
    "medianApplicantsPerJob" INTEGER,
    "applicationsByType" JSONB,
    "jobViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "viewsPerJob" DOUBLE PRECISION,
    "savedJobs" INTEGER NOT NULL DEFAULT 0,
    "savedPerUser" DOUBLE PRECISION,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "referralJobs" INTEGER NOT NULL DEFAULT 0,
    "referralApplications" INTEGER NOT NULL DEFAULT 0,
    "referralBonusAvg" DOUBLE PRECISION,
    "referralBonusMax" DOUBLE PRECISION,
    "referralConversionRate" DOUBLE PRECISION,
    "avgSalary" DOUBLE PRECISION,
    "medianSalary" DOUBLE PRECISION,
    "minSalary" DOUBLE PRECISION,
    "maxSalary" DOUBLE PRECISION,
    "salaryByType" JSONB,
    "salaryByLevel" JSONB,
    "salaryPercentiles" JSONB,
    "topSkills" JSONB,
    "emergingSkills" JSONB,
    "avgSkillsPerJob" DOUBLE PRECISION,
    "topCertifications" JSONB,
    "topEducationReq" JSONB,
    "jobsFilled" INTEGER NOT NULL DEFAULT 0,
    "fillRate" DOUBLE PRECISION,
    "avgTimeToFill" DOUBLE PRECISION,
    "medianTimeToFill" INTEGER,
    "jobsWithHires" INTEGER NOT NULL DEFAULT 0,
    "avgHiresPerJob" DOUBLE PRECISION,
    "uniqueEmployers" INTEGER NOT NULL DEFAULT 0,
    "newEmployers" INTEGER NOT NULL DEFAULT 0,
    "repeatEmployers" INTEGER NOT NULL DEFAULT 0,
    "employerRetentionRate" DOUBLE PRECISION,
    "avgEmployerRating" DOUBLE PRECISION,
    "employersWithReviews" INTEGER NOT NULL DEFAULT 0,
    "uniqueSeekers" INTEGER NOT NULL DEFAULT 0,
    "activeSeekers" INTEGER NOT NULL DEFAULT 0,
    "newSeekers" INTEGER NOT NULL DEFAULT 0,
    "seekersWithHires" INTEGER NOT NULL DEFAULT 0,
    "avgApplicationsToHire" DOUBLE PRECISION,
    "topIndustries" JSONB,
    "growingIndustries" JSONB,
    "monthlyTrend" JSONB,
    "quarterlyGrowth" DOUBLE PRECISION,
    "yearOverYearGrowth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobsMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialSupportMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalPrograms" INTEGER NOT NULL DEFAULT 0,
    "activePrograms" INTEGER NOT NULL DEFAULT 0,
    "newPrograms" INTEGER NOT NULL DEFAULT 0,
    "endedPrograms" INTEGER NOT NULL DEFAULT 0,
    "programsByType" JSONB,
    "freePrograms" INTEGER NOT NULL DEFAULT 0,
    "paidPrograms" INTEGER NOT NULL DEFAULT 0,
    "slidingScalePrograms" INTEGER NOT NULL DEFAULT 0,
    "totalCapacity" INTEGER NOT NULL DEFAULT 0,
    "currentBeneficiaries" INTEGER NOT NULL DEFAULT 0,
    "availableSlots" INTEGER NOT NULL DEFAULT 0,
    "utilizationRate" DOUBLE PRECISION,
    "capacityByType" JSONB,
    "programsWithWaitlist" INTEGER NOT NULL DEFAULT 0,
    "totalWaitlisted" INTEGER NOT NULL DEFAULT 0,
    "avgWaitTime" DOUBLE PRECISION,
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "uniqueApplicants" INTEGER NOT NULL DEFAULT 0,
    "applicationsPerProgram" DOUBLE PRECISION,
    "approvedApplications" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" DOUBLE PRECISION,
    "rejectedApplications" INTEGER NOT NULL DEFAULT 0,
    "rejectionRate" DOUBLE PRECISION,
    "beneficiariesByDemographic" JSONB,
    "totalBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDisbursed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetUtilization" DOUBLE PRECISION,
    "disbursedByType" JSONB,
    "avgAwardAmount" DOUBLE PRECISION,
    "medianAwardAmount" DOUBLE PRECISION,
    "minAwardAmount" DOUBLE PRECISION,
    "maxAwardAmount" DOUBLE PRECISION,
    "awardDistribution" JSONB,
    "programsWithCompletions" INTEGER NOT NULL DEFAULT 0,
    "beneficiaryCompletions" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION,
    "outcomesByType" JSONB,
    "beneficiariesEmployed" INTEGER NOT NULL DEFAULT 0,
    "businessesStarted" INTEGER NOT NULL DEFAULT 0,
    "foodSecurityImproved" INTEGER NOT NULL DEFAULT 0,
    "uniqueProviders" INTEGER NOT NULL DEFAULT 0,
    "newProviders" INTEGER NOT NULL DEFAULT 0,
    "activeProviders" INTEGER NOT NULL DEFAULT 0,
    "verifiedProviders" INTEGER NOT NULL DEFAULT 0,
    "avgProviderRating" DOUBLE PRECISION,
    "providersWithHistory" INTEGER NOT NULL DEFAULT 0,
    "countiesServed" INTEGER NOT NULL DEFAULT 0,
    "topCounties" JSONB,
    "urbanVsRural" JSONB,
    "programsRequiringId" INTEGER NOT NULL DEFAULT 0,
    "programsRequiringProof" INTEGER NOT NULL DEFAULT 0,
    "avgDocsRequired" DOUBLE PRECISION,
    "languagesOffered" JSONB,
    "avgTimeToApproval" DOUBLE PRECISION,
    "avgTimeToDisbursement" DOUBLE PRECISION,
    "monthlyTrend" JSONB,
    "quarterlyGrowth" DOUBLE PRECISION,
    "yearOverYearGrowth" DOUBLE PRECISION,
    "topNeeds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialSupportMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCohort" (
    "id" TEXT NOT NULL,
    "cohortDate" TIMESTAMP(3) NOT NULL,
    "cohortSize" INTEGER NOT NULL DEFAULT 0,
    "acquisitionChannel" TEXT,
    "userType" TEXT,
    "vertical" TEXT,
    "retentionDay7" DOUBLE PRECISION,
    "retentionDay14" DOUBLE PRECISION,
    "retentionDay30" DOUBLE PRECISION,
    "retentionDay60" DOUBLE PRECISION,
    "retentionDay90" DOUBLE PRECISION,
    "retentionDay180" DOUBLE PRECISION,
    "retentionDay365" DOUBLE PRECISION,
    "retentionCurve" JSONB,
    "avgSessionsPerUser" DOUBLE PRECISION,
    "avgEventsPerUser" DOUBLE PRECISION,
    "housingUsers" INTEGER NOT NULL DEFAULT 0,
    "jobsUsers" INTEGER NOT NULL DEFAULT 0,
    "supportUsers" INTEGER NOT NULL DEFAULT 0,
    "servicesUsers" INTEGER NOT NULL DEFAULT 0,
    "multiVerticalUsers" INTEGER NOT NULL DEFAULT 0,
    "crossVerticalRate" DOUBLE PRECISION,
    "powerUsers" INTEGER NOT NULL DEFAULT 0,
    "superUsers" INTEGER NOT NULL DEFAULT 0,
    "powerUserRate" DOUBLE PRECISION,
    "usersWithFirstView" INTEGER NOT NULL DEFAULT 0,
    "usersWithFirstSave" INTEGER NOT NULL DEFAULT 0,
    "usersWithFirstApply" INTEGER NOT NULL DEFAULT 0,
    "usersWithFirstContact" INTEGER NOT NULL DEFAULT 0,
    "avgDaysToFirstApply" DOUBLE PRECISION,
    "avgDaysToFirstContact" DOUBLE PRECISION,
    "appliedUsers" INTEGER NOT NULL DEFAULT 0,
    "applicationRate" DOUBLE PRECISION,
    "transactionUsers" INTEGER NOT NULL DEFAULT 0,
    "transactionRate" DOUBLE PRECISION,
    "repeatApplicants" INTEGER NOT NULL DEFAULT 0,
    "repeatTransactionUsers" INTEGER NOT NULL DEFAULT 0,
    "avgLTV" DOUBLE PRECISION,
    "medianLTV" DOUBLE PRECISION,
    "ltvByVertical" JSONB,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRevenuePerUser" DOUBLE PRECISION,
    "churnedUsers" INTEGER NOT NULL DEFAULT 0,
    "churnRate" DOUBLE PRECISION,
    "churnByMonth" JSONB,
    "churnReasons" JSONB,
    "retentionFactors" JSONB,
    "featureAdoptionImpact" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureAdoption" (
    "id" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "featureCategory" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "returningUsers" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalUsage" INTEGER NOT NULL DEFAULT 0,
    "avgUsagePerUser" DOUBLE PRECISION,
    "medianUsagePerUser" INTEGER,
    "usageDistribution" JSONB,
    "adoptionRate" DOUBLE PRECISION,
    "weeklyAdoption" DOUBLE PRECISION,
    "monthlyAdoption" DOUBLE PRECISION,
    "adoptionByUserType" JSONB,
    "adoptionByVertical" JSONB,
    "avgDaysToFirstUse" DOUBLE PRECISION,
    "medianDaysToFirstUse" INTEGER,
    "cumulativeAdoption" JSONB,
    "conversionRate" DOUBLE PRECISION,
    "conversionLift" DOUBLE PRECISION,
    "sessionLengthImpact" DOUBLE PRECISION,
    "retentionImpact" DOUBLE PRECISION,
    "satisfactionScore" DOUBLE PRECISION,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "positiveFeedback" INTEGER NOT NULL DEFAULT 0,
    "negativeFeedback" INTEGER NOT NULL DEFAULT 0,
    "experimentId" TEXT,
    "experimentGroup" TEXT,
    "experimentVariant" TEXT,
    "testMetric" DOUBLE PRECISION,
    "testPValue" DOUBLE PRECISION,
    "testWinner" BOOLEAN,
    "featureRequests" INTEGER NOT NULL DEFAULT 0,
    "featureComplaints" INTEGER NOT NULL DEFAULT 0,
    "feedbackThemes" JSONB,
    "avgLoadTime" DOUBLE PRECISION,
    "errorRate" DOUBLE PRECISION,
    "crashRate" DOUBLE PRECISION,
    "usageByPlatform" JSONB,
    "dailyTrend" JSONB,
    "weeklyGrowth" DOUBLE PRECISION,
    "monthlyGrowth" DOUBLE PRECISION,
    "peakUsageHour" INTEGER,
    "peakUsageDay" TEXT,
    "projectedAdoption" DOUBLE PRECISION,
    "saturationPoint" DOUBLE PRECISION,

    CONSTRAINT "FeatureAdoption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartMatchFeature_userUuid_timestamp_idx" ON "SmartMatchFeature"("userUuid", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_listingId_timestamp_idx" ON "SmartMatchFeature"("listingId", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_vertical_timestamp_idx" ON "SmartMatchFeature"("vertical", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_overallMatchScore_idx" ON "SmartMatchFeature"("overallMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_userClicked_idx" ON "SmartMatchFeature"("userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_userConverted_idx" ON "SmartMatchFeature"("userConverted");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_timestamp_vertical_userClicked_idx" ON "SmartMatchFeature"("timestamp", "vertical", "userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchFeature_vertical_isWithinBudget_userConverted_idx" ON "SmartMatchFeature"("vertical", "isWithinBudget", "userConverted");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMatchInsight_userUuid_key" ON "SmartMatchInsight"("userUuid");

-- CreateIndex
CREATE INDEX "SmartMatchInsight_userUuid_idx" ON "SmartMatchInsight"("userUuid");

-- CreateIndex
CREATE INDEX "SmartMatchInsight_lastComputed_idx" ON "SmartMatchInsight"("lastComputed");

-- CreateIndex
CREATE INDEX "SmartMatchInsight_userStage_idx" ON "SmartMatchInsight"("userStage");

-- CreateIndex
CREATE INDEX "SmartMatchInsight_churnRisk_idx" ON "SmartMatchInsight"("churnRisk");

-- CreateIndex
CREATE INDEX "SmartMatchInsight_userType_idx" ON "SmartMatchInsight"("userType");

-- CreateIndex
CREATE UNIQUE INDEX "HousingMetrics_date_key" ON "HousingMetrics"("date");

-- CreateIndex
CREATE INDEX "HousingMetrics_date_idx" ON "HousingMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JobsMetrics_date_key" ON "JobsMetrics"("date");

-- CreateIndex
CREATE INDEX "JobsMetrics_date_idx" ON "JobsMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SocialSupportMetrics_date_key" ON "SocialSupportMetrics"("date");

-- CreateIndex
CREATE INDEX "SocialSupportMetrics_date_idx" ON "SocialSupportMetrics"("date");

-- CreateIndex
CREATE INDEX "UserCohort_cohortDate_idx" ON "UserCohort"("cohortDate");

-- CreateIndex
CREATE INDEX "UserCohort_churnRate_idx" ON "UserCohort"("churnRate");

-- CreateIndex
CREATE INDEX "UserCohort_retentionDay30_idx" ON "UserCohort"("retentionDay30");

-- CreateIndex
CREATE UNIQUE INDEX "UserCohort_cohortDate_acquisitionChannel_userType_key" ON "UserCohort"("cohortDate", "acquisitionChannel", "userType");

-- CreateIndex
CREATE INDEX "FeatureAdoption_featureName_date_idx" ON "FeatureAdoption"("featureName", "date");

-- CreateIndex
CREATE INDEX "FeatureAdoption_featureCategory_date_idx" ON "FeatureAdoption"("featureCategory", "date");

-- CreateIndex
CREATE INDEX "FeatureAdoption_adoptionRate_idx" ON "FeatureAdoption"("adoptionRate");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureAdoption_featureName_date_experimentGroup_key" ON "FeatureAdoption"("featureName", "date", "experimentGroup");

-- CreateIndex
CREATE INDEX "CategoryMetrics_categorySlug_date_idx" ON "CategoryMetrics"("categorySlug", "date");

-- CreateIndex
CREATE INDEX "CategoryMetrics_vertical_date_idx" ON "CategoryMetrics"("vertical", "date");

-- CreateIndex
CREATE INDEX "CategoryMetrics_totalRevenue_date_idx" ON "CategoryMetrics"("totalRevenue", "date");

-- CreateIndex
CREATE INDEX "CategoryMetrics_totalViews_date_idx" ON "CategoryMetrics"("totalViews", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMetrics_categorySlug_vertical_date_key" ON "CategoryMetrics"("categorySlug", "vertical", "date");

-- CreateIndex
CREATE INDEX "CountyMetrics_date_idx" ON "CountyMetrics"("date");

-- CreateIndex
CREATE INDEX "CountyMetrics_totalRevenue_idx" ON "CountyMetrics"("totalRevenue");

-- CreateIndex
CREATE INDEX "TrustMetrics_date_idx" ON "TrustMetrics"("date");

-- CreateIndex
CREATE INDEX "UserEvent_userUuid_createdAt_idx" ON "UserEvent"("userUuid", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_vertical_createdAt_idx" ON "UserEvent"("eventType", "vertical", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_targetId_targetType_idx" ON "UserEvent"("targetId", "targetType");

-- CreateIndex
CREATE INDEX "UserEvent_searchId_idx" ON "UserEvent"("searchId");

-- CreateIndex
CREATE INDEX "UserEvent_recommendationId_idx" ON "UserEvent"("recommendationId");

-- CreateIndex
CREATE INDEX "UserEvent_locationCity_eventType_idx" ON "UserEvent"("locationCity", "eventType");

-- CreateIndex
CREATE INDEX "UserEvent_categorySlug_eventType_idx" ON "UserEvent"("categorySlug", "eventType");

-- CreateIndex
CREATE INDEX "UserEvent_userUuid_eventType_targetType_idx" ON "UserEvent"("userUuid", "eventType", "targetType");

-- CreateIndex
CREATE INDEX "UserEvent_userUuid_vertical_createdAt_idx" ON "UserEvent"("userUuid", "vertical", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_targetId_eventType_idx" ON "UserEvent"("targetId", "eventType");
