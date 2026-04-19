/*
  Warnings:

  - The `type` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Account` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `OrganizationInvitation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `verificationStatus` column on the `OrganizationProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `account_verifications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `searchType` column on the `housing_seeker_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `listingType` column on the `property_owner_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `account_verifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('FOR_PROFIT', 'NON_PROFIT', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('ID_VERIFICATION', 'BUSINESS_REGISTRATION', 'TAX_PIN', 'BUSINESS_PERMIT', 'PROFESSIONAL_LICENSE', 'TRADE_CERTIFICATE', 'PRACTICING_CERTIFICATE', 'REFERENCE_LETTER', 'TITLE_DEED', 'LEASE_AGREEMENT', 'OWNERSHIP_AUTHORIZATION', 'INSURANCE_CERTIFICATE', 'POLICE_CLEARANCE', 'RECOMMENDATION_LETTER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('RENT', 'SALE', 'BOTH');

-- CreateEnum
CREATE TYPE "SearchType" AS ENUM ('RENT', 'BUY', 'BOTH');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrganizationVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "businessType" "BusinessType",
ADD COLUMN     "isBusiness" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "type",
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'INDIVIDUAL',
DROP COLUMN "status",
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "IndividualProfile" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "coverPhoto" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "operatesAsBusiness" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrganizationInvitation" DROP COLUMN "status",
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrganizationProfile" ADD COLUMN     "coverPhoto" TEXT,
DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "OrganizationVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "account_verifications" DROP COLUMN "type",
ADD COLUMN     "type" "VerificationDocumentType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "housing_seeker_profiles" DROP COLUMN "searchType",
ADD COLUMN     "searchType" "SearchType";

-- AlterTable
ALTER TABLE "property_owner_profiles" DROP COLUMN "listingType",
ADD COLUMN     "listingType" "ListingType";

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_status_idx" ON "OrganizationInvitation"("status");

-- CreateIndex
CREATE INDEX "OrganizationProfile_verificationStatus_idx" ON "OrganizationProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "account_verifications_status_idx" ON "account_verifications"("status");

-- CreateIndex
CREATE INDEX "account_verifications_type_idx" ON "account_verifications"("type");

-- CreateIndex
CREATE UNIQUE INDEX "account_verifications_accountUuid_type_key" ON "account_verifications"("accountUuid", "type");

-- CreateIndex
CREATE INDEX "housing_seeker_profiles_searchType_idx" ON "housing_seeker_profiles"("searchType");

-- CreateIndex
CREATE INDEX "property_owner_profiles_listingType_idx" ON "property_owner_profiles"("listingType");
