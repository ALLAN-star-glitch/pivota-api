export const PRICE_UNIT_RULES = [
  // =====================================================
  // GLOBAL FALLBACK RULES (categorySlug: null)
  // =====================================================
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: null, minPrice: 200, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 500, maxPrice: 5000000 },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: null, minPrice: 15000, maxPrice: 1000000 },

  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 50000000 },
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: null, minPrice: 5000, maxPrice: 1000000 },

  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 0, maxPrice: 200000, isNotesRequired: true },

  // =====================================================
  // JOBS → TRADES & MANUAL LABOR
  // =====================================================
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'plumbing', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'residential-plumbing', minPrice: 1500, maxPrice: 80000 },
  { vertical: 'JOBS', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'electrical', minPrice: 2000, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'house-help', minPrice: 1200, maxPrice: 4000 },
  { vertical: 'JOBS', unit: 'PER_TRIP', currency: 'KES', categorySlug: 'transport-delivery', minPrice: 300, maxPrice: 5000 },

  // =====================================================
  // JOBS → PROFESSIONAL & TECH (2025 MARKET RATES)
  // =====================================================
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'software-development', minPrice: 1500, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'engineering-technical', minPrice: 4500, maxPrice: 12500, isExperienceRequired: true }, // EBK Standard
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'healthcare-medical', minPrice: 35000, maxPrice: 800000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'finance-accounting', minPrice: 5000, maxPrice: 500000, isNotesRequired: true },

  // =====================================================
  // HOUSING → SPECIFIC RENTAL BRACKETS
  // =====================================================
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'bedsitters-studios', minPrice: 7000, maxPrice: 25000 },
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'apartments', minPrice: 15000, maxPrice: 350000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'housing-plumbing', minPrice: 1000, maxPrice: 50000 },

  // =====================================================
  // SOCIAL SUPPORT → SPECIFICS
  // =====================================================
  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: 'emergency-assistance', minPrice: 0, maxPrice: 100000, isNotesRequired: true },
];