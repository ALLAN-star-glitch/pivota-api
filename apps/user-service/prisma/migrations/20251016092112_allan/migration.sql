/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userCode` to the `User` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "userCode" TEXT NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "public"."User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "public"."User"("userCode");
