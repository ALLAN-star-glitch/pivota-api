-- AlterTable
ALTER TABLE "HouseListing" ADD COLUMN     "depositAmount" DOUBLE PRECISION,
ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPetFriendly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maximumLeaseTerm" INTEGER,
ADD COLUMN     "minimumLeaseTerm" INTEGER,
ADD COLUMN     "titleDeedAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "utilitiesDetails" TEXT,
ADD COLUMN     "utilitiesIncluded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "HouseListing_listingType_idx" ON "HouseListing"("listingType");

-- CreateIndex
CREATE INDEX "HouseListing_propertyType_idx" ON "HouseListing"("propertyType");

-- CreateIndex
CREATE INDEX "HouseListing_price_idx" ON "HouseListing"("price");
