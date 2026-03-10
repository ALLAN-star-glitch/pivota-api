-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "browserVersion" TEXT,
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "isBot" BOOLEAN,
ADD COLUMN     "isDesktop" BOOLEAN,
ADD COLUMN     "isMobile" BOOLEAN,
ADD COLUMN     "isTablet" BOOLEAN,
ADD COLUMN     "osVersion" TEXT;
