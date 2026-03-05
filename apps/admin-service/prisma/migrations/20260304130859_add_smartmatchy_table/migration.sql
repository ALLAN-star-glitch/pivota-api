/*
  Warnings:

  - You are about to drop the `SmartMatchFeature` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SmartMatchFeature";

-- CreateTable
CREATE TABLE "SmartMatchy" (
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

    CONSTRAINT "SmartMatchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmartMatchy_userUuid_timestamp_idx" ON "SmartMatchy"("userUuid", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchy_listingId_timestamp_idx" ON "SmartMatchy"("listingId", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchy_vertical_timestamp_idx" ON "SmartMatchy"("vertical", "timestamp");

-- CreateIndex
CREATE INDEX "SmartMatchy_overallMatchScore_idx" ON "SmartMatchy"("overallMatchScore");

-- CreateIndex
CREATE INDEX "SmartMatchy_userClicked_idx" ON "SmartMatchy"("userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchy_userConverted_idx" ON "SmartMatchy"("userConverted");

-- CreateIndex
CREATE INDEX "SmartMatchy_timestamp_vertical_userClicked_idx" ON "SmartMatchy"("timestamp", "vertical", "userClicked");

-- CreateIndex
CREATE INDEX "SmartMatchy_vertical_isWithinBudget_userConverted_idx" ON "SmartMatchy"("vertical", "isWithinBudget", "userConverted");
