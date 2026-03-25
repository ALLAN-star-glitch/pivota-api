-- AlterTable
ALTER TABLE "SmartMatchyHousing" ADD COLUMN     "housingPetPolicy" TEXT,
ADD COLUMN     "leaseDurationMatch" BOOLEAN,
ADD COLUMN     "moveInDateMatch" BOOLEAN,
ADD COLUMN     "petPolicyMatch" BOOLEAN,
ADD COLUMN     "userBudgetMidpoint" DOUBLE PRECISION,
ADD COLUMN     "userHasPets" BOOLEAN,
ADD COLUMN     "userHouseholdSize" INTEGER,
ADD COLUMN     "userLat" DOUBLE PRECISION,
ADD COLUMN     "userLeaseDuration" TEXT,
ADD COLUMN     "userLng" DOUBLE PRECISION,
ADD COLUMN     "userMoveInDate" TIMESTAMP(3),
ADD COLUMN     "userPetDetails" TEXT,
ADD COLUMN     "userPreferredLocations" JSONB,
ADD COLUMN     "userPreferredNeighborhoods" JSONB,
ADD COLUMN     "userPreferredPropertyTypes" JSONB,
ADD COLUMN     "userSearchRadiusKm" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userMoveInDate_idx" ON "SmartMatchyHousing"("userMoveInDate");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_userHasPets_idx" ON "SmartMatchyHousing"("userHasPets");
