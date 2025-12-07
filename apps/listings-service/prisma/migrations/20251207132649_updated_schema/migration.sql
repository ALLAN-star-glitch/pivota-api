-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "subCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "JobCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
