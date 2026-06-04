/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `HouseListing` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `Rating` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `ServiceBooking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `SupportApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `SupportMilestone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `SupportProgram` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Category_externalId_key" ON "Category"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseListing_externalId_key" ON "HouseListing"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_externalId_key" ON "Rating"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceBooking_externalId_key" ON "ServiceBooking"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportApplication_externalId_key" ON "SupportApplication"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportMilestone_externalId_key" ON "SupportMilestone"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportProgram_externalId_key" ON "SupportProgram"("externalId");
