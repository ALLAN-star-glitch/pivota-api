-- AlterTable
ALTER TABLE "PriceUnitRule" ADD COLUMN     "isExperienceRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNotesRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPrice" DOUBLE PRECISION,
ADD COLUMN     "minPrice" DOUBLE PRECISION DEFAULT 0;
