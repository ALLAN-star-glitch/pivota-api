/*
  Warnings:

  - You are about to drop the column `userId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `defaultRole` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `headquarters` on the `OrganizationProfile` table. All the data in the column will be lost.
  - You are about to drop the column `defaultRole` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `county` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `subCounty` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `ward` on the `UserProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_accountId_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "defaultRole";

-- AlterTable
ALTER TABLE "OrganizationProfile" DROP COLUMN "headquarters",
ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "defaultRole",
ADD COLUMN     "profileImage" TEXT,
ALTER COLUMN "roleName" SET DEFAULT 'GeneralUser';

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "county",
DROP COLUMN "subCounty",
DROP COLUMN "ward";

-- CreateIndex
CREATE UNIQUE INDEX "Account_organizationId_key" ON "Account"("organizationId");
