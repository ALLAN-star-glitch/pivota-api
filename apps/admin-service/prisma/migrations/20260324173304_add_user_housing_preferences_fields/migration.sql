-- AlterTable
ALTER TABLE "UserHousingPreferences" ADD COLUMN     "budgetMidpoint" DOUBLE PRECISION,
ADD COLUMN     "petDetails" TEXT,
ADD COLUMN     "preferredHousingType" TEXT,
ADD COLUMN     "preferredLeaseDuration" TEXT,
ADD COLUMN     "preferredLocations" JSONB,
ADD COLUMN     "preferredMoveInDate" TIMESTAMP(3),
ADD COLUMN     "preferredNeighborhoods" JSONB,
ADD COLUMN     "preferredPropertyTypes" JSONB;
