-- CreateTable
CREATE TABLE "HousingPreference" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "minBedrooms" INTEGER NOT NULL DEFAULT 0,
    "maxBedrooms" INTEGER NOT NULL DEFAULT 5,
    "maxBudget" DOUBLE PRECISION,
    "preferredType" TEXT,
    "preferredCity" TEXT,
    "preferredNeighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HousingPreference_userUuid_key" ON "HousingPreference"("userUuid");

-- AddForeignKey
ALTER TABLE "HousingPreference" ADD CONSTRAINT "HousingPreference_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
