/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `ServiceOffering` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffering_externalId_key" ON "ServiceOffering"("externalId");
