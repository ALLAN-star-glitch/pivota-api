-- AlterTable
ALTER TABLE "Credential" ALTER COLUMN "mfaEnabled" SET DEFAULT true;

-- CreateTable
CREATE TABLE "PasswordSetupToken" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationAudit" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userUuid" TEXT,
    "organizationUuid" TEXT NOT NULL,
    "invitedByUserUuid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordSetupToken_token_key" ON "PasswordSetupToken"("token");

-- CreateIndex
CREATE INDEX "PasswordSetupToken_token_idx" ON "PasswordSetupToken"("token");

-- CreateIndex
CREATE INDEX "PasswordSetupToken_expiresAt_idx" ON "PasswordSetupToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordSetupToken_userUuid_idx" ON "PasswordSetupToken"("userUuid");

-- CreateIndex
CREATE INDEX "InvitationAudit_email_idx" ON "InvitationAudit"("email");

-- CreateIndex
CREATE INDEX "InvitationAudit_organizationUuid_idx" ON "InvitationAudit"("organizationUuid");

-- CreateIndex
CREATE INDEX "InvitationAudit_status_idx" ON "InvitationAudit"("status");

-- AddForeignKey
ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "Credential"("userUuid") ON DELETE CASCADE ON UPDATE CASCADE;
