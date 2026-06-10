/*
  Warnings:

  - The values [COMPLETED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `agreedPrice` on the `ServiceBooking` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceExecutionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED');
ALTER TABLE "public"."ServiceBooking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ServiceBooking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "ServiceBooking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "ServiceBooking" DROP COLUMN "agreedPrice",
ADD COLUMN     "bookingFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "bookingFeeCurrency" TEXT DEFAULT 'KES',
ADD COLUMN     "bookingFeeRefundable" BOOLEAN DEFAULT false,
ADD COLUMN     "serviceDuration" INTEGER,
ADD COLUMN     "serviceExecutionStatus" "ServiceExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "servicePrice" DOUBLE PRECISION,
ADD COLUMN     "servicePriceUnit" TEXT,
ADD COLUMN     "totalAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "customBookingFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "customBookingFeeCurrency" TEXT DEFAULT 'KES',
ADD COLUMN     "customBookingFeeDescription" TEXT,
ADD COLUMN     "customBookingFeeEnabled" BOOLEAN,
ADD COLUMN     "customBookingFeeRefundable" BOOLEAN,
ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxNegotiablePrice" DOUBLE PRECISION,
ADD COLUMN     "minNegotiablePrice" DOUBLE PRECISION,
ADD COLUMN     "useCustomBookingFee" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ServiceOffering_useCustomBookingFee_idx" ON "ServiceOffering"("useCustomBookingFee");
