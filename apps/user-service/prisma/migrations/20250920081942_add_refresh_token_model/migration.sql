/*
  Warnings:

  - Added the required column `hashedToken` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "hashedToken" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_revoked_idx" ON "public"."RefreshToken"("revoked");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "public"."RefreshToken"("expiresAt");
