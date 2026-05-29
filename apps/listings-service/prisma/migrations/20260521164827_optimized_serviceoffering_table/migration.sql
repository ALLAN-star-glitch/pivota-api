/*
  Warnings:

  - You are about to drop the column `accountName` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `creatorName` on the `ServiceOffering` table. All the data in the column will be lost.
  - Made the column `skilledProfessionalId` on table `ServiceOffering` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "accountName",
DROP COLUMN "creatorName",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "professionalAvatar" TEXT,
ADD COLUMN     "professionalName" TEXT,
ADD COLUMN     "serviceAreas" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "verticals" SET DEFAULT ARRAY['PROFESSIONAL_SERVICES']::TEXT[],
ALTER COLUMN "priceUnit" SET DEFAULT 'PER_HOUR',
ALTER COLUMN "skilledProfessionalId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ServiceOffering_status_idx" ON "ServiceOffering"("status");

-- CreateIndex
CREATE INDEX "ServiceOffering_createdAt_idx" ON "ServiceOffering"("createdAt");
