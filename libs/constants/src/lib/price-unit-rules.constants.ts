// seed-data/price-unit-rules.constants.ts

/**
 * PRICE UNIT RULES FOR CONTRACTOR SERVICE OFFERINGS
 * 
 * These rules apply ONLY to COMPLIMENTARY categories (professional services)
 * NOT to MAIN categories (property listings, job posts, support programs)
 * 
 * STRATEGY:
 * - Subcategories have their own specific rules when available
 * - Parent categories serve as fallbacks for subcategories without explicit rules
 * - Global fallbacks apply when no category-specific rules exist
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
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: null, minPrice: 5000, maxPrice: 2000000 },

  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: null, minPrice: 0, maxPrice: 200000, isNotesRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: null, minPrice: 500, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: null, minPrice: 1000, maxPrice: 15000 },

  // =====================================================
  // HOUSING - PARENT CATEGORIES (Fallbacks)
  // =====================================================
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'maintenance-repairs', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'maintenance-repairs', minPrice: 1000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'maintenance-repairs', minPrice: 1000, maxPrice: 15000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 1000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 500, maxPrice: 2000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_FOOT', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 10, maxPrice: 100 },
  { vertical: 'HOUSING', unit: 'PER_ROOM', currency: 'KES', categorySlug: 'cleaning-services', minPrice: 500, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'security-services', minPrice: 15000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'security-services', minPrice: 5000, maxPrice: 150000 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'security-services', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'moving-relocation', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_TRIP', currency: 'KES', categorySlug: 'moving-relocation', minPrice: 1000, maxPrice: 15000 },
  
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 2000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 5000, maxPrice: 5000000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_FOOT', currency: 'KES', categorySlug: 'construction-renovation', minPrice: 500, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'interior-design', minPrice: 1000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'interior-design', minPrice: 5000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'interior-design', minPrice: 20000, maxPrice: 500000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'landscaping-gardening', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'landscaping-gardening', minPrice: 2000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'landscaping-gardening', minPrice: 5000, maxPrice: 30000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'pest-control', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'pest-control', minPrice: 1500, maxPrice: 10000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'home-inspections', minPrice: 5000, maxPrice: 50000, isExperienceRequired: true },
  
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'property-management', minPrice: 5, maxPrice: 15, isNotesRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'property-management', minPrice: 5000, maxPrice: 100000 },
  
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'real-estate-agents', minPrice: 2, maxPrice: 10, isNotesRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'real-estate-agents', minPrice: 10000, maxPrice: 500000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'property-valuers', minPrice: 5000, maxPrice: 100000, isExperienceRequired: true },
  
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'architects', minPrice: 5, maxPrice: 15, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'architects', minPrice: 50000, maxPrice: 5000000 },
  
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'quantity-surveyors', minPrice: 1, maxPrice: 5, isExperienceRequired: true },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'structural-engineers', minPrice: 20000, maxPrice: 2000000, isExperienceRequired: true },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'home-automation', minPrice: 10000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PER_DEVICE', currency: 'KES', categorySlug: 'home-automation', minPrice: 2000, maxPrice: 20000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'solar-installation', minPrice: 20000, maxPrice: 500000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_WATT', currency: 'KES', categorySlug: 'solar-installation', minPrice: 50, maxPrice: 200 },
  
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'waterproofing', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'appliance-repair', minPrice: 1000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'appliance-repair', minPrice: 800, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'waste-management', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'waste-management', minPrice: 1000, maxPrice: 20000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'hvac-services', minPrice: 3000, maxPrice: 50000, isExperienceRequired: true },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'logistics-courier', minPrice: 100, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'PER_KILOMETER', currency: 'KES', categorySlug: 'logistics-courier', minPrice: 50, maxPrice: 500 },
  
  { vertical: 'HOUSING', unit: 'PER_ACRE', currency: 'KES', categorySlug: 'agriculture-farming', minPrice: 1000, maxPrice: 50000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_ANIMAL', currency: 'KES', categorySlug: 'agriculture-farming', minPrice: 200, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'event-planning', minPrice: 5000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PER_GUEST', currency: 'KES', categorySlug: 'event-planning', minPrice: 500, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'automotive', minPrice: 500, maxPrice: 50000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'automotive', minPrice: 500, maxPrice: 3000 },

  // =====================================================
  // HOUSING - SUBCATEGORIES (Specific Rules)
  // =====================================================
  
  // Maintenance & Repair Subcategories
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'electrical-services', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'electrical-services', minPrice: 1500, maxPrice: 80000 },
  { vertical: 'HOUSING', unit: 'PER_POINT', currency: 'KES', categorySlug: 'electrical-services', minPrice: 500, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'plumbing-services', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'plumbing-services', minPrice: 1500, maxPrice: 80000 },
  { vertical: 'HOUSING', unit: 'PER_FIXTURE', currency: 'KES', categorySlug: 'plumbing-services', minPrice: 500, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'carpentry-services', minPrice: 600, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'carpentry-services', minPrice: 1000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_ITEM', currency: 'KES', categorySlug: 'carpentry-services', minPrice: 500, maxPrice: 20000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'painting-services', minPrice: 500, maxPrice: 2500 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'painting-services', minPrice: 2000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'painting-services', minPrice: 100, maxPrice: 500 },
  { vertical: 'HOUSING', unit: 'PER_ROOM', currency: 'KES', categorySlug: 'painting-services', minPrice: 3000, maxPrice: 20000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'handyman-services', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'handyman-services', minPrice: 3000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'handyman-services', minPrice: 1000, maxPrice: 30000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'flooring-services', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'flooring-services', minPrice: 200, maxPrice: 1000 },
  
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'tiling-services', minPrice: 500, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'tiling-services', minPrice: 300, maxPrice: 1500 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'glass-window-services', minPrice: 1000, maxPrice: 20000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'glass-window-services', minPrice: 500, maxPrice: 2500 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'locksmith-services', minPrice: 500, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'locksmith-services', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'roofing-repair-services', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'roofing-repair-services', minPrice: 800, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'fence-gate-repair', minPrice: 1500, maxPrice: 30000 },
  
  // Cleaning Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'house-cleaning', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'house-cleaning', minPrice: 500, maxPrice: 1500 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'deep-cleaning', minPrice: 3000, maxPrice: 25000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'deep-cleaning', minPrice: 100, maxPrice: 300 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'move-cleaning', minPrice: 2000, maxPrice: 15000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'carpet-cleaning', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'carpet-cleaning', minPrice: 100, maxPrice: 500 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'window-cleaning', minPrice: 1000, maxPrice: 8000 },
  { vertical: 'HOUSING', unit: 'PER_WINDOW', currency: 'KES', categorySlug: 'window-cleaning', minPrice: 100, maxPrice: 500 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'office-cleaning', minPrice: 3000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'office-cleaning', minPrice: 800, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'upholstery-cleaning', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'mattress-cleaning', minPrice: 1500, maxPrice: 10000 },
  
  // Security Subcategories
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'security-guards', minPrice: 15000, maxPrice: 80000 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'security-guards', minPrice: 800, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'cctv-installation', minPrice: 10000, maxPrice: 150000 },
  { vertical: 'HOUSING', unit: 'PER_CAMERA', currency: 'KES', categorySlug: 'cctv-installation', minPrice: 3000, maxPrice: 10000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'alarm-systems', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'electric-fences', minPrice: 20000, maxPrice: 200000 },
  
  // Moving Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'local-movers', minPrice: 2000, maxPrice: 30000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'long-distance-movers', minPrice: 5000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'long-distance-movers', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'packing-services', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'HOUSING', unit: 'PER_BOX', currency: 'KES', categorySlug: 'packing-services', minPrice: 100, maxPrice: 500 },
  
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'storage-services', minPrice: 2000, maxPrice: 20000 },
  
  // Construction Subcategories
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'general-contractors', minPrice: 5000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'general-contractors', minPrice: 10, maxPrice: 20 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'home-builders', minPrice: 100000, maxPrice: 5000000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'home-builders', minPrice: 30000, maxPrice: 100000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'renovation-specialists', minPrice: 20000, maxPrice: 2000000 },
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'renovation-specialists', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'kitchen-remodeling', minPrice: 50000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'bathroom-remodeling', minPrice: 30000, maxPrice: 300000 },
  
  // Appliance Repair Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'refrigerator-repair', minPrice: 1000, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'washing-machine-repair', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'dryer-repair', minPrice: 1000, maxPrice: 8000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'oven-stove-repair', minPrice: 800, maxPrice: 12000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'dishwasher-repair', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'microwave-repair', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'ac-repair', minPrice: 1500, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'tv-electronics-repair', minPrice: 1000, maxPrice: 15000 },
  
  // Logistics Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'same-day-delivery', minPrice: 200, maxPrice: 2000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'next-day-delivery', minPrice: 150, maxPrice: 1500 },
  { vertical: 'HOUSING', unit: 'PER_KILOMETER', currency: 'KES', categorySlug: 'freight-cargo', minPrice: 100, maxPrice: 1000 },
  { vertical: 'HOUSING', unit: 'PER_KILOGRAM', currency: 'KES', categorySlug: 'freight-cargo', minPrice: 50, maxPrice: 500 },
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'warehousing-fulfillment', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'boda-courier', minPrice: 100, maxPrice: 1000 },
  
  // Agriculture Subcategories
  { vertical: 'HOUSING', unit: 'PER_ACRE', currency: 'KES', categorySlug: 'crop-spraying', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'crop-spraying', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'HOUSING', unit: 'PER_DAY', currency: 'KES', categorySlug: 'farm-mechanization', minPrice: 5000, maxPrice: 30000 },
  { vertical: 'HOUSING', unit: 'PER_ACRE', currency: 'KES', categorySlug: 'farm-mechanization', minPrice: 3000, maxPrice: 15000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'irrigation-installation', minPrice: 20000, maxPrice: 200000 },
  { vertical: 'HOUSING', unit: 'PER_ACRE', currency: 'KES', categorySlug: 'irrigation-installation', minPrice: 15000, maxPrice: 100000 },
  
  { vertical: 'HOUSING', unit: 'PER_SAMPLE', currency: 'KES', categorySlug: 'soil-testing', minPrice: 2000, maxPrice: 10000 },
  
  { vertical: 'HOUSING', unit: 'PER_VISIT', currency: 'KES', categorySlug: 'veterinary', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'PER_ANIMAL', currency: 'KES', categorySlug: 'veterinary', minPrice: 500, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'PER_BIRD', currency: 'KES', categorySlug: 'poultry-services', minPrice: 50, maxPrice: 500 },
  { vertical: 'HOUSING', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'poultry-services', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'HOUSING', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'greenhouse-installation', minPrice: 2000, maxPrice: 10000 },
  
  // Event Planning Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'wedding-planning', minPrice: 20000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'wedding-planning', minPrice: 10, maxPrice: 20 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'corporate-events', minPrice: 50000, maxPrice: 500000 },
  { vertical: 'HOUSING', unit: 'PER_GUEST', currency: 'KES', categorySlug: 'corporate-events', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'party-planning', minPrice: 5000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_GUEST', currency: 'KES', categorySlug: 'catering', minPrice: 500, maxPrice: 5000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'event-decor', minPrice: 5000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'dj-entertainment', minPrice: 2000, maxPrice: 20000 },
  
  // Automotive Subcategories
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'car-repair', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'HOUSING', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'car-repair', minPrice: 800, maxPrice: 3000 },
  
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'car-wash', minPrice: 300, maxPrice: 3000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'towing', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'auto-electrical', minPrice: 1000, maxPrice: 15000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'auto-body', minPrice: 5000, maxPrice: 100000 },
  { vertical: 'HOUSING', unit: 'FIXED', currency: 'KES', categorySlug: 'boda-repair', minPrice: 500, maxPrice: 10000 },

  // =====================================================
  // JOBS - PARENT CATEGORIES (Fallbacks)
  // =====================================================
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'career-coaching', minPrice: 1500, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'career-coaching', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'career-coaching', minPrice: 10000, maxPrice: 100000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'cv-writing', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_PAGE', currency: 'KES', categorySlug: 'cv-writing', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'interview-preparation', minPrice: 1000, maxPrice: 8000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'interview-preparation', minPrice: 1500, maxPrice: 10000 },
  
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'recruitment-agencies-main', minPrice: 5, maxPrice: 20, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'recruitment-agencies-main', minPrice: 10000, maxPrice: 500000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'skills-training', minPrice: 1000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'skills-training', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_COURSE', currency: 'KES', categorySlug: 'skills-training', minPrice: 10000, maxPrice: 500000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'linkedin-optimization', minPrice: 2000, maxPrice: 15000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'job-search-assistance', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'job-search-assistance', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'career-assessment', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_TEST', currency: 'KES', categorySlug: 'career-assessment', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'executive-search', minPrice: 15, maxPrice: 30, isNotesRequired: true },
  
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'outplacement-services', minPrice: 50000, maxPrice: 500000, isNotesRequired: true },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'networking-events', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_EVENT', currency: 'KES', categorySlug: 'networking-events', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'job-fairs', minPrice: 10000, maxPrice: 200000 },
  { vertical: 'JOBS', unit: 'PER_BOOTH', currency: 'KES', categorySlug: 'job-fairs', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'it-digital-services', minPrice: 1000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'it-digital-services', minPrice: 5000, maxPrice: 500000 },
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'it-digital-services', minPrice: 10000, maxPrice: 1000000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'it-digital-services', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'media-creative', minPrice: 1000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'media-creative', minPrice: 2000, maxPrice: 200000 },
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'media-creative', minPrice: 5000, maxPrice: 500000 },
  
  { vertical: 'JOBS', unit: 'PER_SERVICE', currency: 'KES', categorySlug: 'beauty-wellness', minPrice: 500, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'beauty-wellness', minPrice: 500, maxPrice: 3000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'beauty-wellness', minPrice: 2000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'legal-compliance', minPrice: 2000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'legal-compliance', minPrice: 5000, maxPrice: 200000 },
  { vertical: 'JOBS', unit: 'PER_CONSULTATION', currency: 'KES', categorySlug: 'legal-compliance', minPrice: 2000, maxPrice: 20000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'accounting-tax', minPrice: 1000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'accounting-tax', minPrice: 2000, maxPrice: 100000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'accounting-tax', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'tutoring-academic', minPrice: 500, maxPrice: 5000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'tutoring-academic', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'tutoring-academic', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_PAGE', currency: 'KES', categorySlug: 'printing-stationery', minPrice: 5, maxPrice: 100 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'printing-stationery', minPrice: 100, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_COPY', currency: 'KES', categorySlug: 'printing-stationery', minPrice: 1, maxPrice: 10 },

  // =====================================================
  // JOBS - SUBCATEGORIES (Specific Rules)
  // =====================================================
  
  // Career Coaching Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'career-planning', minPrice: 2000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'career-planning', minPrice: 3000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'career-planning', minPrice: 15000, maxPrice: 150000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'career-change-guidance', minPrice: 2000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'career-change-guidance', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'executive-coaching', minPrice: 5000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'executive-coaching', minPrice: 10000, maxPrice: 30000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'executive-coaching', minPrice: 50000, maxPrice: 500000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'graduate-coaching', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'graduate-coaching', minPrice: 10000, maxPrice: 100000 },
  
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
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'behavioral-interview-prep', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'salary-negotiation', minPrice: 2000, maxPrice: 10000 },
  
  // Recruitment Subcategories
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'it-recruitment', minPrice: 10, maxPrice: 20, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'it-recruitment', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'finance-recruitment', minPrice: 10, maxPrice: 20, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'healthcare-recruitment', minPrice: 10, maxPrice: 20, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'PERCENTAGE', currency: 'KES', categorySlug: 'executive-search', minPrice: 20, maxPrice: 30, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'temporary-staffing', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_PLACEMENT', currency: 'KES', categorySlug: 'mass-recruitment', minPrice: 2000, maxPrice: 20000 },
  
  // Skills Training Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'leadership-training', minPrice: 3000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'leadership-training', minPrice: 20000, maxPrice: 100000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'communication-skills', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'time-management', minPrice: 1500, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'project-management-training', minPrice: 2000, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'team-building', minPrice: 10000, maxPrice: 100000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'negotiation-skills', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'digital-skills', minPrice: 1000, maxPrice: 8000 },
  
  // LinkedIn Optimization Subcategories
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'profile-optimization', minPrice: 3000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'networking-strategies', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'linkedin-content', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'personal-branding', minPrice: 10000, maxPrice: 100000 },
  
  // Job Search Assistance Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'job-search-strategy', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'company-research', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'application-tracking', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'follow-up-strategies', minPrice: 1000, maxPrice: 5000 },
  
  // Career Assessment Subcategories
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'aptitude-testing', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'personality-assessment', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'skills-gap-analysis', minPrice: 5000, maxPrice: 30000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'career-fit-assessment', minPrice: 3000, maxPrice: 20000 },
  
  // IT Subcategories
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'web-design-dev', minPrice: 10000, maxPrice: 500000 },
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'web-design-dev', minPrice: 10000, maxPrice: 500000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'web-design-dev', minPrice: 1000, maxPrice: 8000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'mobile-app-dev', minPrice: 50000, maxPrice: 2000000 },
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'mobile-app-dev', minPrice: 50000, maxPrice: 2000000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'mobile-app-dev', minPrice: 2000, maxPrice: 15000, isExperienceRequired: true },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'computer-repair', minPrice: 500, maxPrice: 3000 },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'computer-repair', minPrice: 1000, maxPrice: 10000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'network-setup', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'network-setup', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'cybersecurity-services', minPrice: 3000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'cybersecurity-services', minPrice: 50000, maxPrice: 500000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'seo-digital-marketing', minPrice: 2000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'seo-digital-marketing', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'social-media-management', minPrice: 10000, maxPrice: 100000 },
  { vertical: 'JOBS', unit: 'PER_POST', currency: 'KES', categorySlug: 'social-media-management', minPrice: 500, maxPrice: 5000 },
  
  // Media Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'photography-services', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_EVENT', currency: 'KES', categorySlug: 'photography-services', minPrice: 5000, maxPrice: 100000 },
  { vertical: 'JOBS', unit: 'PER_DAY', currency: 'KES', categorySlug: 'photography-services', minPrice: 10000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_EVENT', currency: 'KES', categorySlug: 'videography-services', minPrice: 10000, maxPrice: 200000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'videography-services', minPrice: 3000, maxPrice: 15000 },
  { vertical: 'JOBS', unit: 'PER_MINUTE', currency: 'KES', categorySlug: 'videography-services', minPrice: 500, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'graphic-design-services', minPrice: 2000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'graphic-design-services', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_DESIGN', currency: 'KES', categorySlug: 'graphic-design-services', minPrice: 1000, maxPrice: 10000 },
  
  { vertical: 'JOBS', unit: 'PER_WORD', currency: 'KES', categorySlug: 'content-writing', minPrice: 1, maxPrice: 10 },
  { vertical: 'JOBS', unit: 'PER_ARTICLE', currency: 'KES', categorySlug: 'content-writing', minPrice: 500, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'content-writing', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'PER_PAGE', currency: 'KES', categorySlug: 'translation-services', minPrice: 50, maxPrice: 500 },
  { vertical: 'JOBS', unit: 'PER_WORD', currency: 'KES', categorySlug: 'translation-services', minPrice: 1, maxPrice: 5 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'voice-over', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_PROJECT', currency: 'KES', categorySlug: 'voice-over', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'animation-services', minPrice: 3000, maxPrice: 20000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'PER_SECOND', currency: 'KES', categorySlug: 'animation-services', minPrice: 500, maxPrice: 5000 },
  
  // Beauty Subcategories
  { vertical: 'JOBS', unit: 'PER_SERVICE', currency: 'KES', categorySlug: 'hair-salon', minPrice: 500, maxPrice: 3000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'hair-salon', minPrice: 5000, maxPrice: 30000 },
  
  { vertical: 'JOBS', unit: 'PER_SERVICE', currency: 'KES', categorySlug: 'barber-services', minPrice: 300, maxPrice: 1500 },
  
  { vertical: 'JOBS', unit: 'PER_EVENT', currency: 'KES', categorySlug: 'makeup-services', minPrice: 1000, maxPrice: 10000 },
  { vertical: 'JOBS', unit: 'PER_PERSON', currency: 'KES', categorySlug: 'makeup-services', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'PER_SERVICE', currency: 'KES', categorySlug: 'nail-care', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'massage-therapy', minPrice: 1500, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'massage-therapy', minPrice: 2000, maxPrice: 8000 },
  
  { vertical: 'JOBS', unit: 'PER_SERVICE', currency: 'KES', categorySlug: 'braiding-weaving', minPrice: 1000, maxPrice: 5000 },
  
  // Legal Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'corporate-legal', minPrice: 5000, maxPrice: 30000, isExperienceRequired: true },
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'corporate-legal', minPrice: 10000, maxPrice: 200000 },
  
  { vertical: 'JOBS', unit: 'PER_DOCUMENT', currency: 'KES', categorySlug: 'notary-services', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'contract-drafting', minPrice: 5000, maxPrice: 50000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'contract-drafting', minPrice: 2000, maxPrice: 10000 },
  
  { vertical: 'JOBS', unit: 'FIXED', currency: 'KES', categorySlug: 'business-registration', minPrice: 5000, maxPrice: 25000 },
  
  // Accounting Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'bookkeeping', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'bookkeeping', minPrice: 5000, maxPrice: 50000 },
  
  { vertical: 'JOBS', unit: 'PER_RETURN', currency: 'KES', categorySlug: 'tax-filing', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'tax-filing', minPrice: 1500, maxPrice: 10000 },
  
  { vertical: 'JOBS', unit: 'PER_EMPLOYEE', currency: 'KES', categorySlug: 'payroll', minPrice: 200, maxPrice: 1000, isNotesRequired: true },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'payroll', minPrice: 5000, maxPrice: 50000 },
  
  // Tutoring Subcategories
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'primary-tutoring', minPrice: 500, maxPrice: 3000 },
  { vertical: 'JOBS', unit: 'PER_MONTH', currency: 'KES', categorySlug: 'primary-tutoring', minPrice: 5000, maxPrice: 30000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'high-school-tutoring', minPrice: 800, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_SUBJECT', currency: 'KES', categorySlug: 'high-school-tutoring', minPrice: 2000, maxPrice: 15000 },
  
  { vertical: 'JOBS', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'exam-preparation', minPrice: 2000, maxPrice: 20000 },
  { vertical: 'JOBS', unit: 'PACKAGE', currency: 'KES', categorySlug: 'exam-preparation', minPrice: 10000, maxPrice: 100000 },
  
  { vertical: 'JOBS', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'language-tutoring', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'JOBS', unit: 'PER_LEVEL', currency: 'KES', categorySlug: 'language-tutoring', minPrice: 10000, maxPrice: 50000 },
  
  // Printing Subcategories
  { vertical: 'JOBS', unit: 'PER_PAGE', currency: 'KES', categorySlug: 'document-printing', minPrice: 5, maxPrice: 50 },
  { vertical: 'JOBS', unit: 'PER_COPY', currency: 'KES', categorySlug: 'document-printing', minPrice: 1, maxPrice: 10 },
  
  { vertical: 'JOBS', unit: 'PER_SQUARE_METER', currency: 'KES', categorySlug: 'large-format', minPrice: 500, maxPrice: 2000 },
  
  { vertical: 'JOBS', unit: 'PER_HUNDRED', currency: 'KES', categorySlug: 'business-card-printing', minPrice: 1000, maxPrice: 5000 },
  
  { vertical: 'JOBS', unit: 'PER_SHIRT', currency: 'KES', categorySlug: 'tshirt-printing', minPrice: 500, maxPrice: 2000 },
  { vertical: 'JOBS', unit: 'PER_BULK', currency: 'KES', categorySlug: 'tshirt-printing', minPrice: 5000, maxPrice: 50000 },

  // =====================================================
  // SOCIAL_SUPPORT - PARENT CATEGORIES (Fallbacks)
  // =====================================================
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'counseling-services', minPrice: 1500, maxPrice: 8000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'counseling-services', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'counseling-services', minPrice: 10000, maxPrice: 100000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'social-work', minPrice: 1000, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'social-work', minPrice: 5000, maxPrice: 30000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'FIXED', currency: 'KES', categorySlug: 'legal-aid-services', minPrice: 0, maxPrice: 50000, isNotesRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'FREE', currency: 'KES', categorySlug: 'legal-aid-services', minPrice: 0, maxPrice: 0, isNotesRequired: true },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'financial-counseling', minPrice: 1000, maxPrice: 5000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'financial-counseling', minPrice: 1500, maxPrice: 8000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'addiction-counseling', minPrice: 1500, maxPrice: 8000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'addiction-counseling', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'family-therapy', minPrice: 2000, maxPrice: 10000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'marriage-counseling', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'grief-counseling', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'trauma-counseling', minPrice: 2000, maxPrice: 12000, isExperienceRequired: true },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'rehabilitation-services', minPrice: 1500, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'rehabilitation-services', minPrice: 2000, maxPrice: 10000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'physiotherapy', minPrice: 1500, maxPrice: 5000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'physiotherapy', minPrice: 2000, maxPrice: 8000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'nutritionists', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'nutritionists', minPrice: 2000, maxPrice: 10000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'nutritionists', minPrice: 10000, maxPrice: 100000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'speech-therapy', minPrice: 2000, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'occupational-therapy', minPrice: 1500, maxPrice: 5000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'community-health-workers', minPrice: 500, maxPrice: 2000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'art-therapy', minPrice: 1500, maxPrice: 6000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'music-therapy', minPrice: 1500, maxPrice: 6000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'meditation', minPrice: 500, maxPrice: 3000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'disability-support', minPrice: 500, maxPrice: 3000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'disability-support', minPrice: 3000, maxPrice: 20000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'elder-care', minPrice: 500, maxPrice: 3000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'elder-care', minPrice: 3000, maxPrice: 20000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'youth-mentors', minPrice: 500, maxPrice: 3000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'youth-mentors', minPrice: 1000, maxPrice: 5000 },

  // =====================================================
  // SOCIAL_SUPPORT - SUBCATEGORIES (Specific Rules)
  // =====================================================
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'individual-counseling', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'group-counseling', minPrice: 1000, maxPrice: 5000, isNotesRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'crisis-counseling', minPrice: 2000, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'ptsd-counseling', minPrice: 2500, maxPrice: 15000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'ptsd-counseling', minPrice: 20000, maxPrice: 200000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'physical-therapy', minPrice: 1500, maxPrice: 6000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'physical-therapy', minPrice: 2000, maxPrice: 10000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'sports-physiotherapy', minPrice: 2000, maxPrice: 8000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'sports-physiotherapy', minPrice: 3000, maxPrice: 12000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_SESSION', currency: 'KES', categorySlug: 'dietary-planning', minPrice: 1500, maxPrice: 8000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PACKAGE', currency: 'KES', categorySlug: 'dietary-planning', minPrice: 10000, maxPrice: 100000 },
  
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'home-health-aides', minPrice: 500, maxPrice: 2000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'personal-care-assistants', minPrice: 500, maxPrice: 2500 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'sign-language', minPrice: 1000, maxPrice: 5000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'companion-care', minPrice: 400, maxPrice: 2000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_HOUR', currency: 'KES', categorySlug: 'memory-care', minPrice: 800, maxPrice: 4000, isExperienceRequired: true },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_DAY', currency: 'KES', categorySlug: 'respite-care', minPrice: 3000, maxPrice: 20000 },
  { vertical: 'SOCIAL_SUPPORT', unit: 'PER_TRIP', currency: 'KES', categorySlug: 'senior-transportation', minPrice: 300, maxPrice: 2000 },
];