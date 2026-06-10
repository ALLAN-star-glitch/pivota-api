-- AlterTable
ALTER TABLE "ServiceBooking" ADD COLUMN     "reminderSent12h" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent1h" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent24h" BOOLEAN NOT NULL DEFAULT false;
