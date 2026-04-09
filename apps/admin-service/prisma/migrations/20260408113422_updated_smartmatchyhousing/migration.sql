-- AlterTable
ALTER TABLE "SmartMatchyHousing" ADD COLUMN     "leaseTermMatch" BOOLEAN,
ADD COLUMN     "listingDepositAmount" DOUBLE PRECISION,
ADD COLUMN     "listingIsNegotiable" BOOLEAN,
ADD COLUMN     "listingIsPetFriendly" BOOLEAN,
ADD COLUMN     "listingMaximumLeaseTerm" INTEGER,
ADD COLUMN     "listingMinimumLeaseTerm" INTEGER,
ADD COLUMN     "listingTitleDeedAvailable" BOOLEAN,
ADD COLUMN     "listingUtilitiesDetails" TEXT,
ADD COLUMN     "listingUtilitiesIncluded" BOOLEAN,
ADD COLUMN     "negotiableMatch" BOOLEAN,
ADD COLUMN     "petFriendlyMatch" BOOLEAN,
ADD COLUMN     "titleDeedMatch" BOOLEAN,
ADD COLUMN     "utilitiesMatch" BOOLEAN;

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_listingMinimumLeaseTerm_idx" ON "SmartMatchyHousing"("listingMinimumLeaseTerm");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_listingIsPetFriendly_idx" ON "SmartMatchyHousing"("listingIsPetFriendly");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_listingIsNegotiable_idx" ON "SmartMatchyHousing"("listingIsNegotiable");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_leaseTermMatch_idx" ON "SmartMatchyHousing"("leaseTermMatch");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_petFriendlyMatch_idx" ON "SmartMatchyHousing"("petFriendlyMatch");

-- CreateIndex
CREATE INDEX "SmartMatchyHousing_negotiableMatch_idx" ON "SmartMatchyHousing"("negotiableMatch");
