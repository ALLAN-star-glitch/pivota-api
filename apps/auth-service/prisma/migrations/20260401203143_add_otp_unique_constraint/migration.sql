/*
  Warnings:

  - A unique constraint covering the columns `[email,purpose]` on the table `Otp` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Otp_email_purpose_key" ON "Otp"("email", "purpose");
