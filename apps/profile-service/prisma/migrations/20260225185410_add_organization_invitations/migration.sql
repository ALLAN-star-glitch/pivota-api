-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organizationUuid" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "roleName" TEXT NOT NULL DEFAULT 'GeneralUser',
    "invitedByUserUuid" TEXT NOT NULL,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_status_idx" ON "OrganizationInvitation"("status");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_expiresAt_idx" ON "OrganizationInvitation"("expiresAt");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationUuid_idx" ON "OrganizationInvitation"("organizationUuid");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_invitedByUserUuid_idx" ON "OrganizationInvitation"("invitedByUserUuid");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_organizationUuid_key" ON "OrganizationInvitation"("email", "organizationUuid");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationUuid_fkey" FOREIGN KEY ("organizationUuid") REFERENCES "Organization"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedByUserUuid_fkey" FOREIGN KEY ("invitedByUserUuid") REFERENCES "User"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
