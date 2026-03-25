/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// apps/profile-service/src/utils/business-profiles-creator.utils.ts

import { Prisma } from '../../../generated/prisma/client';
import { randomUUID } from 'crypto';
import { StringUtils, PhoneUtils } from '@pivota-api/utils';
import { ClientKafka } from '@nestjs/microservices';

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

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Validate profile data based on profile type
 */
function validateProfileData(
  profileType: BusinessProfileType,
  data: any
): ValidationResult {
  const missingFields: string[] = [];

  switch (profileType) {
    case 'JOB_SEEKER': {
      const jobData = data as JobSeekerProfileDataDto;
      if (!jobData.headline) missingFields.push('headline');
      if (!jobData.skills?.length) missingFields.push('skills');
      if (!jobData.jobTypes?.length) missingFields.push('jobTypes');
      if (!jobData.expectedSalary) missingFields.push('expectedSalary');
      break;
    }

    case 'SKILLED_PROFESSIONAL': {
      const profData = data as SkilledProfessionalProfileDataDto;
      if (!profData.title) missingFields.push('title');
      if (!profData.profession) missingFields.push('profession');
      if (!profData.specialties?.length) missingFields.push('specialties');
      if (!profData.serviceAreas?.length) missingFields.push('serviceAreas');
      if (!profData.yearsExperience) missingFields.push('yearsExperience');
      break;
    }

    case 'HOUSING_SEEKER': {
      const housingData = data as HousingSeekerProfileDataDto;
      if (!housingData.minBudget || !housingData.maxBudget) {
        missingFields.push('budget (minBudget and maxBudget)');
      }
      if (!housingData.preferredTypes?.length) missingFields.push('preferredTypes');
      if (!housingData.preferredCities?.length) missingFields.push('preferredCities');
      break;
    }

    case 'PROPERTY_OWNER': {
      const ownerData = data as PropertyOwnerProfileDataDto;
      if (!ownerData.preferredPropertyTypes?.length) {
        missingFields.push('preferredPropertyTypes');
      }
      if (!ownerData.serviceAreas?.length) missingFields.push('serviceAreas');
      if (!ownerData.companyName && !ownerData.propertyCount) {
        missingFields.push('companyName or propertyCount');
      }
      break;
    }

    case 'SUPPORT_BENEFICIARY': {
      const beneficiaryData = data as SupportBeneficiaryProfileDataDto;
      if (!beneficiaryData.needs?.length) missingFields.push('needs');
      if (!beneficiaryData.city && !beneficiaryData.latitude) {
        missingFields.push('city or location coordinates');
      }
      break;
    }

    case 'INTERMEDIARY_AGENT': {
      const agentData = data as IntermediaryAgentProfileDataDto;
      if (!agentData.agentType) missingFields.push('agentType');
      if (!agentData.specializations?.length) missingFields.push('specializations');
      if (!agentData.serviceAreas?.length) missingFields.push('serviceAreas');
      if (!agentData.licenseNumber) missingFields.push('licenseNumber');
      break;
    }

    case 'EMPLOYER': {
      const employerData = data as EmployerProfileDataDto;
      if (!employerData.companyName && !employerData.businessName) {
        missingFields.push('companyName or businessName');
      }
      if (!employerData.industry) missingFields.push('industry');
      if (!employerData.companySize) missingFields.push('companySize');
      if (!employerData.preferredSkills?.length) missingFields.push('preferredSkills');
      break;
    }

    case 'SOCIAL_SERVICE_PROVIDER': {
      const providerData = data as SocialServiceProviderProfileDataDto;
      if (!providerData.providerType) missingFields.push('providerType');
      if (!providerData.servicesOffered?.length) missingFields.push('servicesOffered');
      if (!providerData.serviceAreas?.length) missingFields.push('serviceAreas');
      break;
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Create a business profile (job seeker, employer, agent, etc.) in a transaction
 * Used by both UserService and OrganisationService within the profile service
 * 
 * @throws Error if required fields are missing
 */
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
    kafkaClient?: ClientKafka;
    logger?: any;
  }
): Promise<void> {
  const logger = options?.logger || console;
  
  logger.log(`📝 Creating business profile: ${profileType} for account ${accountUuid}`);
  
  // Validate required fields before creating
  const validation = validateProfileData(profileType, data);
  if (!validation.isValid) {
    logger.error(`❌ Validation failed for ${profileType}: missing ${validation.missingFields.join(', ')}`);
    throw new Error(
      `Missing required fields for ${profileType}: ${validation.missingFields.join(', ')}`
    );
  }

  switch (profileType) {
    case 'JOB_SEEKER': {
      const jobData = data as JobSeekerProfileDataDto;
      await tx.jobSeekerProfile.create({
        data: {
          accountUuid,
          headline: jobData.headline!,
          isActivelySeeking: jobData.isActivelySeeking ?? true,
          skills: StringUtils.stringifyJsonField(jobData.skills ?? []),
          industries: StringUtils.stringifyJsonField(jobData.industries ?? []),
          jobTypes: StringUtils.stringifyJsonField(jobData.jobTypes ?? []),
          seniorityLevel: jobData.seniorityLevel,
          expectedSalary: jobData.expectedSalary!,
          noticePeriod: jobData.noticePeriod,
          workAuthorization: StringUtils.stringifyJsonField(jobData.workAuthorization ?? []),
          cvUrl: jobData.cvUrl,
          cvLastUpdated: jobData.cvUrl ? new Date() : undefined,
          portfolioImages: StringUtils.stringifyJsonField(jobData.portfolioImages ?? []),
          linkedInUrl: jobData.linkedInUrl,
          githubUrl: jobData.githubUrl,
          portfolioUrl: jobData.portfolioUrl,
          hasAgent: jobData.hasAgent ?? false,
          agentUuid: jobData.agentUuid,
        },
      });
      logger.log(`✅ Created JOB_SEEKER profile for account ${accountUuid}`);
      break;
    }

    case "SKILLED_PROFESSIONAL": {
      const profData = data as SkilledProfessionalProfileDataDto;
      await tx.skilledProfessionalProfile.create({
        data: {
          accountUuid,
          uuid: randomUUID(),
          title: profData.title!,
          profession: profData.profession!,
          specialties: StringUtils.stringifyJsonField(profData.specialties ?? []),
          serviceAreas: StringUtils.stringifyJsonField(profData.serviceAreas ?? []),
          yearsExperience: profData.yearsExperience!,
          licenseNumber: profData.licenseNumber,
          insuranceInfo: profData.insuranceInfo,
          hourlyRate: profData.hourlyRate,
          dailyRate: profData.dailyRate,
          paymentTerms: profData.paymentTerms,
          availableToday: profData.availableToday ?? false,
          availableWeekends: profData.availableWeekends ?? true,
          emergencyService: profData.emergencyService ?? false,
          portfolioImages: StringUtils.stringifyJsonField(profData.portfolioImages ?? []),
          certifications: StringUtils.stringifyJsonField(profData.certifications ?? []),
        },
      });
      logger.log(`✅ Created SKILLED_PROFESSIONAL profile for account ${accountUuid}`);
      break;
    }

    case "HOUSING_SEEKER": {
      const housingData = data as HousingSeekerProfileDataDto;
      
      logger.log(`🏠 Creating HOUSING_SEEKER profile for account ${accountUuid}`);
      logger.debug(`📊 Housing data: ${JSON.stringify({
        minBudget: housingData.minBudget,
        maxBudget: housingData.maxBudget,
        preferredCities: housingData.preferredCities,
        preferredTypes: housingData.preferredTypes,
        minBedrooms: housingData.minBedrooms,
        maxBedrooms: housingData.maxBedrooms,
        hasPets: housingData.hasPets,
        latitude: housingData.latitude,
        longitude: housingData.longitude,
      })}`);
      
      await tx.housingSeekerProfile.create({
        data: {
          accountUuid,
          minBedrooms: housingData.minBedrooms ?? 0,
          maxBedrooms: housingData.maxBedrooms ?? 5,
          minBudget: housingData.minBudget!,
          maxBudget: housingData.maxBudget!,
          preferredTypes: StringUtils.stringifyJsonField(housingData.preferredTypes ?? []),
          preferredCities: StringUtils.stringifyJsonField(housingData.preferredCities ?? []),
          preferredNeighborhoods: StringUtils.stringifyJsonField(housingData.preferredNeighborhoods ?? []),
          moveInDate: housingData.moveInDate ? new Date(housingData.moveInDate) : null,
          leaseDuration: housingData.leaseDuration,
          householdSize: housingData.householdSize ?? 1,
          hasPets: housingData.hasPets ?? false,
          petDetails: housingData.petDetails,
          latitude: housingData.latitude,
          longitude: housingData.longitude,
          searchRadiusKm: housingData.searchRadiusKm ?? 10,
          hasAgent: housingData.hasAgent ?? false,
          agentUuid: housingData.agentUuid,
        },
      });
      
      logger.log(`✅ Created HOUSING_SEEKER profile for account ${accountUuid}`);
      
      // EMIT EVENT AFTER HOUSING SEEKER PROFILE CREATED
      if (options?.userUuid && options?.kafkaClient) {
        logger.log(`📤 Preparing to emit housing preferences event for user ${options.userUuid}`);
        
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
          }
        };
        
        logger.debug(`📤 Event payload: ${JSON.stringify(preferences)}`);
        
        try {
          await options.kafkaClient.emit('housing.preferences.updated', preferences);
          logger.log(`✅ Successfully emitted housing preferences event for user ${options.userUuid}`);
        } catch (kafkaError) {
          logger.error(`❌ Failed to emit Kafka event: ${kafkaError.message}`);
          // Don't throw - event emission failure shouldn't block profile creation
        }
      } else {
        if (!options?.userUuid) {
          logger.warn(`⚠️ No userUuid provided, cannot emit housing preferences event`);
        }
        if (!options?.kafkaClient) {
          logger.warn(`⚠️ No kafkaClient provided, cannot emit housing preferences event`);
        }
      }
      break;
    }

    case "PROPERTY_OWNER": {
      const ownerData = data as PropertyOwnerProfileDataDto;
      await tx.propertyOwnerProfile.create({
        data: {
          accountUuid,
          isProfessional: ownerData.isProfessional ?? false,
          licenseNumber: ownerData.licenseNumber,
          companyName: ownerData.companyName,
          yearsInBusiness: ownerData.yearsInBusiness,
          preferredPropertyTypes: StringUtils.stringifyJsonField(ownerData.preferredPropertyTypes ?? []),
          serviceAreas: StringUtils.stringifyJsonField(ownerData.serviceAreas ?? []),
          isVerifiedOwner: false,
          usesAgent: ownerData.usesAgent ?? false,
          managingAgentUuid: ownerData.managingAgentUuid,
          propertyCount: ownerData.propertyCount,
          propertyTypes: StringUtils.stringifyJsonField(ownerData.propertyTypes ?? []),
          propertyPurpose: ownerData.propertyPurpose,
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
          familySize: beneficiaryData.familySize,
          dependents: beneficiaryData.dependents,
          householdComposition: beneficiaryData.householdComposition,
          vulnerabilityFactors: StringUtils.stringifyJsonField(beneficiaryData.vulnerabilityFactors ?? []),
          city: beneficiaryData.city!,
          neighborhood: beneficiaryData.neighborhood,
          latitude: beneficiaryData.latitude,
          longitude: beneficiaryData.longitude,
          landmark: beneficiaryData.landmark,
          prefersAnonymity: beneficiaryData.prefersAnonymity ?? true,
          languagePreference: StringUtils.stringifyJsonField(beneficiaryData.languagePreference ?? []),
          consentToShare: beneficiaryData.consentToShare ?? false,
          consentGivenAt: beneficiaryData.consentToShare ? new Date() : null,
          referredBy: beneficiaryData.referredBy,
          referredByUuid: beneficiaryData.referredByUuid,
          caseWorkerUuid: beneficiaryData.caseWorkerUuid,
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
          agentType: agentData.agentType!,
          specializations: StringUtils.stringifyJsonField(agentData.specializations ?? []),
          serviceAreas: StringUtils.stringifyJsonField(agentData.serviceAreas ?? []),
          licenseNumber: agentData.licenseNumber!,
          licenseBody: agentData.licenseBody,
          yearsExperience: agentData.yearsExperience,
          agencyName: agentData.agencyName,
          agencyUuid: agentData.agencyUuid,
          commissionRate: agentData.commissionRate,
          feeStructure: agentData.feeStructure,
          minimumFee: agentData.minimumFee,
          typicalFee: agentData.typicalFee,
          isVerified: false,
          about: agentData.about,
          profileImage: agentData.profileImage,
          contactEmail: agentData.contactEmail,
          contactPhone: PhoneUtils.normalize(agentData.contactPhone || ''),
          website: agentData.website,
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
          companyName: employerData.companyName,
          industry: employerData.industry!,
          companySize: employerData.companySize!,
          foundedYear: employerData.foundedYear,
          description: employerData.description,
          logo: employerData.logo,
          preferredSkills: StringUtils.stringifyJsonField(employerData.preferredSkills ?? []),
          remotePolicy: employerData.remotePolicy,
          isVerifiedEmployer: false,
          worksWithAgents: employerData.worksWithAgents ?? false,
          preferredAgents: StringUtils.stringifyJsonField(employerData.preferredAgents ?? []),
          businessName: employerData.businessName,
          isRegistered: employerData.isRegistered ?? false,
          yearsExperience: employerData.yearsExperience,
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
          providerType: providerData.providerType!,
          servicesOffered: StringUtils.stringifyJsonField(providerData.servicesOffered ?? []),
          targetBeneficiaries: StringUtils.stringifyJsonField(providerData.targetBeneficiaries ?? []),
          serviceAreas: StringUtils.stringifyJsonField(providerData.serviceAreas ?? []),
          isVerified: false,
          about: providerData.about,
          website: providerData.website,
          contactEmail: providerData.contactEmail,
          contactPhone: PhoneUtils.normalize(providerData.contactPhone || ''),
          officeHours: providerData.officeHours,
          physicalAddress: providerData.physicalAddress,
          peopleServed: providerData.peopleServed,
          yearEstablished: providerData.yearEstablished,
          acceptsDonations: providerData.acceptsDonations ?? false,
          needsVolunteers: providerData.needsVolunteers ?? false,
          donationInfo: providerData.donationInfo,
          volunteerNeeds: providerData.volunteerNeeds,
          operatingName: providerData.operatingName,
          yearsExperience: providerData.yearsExperience,
          qualifications: StringUtils.stringifyJsonField(providerData.qualifications ?? []),
          availability: providerData.availability,
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