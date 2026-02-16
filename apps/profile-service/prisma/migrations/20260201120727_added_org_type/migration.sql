/*
  Warnings:

  - You are about to drop the column `organizationType` on the `OrganizationProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrganizationProfile" DROP COLUMN "organizationType",
ADD COLUMN     "typeSlug" TEXT;

-- CreateTable
CREATE TABLE "OrganizationType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationType_slug_key" ON "OrganizationType"("slug");

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_typeSlug_fkey" FOREIGN KEY ("typeSlug") REFERENCES "OrganizationType"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
