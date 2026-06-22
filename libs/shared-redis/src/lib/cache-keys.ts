// shared-listings/src/utils/cache-keys.ts

export class CacheKeys {
  private static readonly PREFIX = 'services';
  private static readonly JOB_PREFIX = 'jobs';
  private static readonly HOUSING_PREFIX = 'housing';
  
  // ======================================================
  // SERVICE OFFERINGS CACHE KEYS
  // ======================================================

  /**
   * Generate cache key for service offerings listing
   * Example: services:list:category_plumbing:page_2:limit_20:city_nairobi
   */
  static getListingKey(params: {
    vertical?: string;
    categoryId?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    minRating?: number;
    verifiedOnly?: boolean;
    page?: number;
    limit?: number;
  }): string {
    const parts = [
      this.PREFIX,
      'list',
      params.vertical ? `v_${params.vertical}` : null,
      params.categoryId ? `cat_${params.categoryId}` : null,
      params.city ? `city_${params.city.toLowerCase()}` : null,
      params.minPrice !== undefined ? `min_${params.minPrice}` : null,
      params.maxPrice !== undefined ? `max_${params.maxPrice}` : null,
      params.sortBy ? `sort_${params.sortBy}` : null,
      params.minRating ? `rating_${params.minRating}` : null,
      params.verifiedOnly ? 'verified' : null,
      `p_${params.page || 1}`,
      `l_${params.limit || 20}`,
    ].filter(Boolean);
    
    return parts.join(':');
  }

  /**
   * Get single offering cache key
   */
  static getSingleKey(offeringId: string): string {
    return `${this.PREFIX}:single:${offeringId}`;
  }

  /**
   * Get pattern to invalidate all service listings
   */
  static getListingsPattern(): string {
    return `${this.PREFIX}:list:*`;
  }

  /**
   * Get pattern to invalidate by vertical
   */
  static getVerticalPattern(vertical: string): string {
    return `${this.PREFIX}:list:*v_${vertical}*`;
  }

  /**
   * Get pattern to invalidate by category
   */
  static getCategoryPattern(categoryId: string): string {
    return `${this.PREFIX}:list:*cat_${categoryId}*`;
  }

  // ======================================================
  // JOBS CACHE KEYS
  // ======================================================

  /**
   * Generate cache key for job listings with all characteristics
   * Example: jobs:list:cat_cl123:city_nairobi:min_50000:max_200000:sort_recent:emp_PERMANENT:pay_SALARY:work_ONSITE:commit_FULL_TIME:schedule_DAY_SHIFT:doc_FORMAL_CONTRACT:skill_SKILLED:exp_MID_LEVEL:edu_BACHELORS:remote_true:anon_true:deadline_after_2025-12-01:deadline_before_2025-12-31:start_after_2026-01-01:start_before_2026-01-15:hours_min_20:hours_max_40:p_1:l_20
   */
  static getJobListingKey(params: {
    categoryId?: string;
    city?: string;
    minPay?: number;
    maxPay?: number;
    sortBy?: 'recent' | 'pay_asc' | 'pay_desc';
    // Job Characteristics
    employmentType?: string;
    paymentType?: string;
    workArrangement?: string;
    commitment?: string;
    workSchedule?: string;
    documentationLevel?: string;
    skillLevel?: string;
    experienceLevel?: string;
    educationLevel?: string;
    isRemote?: boolean;
    // ============================================================
    // NEW FILTERS
    // ============================================================
    isAnonymous?: boolean;
    applicationDeadlineAfter?: string;
    applicationDeadlineBefore?: string;
    startDateAfter?: string;
    startDateBefore?: string;
    hoursPerWeekMin?: number;
    hoursPerWeekMax?: number;
    page?: number;
    limit?: number;
  }): string {
    const parts = [
      this.JOB_PREFIX,
      'list',
      params.categoryId ? `cat_${params.categoryId}` : null,
      params.city ? `city_${params.city.toLowerCase()}` : null,
      params.minPay !== undefined ? `min_${params.minPay}` : null,
      params.maxPay !== undefined ? `max_${params.maxPay}` : null,
      params.sortBy ? `sort_${params.sortBy}` : null,
      // Job Characteristics
      params.employmentType ? `emp_${params.employmentType}` : null,
      params.paymentType ? `pay_${params.paymentType}` : null,
      params.workArrangement ? `work_${params.workArrangement}` : null,
      params.commitment ? `commit_${params.commitment}` : null,
      params.workSchedule ? `schedule_${params.workSchedule}` : null,
      params.documentationLevel ? `doc_${params.documentationLevel}` : null,
      params.skillLevel ? `skill_${params.skillLevel}` : null,
      params.experienceLevel ? `exp_${params.experienceLevel}` : null,
      params.educationLevel ? `edu_${params.educationLevel}` : null,
      params.isRemote !== undefined ? `remote_${params.isRemote}` : null,
      // ============================================================
      // NEW FILTERS - include in cache key
      // ============================================================
      params.isAnonymous !== undefined ? `anon_${params.isAnonymous}` : null,
      params.applicationDeadlineAfter ? `deadline_after_${params.applicationDeadlineAfter}` : null,
      params.applicationDeadlineBefore ? `deadline_before_${params.applicationDeadlineBefore}` : null,
      params.startDateAfter ? `start_after_${params.startDateAfter}` : null,
      params.startDateBefore ? `start_before_${params.startDateBefore}` : null,
      params.hoursPerWeekMin !== undefined ? `hours_min_${params.hoursPerWeekMin}` : null,
      params.hoursPerWeekMax !== undefined ? `hours_max_${params.hoursPerWeekMax}` : null,
      `p_${params.page || 1}`,
      `l_${params.limit || 20}`,
    ].filter(Boolean);
    
    return parts.join(':');
  }

