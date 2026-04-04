-- CreateIndex
CREATE INDEX "Otp_email_purpose_idx" ON "Otp"("email", "purpose");

-- CreateIndex
CREATE INDEX "Otp_email_purpose_createdAt_idx" ON "Otp"("email", "purpose", "createdAt");
