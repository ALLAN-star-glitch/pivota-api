/*
  Warnings:

  - You are about to drop the `UserCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "UserCategory";

-- CreateTable
CREATE TABLE "UserModule" (
    "id" SERIAL NOT NULL,
    "userUuid" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "entityType" TEXT,
    "orgName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserModule" ADD CONSTRAINT "UserModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
