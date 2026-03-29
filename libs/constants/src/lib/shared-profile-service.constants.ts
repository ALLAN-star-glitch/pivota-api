// libs/constants/src/index.ts

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

export const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'ROOM', 'BEDSITTER', 'COMMERCIAL', 'LAND', 'INDUSTRIAL'] as const;
export type PropertyType = typeof PROPERTY_TYPES[number];

export const AGENT_TYPES = ['HOUSING_AGENT', 'RECRUITMENT_AGENT', 'SERVICE_BROKER', 'CASE_WORKER', 'MULTI_PURPOSE'] as const;
export type AgentType = typeof AGENT_TYPES[number];

export const SERVICE_PROVIDER_TYPES = ['NGO', 'SOCIAL_ENTERPRISE', 'INDIVIDUAL', 'GOVERNMENT', 'FAITH_BASED', 'COMMUNITY_GROUP'] as const;
export type ServiceProviderType = typeof SERVICE_PROVIDER_TYPES[number];

export const SUPPORT_NEEDS = ['FOOD', 'SHELTER', 'CASH', 'MEDICAL', 'COUNSELING', 'LEGAL', 'EDUCATION', 'CLOTHING', 'TRAINING'] as const;
export type SupportNeed = typeof SUPPORT_NEEDS[number];

export const INDIVIDUAL_PURPOSES = [
  'FIND_JOB',
  'OFFER_SKILLED_SERVICES',
  'WORK_AS_AGENT',
  'FIND_HOUSING',
  'GET_SOCIAL_SUPPORT',
  'JUST_EXPLORING'
] as const;
export type IndividualPurpose = typeof INDIVIDUAL_PURPOSES[number];

export const ORGANIZATION_PURPOSES = [
  'hire_employees',
  'list_properties',
  'offer_skilled_services',
  'provide_social_support',
  'act_as_agent'
] as const;
export type OrganizationPurpose = typeof ORGANIZATION_PURPOSES[number];