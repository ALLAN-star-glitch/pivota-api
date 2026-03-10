-- CreateTable
CREATE TABLE "AuthEventLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "serviceSource" TEXT NOT NULL DEFAULT 'auth',
    "userUuid" TEXT,
    "email" TEXT,
    "emailHash" TEXT,
    "payload" JSONB NOT NULL,
    "clientInfo" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAuthMetrics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSignups" INTEGER NOT NULL DEFAULT 0,
    "emailSignups" INTEGER NOT NULL DEFAULT 0,
    "googleSignups" INTEGER NOT NULL DEFAULT 0,
    "individualSignups" INTEGER NOT NULL DEFAULT 0,
    "organizationSignups" INTEGER NOT NULL DEFAULT 0,
    "premiumSignups" INTEGER NOT NULL DEFAULT 0,
    "freeSignups" INTEGER NOT NULL DEFAULT 0,
    "failedSignups" INTEGER NOT NULL DEFAULT 0,
    "invalidOtpSignups" INTEGER NOT NULL DEFAULT 0,
    "profileFailedSignups" INTEGER NOT NULL DEFAULT 0,
    "totalLogins" INTEGER NOT NULL DEFAULT 0,
    "googleLogins" INTEGER NOT NULL DEFAULT 0,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "loginErrors" INTEGER NOT NULL DEFAULT 0,
    "accountsLinked" INTEGER NOT NULL DEFAULT 0,
    "otpRequests" INTEGER NOT NULL DEFAULT 0,
    "otpVerified" INTEGER NOT NULL DEFAULT 0,
    "otpFailed" INTEGER NOT NULL DEFAULT 0,
    "otpRateLimited" INTEGER NOT NULL DEFAULT 0,
    "mobileLogins" INTEGER NOT NULL DEFAULT 0,
    "desktopLogins" INTEGER NOT NULL DEFAULT 0,
    "tabletLogins" INTEGER NOT NULL DEFAULT 0,
    "botRequests" INTEGER NOT NULL DEFAULT 0,
    "iosLogins" INTEGER NOT NULL DEFAULT 0,
    "androidLogins" INTEGER NOT NULL DEFAULT 0,
    "windowsLogins" INTEGER NOT NULL DEFAULT 0,
    "macLogins" INTEGER NOT NULL DEFAULT 0,
    "chromeLogins" INTEGER NOT NULL DEFAULT 0,
    "safariLogins" INTEGER NOT NULL DEFAULT 0,
    "firefoxLogins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAuthMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyAuthMetrics" (
    "id" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "logins" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyAuthMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthEventLog_eventType_idx" ON "AuthEventLog"("eventType");

-- CreateIndex
CREATE INDEX "AuthEventLog_occurredAt_idx" ON "AuthEventLog"("occurredAt");

-- CreateIndex
CREATE INDEX "AuthEventLog_userUuid_idx" ON "AuthEventLog"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAuthMetrics_date_key" ON "DailyAuthMetrics"("date");

-- CreateIndex
CREATE INDEX "DailyAuthMetrics_date_idx" ON "DailyAuthMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyAuthMetrics_hour_key" ON "HourlyAuthMetrics"("hour");

-- CreateIndex
CREATE INDEX "HourlyAuthMetrics_hour_idx" ON "HourlyAuthMetrics"("hour");
