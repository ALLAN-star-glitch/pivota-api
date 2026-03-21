-- CreateTable
CREATE TABLE "ListingMilestoneEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT,
    "listingId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL,
    "listingPrice" DOUBLE PRECISION NOT NULL,
    "listingType" TEXT NOT NULL,
    "locationCity" TEXT NOT NULL,
    "categoryId" TEXT,
    "milestone" INTEGER NOT NULL,
    "milestoneTier" TEXT NOT NULL,
    "suggestedTeam" TEXT NOT NULL,
    "totalListings" INTEGER NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION NOT NULL,
    "daysSinceFirstListing" INTEGER,
    "categories" JSONB,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "deviceType" TEXT,
    "os" TEXT,
    "osVersion" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "isBot" BOOLEAN DEFAULT false,
    "platform" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMilestoneEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyListingMilestoneMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalMilestones" INTEGER NOT NULL DEFAULT 0,
    "milestone1Count" INTEGER NOT NULL DEFAULT 0,
    "milestone2Count" INTEGER NOT NULL DEFAULT 0,
    "milestone3Count" INTEGER NOT NULL DEFAULT 0,
    "milestone5Count" INTEGER NOT NULL DEFAULT 0,
    "milestone10Count" INTEGER NOT NULL DEFAULT 0,
    "milestone25Count" INTEGER NOT NULL DEFAULT 0,
    "milestone50Count" INTEGER NOT NULL DEFAULT 0,
    "milestone100Count" INTEGER NOT NULL DEFAULT 0,
    "onboardingMilestones" INTEGER NOT NULL DEFAULT 0,
    "engagementMilestones" INTEGER NOT NULL DEFAULT 0,
    "growthMilestones" INTEGER NOT NULL DEFAULT 0,
    "powerMilestones" INTEGER NOT NULL DEFAULT 0,
    "professionalMilestones" INTEGER NOT NULL DEFAULT 0,
    "onboardingTeamNotifications" INTEGER NOT NULL DEFAULT 0,
    "successTeamNotifications" INTEGER NOT NULL DEFAULT 0,
    "salesTeamNotifications" INTEGER NOT NULL DEFAULT 0,
    "marketingTeamNotifications" INTEGER NOT NULL DEFAULT 0,
    "partnershipsTeamNotifications" INTEGER NOT NULL DEFAULT 0,
    "topLocations" JSONB,
    "topCategories" JSONB,
    "listingTypeBreakdown" JSONB,
    "totalListingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageListingPrice" DOUBLE PRECISION,
    "uniqueAccounts" INTEGER NOT NULL DEFAULT 0,
    "repeatAccounts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyListingMilestoneMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountMilestoneSummary" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currentMilestone" INTEGER NOT NULL DEFAULT 0,
    "lastMilestone" INTEGER,
    "lastMilestoneAt" TIMESTAMP(3),
    "milestonesAchieved" JSONB,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePrice" DOUBLE PRECISION,
    "firstListingAt" TIMESTAMP(3),
    "daysActive" INTEGER,
    "primaryCategory" TEXT,
    "primaryLocation" TEXT,
    "primaryListingType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountMilestoneSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_accountId_idx" ON "ListingMilestoneEvent"("accountId");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_milestone_idx" ON "ListingMilestoneEvent"("milestone");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_milestoneTier_idx" ON "ListingMilestoneEvent"("milestoneTier");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_suggestedTeam_idx" ON "ListingMilestoneEvent"("suggestedTeam");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_occurredAt_idx" ON "ListingMilestoneEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_createdAt_idx" ON "ListingMilestoneEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_milestone_occurredAt_idx" ON "ListingMilestoneEvent"("milestone", "occurredAt");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_accountId_milestone_idx" ON "ListingMilestoneEvent"("accountId", "milestone");

-- CreateIndex
CREATE INDEX "ListingMilestoneEvent_suggestedTeam_milestone_idx" ON "ListingMilestoneEvent"("suggestedTeam", "milestone");

-- CreateIndex
CREATE UNIQUE INDEX "DailyListingMilestoneMetrics_date_key" ON "DailyListingMilestoneMetrics"("date");

-- CreateIndex
CREATE INDEX "DailyListingMilestoneMetrics_date_idx" ON "DailyListingMilestoneMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMilestoneSummary_accountId_key" ON "AccountMilestoneSummary"("accountId");

-- CreateIndex
CREATE INDEX "AccountMilestoneSummary_currentMilestone_idx" ON "AccountMilestoneSummary"("currentMilestone");

-- CreateIndex
CREATE INDEX "AccountMilestoneSummary_lastMilestone_idx" ON "AccountMilestoneSummary"("lastMilestone");

-- CreateIndex
CREATE INDEX "AccountMilestoneSummary_isActive_idx" ON "AccountMilestoneSummary"("isActive");
