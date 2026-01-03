/*
  Warnings:

  - You are about to drop the column `type` on the `HouseListing` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `HouseListing` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HouseListing_listingType_idx";

-- DropIndex
DROP INDEX "HouseListing_locationCity_idx";

-- DropIndex
DROP INDEX "HouseListing_type_idx";

-- AlterTable
ALTER TABLE "HouseListing" DROP COLUMN "type",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "HouseListing_locationCity_listingType_categoryId_idx" ON "HouseListing"("locationCity", "listingType", "categoryId");

-- CreateIndex
CREATE INDEX "HouseListing_ownerId_idx" ON "HouseListing"("ownerId");

-- AddForeignKey
ALTER TABLE "HouseListing" ADD CONSTRAINT "HouseListing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
