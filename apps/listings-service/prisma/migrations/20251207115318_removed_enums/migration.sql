/*
  Warnings:

  - The `status` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `JobPost` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `JobPostApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `jobType` on the `JobPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "JobPost" DROP COLUMN "jobType",
ADD COLUMN     "jobType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "JobPostApplication" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Rating" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropEnum
DROP TYPE "ApplicationStatus";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "JobPostStatus";

-- DropEnum
DROP TYPE "JobType";
