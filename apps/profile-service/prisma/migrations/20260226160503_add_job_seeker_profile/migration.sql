/*
  Warnings:

  - You are about to drop the column `preferredRoles` on the `JobSeekerProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JobSeekerProfile" DROP COLUMN "preferredRoles",
ADD COLUMN     "industries" TEXT[],
ADD COLUMN     "jobTypes" TEXT[],
ADD COLUMN     "seniorityLevel" TEXT,
ADD COLUMN     "skills" TEXT[];
