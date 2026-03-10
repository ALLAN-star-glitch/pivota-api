-- AlterTable
ALTER TABLE "SmartMatchy" ADD COLUMN     "browser" TEXT,
ADD COLUMN     "browserVersion" TEXT,
ADD COLUMN     "isBot" BOOLEAN DEFAULT false,
ADD COLUMN     "os" TEXT;

-- CreateIndex
CREATE INDEX "SmartMatchy_os_idx" ON "SmartMatchy"("os");

-- CreateIndex
CREATE INDEX "SmartMatchy_browser_idx" ON "SmartMatchy"("browser");

-- CreateIndex
CREATE INDEX "SmartMatchy_isBot_idx" ON "SmartMatchy"("isBot");
