/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Account` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Account_organizationId_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "organizationId";
