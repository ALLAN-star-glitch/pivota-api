export const ROOT_CATEGORIES = [
  // ======================
  // JOBS
  // ======================
  { vertical: 'JOBS', name: 'Plumbing', slug: 'plumbing', description: 'All plumbing-related jobs' },
  { vertical: 'JOBS', name: 'Electrical', slug: 'electrical', description: 'Electrical repair and installation jobs' },
  { vertical: 'JOBS', name: 'House Help', slug: 'house-help', description: 'Domestic work in homes' },
  { vertical: 'JOBS', name: 'Security Services', slug: 'security-services', description: 'Private security and guarding' },
  { vertical: 'JOBS', name: 'Transport & Delivery', slug: 'transport-delivery', description: 'Boda boda, courier, ride-sharing' },
  { vertical: 'JOBS', name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Hairdressing, makeup, spa services' },
  { vertical: 'JOBS', name: 'Cleaning & Housekeeping', slug: 'cleaning-housekeeping', description: 'Home and office cleaning' },
  { vertical: 'JOBS', name: 'Tutoring & Coaching', slug: 'tutoring-coaching', description: 'Tuition, skills training, sports coaching' },
  { vertical: 'JOBS', name: 'Events & Entertainment', slug: 'events-entertainment', description: 'DJs, MCs, event setup, catering' },
  { vertical: 'JOBS', name: 'Software Development', slug: 'software-development', description: 'Formal software development positions' },
  { vertical: 'JOBS', name: 'Finance & Accounting', slug: 'finance-accounting', description: 'Accounting, auditing, payroll' },
  { vertical: 'JOBS', name: 'Marketing & Communications', slug: 'marketing-communications', description: 'Marketing, PR, content creation' },
  { vertical: 'JOBS', name: 'Education & Training', slug: 'education-training', description: 'Teachers, lecturers, trainers' },
  { vertical: 'JOBS', name: 'Healthcare & Medical', slug: 'healthcare-medical', description: 'Nurses, doctors, lab techs, health assistants' },
  { vertical: 'JOBS', name: 'Administration & HR', slug: 'administration-hr', description: 'Office admin, HR, clerical roles' },
  { vertical: 'JOBS', name: 'Sales & Customer Service', slug: 'sales-customer-service', description: 'Sales reps, call centers, customer support' },
  { vertical: 'JOBS', name: 'Engineering & Technical', slug: 'engineering-technical', description: 'Civil, mechanical, electrical engineers' },
  { vertical: 'JOBS', name: 'Hospitality & Tourism', slug: 'hospitality-tourism', description: 'Hotels, restaurants, travel agencies' },
  { vertical: 'JOBS', name: 'Logistics & Supply Chain', slug: 'logistics-supply-chain', description: 'Warehouse, distribution, transport management' },

  // ======================
  // HOUSING
  // ======================
  { vertical: 'HOUSING', name: 'Apartments', slug: 'apartments', description: 'Apartment housing units' },
  { vertical: 'HOUSING', name: 'Houses', slug: 'houses', description: 'Standalone residential houses' },
  { vertical: 'HOUSING', name: 'Bedsitters & Studios', slug: 'bedsitters-studios', description: 'Single-room housing units' },
  { vertical: 'HOUSING', name: 'Housing Services', slug: 'housing-services', description: 'Maintenance and property-related services' },

  // ======================
  // SOCIAL SUPPORT
  // ======================
  { vertical: 'SOCIAL_SUPPORT', name: 'Youth Programs', slug: 'youth-programs', description: 'Support programs targeting youth' },
  { vertical: 'SOCIAL_SUPPORT', name: 'Women Empowerment', slug: 'women-empowerment', description: 'Programs supporting women' },
  { vertical: 'SOCIAL_SUPPORT', name: 'Disability Support', slug: 'disability-support', description: 'Support for persons with disabilities' },
  { vertical: 'SOCIAL_SUPPORT', name: 'Community Services', slug: 'community-services', description: 'Community-based assistance' },
];

export const SUB_CATEGORIES = (rootIds: Record<string, string>) => [
  // JOBS SUBS
  { vertical: 'JOBS', name: 'Residential Plumbing', slug: 'residential-plumbing', description: 'Home plumbing', parentId: rootIds['JOBS:plumbing'] },
  { vertical: 'JOBS', name: 'Commercial Plumbing', slug: 'commercial-plumbing', description: 'Business plumbing', parentId: rootIds['JOBS:plumbing'] },
  { vertical: 'JOBS', name: 'House Wiring', slug: 'house-wiring', description: 'Home electrical wiring', parentId: rootIds['JOBS:electrical'] },
  { vertical: 'JOBS', name: 'Office Electrical Installations', slug: 'office-electrical-installations', description: 'Office electrical work', parentId: rootIds['JOBS:electrical'] },
  { vertical: 'JOBS', name: 'Web Development', slug: 'web-development', description: 'Frontend and backend development', parentId: rootIds['JOBS:software-development'] },
  { vertical: 'JOBS', name: 'Mobile App Development', slug: 'mobile-app-development', description: 'iOS and Android development', parentId: rootIds['JOBS:software-development'] },

  // HOUSING SUBS (Note: slugs adjusted to prevent collision with JOBS)
  { vertical: 'HOUSING', name: 'Plumbing Services', slug: 'housing-plumbing', description: 'Housing maintenance plumbing', parentId: rootIds['HOUSING:housing-services'] },
  { vertical: 'HOUSING', name: 'Electrical Services', slug: 'housing-electrical', description: 'Housing maintenance electrical', parentId: rootIds['HOUSING:housing-services'] },

  // SOCIAL SUPPORT SUBS
  { vertical: 'SOCIAL_SUPPORT', name: 'Skills Training', slug: 'skills-training', description: 'Skill-building programs', parentId: rootIds['SOCIAL_SUPPORT:community-services'] },
  { vertical: 'SOCIAL_SUPPORT', name: 'Emergency Assistance', slug: 'emergency-assistance', description: 'Urgent aid and relief', parentId: rootIds['SOCIAL_SUPPORT:community-services'] },
];