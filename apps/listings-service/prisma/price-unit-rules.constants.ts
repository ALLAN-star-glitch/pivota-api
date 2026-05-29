// seed-data/price-unit-rules.constants.ts

/**
 * PRICE UNIT RULES FOR CONTRACTOR SERVICE OFFERINGS
 * 
 * These rules apply ONLY to COMPLIMENTARY categories (professional services)
 * NOT to MAIN categories (property listings, job posts, support programs)
 * 
 * Slugs reference COMPLIMENTARY categories from ROOT_CATEGORIES:
 * - HOUSING COMPLIMENTARY: cleaning-services, security-services, moving-relocation, etc.
 * - JOBS COMPLIMENTARY: career-coaching, cv-writing, interview-preparation, etc.
 * - SOCIAL_SUPPORT COMPLIMENTARY: counseling-services, social-work, etc.
 * 
 * Subcategory slugs (e.g., electricians, plumbers) are from SUB_CATEGORIES
 * and are children of COMPLIMENTARY parent categories.
 */

export const PRICE_UNIT_RULES = [
  // =====================================================
  // GLOBAL FALLBACK RULES (No specific category)
  // =====================================================
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 50000000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: null, minPrice: 500, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: null, minPrice: 2000, maxPrice: 50000 },

  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 500, maxPrice: 5000000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: null, minPrice: 200, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: null, minPrice: 15000, maxPrice: 1000000 },

  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 0, maxPrice: 200000, isNotesRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: null, minPrice: 500, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 15000 },

  // =====================================================
  // HOUSING - COMPLIMENTARY CATEGORIES (Parent Categories)
  // =====================================================
  
  // Maintenance & Repairs (Parent)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'maintenance-repairs', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'maintenance-repairs', minPrice: 1000, maxPrice: 50000 },
  
  // Cleaning Services (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 1000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 500, maxPrice: 2000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_FOOT', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 10, maxPrice: 100 },
  
  // Security Services (Parent)
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'security-services', minPrice: 15000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'security-services', minPrice: 5000, maxPrice: 150000 },
  
  // Moving & Relocation (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'moving-relocation', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_TRIP', currency: 'KES', categorySlug: 'moving-relocation', minPrice: 1000, maxPrice: 15000 },
  
  // Construction & Renovation (Parent)
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 2000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 5000, maxPrice: 5000000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_FOOT', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 500, maxPrice: 5000 },
  
  // Interior Design (Parent)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'interior-design', minPrice: 1000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'interior-design', minPrice: 5000, maxPrice: 500000 },
  
  // Landscaping & Gardening (Parent)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'landscaping-gardening', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'landscaping-gardening', minPrice: 2000, maxPrice: 100000 },
  
  // Pest Control (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'pest-control', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'pest-control', minPrice: 1500, maxPrice: 10000 },
  
  // Home Inspections (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'home-inspections', minPrice: 5000, maxPrice: 50000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_FOOT', currency: 'KES', categorySlug: 'home-inspections', minPrice: 10, maxPrice: 50 },
  
  // Property Management (Parent)
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'property-management', minPrice: 5, maxPrice: 15, isNotesRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'property-management', minPrice: 5000, maxPrice: 100000 },
  
  // Real Estate Agents (Parent)
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'real-estate-agents', minPrice: 2, maxPrice: 10, isNotesRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'real-estate-agents', minPrice: 10000, maxPrice: 500000 },
  
  // Property Valuers (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'property-valuers', minPrice: 5000, maxPrice: 100000, isExperienceRequired: true },
  
  // Architects (Parent)
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'architects', minPrice: 5, maxPrice: 15, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'architects', minPrice: 50000, maxPrice: 5000000 },
  
  // Quantity Surveyors (Parent)
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'quantity-surveyors', minPrice: 1, maxPrice: 5, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'quantity-surveyors', minPrice: 10000, maxPrice: 500000 },
  
  // Structural Engineers (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'structural-engineers', minPrice: 20000, maxPrice: 2000000, isExperienceRequired: true },
  
  // Home Automation (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'home-automation', minPrice: 10000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'home-automation', minPrice: 1000, maxPrice: 5000, isExperienceRequired: true },
  
  // Solar Installation (Parent)
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'solar-installation', minPrice: 20000, maxPrice: 500000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_WATT', currency: 'KES', categorySlug: 'solar-installation', minPrice: 50, maxPrice: 200 },
  
  // Waterproofing (Parent)
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'waterproofing', minPrice: 500, maxPrice: 2000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'waterproofing', minPrice: 5000, maxPrice: 200000 },

  // =====================================================
  // HOUSING - COMPLIMENTARY SUBCATEGORIES (Specific Services)
  // =====================================================
  
  // Electricians (Subcategory of Maintenance & Repairs)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'electricians', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'electricians', minPrice: 1500, maxPrice: 80000 },
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'electricians', minPrice: 2000, maxPrice: 15000 },
  
  // Plumbers (Subcategory of Maintenance & Repairs)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'plumbers', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'plumbers', minPrice: 1500, maxPrice: 80000 },
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'plumbers', minPrice: 2000, maxPrice: 15000 },
  
  // Carpenters (Subcategory of Maintenance & Repairs)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'carpenters', minPrice: 600, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'carpenters', minPrice: 1000, maxPrice: 50000 },
  
  // Painters (Subcategory of Maintenance & Repairs)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'painters', minPrice: 500, maxPrice: 2500 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'painters', minPrice: 2000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'painters', minPrice: 100, maxPrice: 500 },
  
  // Handyman Services (Subcategory of Maintenance & Repairs)
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'handyman-services', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'handyman-services', minPrice: 3000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'handyman-services', minPrice: 1000, maxPrice: 30000 },
  
  // Appliance Repair Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'refrigerator-repair', minPrice: 1000, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'washing-machine-repair', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'oven-stove-repair', minPrice: 800, maxPrice: 12000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'dishwasher-repair', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'microwave-repair', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'ac-repair', minPrice: 1500, maxPrice: 20000, isExperienceRequired: true },
  
  // Cleaning Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'house-cleaning', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'deep-cleaning', minPrice: 3000, maxPrice: 25000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'carpet-cleaning', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'carpet-cleaning', minPrice: 100, maxPrice: 500 },
  
  // =====================================================
  // JOBS - COMPLIMENTARY CATEGORIES (Career Support Services)
  // =====================================================
  
  // Career Coaching (Parent)
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'career-coaching', minPrice: 1500, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'career-coaching', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'career-coaching', minPrice: 10000, maxPrice: 100000 },
  
  // CV Writing (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'cv-writing', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_PAGE', currency: 'KES', categorySlug: 'cv-writing', minPrice: 500, maxPrice: 2000 },
  
  // Interview Preparation (Parent)
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'interview-preparation', minPrice: 1000, maxPrice: 8000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'interview-preparation', minPrice: 1500, maxPrice: 10000 },
  
  // Recruitment Agencies (Parent)
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'recruitment-agencies-main', minPrice: 5, maxPrice: 20, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'recruitment-agencies-main', minPrice: 10000, maxPrice: 500000 },
  
  // Skills Training (Parent)
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'skills-training', minPrice: 1000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'skills-training', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_COURSE', currency: 'KES', categorySlug: 'skills-training', minPrice: 10000, maxPrice: 500000 },
  
  // LinkedIn Optimization (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'linkedin-optimization', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'linkedin-optimization', minPrice: 1500, maxPrice: 5000 },
  
  // Job Search Assistance (Parent)
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'job-search-assistance', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'job-search-assistance', minPrice: 5000, maxPrice: 50000 },
  
  // Career Assessment (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'career-assessment', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_TEST', currency: 'KES', categorySlug: 'career-assessment', minPrice: 1000, maxPrice: 5000 },
  
  // Executive Search (Parent)
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'executive-search', minPrice: 15, maxPrice: 30, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'executive-search', minPrice: 100000, maxPrice: 1000000 },
  
  // Outplacement Services (Parent)
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'outplacement-services', minPrice: 50000, maxPrice: 500000, isNotesRequired: true },
  
  // Resume Templates (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'resume-templates', minPrice: 500, maxPrice: 5000 },
  
  // Job Boards (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'job-boards', minPrice: 1000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'job-boards', minPrice: 5000, maxPrice: 50000 },
  
  // Networking Events (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'networking-events', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_EVENT', currency: 'KES', categorySlug: 'networking-events', minPrice: 5000, maxPrice: 50000 },
  
  // Job Fairs (Parent)
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'job-fairs', minPrice: 10000, maxPrice: 200000 },
  { vertical: 'JOBS', unit: 'PER_BOOTH', currency: 'KES', categorySlug: 'job-fairs', minPrice: 5000, maxPrice: 50000 },

  // =====================================================
  // JOBS - COMPLIMENTARY SUBCATEGORIES (Specific Services)
  // =====================================================
  
  // CV Writing Subcategories
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'professional-cv-writing', minPrice: 3000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'cv-makeover', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'cover-letter-writing', minPrice: 500, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'linkedin-profile-writing', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'portfolio-development', minPrice: 5000, maxPrice: 50000 },
  
  // Interview Prep Subcategories
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'mock-interviews', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'interview-coaching', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'technical-interview-prep', minPrice: 3000, maxPrice: 20000, isExperienceRequired: true },
  
  // =====================================================
  // SOCIAL_SUPPORT - COMPLIMENTARY CATEGORIES
  // =====================================================
  
  // Counseling Services (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'counseling-services', minPrice: 1500, maxPrice: 8000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'counseling-services', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'counseling-services', minPrice: 10000, maxPrice: 100000 },
  
  // Social Work (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'social-work', minPrice: 1000, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'social-work', minPrice: 5000, maxPrice: 30000 },
  
  // Legal Aid (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: 'legal-aid-services', minPrice: 0, maxPrice: 50000, isNotesRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'legal-aid-services', minPrice: 1000, maxPrice: 10000 },
  
  // Financial Counseling (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'financial-counseling', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'financial-counseling', minPrice: 1500, maxPrice: 8000 },
  
  // Addiction Counseling (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'addiction-counseling', minPrice: 1500, maxPrice: 8000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'addiction-counseling', minPrice: 20000, maxPrice: 200000 },
  
  // Family Therapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'family-therapy', minPrice: 2000, maxPrice: 10000, isExperienceRequired: true },
  
  // Marriage Counseling (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'marriage-counseling', minPrice: 2000, maxPrice: 10000 },
  
  // Grief Counseling (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'grief-counseling', minPrice: 1500, maxPrice: 8000 },
  
  // Trauma Counseling (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'trauma-counseling', minPrice: 2000, maxPrice: 12000, isExperienceRequired: true },
  
  // Rehabilitation Services (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'rehabilitation-services', minPrice: 1500, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'rehabilitation-services', minPrice: 2000, maxPrice: 10000 },
  
  // Physiotherapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'physiotherapy', minPrice: 1500, maxPrice: 5000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'physiotherapy', minPrice: 2000, maxPrice: 8000 },
  
  // Nutritionists (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'nutritionists', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'nutritionists', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'nutritionists', minPrice: 10000, maxPrice: 100000 },
  
  // Speech Therapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'speech-therapy', minPrice: 2000, maxPrice: 6000, isExperienceRequired: true },
  
  // Occupational Therapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'occupational-therapy', minPrice: 1500, maxPrice: 5000, isExperienceRequired: true },
  
  // Community Health Workers (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'community-health-workers', minPrice: 500, maxPrice: 2000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'community-health-workers', minPrice: 2000, maxPrice: 10000 },
  
  // Art Therapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'art-therapy', minPrice: 1500, maxPrice: 6000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'art-therapy', minPrice: 2000, maxPrice: 8000 },
  
  // Music Therapy (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'music-therapy', minPrice: 1500, maxPrice: 6000 },
  
  // Meditation (Parent)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'meditation', minPrice: 500, maxPrice: 3000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'meditation', minPrice: 5000, maxPrice: 50000 },

  // =====================================================
  // SOCIAL_SUPPORT - COMPLIMENTARY SUBCATEGORIES
  // =====================================================
  
  // Individual Counseling (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'individual-counseling', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'individual-counseling', minPrice: 2000, maxPrice: 10000 },
  
  // Group Counseling (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'group-counseling', minPrice: 1000, maxPrice: 5000, isNotesRequired: true },
  
  // Crisis Counseling (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'crisis-counseling', minPrice: 2000, maxPrice: 15000, isExperienceRequired: true },
  
  // PTSD Counseling (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'ptsd-counseling', minPrice: 2500, maxPrice: 15000, isExperienceRequired: true },
  
  // Physical Therapy (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'physical-therapy', minPrice: 1500, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'physical-therapy', minPrice: 2000, maxPrice: 10000 },
  
  // Sports Physiotherapy (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'sports-physiotherapy', minPrice: 2000, maxPrice: 8000, isExperienceRequired: true },
  
  // Dietary Planning (Subcategory)
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'dietary-planning', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'dietary-planning', minPrice: 10000, maxPrice: 100000 },
];