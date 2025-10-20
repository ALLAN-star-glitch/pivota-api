-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "currentSubscription" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;
