-- AlterTable
ALTER TABLE "EmployerProfile" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "isRegistered" BOOLEAN DEFAULT false,
ADD COLUMN     "yearsExperience" INTEGER;

-- AlterTable
ALTER TABLE "PropertyOwnerProfile" ADD COLUMN     "propertyCount" INTEGER,
ADD COLUMN     "propertyPurpose" TEXT,
ADD COLUMN     "propertyTypes" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "SocialServiceProviderProfile" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "operatingName" TEXT,
ADD COLUMN     "qualifications" JSONB DEFAULT '[]',
ADD COLUMN     "yearsExperience" INTEGER;
