-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "features" TEXT,
ADD COLUMN     "monthlyPrice" DOUBLE PRECISION,
ADD COLUMN     "totalListings" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "maxListings" INTEGER,
    "restrictions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRule_planId_moduleId_key" ON "CategoryRule"("planId", "moduleId");

-- AddForeignKey
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRule" ADD CONSTRAINT "CategoryRule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
