/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "UserEvent" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'MOBILE';

-- DropTable
DROP TABLE "AuditLog";

-- CreateTable
CREATE TABLE "MarketplaceStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "gmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escrowVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "newProviders" INTEGER NOT NULL DEFAULT 0,
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "avgCompletionTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountyMetrics" (
    "id" TEXT NOT NULL,
    "countyName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "jobCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CountyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryMetrics" (
    "id" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "jobsCreated" INTEGER NOT NULL DEFAULT 0,
    "jobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "disputesOpened" INTEGER NOT NULL DEFAULT 0,
    "disputesResolved" INTEGER NOT NULL DEFAULT 0,
    "fraudFlags" INTEGER NOT NULL DEFAULT 0,
    "suspensions" INTEGER NOT NULL DEFAULT 0,
    "avgResolutionTime" DOUBLE PRECISION,

    CONSTRAINT "TrustMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceStats_date_key" ON "MarketplaceStats"("date");

-- CreateIndex
CREATE INDEX "MarketplaceStats_date_idx" ON "MarketplaceStats"("date");

-- CreateIndex
CREATE INDEX "CountyMetrics_countyName_idx" ON "CountyMetrics"("countyName");

-- CreateIndex
CREATE UNIQUE INDEX "CountyMetrics_countyName_date_key" ON "CountyMetrics"("countyName", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMetrics_categorySlug_date_key" ON "CategoryMetrics"("categorySlug", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TrustMetrics_date_key" ON "TrustMetrics"("date");