  /**
   * Get single job cache key
   */
  static getSingleJobKey(jobId: string): string {
    return `${this.JOB_PREFIX}:single:${jobId}`;
  }

  /**
   * Get pattern to invalidate all job listings
   */
  static getJobListingsPattern(): string {
    return `${this.JOB_PREFIX}:list:*`;
  }

  /**
   * Get pattern to invalidate job by category
   */
  static getJobCategoryPattern(categoryId: string): string {
    return `${this.JOB_PREFIX}:list:*cat_${categoryId}*`;
  }

  /**
   * Get pattern to invalidate job by employment type
   */
  static getJobEmploymentTypePattern(employmentType: string): string {
    return `${this.JOB_PREFIX}:list:*emp_${employmentType}*`;
  }

  /**
   * Get pattern to invalidate job by experience level
   */
  static getJobExperienceLevelPattern(experienceLevel: string): string {
    return `${this.JOB_PREFIX}:list:*exp_${experienceLevel}*`;
  }

  /**
   * Get pattern to invalidate job by work arrangement
   */
  static getJobWorkArrangementPattern(workArrangement: string): string {
    return `${this.JOB_PREFIX}:list:*work_${workArrangement}*`;
  }

  /**
   * Get pattern to invalidate job by city
   */
  static getJobCityPattern(city: string): string {
    return `${this.JOB_PREFIX}:list:*city_${city.toLowerCase()}*`;
  }

  /**
   * Get pattern to invalidate job by remote status
   */
  static getJobRemotePattern(isRemote: boolean): string {
    return `${this.JOB_PREFIX}:list:*remote_${isRemote}*`;
  }

  /**
   * Get pattern to invalidate job by anonymous status
   */
  static getJobAnonymousPattern(isAnonymous: boolean): string {
    return `${this.JOB_PREFIX}:list:*anon_${isAnonymous}*`;
  }

  /**
   * Get pattern to invalidate job by application deadline
   */
  static getJobApplicationDeadlinePattern(): string {
    return `${this.JOB_PREFIX}:list:*deadline_*`;
  }

  /**
   * Get pattern to invalidate job by start date
   */
  static getJobStartDatePattern(): string {
    return `${this.JOB_PREFIX}:list:*start_*`;
  }

