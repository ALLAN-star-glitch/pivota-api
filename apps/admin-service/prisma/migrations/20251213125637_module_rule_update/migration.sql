/*
  Warnings:

  - You are about to drop the `CategoryRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CategoryRule" DROP CONSTRAINT "CategoryRule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryRule" DROP CONSTRAINT "CategoryRule_planId_fkey";

-- DropTable
DROP TABLE "CategoryRule";

-- CreateTable
CREATE TABLE "ModuleRule" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "restrictions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleRule_planId_moduleId_key" ON "ModuleRule"("planId", "moduleId");

-- AddForeignKey
ALTER TABLE "ModuleRule" ADD CONSTRAINT "ModuleRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleRule" ADD CONSTRAINT "ModuleRule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
