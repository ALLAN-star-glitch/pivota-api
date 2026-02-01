/*
  Warnings:

  - You are about to drop the `OrganizationInvitation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizationInvitation" DROP CONSTRAINT "OrganizationInvitation_organizationUuid_fkey";

-- DropTable
DROP TABLE "OrganizationInvitation";