  /**
   * Get pattern to invalidate job by hours per week
   */
  static getJobHoursPerWeekPattern(): string {
    return `${this.JOB_PREFIX}:list:*hours_*`;
  }

  // ======================================================
  // HOUSING CACHE KEYS
  // ======================================================

  /**
   * Generate cache key for housing listings
   * Example: housing:list:cat_apartments:city_nairobi:min_20000:max_60000:p_1:l_20
   */
  static getHousingListingKey(params: {
    categoryId?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    listingType?: string;
    bedrooms?: number;
    propertyType?: string;
    isFurnished?: boolean;
    sortBy?: 'recent' | 'price_asc' | 'price_desc';
    page?: number;
    limit?: number;
  }): string {
    const parts = [
      this.HOUSING_PREFIX,
      'list',
      params.categoryId ? `cat_${params.categoryId}` : null,
      params.city ? `city_${params.city.toLowerCase()}` : null,
      params.minPrice !== undefined ? `min_${params.minPrice}` : null,
      params.maxPrice !== undefined ? `max_${params.maxPrice}` : null,
      params.listingType ? `type_${params.listingType}` : null,
      params.bedrooms !== undefined ? `beds_${params.bedrooms}` : null,
      params.propertyType ? `prop_${params.propertyType}` : null,
      params.isFurnished !== undefined ? `furnished_${params.isFurnished}` : null,
      params.sortBy ? `sort_${params.sortBy}` : null,
      `p_${params.page || 1}`,
      `l_${params.limit || 20}`,
    ].filter(Boolean);
    
    return parts.join(':');
  }

  /**
   * Get single housing cache key
   */
  static getSingleHousingKey(listingId: string): string {
    return `${this.HOUSING_PREFIX}:single:${listingId}`;
  }

  /**
   * Get pattern to invalidate all housing listings
   */
  static getHousingListingsPattern(): string {
    return `${this.HOUSING_PREFIX}:list:*`;
  }

  /**
   * Get pattern to invalidate housing by category
   */
  static getHousingCategoryPattern(categoryId: string): string {
    return `${this.HOUSING_PREFIX}:list:*cat_${categoryId}*`;
  }

  /**
   * Get pattern to invalidate housing by city
   */
  static getHousingCityPattern(city: string): string {
    return `${this.HOUSING_PREFIX}:list:*city_${city.toLowerCase()}*`;
  }

  /**
   * Get pattern to invalidate housing by listing type (RENTAL/SALE)
   */
  static getHousingTypePattern(listingType: string): string {
    return `${this.HOUSING_PREFIX}:list:*type_${listingType}*`;
  }

  /**
   * Generate cache key for all house listings
   * Example: housing:all:city_nairobi:min_20000:max_100000:sort_recent:p_1:l_20
   */
 // shared-listings/src/utils/cache-keys.ts

static getHouseAllKey(params: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  listingType?: string;
  bedrooms?: number;
  propertyType?: string;
  isFurnished?: boolean;
  sortBy?: 'recent' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}): string {
  const parts = [
    this.HOUSING_PREFIX,  // 'housing'
    'all',
  ];

  // Add parameters only if they have values
  if (params.city) parts.push(`city_${params.city.toLowerCase()}`);
  if (params.minPrice !== undefined && params.minPrice !== null) parts.push(`min_${params.minPrice}`);
  if (params.maxPrice !== undefined && params.maxPrice !== null) parts.push(`max_${params.maxPrice}`);
  if (params.listingType) parts.push(`type_${params.listingType}`);
  if (params.bedrooms !== undefined && params.bedrooms !== null) parts.push(`beds_${params.bedrooms}`);
  if (params.propertyType) parts.push(`prop_${params.propertyType}`);
  if (params.isFurnished !== undefined && params.isFurnished !== null) parts.push(`furnished_${params.isFurnished}`);
  if (params.sortBy) parts.push(`sort_${params.sortBy}`);
  
  parts.push(`p_${params.page || 1}`);
  parts.push(`l_${params.limit || 20}`);
  
  return parts.join(':');
}
}