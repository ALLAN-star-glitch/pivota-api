/*
  Warnings:

  - You are about to drop the column `entityId` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "entityId",
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "entityIds" TEXT[],
ADD COLUMN     "totalAmount" DOUBLE PRECISION;
