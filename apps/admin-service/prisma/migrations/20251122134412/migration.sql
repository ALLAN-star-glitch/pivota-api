/*
  Warnings:

  - A unique constraint covering the columns `[userUuid]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserRole_userUuid_idx";

-- DropIndex
DROP INDEX "UserRole_userUuid_roleId_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userUuid_key" ON "UserRole"("userUuid");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");
