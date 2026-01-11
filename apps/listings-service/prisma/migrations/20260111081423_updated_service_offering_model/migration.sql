/*
  Warnings:

  - You are about to drop the column `providerType` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProviderPricingRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProviderPricingRule" DROP CONSTRAINT "ProviderPricingRule_categoryId_fkey";

-- DropIndex
DROP INDEX "ServiceOffering_providerType_idx";

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "providerType",
ADD COLUMN     "contractorType" TEXT NOT NULL DEFAULT 'INDIVIDUAL';

-- DropTable
DROP TABLE "Booking";

-- DropTable
DROP TABLE "ProviderPricingRule";

-- CreateTable
CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT,
    "contractorName" TEXT,
    "serviceTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "locationCity" TEXT,
    "agreedPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "customerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPricingRule" (
    "id" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "categoryId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "minPrice" DOUBLE PRECISION DEFAULT 0,
    "maxPrice" DOUBLE PRECISION,
    "isExperienceRequired" BOOLEAN NOT NULL DEFAULT false,
    "isNotesRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceBooking_contractorId_idx" ON "ServiceBooking"("contractorId");

-- CreateIndex
CREATE INDEX "ServiceBooking_clientId_idx" ON "ServiceBooking"("clientId");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_idx" ON "ServiceBooking"("status");

-- CreateIndex
CREATE INDEX "ServiceBooking_serviceId_idx" ON "ServiceBooking"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorPricingRule_vertical_unit_currency_categoryId_key" ON "ContractorPricingRule"("vertical", "unit", "currency", "categoryId");

-- CreateIndex
CREATE INDEX "ServiceOffering_contractorType_idx" ON "ServiceOffering"("contractorType");

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPricingRule" ADD CONSTRAINT "ContractorPricingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
