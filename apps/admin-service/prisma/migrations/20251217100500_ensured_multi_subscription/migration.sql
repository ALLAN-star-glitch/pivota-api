-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropIndex
DROP INDEX "Subscription_userUuid_key";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amountPaid" DOUBLE PRECISION,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PLAN',
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "planId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
