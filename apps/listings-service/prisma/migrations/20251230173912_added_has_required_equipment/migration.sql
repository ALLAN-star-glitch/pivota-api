/*
  Warnings:

  - You are about to drop the column `applicationType` on the `JobPostApplication` table. All the data in the column will be lost.
  - You are about to drop the column `isReferral` on the `JobPostApplication` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_jobPostId_fkey";

-- DropIndex
DROP INDEX "JobPostApplication_applicationType_idx";

-- AlterTable
ALTER TABLE "JobPostApplication" DROP COLUMN "applicationType",
DROP COLUMN "isReferral",
ADD COLUMN     "hasRequiredEquipment" BOOLEAN NOT NULL DEFAULT false;
