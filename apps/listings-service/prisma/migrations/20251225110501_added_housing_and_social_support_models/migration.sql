/*
  Warnings:

  - You are about to drop the column `employerId` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the `ProviderJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProviderJob" DROP CONSTRAINT "ProviderJob_categoryId_fkey";

-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "employerId",
DROP COLUMN "providerId",
ADD COLUMN     "serviceId" TEXT;

-- DropTable
DROP TABLE "ProviderJob";

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "verticals" TEXT[] DEFAULT ARRAY['JOBS']::TEXT[],
    "categoryLabel" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'FIXED',
    "locationCity" TEXT NOT NULL,
    "locationNeighborhood" TEXT,
    "yearsExperience" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "availability" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseListing" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isFurnished" BOOLEAN NOT NULL DEFAULT false,
    "locationCity" TEXT NOT NULL,
    "locationNeighborhood" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "houseId" TEXT NOT NULL,

    CONSTRAINT "HouseImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseViewing" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewingDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "HouseViewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportProgram" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibilityCriteria" TEXT,
    "targetAudience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "locationCity" TEXT,
    "locationNeighborhood" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportApplication" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceOffering_locationCity_idx" ON "ServiceOffering"("locationCity");

-- CreateIndex
CREATE INDEX "ServiceOffering_verticals_idx" ON "ServiceOffering"("verticals");

-- CreateIndex
CREATE INDEX "ServiceOffering_providerId_idx" ON "ServiceOffering"("providerId");

-- CreateIndex
CREATE INDEX "HouseListing_locationCity_idx" ON "HouseListing"("locationCity");

-- CreateIndex
CREATE INDEX "HouseListing_type_idx" ON "HouseListing"("type");

-- CreateIndex
CREATE INDEX "HouseListing_listingType_idx" ON "HouseListing"("listingType");

-- CreateIndex
CREATE INDEX "HouseListing_status_idx" ON "HouseListing"("status");

-- CreateIndex
CREATE INDEX "SupportProgram_locationCity_idx" ON "SupportProgram"("locationCity");

-- CreateIndex
CREATE INDEX "SupportProgram_category_idx" ON "SupportProgram"("category");

-- CreateIndex
CREATE INDEX "SupportProgram_status_idx" ON "SupportProgram"("status");

-- CreateIndex
CREATE INDEX "JobPost_locationCity_idx" ON "JobPost"("locationCity");

-- CreateIndex
CREATE INDEX "JobPost_status_idx" ON "JobPost"("status");

-- CreateIndex
CREATE INDEX "JobPost_creatorId_idx" ON "JobPost"("creatorId");

-- CreateIndex
CREATE INDEX "JobPost_categoryId_idx" ON "JobPost"("categoryId");

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseImage" ADD CONSTRAINT "HouseImage_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "HouseListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseViewing" ADD CONSTRAINT "HouseViewing_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "HouseListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportApplication" ADD CONSTRAINT "SupportApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SupportProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
