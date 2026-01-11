/*
  Warnings:

  - You are about to drop the column `AccountName` on the `HouseListing` table. All the data in the column will be lost.
  - Added the required column `accountName` to the `HouseListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HouseListing" DROP COLUMN "AccountName",
ADD COLUMN     "accountName" TEXT NOT NULL;
