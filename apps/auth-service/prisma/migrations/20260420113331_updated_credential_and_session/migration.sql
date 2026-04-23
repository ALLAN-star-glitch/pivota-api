/*
  Warnings:

  - Added the required column `accountUuid` to the `Credential` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "accountUuid" TEXT NOT NULL,
ADD COLUMN     "memberStatus" TEXT;

-- CreateIndex
CREATE INDEX "Credential_accountUuid_idx" ON "Credential"("accountUuid");

-- CreateIndex
CREATE INDEX "Credential_accountStatus_idx" ON "Credential"("accountStatus");

-- CreateIndex
CREATE INDEX "Credential_memberStatus_idx" ON "Credential"("memberStatus");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "Credential"("userUuid") ON DELETE RESTRICT ON UPDATE CASCADE;
