-- AlterTable
ALTER TABLE "SmartMatchyHousing" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "schedulerId" TEXT,
ADD COLUMN     "viewerId" TEXT,
ADD COLUMN     "viewingStatus" TEXT;

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_viewerId_idx" ON "SmartMatchyHousing"("viewerId");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_schedulerId_idx" ON "SmartMatchyHousing"("schedulerId");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_viewingStatus_idx" ON "SmartMatchyHousing"("viewingStatus");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_creatorId_idx" ON "SmartMatchyHousing"("creatorId");
