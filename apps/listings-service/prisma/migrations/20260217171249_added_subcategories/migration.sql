-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "HouseListing" ADD COLUMN     "subCategoryId" TEXT;

-- AlterTable
ALTER TABLE "ServiceOffering" ADD COLUMN     "subCategoryId" TEXT;

-- AlterTable
ALTER TABLE "SupportProgram" ADD COLUMN     "subCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "HouseListing_subCategoryId_idx" ON "HouseListing"("subCategoryId");

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseListing" ADD CONSTRAINT "HouseListing_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportProgram" ADD CONSTRAINT "SupportProgram_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
