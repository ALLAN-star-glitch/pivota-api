/*
  Warnings:

  - A unique constraint covering the columns `[userUuid]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userUuid_key" ON "Subscription"("userUuid");
