/*
  Warnings:

  - The primary key for the `Credential` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[uuid]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `InvitationAudit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `Otp` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `PasswordSetupToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[uuid]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `Credential` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `InvitationAudit` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `InvitationAudit` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Otp` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `PasswordSetupToken` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Session` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_pkey",
ADD COLUMN     "uuid" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Credential_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Credential_id_seq";

-- AlterTable
ALTER TABLE "InvitationAudit" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "uuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PasswordSetupToken" ADD COLUMN     "uuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
ADD COLUMN     "uuid" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Session_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "Credential_uuid_key" ON "Credential"("uuid");

-- CreateIndex
CREATE INDEX "Credential_userUuid_idx" ON "Credential"("userUuid");

-- CreateIndex
CREATE INDEX "Credential_email_idx" ON "Credential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationAudit_uuid_key" ON "InvitationAudit"("uuid");

-- CreateIndex
CREATE INDEX "InvitationAudit_invitedByUserUuid_idx" ON "InvitationAudit"("invitedByUserUuid");

-- CreateIndex
CREATE UNIQUE INDEX "Otp_uuid_key" ON "Otp"("uuid");

-- CreateIndex
CREATE INDEX "Otp_purpose_idx" ON "Otp"("purpose");

-- CreateIndex
CREATE INDEX "Otp_expiresAt_idx" ON "Otp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordSetupToken_uuid_key" ON "PasswordSetupToken"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Session_uuid_key" ON "Session"("uuid");

-- CreateIndex
CREATE INDEX "Session_tokenId_idx" ON "Session"("tokenId");
