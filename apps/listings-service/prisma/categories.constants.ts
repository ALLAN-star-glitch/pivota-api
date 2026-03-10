export const ROOT_CATEGORIES = [
  // ======================================================================
  // HOUSING PILLAR - MAIN Categories (Property Listings)
  // ======================================================================
  { vertical: 'HOUSING', type: 'MAIN', name: 'Apartments', slug: 'apartments', description: 'Apartment units for rent or sale in multi-unit buildings' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Houses', slug: 'houses', description: 'Standalone residential houses for rent or sale' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bedsitters', slug: 'bedsitters', description: 'Single-room occupancy units with shared or private facilities' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Studio Apartments', slug: 'studio-apartments', description: 'Open-plan living spaces combining bedroom, living, and kitchen' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Maisonettes', slug: 'maisonettes', description: 'Multi-story apartments with private entrance' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bungalows', slug: 'bungalows', description: 'Single-story detached houses' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Mansions', slug: 'mansions', description: 'Large, luxurious houses with extensive amenities' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Townhouses', slug: 'townhouses', description: 'Multi-floor homes sharing walls with neighbors' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Duplexes', slug: 'duplexes', description: 'Two-unit buildings, each with separate entrance' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Commercial Spaces', slug: 'commercial-spaces', description: 'Retail shops, offices, and business premises' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Warehouses', slug: 'warehouses', description: 'Industrial storage and logistics spaces' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Hostels', slug: 'hostels', description: 'Budget accommodation with shared facilities' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Guest Houses', slug: 'guest-houses', description: 'Small-scale accommodation for visitors' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Serviced Apartments', slug: 'serviced-apartments', description: 'Fully furnished apartments with hotel-like services' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Airbnbs', slug: 'airbnbs', description: 'Short-term rental properties' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Co-living Spaces', slug: 'co-living-spaces', description: 'Shared living spaces with private bedrooms and common areas' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Vacation Rentals', slug: 'vacation-rentals', description: 'Holiday homes and beach houses' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Student Housing', slug: 'student-housing', description: 'Accommodation specifically for students' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Senior Living', slug: 'senior-living', description: 'Housing for elderly with support services' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Gated Communities', slug: 'gated-communities', description: 'Secure residential estates with shared amenities' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Condos', slug: 'condos', description: 'Condominium units for sale' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Villas', slug: 'villas', description: 'Luxury standalone homes' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Farmhouses', slug: 'farmhouses', description: 'Agricultural residential properties' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Cottages', slug: 'cottages', description: 'Small, cozy rural homes' },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Cabins', slug: 'cabins', description: 'Rustic woodland accommodations' },
  
  // HOUSING - COMPLIMENTARY Categories (Service Providers)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Construction & Renovation', slug: 'construction-renovation', description: 'Building, remodeling, and renovation services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Maintenance & Repairs', slug: 'maintenance-repairs', description: 'Ongoing property maintenance and repair services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Cleaning Services', slug: 'cleaning-services', description: 'Professional cleaning for homes and offices' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Services', slug: 'security-services', description: 'Security systems, guards, and surveillance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Moving & Relocation', slug: 'moving-relocation', description: 'Moving companies and relocation assistance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Interior Design', slug: 'interior-design', description: 'Home decoration and space planning' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Landscaping & Gardening', slug: 'landscaping-gardening', description: 'Garden design, lawn care, and outdoor maintenance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Pest Control', slug: 'pest-control', description: 'Extermination and pest management services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Inspections', slug: 'home-inspections', description: 'Pre-purchase and pre-rental property inspections' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Management', slug: 'property-management', description: 'Professional management of rental properties' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Real Estate Agents', slug: 'real-estate-agents', description: 'Professional property sales and rental agents' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Valuers', slug: 'property-valuers', description: 'Professional property valuation services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Architects', slug: 'architects', description: 'Building design and planning services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Quantity Surveyors', slug: 'quantity-surveyors', description: 'Construction cost estimation and management' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Structural Engineers', slug: 'structural-engineers', description: 'Building structure analysis and design' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Geotechnical Engineers', slug: 'geotechnical-engineers', description: 'Soil testing and foundation analysis' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Environmental Consultants', slug: 'environmental-consultants', description: 'Environmental impact assessments' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Automation', slug: 'home-automation', description: 'Smart home installation and setup' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Solar Installation', slug: 'solar-installation', description: 'Solar panel installation' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Waterproofing', slug: 'waterproofing', description: 'Basement and roof waterproofing' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Chimney Sweeps', slug: 'chimney-sweeps', description: 'Chimney cleaning and maintenance' },

  // ======================================================================
  // JOBS PILLAR - MAIN Categories (Employment Opportunities)
  // ======================================================================
  // Technology & IT
  { vertical: 'JOBS', type: 'MAIN', name: 'Software Development', slug: 'software-development', description: 'Programming, coding, and software engineering roles' },
  { vertical: 'JOBS', type: 'MAIN', name: 'IT & Networking', slug: 'it-networking', description: 'Network administration, IT support, and infrastructure' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Data Science & Analytics', slug: 'data-science-analytics', description: 'Data analysis, machine learning, and business intelligence' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Cybersecurity', slug: 'cybersecurity', description: 'Information security and protection roles' },
  { vertical: 'JOBS', type: 'MAIN', name: 'DevOps & Cloud', slug: 'devops-cloud', description: 'Cloud computing, infrastructure automation' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Product Management', slug: 'product-management', description: 'Product strategy, roadmap, and delivery' },
  { vertical: 'JOBS', type: 'MAIN', name: 'UX/UI Design', slug: 'ux-ui-design', description: 'User experience and interface design' },
  
  // Finance & Accounting
  { vertical: 'JOBS', type: 'MAIN', name: 'Accounting', slug: 'accounting', description: 'Bookkeeping, auditing, and financial reporting' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Finance', slug: 'finance', description: 'Financial analysis, planning, and management' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Banking', slug: 'banking', description: 'Retail banking, corporate banking, and investment banking' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Insurance', slug: 'insurance', description: 'Underwriting, claims, and insurance sales' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Investment', slug: 'investment', description: 'Portfolio management, trading, and wealth management' },

    // Add to JOBS - MAIN Categories
  { vertical: 'JOBS', type: 'MAIN', name: 'House Help', slug: 'house-help', description: 'Domestic work, housekeeping, and home assistance' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Transport & Delivery', slug: 'transport-delivery', description: 'Drivers, couriers, and delivery services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Engineering & Technical', slug: 'engineering-technical', description: 'All engineering and technical roles' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Healthcare & Medical', slug: 'healthcare-medical', description: 'Medical and healthcare positions' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Finance & Accounting', slug: 'finance-accounting', description: 'Finance, accounting, and auditing roles' },
  
  // Marketing & Sales
  { vertical: 'JOBS', type: 'MAIN', name: 'Digital Marketing', slug: 'digital-marketing', description: 'SEO, SEM, social media, and email marketing' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Content Creation', slug: 'content-creation', description: 'Writing, video production, and content strategy' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Public Relations', slug: 'public-relations', description: 'Media relations, crisis communications' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Brand Management', slug: 'brand-management', description: 'Brand strategy and development' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Sales', slug: 'sales', description: 'B2B and B2C sales positions' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Business Development', slug: 'business-development', description: 'Partnerships, market expansion' },
  
  // Engineering & Technical
  { vertical: 'JOBS', type: 'MAIN', name: 'Civil Engineering', slug: 'civil-engineering', description: 'Infrastructure, construction, and structural engineering' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Mechanical Engineering', slug: 'mechanical-engineering', description: 'Machinery, HVAC, and mechanical systems' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Electrical Engineering', slug: 'electrical-engineering', description: 'Power systems, electronics, and controls' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Chemical Engineering', slug: 'chemical-engineering', description: 'Process engineering, pharmaceuticals' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Industrial Engineering', slug: 'industrial-engineering', description: 'Process optimization, manufacturing' },
  
  // Healthcare & Medical
  { vertical: 'JOBS', type: 'MAIN', name: 'Medical Doctors', slug: 'medical-doctors', description: 'Physicians, surgeons, and specialists' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Nursing', slug: 'nursing', description: 'Registered nurses, nurse practitioners' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Pharmacy', slug: 'pharmacy', description: 'Pharmacists and pharmaceutical roles' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Dentistry', slug: 'dentistry', description: 'Dentists, orthodontists, and dental hygienists' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Allied Health', slug: 'allied-health', description: 'Physiotherapy, occupational therapy, radiology' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Laboratory Services', slug: 'laboratory-services', description: 'Medical lab scientists and technicians' },
  
  // Education & Training
  { vertical: 'JOBS', type: 'MAIN', name: 'Teaching', slug: 'teaching', description: 'Primary, secondary, and high school teachers' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Lecturing', slug: 'lecturing', description: 'University and college lecturers' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Training & Development', slug: 'training-development', description: 'Corporate trainers and facilitators' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Educational Administration', slug: 'educational-administration', description: 'School principals, administrators' },
  
  // Hospitality & Tourism
  { vertical: 'JOBS', type: 'MAIN', name: 'Hotel Management', slug: 'hotel-management', description: 'Hotel operations and management' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Food & Beverage', slug: 'food-beverage', description: 'Restaurant, catering, and bar services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Tourism & Travel', slug: 'tourism-travel', description: 'Tour guides, travel agents, tour operations' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Chefs & Cooks', slug: 'chefs-cooks', description: 'Culinary professionals' },
  
  // Skilled Trades
  { vertical: 'JOBS', type: 'MAIN', name: 'Electricians', slug: 'electricians-jobs', description: 'Electrical installation and maintenance' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Plumbers', slug: 'plumbers-jobs', description: 'Plumbing installation and repair' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Carpenters', slug: 'carpenters-jobs', description: 'Woodwork and construction' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Welders', slug: 'welders', description: 'Metal fabrication and welding' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Mechanics', slug: 'mechanics', description: 'Vehicle and machinery repair' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Masons', slug: 'masons', description: 'Bricklaying and stonework' },
  
  // Administrative & Support
  { vertical: 'JOBS', type: 'MAIN', name: 'Administration', slug: 'administration', description: 'Office administration and clerical roles' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Human Resources', slug: 'human-resources', description: 'HR management, recruitment, training' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Customer Service', slug: 'customer-service', description: 'Call centers, support, client relations' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Receptionists', slug: 'receptionists', description: 'Front desk and reception roles' },
  
  // Legal
  { vertical: 'JOBS', type: 'MAIN', name: 'Lawyers', slug: 'lawyers', description: 'Legal practice and advocacy' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Paralegals', slug: 'paralegals', description: 'Legal support and assistance' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Legal Secretaries', slug: 'legal-secretaries', description: 'Legal administrative support' },

  { vertical: 'JOBS', type: 'MAIN', name: 'Graphic Design', slug: 'graphic-design', description: 'Visual communication and design' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Photography', slug: 'photography', description: 'Professional photography services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Videography', slug: 'videography', description: 'Video production and editing' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Translation', slug: 'translation', description: 'Language translation services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Research', slug: 'research', description: 'Academic and market research' },

  
  // JOBS - COMPLIMENTARY Categories (Career Support Services)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Coaching', slug: 'career-coaching', description: 'Professional career guidance and planning' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'CV Writing', slug: 'cv-writing', description: 'Professional resume and CV preparation' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Interview Preparation', slug: 'interview-preparation', description: 'Interview coaching and practice' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Recruitment Agencies', slug: 'recruitment-agencies-main', description: 'Professional placement services' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Skills Training', slug: 'skills-training', description: 'Professional skills development programs' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'LinkedIn Optimization', slug: 'linkedin-optimization', description: 'Profile enhancement and personal branding' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Search Assistance', slug: 'job-search-assistance', description: 'Job hunting strategies and support' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Assessment', slug: 'career-assessment', description: 'Aptitude and career fit testing' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Search', slug: 'executive-search', description: 'Headhunting for senior positions' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Outplacement Services', slug: 'outplacement-services', description: 'Support for displaced workers' },

  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Resume Templates', slug: 'resume-templates', description: 'Professional resume templates' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Boards', slug: 'job-boards', description: 'Job posting platforms' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Networking Events', slug: 'networking-events', description: 'Professional networking opportunities' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Fairs', slug: 'job-fairs', description: 'Career fair organizers' },

  { vertical: 'JOBS', type: 'MAIN', name: 'Architecture', slug: 'architecture', description: 'Architectural design and planning' },

  // ======================================================================
  // SOCIAL SUPPORT PILLAR - MAIN Categories (NGO & Community Programs)
  // ======================================================================
  // Basic Needs
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Food Aid', slug: 'food-aid', description: 'Food distribution and nutrition programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Water & Sanitation', slug: 'water-sanitation', description: 'Clean water access and sanitation projects' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Housing Assistance', slug: 'housing-assistance', description: 'Shelter and housing support programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Clothing Distribution', slug: 'clothing-distribution', description: 'Clothing and essential items provision' },
  
  // Financial Support
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Cash Transfers', slug: 'cash-transfers', description: 'Direct financial assistance to beneficiaries' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Microfinance', slug: 'microfinance', description: 'Small loans and financial services' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Grants', slug: 'grants', description: 'Funding for individuals and organizations' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Scholarships', slug: 'scholarships', description: 'Educational financial support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Emergency Relief', slug: 'emergency-relief', description: 'Disaster and crisis response funding' },
  
  // Education & Training
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Adult Education', slug: 'adult-education', description: 'Learning programs for adults' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Vocational Training', slug: 'vocational-training', description: 'Skills training for employment' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Literacy Programs', slug: 'literacy-programs', description: 'Reading and writing education' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'School Supplies', slug: 'school-supplies', description: 'Educational materials provision' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'After-school Programs', slug: 'after-school-programs', description: 'Childcare and educational support' },
  
  // Health & Wellness
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Medical Camps', slug: 'medical-camps', description: 'Free medical services and checkups' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Vaccination Drives', slug: 'vaccination-drives', description: 'Immunization programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Maternal Health', slug: 'maternal-health', description: 'Support for pregnant women and new mothers' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Child Health', slug: 'child-health', description: 'Pediatric healthcare programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'HIV/AIDS Support', slug: 'hiv-aids-support', description: 'Testing, treatment, and awareness' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Mental Health', slug: 'mental-health-programs', description: 'Counseling and mental wellness' },
  
  // Youth & Children
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Orphanages', slug: 'orphanages', description: 'Care for orphaned children' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Child Protection', slug: 'child-protection', description: 'Safeguarding children from abuse' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Youth Empowerment', slug: 'youth-empowerment', description: 'Programs for young people' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Street Children', slug: 'street-children', description: 'Rehabilitation and support for street children' },
  
  // Women & Gender
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Women Empowerment', slug: 'women-empowerment', description: 'Programs supporting women\'s advancement' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Gender-Based Violence', slug: 'gender-based-violence', description: 'Support for GBV survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Mothers & Infants', slug: 'mothers-infants', description: 'Support for mothers and babies' },
  
  // Disability Support
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Disability Services', slug: 'disability-services', description: 'Support for persons with disabilities' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Accessibility Programs', slug: 'accessibility-programs', description: 'Making spaces and services accessible' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Special Education', slug: 'special-education', description: 'Education for special needs children' },
  
  // Elderly Support
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Elderly Care', slug: 'elderly-care-programs', description: 'Support for senior citizens' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Retirement Homes', slug: 'retirement-homes', description: 'Housing for the elderly' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Meals on Wheels', slug: 'meals-on-wheels', description: 'Food delivery for seniors' },
  
  // Community Development
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Community Centers', slug: 'community-centers', description: 'Local gathering and support spaces' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Infrastructure Projects', slug: 'infrastructure-projects', description: 'Community building and improvement' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Environmental Conservation', slug: 'environmental-conservation', description: 'Green initiatives and conservation' },
  
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Refugee Support', slug: 'refugee-support', description: 'Assistance for refugees and asylum seekers' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Human Trafficking Victims', slug: 'human-trafficking-victims', description: 'Support for trafficking survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Domestic Violence', slug: 'domestic-violence', description: 'Support for domestic abuse survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'LGBTQ+ Support', slug: 'lgbtq-support', description: 'Services for LGBTQ+ community' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Prisoner Reentry', slug: 'prisoner-reentry', description: 'Support for formerly incarcerated individuals' },

  // SOCIAL SUPPORT - COMPLIMENTARY Categories (Professional Helpers)
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Counseling Services', slug: 'counseling-services', description: 'Professional mental health counseling' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Social Work', slug: 'social-work', description: 'Professional case management and advocacy' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Legal Aid', slug: 'legal-aid-services', description: 'Free or low-cost legal assistance' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Financial Counseling', slug: 'financial-counseling', description: 'Budgeting and financial advice' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Addiction Counseling', slug: 'addiction-counseling', description: 'Substance abuse treatment and support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Therapy', slug: 'family-therapy', description: 'Counseling for families' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Marriage Counseling', slug: 'marriage-counseling', description: 'Relationship support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Grief Counseling', slug: 'grief-counseling', description: 'Support for loss and bereavement' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Trauma Counseling', slug: 'trauma-counseling', description: 'Support for trauma survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Rehabilitation Services', slug: 'rehabilitation-services', description: 'Physical and occupational therapy' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Speech Therapy', slug: 'speech-therapy', description: 'Communication disorder treatment' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Occupational Therapy', slug: 'occupational-therapy', description: 'Daily living skills support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Physiotherapy', slug: 'physiotherapy', description: 'Physical rehabilitation' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Nutritionists', slug: 'nutritionists', description: 'Dietary advice and planning' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Community Health Workers', slug: 'community-health-workers', description: 'Frontline health support' },

  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Art Therapy', slug: 'art-therapy', description: 'Therapeutic art programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Music Therapy', slug: 'music-therapy', description: 'Therapeutic music programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Animal Therapy', slug: 'animal-therapy', description: 'Therapy animal programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Meditation', slug: 'meditation', description: 'Mindfulness and meditation instruction' },
];


export const SUB_CATEGORIES = (rootIds: Record<string, string>) => [
  // ======================================================================
  // HOUSING - MAIN Subcategories (Property Types by bedrooms, features)
  // ======================================================================
  
  // Apartments Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Studio Apartments', slug: 'studio-apartments-sub', description: 'Open-plan studio apartments', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '1 Bedroom Apartments', slug: '1-bedroom-apartments', description: 'One-bedroom apartment units', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '2 Bedroom Apartments', slug: '2-bedroom-apartments', description: 'Two-bedroom apartment units', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '3 Bedroom Apartments', slug: '3-bedroom-apartments', description: 'Three-bedroom apartment units', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '4+ Bedroom Apartments', slug: '4-plus-bedroom-apartments', description: 'Four or more bedroom apartments', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Penthouse Apartments', slug: 'penthouse-apartments', description: 'Luxury top-floor apartments', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Garden Apartments', slug: 'garden-apartments', description: 'Ground-floor apartments with garden access', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Duplex Apartments', slug: 'duplex-apartments', description: 'Two-story apartment units', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Furnished Apartments', slug: 'furnished-apartments', description: 'Apartments with furniture included', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Unfurnished Apartments', slug: 'unfurnished-apartments', description: 'Apartments without furniture', parentId: rootIds['HOUSING:apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Serviced Apartments', slug: 'serviced-apartments-sub', description: 'Hotel-like serviced apartments', parentId: rootIds['HOUSING:serviced-apartments'] },
  
  // Houses Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: '2 Bedroom Houses', slug: '2-bedroom-houses', description: 'Two-bedroom houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '3 Bedroom Houses', slug: '3-bedroom-houses', description: 'Three-bedroom houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '4 Bedroom Houses', slug: '4-bedroom-houses', description: 'Four-bedroom houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '5 Bedroom Houses', slug: '5-bedroom-houses', description: 'Five-bedroom houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '6+ Bedroom Houses', slug: '6-plus-bedroom-houses', description: 'Six or more bedroom houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Modern Houses', slug: 'modern-houses', description: 'Contemporary style houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Traditional Houses', slug: 'traditional-houses', description: 'Classic and traditional houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Eco-friendly Houses', slug: 'eco-friendly-houses', description: 'Environmentally sustainable houses', parentId: rootIds['HOUSING:houses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Smart Homes', slug: 'smart-homes', description: 'Houses with automation technology', parentId: rootIds['HOUSING:houses'] },
  
  // Bedsitters & Studios Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Single Bedsitters', slug: 'single-bedsitters', description: 'Basic single-room units', parentId: rootIds['HOUSING:bedsitters'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bedsitters with Kitchen', slug: 'bedsitters-with-kitchen', description: 'Bedsitters with kitchen area', parentId: rootIds['HOUSING:bedsitters'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bedsitters with Bathroom', slug: 'bedsitters-with-bathroom', description: 'Bedsitters with private bathroom', parentId: rootIds['HOUSING:bedsitters'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Studio Apartments', slug: 'studio-apt-sub', description: 'Studio apartment units', parentId: rootIds['HOUSING:studio-apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Loft Studios', slug: 'loft-studios', description: 'Open-space loft apartments', parentId: rootIds['HOUSING:studio-apartments'] },
  
  // Commercial Spaces Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Retail Shops', slug: 'retail-shops', description: 'Shops and retail outlets', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Office Spaces', slug: 'office-spaces', description: 'Commercial office space', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Warehouses', slug: 'warehouses', description: 'Storage and industrial spaces', parentId: rootIds['HOUSING:warehouses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Restaurants', slug: 'restaurants', description: 'Restaurant premises', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Cafés', slug: 'cafes', description: 'Coffee shop and café spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Salons', slug: 'salons', description: 'Beauty salon and barbershop spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Gyms', slug: 'gyms', description: 'Fitness center spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Clinics', slug: 'clinics', description: 'Medical clinic spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Showrooms', slug: 'showrooms', description: 'Product display showrooms', parentId: rootIds['HOUSING:commercial-spaces'] },
  
  // Maisonettes Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: '2 Bedroom Maisonettes', slug: '2-bedroom-maisonettes', description: 'Two-bedroom maisonettes', parentId: rootIds['HOUSING:maisonettes'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '3 Bedroom Maisonettes', slug: '3-bedroom-maisonettes', description: 'Three-bedroom maisonettes', parentId: rootIds['HOUSING:maisonettes'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '4 Bedroom Maisonettes', slug: '4-bedroom-maisonettes', description: 'Four-bedroom maisonettes', parentId: rootIds['HOUSING:maisonettes'] },
  
  // Bungalows Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: '2 Bedroom Bungalows', slug: '2-bedroom-bungalows', description: 'Two-bedroom bungalows', parentId: rootIds['HOUSING:bungalows'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '3 Bedroom Bungalows', slug: '3-bedroom-bungalows', description: 'Three-bedroom bungalows', parentId: rootIds['HOUSING:bungalows'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '4 Bedroom Bungalows', slug: '4-bedroom-bungalows', description: 'Four-bedroom bungalows', parentId: rootIds['HOUSING:bungalows'] },
  
  // Townhouses Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'End Unit Townhouses', slug: 'end-unit-townhouses', description: 'Townhouses at the end of rows', parentId: rootIds['HOUSING:townhouses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Middle Unit Townhouses', slug: 'middle-unit-townhouses', description: 'Townhouses in the middle of rows', parentId: rootIds['HOUSING:townhouses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: '3 Story Townhouses', slug: '3-story-townhouses', description: 'Three-story townhouses', parentId: rootIds['HOUSING:townhouses'] },
  
  // Vacation Rentals Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Beach Houses', slug: 'beach-houses', description: 'Houses near the beach', parentId: rootIds['HOUSING:vacation-rentals'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Mountain Cabins', slug: 'mountain-cabins', description: 'Cabins in mountain areas', parentId: rootIds['HOUSING:vacation-rentals'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Lake Houses', slug: 'lake-houses', description: 'Houses near lakes', parentId: rootIds['HOUSING:vacation-rentals'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Safari Lodges', slug: 'safari-lodges', description: 'Accommodation in wildlife areas', parentId: rootIds['HOUSING:vacation-rentals'] },
  
  // Gated Communities Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Gated Apartment Complexes', slug: 'gated-apartment-complexes', description: 'Secure apartment communities', parentId: rootIds['HOUSING:gated-communities'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Gated Housing Estates', slug: 'gated-housing-estates', description: 'Secure residential estates', parentId: rootIds['HOUSING:gated-communities'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Golf Estates', slug: 'golf-estates', description: 'Gated communities with golf courses', parentId: rootIds['HOUSING:gated-communities'] },
  
  // Student Housing Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'University Dorms', slug: 'university-dorms', description: 'On-campus student housing', parentId: rootIds['HOUSING:student-housing'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Off-campus Student Apartments', slug: 'off-campus-student-apartments', description: 'Off-campus student accommodation', parentId: rootIds['HOUSING:student-housing'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Student Hostels', slug: 'student-hostels', description: 'Budget student accommodation', parentId: rootIds['HOUSING:student-housing'] },

  // ======================================================================
  // HOUSING - COMPLIMENTARY Subcategories (Service Providers)
  // ======================================================================
  
  // Construction & Renovation Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'General Contractors', slug: 'general-contractors', description: 'Overall construction management', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Builders', slug: 'home-builders', description: 'New home construction', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Renovation Specialists', slug: 'renovation-specialists', description: 'Home remodeling and updates', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Kitchen Remodeling', slug: 'kitchen-remodeling', description: 'Kitchen renovation', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Bathroom Remodeling', slug: 'bathroom-remodeling', description: 'Bathroom renovation', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Basement Finishing', slug: 'basement-finishing', description: 'Basement conversion', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Additions', slug: 'home-additions', description: 'Adding rooms or extensions', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Roofing Contractors', slug: 'roofing-contractors', description: 'Roof installation and repair', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Masonry', slug: 'masonry', description: 'Brick and stone work', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Concrete Work', slug: 'concrete-work', description: 'Concrete foundations and slabs', parentId: rootIds['HOUSING:construction-renovation'] },
  
  // Maintenance & Repairs Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Electricians', slug: 'electricians', description: 'Electrical repairs and installations', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Plumbers', slug: 'plumbers', description: 'Plumbing repairs and installations', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'HVAC Technicians', slug: 'hvac-technicians', description: 'Heating and cooling systems', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Carpenters', slug: 'carpenters', description: 'Woodwork and furniture repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Painters', slug: 'painters', description: 'Interior and exterior painting', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Flooring Specialists', slug: 'flooring-specialists', description: 'Floor installation and repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tilers', slug: 'tilers', description: 'Tile installation', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Glaziers', slug: 'glaziers', description: 'Glass and window repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Locksmiths', slug: 'locksmiths', description: 'Lock and security repairs', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Handyman Services', slug: 'handyman-services', description: 'General household repairs', parentId: rootIds['HOUSING:maintenance-repairs'] },
  
  // Cleaning Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'House Cleaning', slug: 'house-cleaning', description: 'Regular home cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Deep Cleaning', slug: 'deep-cleaning', description: 'Thorough cleaning services', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Move-in/Move-out Cleaning', slug: 'move-cleaning', description: 'Cleaning for moving', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Carpet Cleaning', slug: 'carpet-cleaning', description: 'Professional carpet cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Window Cleaning', slug: 'window-cleaning', description: 'Window washing services', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Office Cleaning', slug: 'office-cleaning', description: 'Commercial cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Post-Construction Cleaning', slug: 'post-construction-cleaning', description: 'Clean-up after construction', parentId: rootIds['HOUSING:cleaning-services'] },
  
  // Security Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Guards', slug: 'security-guards', description: 'On-site security personnel', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'CCTV Installation', slug: 'cctv-installation', description: 'Camera system installation', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Alarm Systems', slug: 'alarm-systems', description: 'Burglar alarm installation', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Access Control', slug: 'access-control', description: 'Gate and door access systems', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Electric Fences', slug: 'electric-fences', description: 'Perimeter security', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Consulting', slug: 'security-consulting', description: 'Security assessment and advice', parentId: rootIds['HOUSING:security-services'] },
  
  // Moving & Relocation Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Local Movers', slug: 'local-movers', description: 'Local moving services', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Long Distance Movers', slug: 'long-distance-movers', description: 'Inter-city moving', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Packing Services', slug: 'packing-services', description: 'Professional packing', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Storage Services', slug: 'storage-services', description: 'Moving and storage solutions', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Furniture Assembly', slug: 'furniture-assembly', description: 'Furniture setup after move', parentId: rootIds['HOUSING:moving-relocation'] },
  
  // Interior Design Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Interior Design', slug: 'residential-interior-design', description: 'Home interior design', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Interior Design', slug: 'commercial-interior-design', description: 'Office and business design', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Furniture Selection', slug: 'furniture-selection', description: 'Furniture sourcing and selection', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Color Consulting', slug: 'color-consulting', description: 'Paint and color advice', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Space Planning', slug: 'space-planning', description: 'Room layout and organization', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Staging', slug: 'home-staging', description: 'Preparing homes for sale', parentId: rootIds['HOUSING:interior-design'] },
  
  // Landscaping & Gardening Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Garden Design', slug: 'garden-design', description: 'Garden planning and design', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Lawn Care', slug: 'lawn-care', description: 'Lawn maintenance', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tree Services', slug: 'tree-services', description: 'Tree trimming and removal', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Irrigation Systems', slug: 'irrigation-systems', description: 'Sprinkler and watering systems', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Hardscaping', slug: 'hardscaping', description: 'Patios, walkways, and decks', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Outdoor Lighting', slug: 'outdoor-lighting', description: 'Garden and landscape lighting', parentId: rootIds['HOUSING:landscaping-gardening'] },
  
  // Pest Control Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'General Pest Control', slug: 'general-pest-control', description: 'Common household pests', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Termite Control', slug: 'termite-control', description: 'Termite treatment', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rodent Control', slug: 'rodent-control', description: 'Rat and mouse removal', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Bed Bug Treatment', slug: 'bed-bug-treatment', description: 'Bed bug extermination', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Fumigation Services', slug: 'fumigation-services', description: 'Whole-property fumigation', parentId: rootIds['HOUSING:pest-control'] },
  
  // Appliance Repair Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Refrigerator Repair', slug: 'refrigerator-repair', description: 'Fridge and freezer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Washing Machine Repair', slug: 'washing-machine-repair', description: 'Washer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Dryer Repair', slug: 'dryer-repair', description: 'Clothes dryer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Oven & Stove Repair', slug: 'oven-stove-repair', description: 'Cooking appliance repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Dishwasher Repair', slug: 'dishwasher-repair', description: 'Dishwasher repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Microwave Repair', slug: 'microwave-repair', description: 'Microwave oven repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Air Conditioner Repair', slug: 'ac-repair', description: 'AC and cooling repair', parentId: rootIds['HOUSING:appliance-repair'] },
  
  // Property Management Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rental Management', slug: 'rental-management', description: 'Managing rental properties', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tenant Screening', slug: 'tenant-screening', description: 'Background checks for tenants', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rent Collection', slug: 'rent-collection', description: 'Rent collection services', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Maintenance', slug: 'property-maintenance', description: 'Ongoing property upkeep', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Eviction Services', slug: 'eviction-services', description: 'Legal eviction process', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Lease Management', slug: 'lease-management', description: 'Lease agreement handling', parentId: rootIds['HOUSING:property-management'] },
  
  // Real Estate Agents Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Sales Agents', slug: 'residential-sales-agents', description: 'Home buying and selling', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rental Agents', slug: 'rental-agents', description: 'Property rental agents', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Agents', slug: 'commercial-agents', description: 'Commercial property agents', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Consultants', slug: 'property-consultants', description: 'Real estate advisory', parentId: rootIds['HOUSING:real-estate-agents'] },
  
  // Architects Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Architects', slug: 'residential-architects', description: 'Home design architects', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Architects', slug: 'commercial-architects', description: 'Business building design', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Landscape Architects', slug: 'landscape-architects', description: 'Outdoor space design', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Interior Architects', slug: 'interior-architects', description: 'Interior space planning', parentId: rootIds['HOUSING:architects'] },

  // ======================================================================
  // JOBS - COMPLIMENTARY Subcategories (Career Support Services)
  // ======================================================================
  
  // Career Coaching Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Planning', slug: 'career-planning', description: 'Long-term career strategy', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Change Guidance', slug: 'career-change-guidance', description: 'Switching careers', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Coaching', slug: 'executive-coaching', description: 'Leadership development', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Graduate Coaching', slug: 'graduate-coaching', description: 'Support for new graduates', parentId: rootIds['JOBS:career-coaching'] },
  
  // CV Writing Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Professional CV Writing', slug: 'professional-cv-writing', description: 'Expert resume creation', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'CV Makeover', slug: 'cv-makeover', description: 'Resume refresh', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Cover Letter Writing', slug: 'cover-letter-writing', description: 'Custom cover letters', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'LinkedIn Profile Writing', slug: 'linkedin-profile-writing', description: 'Professional profile creation', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Portfolio Development', slug: 'portfolio-development', description: 'Work portfolio creation', parentId: rootIds['JOBS:cv-writing'] },
  
  // Interview Preparation Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Mock Interviews', slug: 'mock-interviews', description: 'Practice interviews', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Interview Coaching', slug: 'interview-coaching', description: 'One-on-one interview training', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Technical Interview Prep', slug: 'technical-interview-prep', description: 'Coding and technical interviews', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Behavioral Interview Prep', slug: 'behavioral-interview-prep', description: 'Soft skills interview practice', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Salary Negotiation', slug: 'salary-negotiation', description: 'Negotiation skills training', parentId: rootIds['JOBS:interview-preparation'] },
  
  // Recruitment Agencies Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'IT Recruitment', slug: 'it-recruitment', description: 'Tech industry placement', parentId: rootIds['JOBS:recruitment-agencies'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Finance Recruitment', slug: 'finance-recruitment', description: 'Finance sector placement', parentId: rootIds['JOBS:recruitment-agencies'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Healthcare Recruitment', slug: 'healthcare-recruitment', description: 'Medical staff placement', parentId: rootIds['JOBS:recruitment-agencies'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Search', slug: 'executive-search', description: 'Senior leadership placement', parentId: rootIds['JOBS:recruitment-agencies'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Temporary Staffing', slug: 'temporary-staffing', description: 'Short-term placements', parentId: rootIds['JOBS:recruitment-agencies'] },
  
  // Skills Training Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Leadership Training', slug: 'leadership-training', description: 'Management skills development', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Communication Skills', slug: 'communication-skills', description: 'Verbal and written communication', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Time Management', slug: 'time-management', description: 'Productivity training', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Project Management', slug: 'project-management-training', description: 'Project management skills', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Team Building', slug: 'team-building', description: 'Collaboration training', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Negotiation Skills', slug: 'negotiation-skills', description: 'Negotiation training', parentId: rootIds['JOBS:skills-training'] },
  
  // LinkedIn Optimization Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Profile Optimization', slug: 'profile-optimization', description: 'LinkedIn profile enhancement', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Networking Strategies', slug: 'networking-strategies', description: 'Professional networking', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Content Creation', slug: 'linkedin-content', description: 'LinkedIn content strategy', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Personal Branding', slug: 'personal-branding', description: 'Brand development', parentId: rootIds['JOBS:linkedin-optimization'] },
  
  // Job Search Assistance Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Search Strategy', slug: 'job-search-strategy', description: 'Job hunting techniques', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Company Research', slug: 'company-research', description: 'Employer research assistance', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Application Tracking', slug: 'application-tracking', description: 'Managing job applications', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Follow-up Strategies', slug: 'follow-up-strategies', description: 'Post-application follow-up', parentId: rootIds['JOBS:job-search-assistance'] },
  
  // Career Assessment Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Aptitude Testing', slug: 'aptitude-testing', description: 'Skills and abilities assessment', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Personality Assessment', slug: 'personality-assessment', description: 'Career personality tests', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Skills Gap Analysis', slug: 'skills-gap-analysis', description: 'Identifying training needs', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Fit Assessment', slug: 'career-fit-assessment', description: 'Career matching', parentId: rootIds['JOBS:career-assessment'] },

  // ======================================================================
  // SOCIAL SUPPORT - COMPLIMENTARY Subcategories (Professional Helpers)
  // ======================================================================
  
  // Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Individual Counseling', slug: 'individual-counseling', description: 'One-on-one therapy', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Group Counseling', slug: 'group-counseling', description: 'Therapy groups', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Online Counseling', slug: 'online-counseling', description: 'Virtual therapy sessions', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Crisis Counseling', slug: 'crisis-counseling', description: 'Emergency mental health support', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  
  // Family Therapy Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Counseling', slug: 'family-counseling', description: 'Therapy for families', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Parenting Support', slug: 'parenting-support', description: 'Parenting guidance', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Counseling', slug: 'child-counseling', description: 'Therapy for children', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Adolescent Counseling', slug: 'adolescent-counseling', description: 'Teen therapy', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  
  // Marriage Counseling Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Couples Counseling', slug: 'couples-counseling', description: 'Relationship therapy', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Pre-marital Counseling', slug: 'pre-marital-counseling', description: 'Preparation for marriage', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Divorce Counseling', slug: 'divorce-counseling', description: 'Support through separation', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  
  // Grief Counseling Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Bereavement Support', slug: 'bereavement-support', description: 'Loss of loved one', parentId: rootIds['SOCIAL_SUPPORT:grief-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Loss Counseling', slug: 'loss-counseling', description: 'Coping with loss', parentId: rootIds['SOCIAL_SUPPORT:grief-counseling'] },
  
  // Trauma Counseling Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'PTSD Counseling', slug: 'ptsd-counseling', description: 'Trauma recovery', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Abuse Survivors', slug: 'abuse-survivors', description: 'Support for abuse survivors', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Accident Trauma', slug: 'accident-trauma', description: 'Post-accident support', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  
  // Addiction Counseling Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Alcohol Addiction', slug: 'alcohol-addiction', description: 'Alcohol abuse counseling', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Drug Addiction', slug: 'drug-addiction', description: 'Substance abuse counseling', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Gambling Addiction', slug: 'gambling-addiction', description: 'Problem gambling support', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Recovery Coaching', slug: 'recovery-coaching', description: 'Ongoing recovery support', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  
  // Social Work Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Case Management', slug: 'case-management', description: 'Coordinated care planning', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Welfare', slug: 'child-welfare', description: 'Child protection services', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Foster Care Support', slug: 'foster-care-support', description: 'Foster family assistance', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Adoption Services', slug: 'adoption-services', description: 'Adoption support', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  
  // Legal Aid Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Law', slug: 'family-law', description: 'Divorce, custody, support', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Housing Law', slug: 'housing-law', description: 'Tenant rights, eviction', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Immigration Law', slug: 'immigration-law', description: 'Visas, asylum, citizenship', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Employment Law', slug: 'employment-law', description: 'Workplace rights', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Criminal Law', slug: 'criminal-law', description: 'Legal defense', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  
  // Financial Counseling Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Budgeting Help', slug: 'budgeting-help', description: 'Personal budgeting', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Debt Management', slug: 'debt-management', description: 'Debt reduction strategies', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Savings Planning', slug: 'savings-planning', description: 'Building savings', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Credit Repair', slug: 'credit-repair', description: 'Credit score improvement', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Banking Assistance', slug: 'banking-assistance', description: 'Financial system navigation', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  
  // Rehabilitation Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Physical Therapy', slug: 'physical-therapy', description: 'Physical rehabilitation', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Occupational Therapy', slug: 'occupational-therapy', description: 'Daily living skills', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Speech Therapy', slug: 'speech-therapy', description: 'Communication therapy', parentId: rootIds['SOCIAL_SUPPORT:speech-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Vocational Rehabilitation', slug: 'vocational-rehabilitation', description: 'Work readiness', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  
  // Physiotherapy Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Sports Physiotherapy', slug: 'sports-physiotherapy', description: 'Sports injury recovery', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Orthopedic Physiotherapy', slug: 'orthopedic-physiotherapy', description: 'Bone and joint therapy', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Neurological Physiotherapy', slug: 'neurological-physiotherapy', description: 'Nerve and brain rehabilitation', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Pediatric Physiotherapy', slug: 'pediatric-physiotherapy', description: 'Children\'s physical therapy', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Geriatric Physiotherapy', slug: 'geriatric-physiotherapy', description: 'Elderly physical therapy', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  
  // Nutritionists Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Dietary Planning', slug: 'dietary-planning', description: 'Personal meal plans', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Weight Management', slug: 'weight-management', description: 'Healthy weight programs', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Medical Nutrition', slug: 'medical-nutrition', description: 'Diet for health conditions', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Sports Nutrition', slug: 'sports-nutrition', description: 'Athlete dietary advice', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Nutrition', slug: 'child-nutrition', description: 'Healthy eating for kids', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  
  // Community Health Workers Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Home Health Aides', slug: 'home-health-aides', description: 'In-home care assistance', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Health Education', slug: 'health-education', description: 'Community health teaching', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Outreach Workers', slug: 'outreach-workers', description: 'Community engagement', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Patient Navigation', slug: 'patient-navigation', description: 'Healthcare system guidance', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  
  // Youth Mentors Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Academic Mentoring', slug: 'academic-mentoring', description: 'School support for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Life Skills Mentoring', slug: 'life-skills-mentoring', description: 'Practical skills for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Career Mentoring', slug: 'career-mentoring', description: 'Career guidance for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'At-risk Youth Programs', slug: 'at-risk-youth-programs', description: 'Support for vulnerable youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  
  // Disability Support Workers Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Personal Care Assistants', slug: 'personal-care-assistants', description: 'Daily living assistance', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Mobility Assistance', slug: 'mobility-assistance', description: 'Movement support', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Communication Support', slug: 'communication-support', description: 'Assistive communication', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Independent Living Skills', slug: 'independent-living-skills', description: 'Self-sufficiency training', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  
  // Elder Care Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Companion Care', slug: 'companion-care', description: 'Social support for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Personal Care for Seniors', slug: 'personal-care-seniors', description: 'Daily assistance for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Memory Care', slug: 'memory-care', description: 'Dementia and Alzheimer\'s support', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Respite Care', slug: 'respite-care', description: 'Temporary caregiver relief', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Senior Transportation', slug: 'senior-transportation', description: 'Transport for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
];