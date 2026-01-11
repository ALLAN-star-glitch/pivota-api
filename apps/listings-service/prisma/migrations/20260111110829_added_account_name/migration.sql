/*
  Warnings:

  - Added the required column `accountName` to the `JobPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "accountName" TEXT NOT NULL;
