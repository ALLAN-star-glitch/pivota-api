-- CreateTable
CREATE TABLE "OtpRequestLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OtpRequestLog_email_purpose_createdAt_idx" ON "OtpRequestLog"("email", "purpose", "createdAt");
