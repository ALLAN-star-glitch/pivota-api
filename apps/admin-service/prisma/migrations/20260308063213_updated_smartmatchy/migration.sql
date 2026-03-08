-- AlterTable
ALTER TABLE "SmartMatchy" ADD COLUMN     "aiEventId" TEXT,
ADD COLUMN     "aiEventTimestamp" TIMESTAMP(3),
ADD COLUMN     "aiEventType" TEXT,
ADD COLUMN     "amenityMatchCount" INTEGER,
ADD COLUMN     "amenityMatchScore" DOUBLE PRECISION,
ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "bathroomDiff" INTEGER,
ADD COLUMN     "dayOfWeek" INTEGER,
ADD COLUMN     "daysSinceListingPosted" INTEGER,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "distanceFromPreferred" DOUBLE PRECISION,
ADD COLUMN     "hourOfDay" INTEGER,
ADD COLUMN     "interactionType" TEXT,
ADD COLUMN     "isCityMatch" BOOLEAN,
ADD COLUMN     "isExactNeighborhoodMatch" BOOLEAN,
ADD COLUMN     "isWeekend" BOOLEAN,
ADD COLUMN     "listingAmenities" JSONB,
ADD COLUMN     "listingCategoryId" TEXT,
ADD COLUMN     "listingCategorySlug" TEXT,
ADD COLUMN     "listingIsFurnished" BOOLEAN DEFAULT false,
ADD COLUMN     "listingLatitude" DOUBLE PRECISION,
ADD COLUMN     "listingLongitude" DOUBLE PRECISION,
ADD COLUMN     "listingSquareFootage" INTEGER,
ADD COLUMN     "listingYearBuilt" INTEGER,
ADD COLUMN     "locationMatchScore" DOUBLE PRECISION,
ADD COLUMN     "osVersion" TEXT,
ADD COLUMN     "priceVsCategoryAvg" DOUBLE PRECISION,
ADD COLUMN     "priceVsNeighborhoodAvg" DOUBLE PRECISION,
ADD COLUMN     "propertyTypeMatchScore" DOUBLE PRECISION,
ADD COLUMN     "scrollDepth" INTEGER,
ADD COLUMN     "searchPosition" INTEGER,
ADD COLUMN     "sessionSearchId" TEXT,
ADD COLUMN     "sessionSearchQuery" TEXT,
ADD COLUMN     "timeSpent" INTEGER,
ADD COLUMN     "timeToViewing" INTEGER,
ADD COLUMN     "userBudgetFlexibility" DOUBLE PRECISION,
ADD COLUMN     "userCompletedViewing" BOOLEAN DEFAULT false,
ADD COLUMN     "userFavoriteAmenities" JSONB,
ADD COLUMN     "userPreferredAmenities" JSONB,
ADD COLUMN     "userPreferredBathrooms" INTEGER,
ADD COLUMN     "userPreferredListingTypes" JSONB,
ADD COLUMN     "userPreferredLocations" JSONB,
ADD COLUMN     "userPreferredPropertyTypes" JSONB,
ADD COLUMN     "userPreviousSearches" JSONB,
ADD COLUMN     "userPreviousViewings" JSONB,
ADD COLUMN     "userScheduledViewing" BOOLEAN DEFAULT false,
ADD COLUMN     "viewDuration" INTEGER,
ADD COLUMN     "viewingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "viewingDate" TIMESTAMP(3),
ADD COLUMN     "viewingFeedback" JSONB;

-- CreateIndex
CREATE INDEX "SmartMatchy_aiEventType_timestamp_idx" ON "SmartMatchy"("aiEventType", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchy_listingPropertyType_idx" ON "SmartMatchy"("listingPropertyType");

-- CreateIndex
CREATE INDEX "SmartMatchy_listingSquareFootage_idx" ON "SmartMatchy"("listingSquareFootage");

-- CreateIndex
CREATE INDEX "SmartMatchy_interactionType_idx" ON "SmartMatchy"("interactionType");

-- CreateIndex
CREATE INDEX "SmartMatchy_hourOfDay_idx" ON "SmartMatchy"("hourOfDay");

-- CreateIndex
CREATE INDEX "SmartMatchy_dayOfWeek_idx" ON "SmartMatchy"("dayOfWeek");

-- CreateIndex
CREATE INDEX "SmartMatchy_deviceType_idx" ON "SmartMatchy"("deviceType");

-- CreateIndex
CREATE INDEX "SmartMatchy_distanceFromPreferred_idx" ON "SmartMatchy"("distanceFromPreferred");

-- CreateIndex
CREATE INDEX "SmartMatchy_amenityMatchScore_idx" ON "SmartMatchy"("amenityMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchy_userScheduledViewing_idx" ON "SmartMatchy"("userScheduledViewing");

-- CreateIndex
CREATE INDEX "SmartMatchy_userCompletedViewing_idx" ON "SmartMatchy"("userCompletedViewing");

-- CreateIndex
CREATE INDEX "SmartMatchy_listingNeighborhood_userPreferredNeighborhood_idx" ON "SmartMatchy"("listingNeighborhood", "userPreferredNeighborhood");

-- CreateIndex
CREATE INDEX "SmartMatchy_priceVsCategoryAvg_idx" ON "SmartMatchy"("priceVsCategoryAvg");

-- CreateIndex
CREATE INDEX "SmartMatchy_sessionSearchId_idx" ON "SmartMatchy"("sessionSearchId");
