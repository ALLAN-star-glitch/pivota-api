/*
  Warnings:

  - You are about to drop the column `userId` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userUuid]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userUuid` to the `Credential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userUuid` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Credential_userId_key";

-- DropIndex
DROP INDEX "public"."Session_userId_idx";

-- AlterTable
ALTER TABLE "public"."Credential" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Session" DROP COLUMN "userId",
ADD COLUMN     "userUuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Credential_userUuid_key" ON "public"."Credential"("userUuid");

-- CreateIndex
CREATE INDEX "Session_userUuid_idx" ON "public"."Session"("userUuid");
