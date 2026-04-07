/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Credential_phone_key" ON "Credential"("phone");
