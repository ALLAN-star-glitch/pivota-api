/*
  Warnings:

  - Added the required column `updatedAt` to the `HouseImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookedById` to the `HouseViewing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `HouseViewing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HouseImage" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "HouseViewing" ADD COLUMN     "bookedById" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
