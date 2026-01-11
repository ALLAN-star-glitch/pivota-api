/*
  Warnings:

  - Added the required column `AccountName` to the `HouseListing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorName` to the `HouseListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HouseListing" ADD COLUMN     "AccountName" TEXT NOT NULL,
ADD COLUMN     "creatorName" TEXT NOT NULL;
