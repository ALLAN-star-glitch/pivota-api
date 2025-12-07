/*
  Warnings:

  - Added the required column `additionalNotes` to the `ProviderJob` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProviderJob" ADD COLUMN     "additionalNotes" TEXT NOT NULL;
