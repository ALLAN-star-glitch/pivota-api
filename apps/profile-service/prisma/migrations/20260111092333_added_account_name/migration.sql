-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "ContractorProfile" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "specialties" TEXT[],
    "serviceAreas" TEXT[],
    "yearsExperience" INTEGER DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_uuid_key" ON "ContractorProfile"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_accountId_key" ON "ContractorProfile"("accountId");

-- AddForeignKey
ALTER TABLE "ContractorProfile" ADD CONSTRAINT "ContractorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
