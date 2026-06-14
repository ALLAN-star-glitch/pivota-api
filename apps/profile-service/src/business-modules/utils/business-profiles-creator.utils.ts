/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// apps/profile-service/src/utils/business-profiles-creator.utils.ts

import { ListingType, Prisma, SearchType } from '../../../generated/prisma/client';
import { randomUUID } from 'crypto';
import { StringUtils, PhoneUtils } from '@pivota-api/utils';


// Import your DTO types from dtos library
import {
  JobSeekerProfileDataDto,
  SkilledProfessionalProfileDataDto,
  HousingSeekerProfileDataDto,
  PropertyOwnerProfileDataDto,
  SupportBeneficiaryProfileDataDto,
  IntermediaryAgentProfileDataDto,
  EmployerProfileDataDto,
  SocialServiceProviderProfileDataDto,
} from '@pivota-api/dtos';

export type BusinessProfileType = 
  | 'JOB_SEEKER'
  | 'SKILLED_PROFESSIONAL'
  | 'HOUSING_SEEKER'
  | 'PROPERTY_OWNER'
  | 'SUPPORT_BENEFICIARY'
  | 'INTERMEDIARY_AGENT'
  | 'EMPLOYER'
  | 'SOCIAL_SERVICE_PROVIDER';

// Helper to queue events (non-blocking)
async function emitHousingEvent(
  options: any,
  housingData: HousingSeekerProfileDataDto,
  accountUuid: string,
  logger: any
): Promise<void> {
  if (!options?.userUuid) {
    logger.warn(`⚠️ No userUuid provided, cannot emit housing preferences event`);
    return;
  }

  if (!options?.queueService) {
    logger.warn(`⚠️ No queueService provided, cannot queue housing preferences event`);
    return;
  }

  logger.log(`📤 Queuing housing preferences event for user ${options.userUuid}`);
  
  const preferences = {
    userUuid: options.userUuid,
    timestamp: new Date().toISOString(),
    action: 'CREATED' as const,
    data: {
      minBudget: housingData.minBudget,
      maxBudget: housingData.maxBudget,
      budgetMidpoint: housingData.minBudget && housingData.maxBudget 
        ? (housingData.minBudget + housingData.maxBudget) / 2 
        : null,
      preferredLocations: housingData.preferredCities,
      preferredNeighborhoods: housingData.preferredNeighborhoods,
      preferredPropertyTypes: housingData.preferredTypes,
      minBedrooms: housingData.minBedrooms,
      maxBedrooms: housingData.maxBedrooms,
      moveInDate: housingData.moveInDate,
      hasPets: housingData.hasPets,
      latitude: housingData.latitude,
      longitude: housingData.longitude,
      searchRadiusKm: housingData.searchRadiusKm,
      searchType: housingData.searchType,
      isLookingForRental: housingData.isLookingForRental,
      isLookingToBuy: housingData.isLookingToBuy,
    }
  };
  
  try {
    await options.queueService.addJob(
      'profile-queue',
      'housing-preferences-updated',
      preferences,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    logger.log(`✅ Successfully queued housing preferences event for user ${options.userUuid}`);
  } catch (queueError) {
    logger.error(`❌ Failed to queue housing event: ${queueError.message}`);
  }
}

// Main function - NO VALIDATION (DTOs already handle it)
export async function createBusinessProfile(
  tx: Prisma.TransactionClient,
  accountUuid: string,
  profileType: BusinessProfileType,
  data: JobSeekerProfileDataDto | SkilledProfessionalProfileDataDto | 
        HousingSeekerProfileDataDto | PropertyOwnerProfileDataDto | 
        SupportBeneficiaryProfileDataDto | IntermediaryAgentProfileDataDto |
        EmployerProfileDataDto | SocialServiceProviderProfileDataDto,
  options?: {
    userUuid?: string;
    queueService?: any;
    logger?: any;
  }
): Promise<void> {
  const logger = options?.logger || console;
  
  logger.log(`📝 Creating business profile: ${profileType} for account ${accountUuid}`);
  
  // No validation - DTOs already validated at API layer
  // Just create the profile with sensible defaults for missing fields

  switch (profileType) {
    case 'JOB_SEEKER': {
      const jobData = data as JobSeekerProfileDataDto;
      await tx.jobSeekerProfile.create({
        data: {
          accountUuid,
          headline: jobData.headline ?? '',
          isActivelySeeking: jobData.isActivelySeeking ?? true,
          skills: StringUtils.stringifyJsonField(jobData.skills ?? []),
          industries: StringUtils.stringifyJsonField(jobData.industries ?? []),
          jobTypes: StringUtils.stringifyJsonField(jobData.jobTypes ?? []),
          seniorityLevel: jobData.seniorityLevel ?? null,
          expectedSalary: jobData.expectedSalary ?? null,
          noticePeriod: jobData.noticePeriod ?? null,
          workAuthorization: StringUtils.stringifyJsonField(jobData.workAuthorization ?? []),
          cvUrl: jobData.cvUrl ?? null,
          cvLastUpdated: jobData.cvUrl ? new Date() : null,
          portfolioImages: StringUtils.stringifyJsonField(jobData.portfolioImages ?? []),
          linkedInUrl: jobData.linkedInUrl ?? null,
          githubUrl: jobData.githubUrl ?? null,
          portfolioUrl: jobData.portfolioUrl ?? null,
          hasAgent: jobData.hasAgent ?? false,
          agentUuid: jobData.agentUuid ?? null,
        },
      });
      logger.log(`✅ Created JOB_SEEKER profile for account ${accountUuid}`);
      break;
    }

      case "SKILLED_PROFESSIONAL": {
      const profData = data as SkilledProfessionalProfileDataDto;
      
      logger.log(`👨‍🔧 Creating SKILLED_PROFESSIONAL profile for account ${accountUuid}`);
       
      // Use title or profession as fallback, default to 'Professional'
      const profileTitle = profData.title || profData.profession || 'Professional';
      
      const profile = await tx.skilledProfessionalProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          title: profileTitle,
          specialties: StringUtils.stringifyJsonField(profData.specialties ?? []),
          serviceAreas: StringUtils.stringifyJsonField(profData.serviceAreas ?? []),
          yearsExperience: profData.yearsExperience ?? 0,
          licenseNumber: profData.licenseNumber ?? null,
          insuranceInfo: profData.insuranceInfo ?? null,
          hourlyRate: profData.hourlyRate ?? null,
          dailyRate: profData.dailyRate ?? null,
          paymentTerms: profData.paymentTerms ?? null,
          availableToday: profData.availableToday ?? false,
          availableWeekends: profData.availableWeekends ?? true,
          emergencyService: profData.emergencyService ?? false,
          portfolioImages: StringUtils.stringifyJsonField(profData.portfolioImages ?? []),
          certifications: StringUtils.stringifyJsonField(profData.certifications ?? []),
          
          // ========== NEW: Booking Fee Fields ==========
          profileBookingFeeEnabled: profData.profileBookingFeeEnabled ?? false,
          profileBookingFeeAmount: profData.profileBookingFeeAmount ?? null,
          profileBookingFeeCurrency: profData.profileBookingFeeCurrency ?? 'KES',
          profileBookingFeeDescription: profData.profileBookingFeeDescription ?? null,
          profileBookingFeeRefundable: profData.profileBookingFeeRefundable ?? false,
        },
      });
      
      // Create category relations if categories are provided
      if (profData.primaryCategoryId || profData.additionalCategoryIds?.length) {
        logger.log(`📂 Creating category relations for skilled professional`);
        
        if (profData.primaryCategoryId) {
          await tx.skilledProfessionalCategory.create({
            data: {
              skilledProfessionalId: profile.id,
              categoryId: profData.primaryCategoryId,
              isPrimary: true,
              yearsExperience: profData.yearsExperienceInCategory ?? profData.yearsExperience ?? 0,
            }
          });
          logger.log(`✅ Created primary category relation: ${profData.primaryCategoryId}`);
        }
        
        if (profData.additionalCategoryIds?.length) {
          await tx.skilledProfessionalCategory.createMany({
            data: profData.additionalCategoryIds.map(categoryId => ({
              skilledProfessionalId: profile.id,
              categoryId,
              isPrimary: false,
            })),
          });
          logger.log(`✅ Created ${profData.additionalCategoryIds.length} additional category relations`);
        }
      }
      
      logger.log(`✅ Created SKILLED_PROFESSIONAL profile for account ${accountUuid}`);
      break;
    }

    case "HOUSING_SEEKER": {
      const housingData = data as HousingSeekerProfileDataDto;
      
      logger.log(`🏠 Creating HOUSING_SEEKER profile for account ${accountUuid}`);
      
      await tx.housingSeekerProfile.create({
        data: {
          accountUuid,
          minBedrooms: housingData.minBedrooms ?? 0,
          maxBedrooms: housingData.maxBedrooms ?? 5,
          minBudget: housingData.minBudget ?? 0,
          maxBudget: housingData.maxBudget ?? 10000000,
          preferredTypes: StringUtils.stringifyJsonField(housingData.preferredTypes ?? []),
          preferredCities: StringUtils.stringifyJsonField(housingData.preferredCities ?? []),
          preferredNeighborhoods: StringUtils.stringifyJsonField(housingData.preferredNeighborhoods ?? []),
          moveInDate: housingData.moveInDate ? new Date(housingData.moveInDate) : null,
          leaseDuration: housingData.leaseDuration ?? null,
          householdSize: housingData.householdSize ?? 1,
          hasPets: housingData.hasPets ?? false,
          petDetails: housingData.petDetails ?? null,
          latitude: housingData.latitude ?? null,
          longitude: housingData.longitude ?? null,
          searchRadiusKm: housingData.searchRadiusKm ?? 10,
          hasAgent: housingData.hasAgent ?? false,
          agentUuid: housingData.agentUuid ?? null,
          searchType: housingData.searchType ? (housingData.searchType as SearchType) : null,
          isLookingForRental: housingData.isLookingForRental ?? false,
          isLookingToBuy: housingData.isLookingToBuy ?? false,
        },
      });
      
      logger.log(`✅ Created HOUSING_SEEKER profile for account ${accountUuid}`);
      
      await emitHousingEvent(options, housingData, accountUuid, logger);
      break;
    }

    case "PROPERTY_OWNER": {
      const ownerData = data as PropertyOwnerProfileDataDto;
      
      logger.log(`🏢 Creating PROPERTY_OWNER profile for account ${accountUuid}`);
      
      await tx.propertyOwnerProfile.create({
        data: {
          accountUuid,
          isProfessional: ownerData.isProfessional ?? false,
          licenseNumber: ownerData.licenseNumber ?? null,
          companyName: ownerData.companyName ?? null,
          yearsInBusiness: ownerData.yearsInBusiness ?? null,
          preferredPropertyTypes: StringUtils.stringifyJsonField(ownerData.preferredPropertyTypes ?? []),
          serviceAreas: StringUtils.stringifyJsonField(ownerData.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: ownerData.usesAgent ?? false,
          managingAgentUuid: ownerData.managingAgentUuid ?? null,
          propertyCount: ownerData.propertyCount ?? null,
          propertyTypes: StringUtils.stringifyJsonField(ownerData.propertyTypes ?? []),
          propertyPurpose: ownerData.propertyPurpose ?? null,
          listingType: ownerData.listingType ? (ownerData.listingType as ListingType) : null,
          isListingForRent: ownerData.isListingForRent ?? false,
          isListingForSale: ownerData.isListingForSale ?? false,
        },
      });
      logger.log(`✅ Created PROPERTY_OWNER profile for account ${accountUuid}`);
      break;
    }

    case "SUPPORT_BENEFICIARY": {
      const beneficiaryData = data as SupportBeneficiaryProfileDataDto;
      
      await tx.supportBeneficiaryProfile.create({
        data: {
          accountUuid,
          needs: StringUtils.stringifyJsonField(beneficiaryData.needs ?? []),
          urgentNeeds: StringUtils.stringifyJsonField(beneficiaryData.urgentNeeds ?? []),
          familySize: beneficiaryData.familySize ?? null,
          dependents: beneficiaryData.dependents ?? null,
          householdComposition: beneficiaryData.householdComposition ?? null,
          vulnerabilityFactors: StringUtils.stringifyJsonField(beneficiaryData.vulnerabilityFactors ?? []),
          city: beneficiaryData.city ?? null,
          neighborhood: beneficiaryData.neighborhood ?? null,
          latitude: beneficiaryData.latitude ?? null,
          longitude: beneficiaryData.longitude ?? null,
          landmark: beneficiaryData.landmark ?? null,
          prefersAnonymity: beneficiaryData.prefersAnonymity ?? true,
          languagePreference: StringUtils.stringifyJsonField(beneficiaryData.languagePreference ?? []),
          consentToShare: beneficiaryData.consentToShare ?? false,
          consentGivenAt: beneficiaryData.consentToShare ? new Date() : null,
          referredBy: beneficiaryData.referredBy ?? null,
          referredByUuid: beneficiaryData.referredByUuid ?? null,
          caseWorkerUuid: beneficiaryData.caseWorkerUuid ?? null,
        },
      });
      logger.log(`✅ Created SUPPORT_BENEFICIARY profile for account ${accountUuid}`);
      break;
    }

    case "INTERMEDIARY_AGENT": {
      const agentData = data as IntermediaryAgentProfileDataDto;
      
      await tx.intermediaryAgentProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          agentType: agentData.agentType ?? 'GENERAL',
          specializations: StringUtils.stringifyJsonField(agentData.specializations ?? []),
          serviceAreas: StringUtils.stringifyJsonField(agentData.serviceAreas ?? []),
          licenseNumber: agentData.licenseNumber ?? null,
          licenseBody: agentData.licenseBody ?? null,
          yearsExperience: agentData.yearsExperience ?? null,
          agencyName: agentData.agencyName ?? null,
          agencyUuid: agentData.agencyUuid ?? null,
          commissionRate: agentData.commissionRate ?? null,
          feeStructure: agentData.feeStructure ?? null,
          minimumFee: agentData.minimumFee ?? null,
          typicalFee: agentData.typicalFee ?? null,
          isVerified: false,
          about: agentData.about ?? null,
          profileImage: agentData.profileImage ?? null,
          contactEmail: agentData.contactEmail ?? null,
          contactPhone: PhoneUtils.normalize(agentData.contactPhone || '') ?? null,
          website: agentData.website ?? null,
          socialLinks: StringUtils.stringifyJsonField(agentData.socialLinks ?? {}),
          clientTypes: StringUtils.stringifyJsonField(agentData.clientTypes ?? []),
        },
      });
      logger.log(`✅ Created INTERMEDIARY_AGENT profile for account ${accountUuid}`);
      break;
    }

    case "EMPLOYER": {
      const employerData = data as EmployerProfileDataDto;
      
      await tx.employerProfile.create({
        data: {
          accountUuid,
          companyName: employerData.companyName ?? null,
          industry: employerData.industry ?? null,
          companySize: employerData.companySize ?? null,
          foundedYear: employerData.foundedYear ?? null,
          description: employerData.description ?? null,
          logo: employerData.logo ?? null,
          preferredSkills: StringUtils.stringifyJsonField(employerData.preferredSkills ?? []),
          remotePolicy: employerData.remotePolicy ?? null,
          isVerifiedEmployer: false,
          worksWithAgents: employerData.worksWithAgents ?? false,
          preferredAgents: StringUtils.stringifyJsonField(employerData.preferredAgents ?? []),
          businessName: employerData.businessName ?? null,
          isRegistered: employerData.isRegistered ?? false,
          yearsExperience: employerData.yearsExperience ?? null,
        },
      });
      logger.log(`✅ Created EMPLOYER profile for account ${accountUuid}`);
      break;
    }

    case "SOCIAL_SERVICE_PROVIDER": {
      const providerData = data as SocialServiceProviderProfileDataDto;
      
      await tx.socialServiceProviderProfile.create({
        data: {
          accountUuid,
          providerType: providerData.providerType ?? 'GENERAL',
          servicesOffered: StringUtils.stringifyJsonField(providerData.servicesOffered ?? []),
          targetBeneficiaries: StringUtils.stringifyJsonField(providerData.targetBeneficiaries ?? []),
          serviceAreas: StringUtils.stringifyJsonField(providerData.serviceAreas ?? []),
          isVerified: false,
          about: providerData.about ?? null,
          website: providerData.website ?? null,
          contactEmail: providerData.contactEmail ?? null,
          contactPhone: PhoneUtils.normalize(providerData.contactPhone || '') ?? null,
          officeHours: providerData.officeHours ?? null,
          physicalAddress: providerData.physicalAddress ?? null,
          peopleServed: providerData.peopleServed ?? null,
          yearEstablished: providerData.yearEstablished ?? null,
          acceptsDonations: providerData.acceptsDonations ?? false,
          needsVolunteers: providerData.needsVolunteers ?? false,
          donationInfo: providerData.donationInfo ?? null,
          volunteerNeeds: providerData.volunteerNeeds ?? null,
          operatingName: providerData.operatingName ?? null,
          yearsExperience: providerData.yearsExperience ?? null,
          qualifications: StringUtils.stringifyJsonField(providerData.qualifications ?? []),
          availability: providerData.availability ?? null,
        },
      });
      logger.log(`✅ Created SOCIAL_SERVICE_PROVIDER profile for account ${accountUuid}`);
      break;
    }
  

    default:
      logger.error(`❌ Unknown business profile type: ${profileType}`);
      throw new Error(`Unknown business profile type: ${profileType}`);
  }
}