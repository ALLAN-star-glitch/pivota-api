-- AlterTable
ALTER TABLE "housing_seeker_profiles" ADD COLUMN     "isLookingForRental" BOOLEAN DEFAULT false,
ADD COLUMN     "isLookingToBuy" BOOLEAN DEFAULT false,
ADD COLUMN     "searchType" TEXT;

-- AlterTable
ALTER TABLE "property_owner_profiles" ADD COLUMN     "isListingForRent" BOOLEAN DEFAULT false,
ADD COLUMN     "isListingForSale" BOOLEAN DEFAULT false,
ADD COLUMN     "listingType" TEXT;

-- CreateIndex
CREATE INDEX "housing_seeker_profiles_searchType_idx" ON "housing_seeker_profiles"("searchType");

-- CreateIndex
CREATE INDEX "property_owner_profiles_listingType_idx" ON "property_owner_profiles"("listingType");
