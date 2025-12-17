/*
  Warnings:

  - You are about to drop the column `premium` on the `Plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "premium",
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;
