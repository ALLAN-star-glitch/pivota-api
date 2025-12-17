/*
  Warnings:

  - You are about to drop the column `categoryId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `currentSubscription` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `planId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionExpiresAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "categoryId",
DROP COLUMN "currentSubscription",
DROP COLUMN "planId",
DROP COLUMN "role",
DROP COLUMN "subscriptionExpiresAt",
DROP COLUMN "subscriptionStatus",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT;
