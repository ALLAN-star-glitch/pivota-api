/*
  Warnings:

  - You are about to drop the column `userId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserCategory` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `UserRole` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userUuid,roleId]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userUuid` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userUuid` to the `UserCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userUuid` to the `UserRole` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."UserRole_userId_roleId_key";

-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT,
ALTER COLUMN "performedBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Subscription" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserCategory" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT NOT NULL,
ALTER COLUMN "approvedBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."UserRole" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_userUuid_idx" ON "public"."AuditLog"("userUuid");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userUuid_idx" ON "public"."Subscription"("userUuid");

-- CreateIndex
CREATE INDEX "Subscription_createdAt_idx" ON "public"."Subscription"("createdAt");

-- CreateIndex
CREATE INDEX "UserCategory_userUuid_idx" ON "public"."UserCategory"("userUuid");

-- CreateIndex
CREATE INDEX "UserCategory_createdAt_idx" ON "public"."UserCategory"("createdAt");

-- CreateIndex
CREATE INDEX "UserRole_userUuid_idx" ON "public"."UserRole"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userUuid_roleId_key" ON "public"."UserRole"("userUuid", "roleId");
