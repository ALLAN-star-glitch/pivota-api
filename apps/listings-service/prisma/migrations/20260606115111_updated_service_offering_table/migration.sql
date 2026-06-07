/*
  Warnings:

  - You are about to drop the column `locationCity` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `locationNeighborhood` on the `ServiceOffering` table. All the data in the column will be lost.
  - You are about to drop the column `serviceAreas` on the `ServiceOffering` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ServiceOffering_locationCity_idx";

-- AlterTable
ALTER TABLE "ServiceOffering" DROP COLUMN "locationCity",
DROP COLUMN "locationNeighborhood",
DROP COLUMN "serviceAreas",
ADD COLUMN     "coverageAreas" JSONB;
