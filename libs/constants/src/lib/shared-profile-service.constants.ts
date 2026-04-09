/**
 * Kenyan Phone Regex:
 * Supports: +254..., 254..., 07..., 01..., 02...
 */
export const KENYAN_PHONE_REGEX = /^(?:254|\+254|0)?((?:7|1|2)\d{8})$/;

/* ======================================================
   ENUM VALUES (for validation)
====================================================== */

export const ACCOUNT_TYPES = ['INDIVIDUAL', 'ORGANIZATION'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

export const PROFILE_TYPES = [
  'JOB_SEEKER',
  'SKILLED_PROFESSIONAL',
  'HOUSING_SEEKER',
  'PROPERTY_OWNER',
  'SUPPORT_BENEFICIARY',
  'SOCIAL_SERVICE_PROVIDER',
  'INTERMEDIARY_AGENT',
  'EMPLOYER'
] as const;
export type ProfileType = typeof PROFILE_TYPES[number];

// ======================================================
// USER ROLES (Based on Final RBAC Structure)
// ======================================================
export const USER_ROLES = [
  // Platform Roles (PivotaConnect Team)
  'SuperAdmin',
  'PlatformSystemAdmin',
  'PlatformComplianceAdmin',
  'PlatformAnalyticsAdmin',
  'PlatformModuleManager',
  'AIDeveloper',
  
  // Account Roles
  'Individual',           // Individual user with personal account
  'Admin',                // Business account owner
  'ContentManagerAdmin',  // Business content manager
  'Member'                // Regular business member
] as const;
export type UserRole = typeof USER_ROLES[number];

// ======================================================
// ORGANIZATION TYPES (with slug and label)
// ======================================================
export const ORGANIZATION_TYPES = [
  { slug: 'NGO', label: 'Non-Governmental Organization' },
  { slug: 'COMPANY', label: 'Company' },
  { slug: 'SOCIAL_ENTERPRISE', label: 'Social Enterprise' },
  { slug: 'GOVERNMENT', label: 'Government Entity' },
  { slug: 'AGENCY', label: 'Agency' },
  { slug: 'COOPERATIVE', label: 'Cooperative' },
  { slug: 'INDIVIDUAL', label: 'Individual' },
  { slug: 'PRIVATE_LIMITED', label: 'Private Limited Company' },
  { slug: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
  { slug: 'PARTNERSHIP', label: 'Partnership' },
  { slug: 'COMMUNITY_BASED_ORGANIZATION', label: 'Community Based Organization' },
  { slug: 'FAITH_BASED_ORGANIZATION', label: 'Faith Based Organization' },
  { slug: 'FAMILY', label: 'Family' },
] as const;

export type OrganizationType = typeof ORGANIZATION_TYPES[number]['slug'];

// Helper function to get organization type label
export function getOrganizationTypeLabel(slug: OrganizationType): string {
  const type = ORGANIZATION_TYPES.find(t => t.slug === slug);
  return type?.label || slug;
}

// Helper function to get all organization type slugs
export function getOrganizationTypeSlugs(): OrganizationType[] {
  return ORGANIZATION_TYPES.map(t => t.slug);
}

export const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'CASUAL', 'GIG'] as const;
export type JobType = typeof JOB_TYPES[number];

export const SENIORITY_LEVELS = ['ENTRY', 'INTERMEDIATE', 'SENIOR', 'LEAD', 'EXECUTIVE', 'EXPERIENCED'] as const;
export type SeniorityLevel = typeof SENIORITY_LEVELS[number];

// ======================================================
// PROPERTY TYPES (For housing listings)
// ======================================================
export const PROPERTY_TYPES = [
  'APARTMENT', 
  'HOUSE', 
  'ROOM', 
  'BEDSITTER', 
  'COMMERCIAL', 
  'LAND', 
  'INDUSTRIAL',
  'CONDO',
  'TOWNHOUSE',
  'VILLA',
  'STUDIO',
  'PENTHOUSE'
] as const;
export type PropertyType = typeof PROPERTY_TYPES[number];

// ======================================================
// HOUSING LISTING TYPES (For property listings - rent vs sale)
// ======================================================
export const HOUSING_LISTING_TYPES = ['RENT', 'SALE'] as const;
export type HousingListingType = typeof HOUSING_LISTING_TYPES[number];

// ======================================================
// HOUSING SEARCH TYPES (For housing seekers)
// ======================================================
export const HOUSING_SEARCH_TYPES = ['RENT', 'BUY', 'BOTH'] as const;
export type HousingSearchType = typeof HOUSING_SEARCH_TYPES[number];

// ======================================================
// PROPERTY STATUS (For listings lifecycle)
// ======================================================
export const PROPERTY_STATUSES = [
  'AVAILABLE',
  'RENTED',
  'SOLD',
  'PENDING',
  'UNAVAILABLE',
  'UNDER_MAINTENANCE'
] as const;
export type PropertyStatus = typeof PROPERTY_STATUSES[number];

// ======================================================
// LEASE DURATIONS (For rental properties)
// ======================================================
export const LEASE_DURATIONS = [
  'MONTH_TO_MONTH',
  '3_MONTHS',
  '6_MONTHS',
  '1_YEAR',
  '2_YEARS',
  '3_YEARS',
  '5_YEARS',
  'FLEXIBLE'
] as const;
export type LeaseDuration = typeof LEASE_DURATIONS[number];

// ======================================================
// UTILITY TYPES (For rental properties)
// ======================================================
export const UTILITY_TYPES = [
  'WATER',
  'ELECTRICITY',
  'INTERNET',
  'GARBAGE',
  'SECURITY',
  'PARKING',
  'GAS',
  'NONE'
] as const;
export type UtilityType = typeof UTILITY_TYPES[number];

// ======================================================
// AGENT TYPES
// ======================================================
export const AGENT_TYPES = ['HOUSING_AGENT', 'RECRUITMENT_AGENT', 'SERVICE_BROKER', 'CASE_WORKER', 'MULTI_PURPOSE'] as const;
export type AgentType = typeof AGENT_TYPES[number];

// ======================================================
// SERVICE PROVIDER TYPES
// ======================================================
export const SERVICE_PROVIDER_TYPES = ['NGO', 'SOCIAL_ENTERPRISE', 'INDIVIDUAL', 'GOVERNMENT', 'FAITH_BASED', 'COMMUNITY_GROUP'] as const;
export type ServiceProviderType = typeof SERVICE_PROVIDER_TYPES[number];

// ======================================================
// SUPPORT NEEDS
// ======================================================
export const SUPPORT_NEEDS = ['FOOD', 'SHELTER', 'CASH', 'MEDICAL', 'COUNSELING', 'LEGAL', 'EDUCATION', 'CLOTHING', 'TRAINING'] as const;
export type SupportNeed = typeof SUPPORT_NEEDS[number];

// ======================================================
// INDIVIDUAL PURPOSES (Onboarding - what they want to do)
// ======================================================
export const INDIVIDUAL_PURPOSES = [
  'FIND_JOB',
  'OFFER_SKILLED_SERVICES',
  'WORK_AS_AGENT',
  'FIND_HOUSING',
  'GET_SOCIAL_SUPPORT',
  'HIRE_EMPLOYEES',
  'LIST_PROPERTIES',
  'JUST_EXPLORING'
] as const;
export type IndividualPurpose = typeof INDIVIDUAL_PURPOSES[number];

// ======================================================
// ORGANIZATION PURPOSES (Onboarding - what they want to do)
// ======================================================
export const ORGANIZATION_PURPOSES = [
  'hire_employees',
  'list_properties',
  'offer_skilled_services',
  'provide_social_support',
  'act_as_agent'
] as const;
export type OrganizationPurpose = typeof ORGANIZATION_PURPOSES[number];

// ======================================================
// JOB APPLICATION STATUSES
// ======================================================
export const JOB_APPLICATION_STATUSES = [
  'PENDING',
  'REVIEWING',
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'COMPLETED'
] as const;
export type JobApplicationStatus = typeof JOB_APPLICATION_STATUSES[number];

// ======================================================
// SERVICE BOOKING STATUSES
// ======================================================
export const SERVICE_BOOKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
] as const;
export type ServiceBookingStatus = typeof SERVICE_BOOKING_STATUSES[number];

// ======================================================
// SUPPORT APPLICATION STATUSES
// ======================================================
export const SUPPORT_APPLICATION_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'WAITLISTED',
  'APPROVED',
  'REJECTED',
  'DISBURSED',
  'CLOSED'
] as const;
export type SupportApplicationStatus = typeof SUPPORT_APPLICATION_STATUSES[number];

// ======================================================
// GENDER OPTIONS
// ======================================================
export const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
export type GenderOption = typeof GENDER_OPTIONS[number];

// ======================================================
// WORK POLICIES
// ======================================================
export const WORK_POLICIES = ['REMOTE', 'HYBRID', 'ONSITE', 'FLEXIBLE'] as const;
export type WorkPolicy = typeof WORK_POLICIES[number];

// ======================================================
// COMPANY SIZES
// ======================================================
export const COMPANY_SIZES = ['Sole Proprietor', '1-10', '11-50', '51-200', '200+'] as const;
export type CompanySize = typeof COMPANY_SIZES[number];