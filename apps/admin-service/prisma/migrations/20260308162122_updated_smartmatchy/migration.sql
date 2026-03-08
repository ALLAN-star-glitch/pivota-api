-- AlterTable
ALTER TABLE "SmartMatchy" ADD COLUMN     "isAdminBooking" BOOLEAN DEFAULT false,
ADD COLUMN     "viewingDuration" INTEGER,
ADD COLUMN     "viewingParticipants" INTEGER;

-- CreateIndex
CREATE INDEX "SmartMatchy_viewingDate_idx" ON "SmartMatchy"("viewingDate");

-- CreateIndex
CREATE INDEX "SmartMatchy_isAdminBooking_idx" ON "SmartMatchy"("isAdminBooking");

-- CreateIndex
CREATE INDEX "SmartMatchy_viewingDuration_idx" ON "SmartMatchy"("viewingDuration");
