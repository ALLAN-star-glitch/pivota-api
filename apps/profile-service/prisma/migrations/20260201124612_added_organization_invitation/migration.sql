-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationUuid" TEXT NOT NULL,
    "roleName" TEXT NOT NULL DEFAULT 'Member',
    "invitedByUuid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_organizationUuid_key" ON "OrganizationInvitation"("email", "organizationUuid");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationUuid_fkey" FOREIGN KEY ("organizationUuid") REFERENCES "Organization"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
