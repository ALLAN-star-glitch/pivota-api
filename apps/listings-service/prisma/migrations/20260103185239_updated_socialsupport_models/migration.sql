/*
  Warnings:

  - You are about to drop the column `adminNotes` on the `SupportApplication` table. All the data in the column will be lost.
  - You are about to drop the column `userNotes` on the `SupportApplication` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[programId,beneficiaryId]` on the table `SupportApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `creatorId` to the `SupportProgram` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SupportApplication" DROP COLUMN "adminNotes",
DROP COLUMN "userNotes",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "awardedAmount" DOUBLE PRECISION,
ADD COLUMN     "awardedDetails" TEXT,
ADD COLUMN     "awardedQuantity" INTEGER,
ADD COLUMN     "internalNGOAudit" TEXT,
ADD COLUMN     "isComplianceVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedValue" DOUBLE PRECISION,
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "statementOfNeed" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SupportProgram" ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isProviderVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerType" TEXT NOT NULL DEFAULT 'ORGANIZATION',
ADD COLUMN     "remainingBudget" DOUBLE PRECISION,
ADD COLUMN     "requiresIdVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresIncomeProof" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportType" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "totalBudget" DOUBLE PRECISION,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "SupportBenefit" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "quantity" INTEGER DEFAULT 1,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportDocument" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMilestone" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportBenefit_externalReference_key" ON "SupportBenefit"("externalReference");

-- CreateIndex
CREATE INDEX "SupportBenefit_applicationId_idx" ON "SupportBenefit"("applicationId");

-- CreateIndex
CREATE INDEX "SupportBenefit_status_idx" ON "SupportBenefit"("status");

-- CreateIndex
CREATE INDEX "SupportBenefit_externalReference_idx" ON "SupportBenefit"("externalReference");

-- CreateIndex
CREATE INDEX "SupportDocument_applicationId_idx" ON "SupportDocument"("applicationId");

-- CreateIndex
CREATE INDEX "SupportDocument_documentType_idx" ON "SupportDocument"("documentType");

-- CreateIndex
CREATE INDEX "SupportMilestone_programId_idx" ON "SupportMilestone"("programId");

-- CreateIndex
CREATE INDEX "SupportApplication_status_idx" ON "SupportApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupportApplication_programId_beneficiaryId_key" ON "SupportApplication"("programId", "beneficiaryId");

-- CreateIndex
CREATE INDEX "SupportProgram_organizationId_idx" ON "SupportProgram"("organizationId");

-- CreateIndex
CREATE INDEX "SupportProgram_providerType_idx" ON "SupportProgram"("providerType");

-- CreateIndex
CREATE INDEX "SupportProgram_supportType_idx" ON "SupportProgram"("supportType");

-- AddForeignKey
ALTER TABLE "SupportBenefit" ADD CONSTRAINT "SupportBenefit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SupportApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportDocument" ADD CONSTRAINT "SupportDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SupportApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMilestone" ADD CONSTRAINT "SupportMilestone_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SupportProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
