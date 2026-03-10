-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");
