/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// apps/profile-service/src/utils/business-profiles-creator.utils.ts

import { Prisma } from '../../../generated/prisma/client';
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
      // Required fields for property owner
      if (!ownerData.preferredPropertyTypes?.length) {
        missingFields.push('preferredPropertyTypes');
      }
      if (!ownerData.serviceAreas?.length) missingFields.push('serviceAreas');
      // For organizations: companyName is required
      // For individuals: propertyCount can be optional
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
      // Agency name is recommended but not required for individuals
      break;
    }

    case 'EMPLOYER': {
      const employerData = data as EmployerProfileDataDto;
      // For organizations: companyName is required
      // For individuals: businessName can be optional
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
      // For organizations: about, officeHours, yearEstablished are required
      // For individuals: operatingName is optional
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
        EmployerProfileDataDto | SocialServiceProviderProfileDataDto
): Promise<void> {
  // Validate required fields before creating
  const validation = validateProfileData(profileType, data);
  if (!validation.isValid) {
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
      break;
    }

    case "HOUSING_SEEKER": {
      const housingData = data as HousingSeekerProfileDataDto;
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
      break;
    }

    default:
      throw new Error(`Unknown business profile type: ${profileType}`);
  }
}