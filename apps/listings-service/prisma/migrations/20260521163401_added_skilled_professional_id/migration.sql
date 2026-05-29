-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "skilledProfessionalId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceOffering_skilledProfessionalId_idx" ON "ServiceOffering"("skilledProfessionalId");
