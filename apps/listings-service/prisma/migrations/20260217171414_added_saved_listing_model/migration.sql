-- CreateTable
CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedListing_userUuid_idx" ON "SavedListing"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "SavedListing_userUuid_targetId_key" ON "SavedListing"("userUuid", "targetId");
