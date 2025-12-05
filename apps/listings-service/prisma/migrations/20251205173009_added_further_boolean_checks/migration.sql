/*
  Warnings:

  - You are about to drop the column `jobRequestId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the `FormalApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormalJobPosting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InformalApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InformalJobRequest` table. If the table is not empty, all the data it contains will be lost.
  - The required column `externalId` was added to the `Booking` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `jobPostId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - The required column `externalId` was added to the `JobCategory` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `externalId` was added to the `ProviderJob` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `externalId` was added to the `Rating` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterEnum
ALTER TYPE "JobPostStatus" ADD VALUE 'DRAFT';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_jobRequestId_fkey";

-- DropForeignKey
ALTER TABLE "FormalApplication" DROP CONSTRAINT "FormalApplication_jobId_fkey";

-- DropForeignKey
ALTER TABLE "FormalJobPosting" DROP CONSTRAINT "FormalJobPosting_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "InformalApplication" DROP CONSTRAINT "InformalApplication_jobRequestId_fkey";

-- DropForeignKey
ALTER TABLE "InformalJobRequest" DROP CONSTRAINT "InformalJobRequest_categoryId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "jobRequestId",
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "jobPostId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "JobCategory" ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "hasParent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSubcategories" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProviderJob" ADD COLUMN     "externalId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "jobId",
ADD COLUMN     "externalId" TEXT NOT NULL,
ADD COLUMN     "jobPostId" TEXT;

-- DropTable
DROP TABLE "FormalApplication";

-- DropTable
DROP TABLE "FormalJobPosting";

-- DropTable
DROP TABLE "InformalApplication";

-- DropTable
DROP TABLE "InformalJobRequest";

-- DropEnum
DROP TYPE "JobRequestStatus";

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "formalCategoryId" TEXT,
    "creatorId" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "locationCity" TEXT NOT NULL,
    "locationNeighborhood" TEXT,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "requiresDocuments" BOOLEAN NOT NULL DEFAULT false,
    "requiresEquipment" BOOLEAN NOT NULL DEFAULT false,
    "payAmount" DOUBLE PRECISION,
    "payRate" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceLevel" TEXT,
    "employmentType" TEXT,
    "documentsNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipmentRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalNotes" TEXT,
    "status" "JobPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPostApplication" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPostApplication_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "JobCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_formalCategoryId_fkey" FOREIGN KEY ("formalCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostApplication" ADD CONSTRAINT "JobPostApplication_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "JobPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
