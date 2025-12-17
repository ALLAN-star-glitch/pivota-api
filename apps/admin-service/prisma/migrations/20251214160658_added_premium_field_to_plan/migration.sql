/*
  Warnings:

  - You are about to drop the column `premium` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "premium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "premium";
