/*
  Warnings:

  - You are about to drop the column `type` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roleType]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roleType` to the `Role` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Role_type_key";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "type",
ADD COLUMN     "roleType" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleType_key" ON "Role"("roleType");
