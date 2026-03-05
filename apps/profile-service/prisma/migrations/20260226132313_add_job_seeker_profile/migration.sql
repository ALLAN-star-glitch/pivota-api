-- CreateTable
CREATE TABLE "JobSeekerProfile" (
    "id" TEXT NOT NULL,
    "userUuid" TEXT NOT NULL,
    "cvUrl" TEXT,
    "cvLastUpdated" TIMESTAMP(3),
    "isActivelySeeking" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "preferredRoles" TEXT[],
    "noticePeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerProfile_userUuid_key" ON "JobSeekerProfile"("userUuid");

-- AddForeignKey
ALTER TABLE "JobSeekerProfile" ADD CONSTRAINT "JobSeekerProfile_userUuid_fkey" FOREIGN KEY ("userUuid") REFERENCES "User"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
