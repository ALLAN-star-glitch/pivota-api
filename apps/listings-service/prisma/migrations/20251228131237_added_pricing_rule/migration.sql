-- CreateTable
CREATE TABLE "PriceUnitRule" (
    "id" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceUnitRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceUnitRule_vertical_unit_key" ON "PriceUnitRule"("vertical", "unit");
