/*
  Warnings:

  - A unique constraint covering the columns `[googleProviderId]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "googleProviderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Credential_googleProviderId_key" ON "Credential"("googleProviderId");
