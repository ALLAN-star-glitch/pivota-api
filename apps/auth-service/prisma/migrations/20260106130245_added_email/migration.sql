/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Credential` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockoutExpires" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Credential_email_key" ON "Credential"("email");
