/*
  Warnings:

  - You are about to drop the column `verticals` on the `ServiceOffering` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ServiceOffering_verticals_idx";

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "verticals";
