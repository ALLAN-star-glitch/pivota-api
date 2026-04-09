-- AlterTable
ALTER TABLE "UserHousingPreferences" ADD COLUMN     "isLookingForRental" BOOLEAN,
ADD COLUMN     "isLookingToBuy" BOOLEAN,
ADD COLUMN     "preferredLeaseTerm" INTEGER,
ADD COLUMN     "requiresNegotiable" BOOLEAN,
ADD COLUMN     "requiresPetFriendly" BOOLEAN,
ADD COLUMN     "requiresTitleDeed" BOOLEAN,
ADD COLUMN     "requiresUtilitiesIncluded" BOOLEAN,
ADD COLUMN     "searchType" TEXT;

-- CreateIndex
CREATE INDEX "UserHousingPreferences_searchType_idx" ON "UserHousingPreferences"("searchType");

-- CreateIndex
CREATE INDEX "UserHousingPreferences_isLookingForRental_idx" ON "UserHousingPreferences"("isLookingForRental");

-- CreateIndex
CREATE INDEX "UserHousingPreferences_isLookingToBuy_idx" ON "UserHousingPreferences"("isLookingToBuy");
