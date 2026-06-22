// libs/shared/constants/src/job-characteristics.constants.ts

/**
 * JOB CHARACTERISTICS
 * Global characteristics that apply to ALL jobs regardless of category
 * These are used across all job types (formal, informal, gig, domestic, etc.)
 * 
 * @module constants
 */

// ======================================================
// 1. EMPLOYMENT TYPE - How is the worker engaged?
// ======================================================
export const EMPLOYMENT_TYPES = [
  'PERMANENT',
  'CONTRACT',
  'CASUAL',
  'GIG',
  'FREELANCE',
  'INTERNSHIP',
  'APPRENTICESHIP',
  'VOLUNTEER',
] as const;

export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

// ======================================================
// 2. PAYMENT TYPE - How is the worker paid?
// ======================================================
export const PAYMENT_TYPES = [
  'SALARY',
  'WAGE',
  'PER_TASK',
  'COMMISSION',
  'PROJECT_BASED',
  'STIPEND',
  'IN_KIND',
] as const;

export type PaymentType = typeof PAYMENT_TYPES[number];

// ======================================================
// 3. WORK ARRANGEMENT - Where does the work happen?
// ======================================================
export const WORK_ARRANGEMENTS = [
  'ONSITE',
  'REMOTE',
  'HYBRID',
  'FIELD',
  'SHIFT',
  'FLEXIBLE',
] as const;

export type WorkArrangement = typeof WORK_ARRANGEMENTS[number];

// ======================================================
// 4. COMMITMENT LEVEL - Time commitment required
// ======================================================
export const COMMITMENT_LEVELS = [
  'FULL_TIME',
  'PART_TIME',
  'PROJECT_BASED',
  'ON_CALL',
] as const;

export type CommitmentLevel = typeof COMMITMENT_LEVELS[number];

// ======================================================
// 5. WORK SCHEDULE - When does the work happen?
// ======================================================
export const WORK_SCHEDULES = [
  'DAY_SHIFT',
  'NIGHT_SHIFT',
  'ROTATING_SHIFT',
  'FLEXIBLE',
  'FIXED',
] as const;

export type WorkSchedule = typeof WORK_SCHEDULES[number];

// ======================================================
// 6. DOCUMENTATION LEVEL - Level of formality/documentation
// ======================================================
export const DOCUMENTATION_LEVELS = [
  'NONE',
  'VERBAL_AGREEMENT',
  'SIMPLE_CONTRACT',
  'FORMAL_CONTRACT',
  'GOVERNMENT_REG',
] as const;

export type DocumentationLevel = typeof DOCUMENTATION_LEVELS[number];

// ======================================================
// 7. SKILL LEVEL - Required skill level for the job
// ======================================================
export const SKILL_LEVELS = [
  'UNSKILLED',
  'SEMI_SKILLED',
  'SKILLED',
  'PROFESSIONAL',
] as const;

export type SkillLevel = typeof SKILL_LEVELS[number];

// ======================================================
// 8. EXPERIENCE LEVEL - Required years of experience
// ======================================================
export const EXPERIENCE_LEVELS = [
  'ENTRY',
  'JUNIOR',
  'MID_LEVEL',
  'SENIOR',
  'LEAD',
  'PRINCIPAL',
] as const;

export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

// ======================================================
// 9. EDUCATION LEVEL - Required education qualification
// ======================================================
export const EDUCATION_LEVELS = [
  'NONE',
  'CERTIFICATE',
  'DIPLOMA',
  'BACHELORS',
  'MASTERS',
  'PHD',
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number];

// ======================================================
// 10. COMPLETE JOB CHARACTERISTICS INTERFACE
// ======================================================
export interface JobCharacteristics {
  employmentType: EmploymentType;
  paymentType: PaymentType;
  workArrangement: WorkArrangement;
  commitment: CommitmentLevel;
  workSchedule: WorkSchedule;
  documentationLevel: DocumentationLevel;
  skillLevel: SkillLevel;
  experienceLevel: ExperienceLevel;
  educationLevel: EducationLevel;
}

// ======================================================
// 11. DEFAULT VALUES (for new job posts)
// ======================================================
export const DEFAULT_JOB_CHARACTERISTICS: JobCharacteristics = {
  employmentType: 'PERMANENT',
  paymentType: 'SALARY',
  workArrangement: 'ONSITE',
  commitment: 'FULL_TIME',
  workSchedule: 'DAY_SHIFT',
  documentationLevel: 'FORMAL_CONTRACT',
  skillLevel: 'SKILLED',
  experienceLevel: 'ENTRY',
  educationLevel: 'BACHELORS',
};

