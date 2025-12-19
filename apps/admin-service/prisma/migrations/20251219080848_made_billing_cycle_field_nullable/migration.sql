/*
  Warnings:

  - Made the column `features` on table `Plan` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "features" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "billingCycle" DROP NOT NULL,
ALTER COLUMN "billingCycle" DROP DEFAULT;
