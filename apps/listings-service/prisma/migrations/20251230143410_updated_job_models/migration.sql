/*
  Warnings:

  - A unique constraint covering the columns `[jobPostId,applicantId]` on the table `JobPostApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employerId` to the `JobPostApplication` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "JobPostApplication" DROP CONSTRAINT "JobPostApplication_jobPostId_fkey";

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "allowReferrals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "referralBonus" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "JobPostApplication" ADD COLUMN     "agreedPay" DOUBLE PRECISION,
ADD COLUMN     "agreedStartDate" TIMESTAMP(3),
ADD COLUMN     "applicationType" TEXT NOT NULL DEFAULT 'FORMAL',
ADD COLUMN     "availabilityDate" TIMESTAMP(3),
ADD COLUMN     "availabilityNotes" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "employerId" TEXT NOT NULL,
ADD COLUMN     "employerNotes" TEXT,
ADD COLUMN     "expectedPay" DOUBLE PRECISION,
ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReferral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referrerEmail" TEXT,
ADD COLUMN     "referrerName" TEXT,
ADD COLUMN     "referrerPhone" TEXT,
ADD COLUMN     "referrerRelationship" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JobApplicationAttachment" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "contentText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicationStatusHistory" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "oldStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplicationAttachment_applicationId_idx" ON "JobApplicationAttachment"("applicationId");

-- CreateIndex
CREATE INDEX "JobApplicationAttachment_type_idx" ON "JobApplicationAttachment"("type");

-- CreateIndex
CREATE INDEX "JobApplicationStatusHistory_applicationId_idx" ON "JobApplicationStatusHistory"("applicationId");

-- CreateIndex
CREATE INDEX "JobApplicationStatusHistory_newStatus_idx" ON "JobApplicationStatusHistory"("newStatus");

-- CreateIndex
CREATE INDEX "JobPostApplication_applicantId_idx" ON "JobPostApplication"("applicantId");

-- CreateIndex
CREATE INDEX "JobPostApplication_employerId_idx" ON "JobPostApplication"("employerId");

-- CreateIndex
CREATE INDEX "JobPostApplication_jobPostId_idx" ON "JobPostApplication"("jobPostId");

-- CreateIndex
CREATE INDEX "JobPostApplication_status_idx" ON "JobPostApplication"("status");

-- CreateIndex
CREATE INDEX "JobPostApplication_applicationType_idx" ON "JobPostApplication"("applicationType");

-- CreateIndex
CREATE INDEX "JobPostApplication_referrerPhone_idx" ON "JobPostApplication"("referrerPhone");

-- CreateIndex
CREATE UNIQUE INDEX "JobPostApplication_jobPostId_applicantId_key" ON "JobPostApplication"("jobPostId", "applicantId");

-- AddForeignKey
ALTER TABLE "JobPostApplication" ADD CONSTRAINT "JobPostApplication_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationAttachment" ADD CONSTRAINT "JobApplicationAttachment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobPostApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationStatusHistory" ADD CONSTRAINT "JobApplicationStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobPostApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
