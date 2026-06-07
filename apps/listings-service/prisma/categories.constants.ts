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
  
  // HOUSING - COMPLIMENTARY Categories (Professional Services)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Construction & Renovation Services', slug: 'construction-renovation', description: 'Building, remodeling, and renovation services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Maintenance & Repair Services', slug: 'maintenance-repairs', description: 'Electrical, plumbing, and general household repairs' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Cleaning Services', slug: 'cleaning-services', description: 'Professional cleaning for homes and offices' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Services', slug: 'security-services', description: 'Security systems, guards, and surveillance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Moving & Relocation Services', slug: 'moving-relocation', description: 'Moving companies and relocation assistance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Interior Design Services', slug: 'interior-design', description: 'Home decoration and space planning' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Landscaping & Gardening Services', slug: 'landscaping-gardening', description: 'Garden design, lawn care, and outdoor maintenance' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Pest Control Services', slug: 'pest-control', description: 'Extermination and pest management services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Inspection Services', slug: 'home-inspections', description: 'Pre-purchase and pre-rental property inspections' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Management Services', slug: 'property-management', description: 'Professional management of rental properties' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Real Estate Agency Services', slug: 'real-estate-agents', description: 'Professional property sales and rental agents' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Valuation Services', slug: 'property-valuers', description: 'Professional property valuation services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Architecture & Design Services', slug: 'architects', description: 'Building design and planning services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Quantity Surveying Services', slug: 'quantity-surveyors', description: 'Construction cost estimation and management' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Structural Engineering Services', slug: 'structural-engineers', description: 'Building structure analysis and design' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Geotechnical Engineering Services', slug: 'geotechnical-engineers', description: 'Soil testing and foundation analysis' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Environmental Consulting Services', slug: 'environmental-consultants', description: 'Environmental impact assessments' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Automation Services', slug: 'home-automation', description: 'Smart home installation and setup' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Solar Installation Services', slug: 'solar-installation', description: 'Solar panel installation' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Waterproofing Services', slug: 'waterproofing', description: 'Basement and roof waterproofing' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Appliance Repair Services', slug: 'appliance-repair', description: 'Repair of household appliances' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Waste Management Services', slug: 'waste-management', description: 'Garbage collection and disposal' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'HVAC Services', slug: 'hvac-services', description: 'Heating, ventilation, and air conditioning' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Logistics & Courier Services', slug: 'logistics-courier', description: 'Delivery, freight, and moving services' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Agriculture & Farming Services', slug: 'agriculture-farming', description: 'Crop, livestock, and farm management' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Event Planning Services', slug: 'event-planning', description: 'Weddings, conferences, parties at venues' },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Automotive Services', slug: 'automotive', description: 'Car repair, towing, and detailing' },

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

  // General & Informal
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
  
  // Skilled Trades (These are job SEEKERS, not services)
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

  // Creative
  { vertical: 'JOBS', type: 'MAIN', name: 'Graphic Design', slug: 'graphic-design', description: 'Visual communication and design' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Photography', slug: 'photography', description: 'Professional photography services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Videography', slug: 'videography', description: 'Video production and editing' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Translation', slug: 'translation', description: 'Language translation services' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Research', slug: 'research', description: 'Academic and market research' },
  { vertical: 'JOBS', type: 'MAIN', name: 'Architecture', slug: 'architecture', description: 'Architectural design and planning' },

  // JOBS - COMPLIMENTARY Categories (Career Support Services)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Coaching Services', slug: 'career-coaching', description: 'Professional career guidance and planning' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'CV Writing Services', slug: 'cv-writing', description: 'Professional resume and CV preparation' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Interview Preparation Services', slug: 'interview-preparation', description: 'Interview coaching and practice' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Recruitment Services', slug: 'recruitment-agencies-main', description: 'Professional placement services' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Skills Training Services', slug: 'skills-training', description: 'Professional skills development programs' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'LinkedIn Optimization Services', slug: 'linkedin-optimization', description: 'Profile enhancement and personal branding' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Search Assistance Services', slug: 'job-search-assistance', description: 'Job hunting strategies and support' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Assessment Services', slug: 'career-assessment', description: 'Aptitude and career fit testing' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Search Services', slug: 'executive-search', description: 'Headhunting for senior positions' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Outplacement Services', slug: 'outplacement-services', description: 'Support for displaced workers' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Networking Event Services', slug: 'networking-events', description: 'Professional networking opportunities' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Fair Services', slug: 'job-fairs', description: 'Career fair organizers' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'IT & Digital Services', slug: 'it-digital-services', description: 'Software, web, and tech support services' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Media & Creative Services', slug: 'media-creative', description: 'Photography, video, and content creation' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Beauty & Wellness Services', slug: 'beauty-wellness', description: 'Salons, spas, and personal care services' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Legal & Compliance Services', slug: 'legal-compliance', description: 'Legal and regulatory services' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Accounting & Tax Services', slug: 'accounting-tax', description: 'Bookkeeping, tax filing, auditing' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Tutoring & Academic Support', slug: 'tutoring-academic', description: 'Home tutors and exam prep' },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Printing & Stationery Services', slug: 'printing-stationery', description: 'Banners, documents, business cards' },

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
  
  // Vulnerable Populations
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Refugee Support', slug: 'refugee-support', description: 'Assistance for refugees and asylum seekers' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Human Trafficking Victims', slug: 'human-trafficking-victims', description: 'Support for trafficking survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Domestic Violence', slug: 'domestic-violence', description: 'Support for domestic abuse survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'LGBTQ+ Support', slug: 'lgbtq-support', description: 'Services for LGBTQ+ community' },
  { vertical: 'SOCIAL_SUPPORT', type: 'MAIN', name: 'Prisoner Reentry', slug: 'prisoner-reentry', description: 'Support for formerly incarcerated individuals' },

  // SOCIAL SUPPORT - COMPLIMENTARY Categories (Professional Helpers)
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Counseling & Therapy Services', slug: 'counseling-services', description: 'Professional mental health counseling' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Social Work Services', slug: 'social-work', description: 'Professional case management and advocacy' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Legal Aid Services', slug: 'legal-aid-services', description: 'Free or low-cost legal assistance' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Financial Counseling Services', slug: 'financial-counseling', description: 'Budgeting and financial advice' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Addiction Counseling Services', slug: 'addiction-counseling', description: 'Substance abuse treatment and support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Therapy Services', slug: 'family-therapy', description: 'Counseling for families' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Marriage Counseling Services', slug: 'marriage-counseling', description: 'Relationship support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Grief Counseling Services', slug: 'grief-counseling', description: 'Support for loss and bereavement' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Trauma Counseling Services', slug: 'trauma-counseling', description: 'Support for trauma survivors' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Rehabilitation Services', slug: 'rehabilitation-services', description: 'Physical and occupational therapy' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Speech Therapy Services', slug: 'speech-therapy', description: 'Communication disorder treatment' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Occupational Therapy Services', slug: 'occupational-therapy', description: 'Daily living skills support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Physiotherapy Services', slug: 'physiotherapy', description: 'Physical rehabilitation' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Nutrition & Dietetics Services', slug: 'nutritionists', description: 'Dietary advice and planning' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Community Health Services', slug: 'community-health-workers', description: 'Frontline health support' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Art Therapy Services', slug: 'art-therapy', description: 'Therapeutic art programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Music Therapy Services', slug: 'music-therapy', description: 'Therapeutic music programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Animal Therapy Services', slug: 'animal-therapy', description: 'Therapy animal programs' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Meditation & Mindfulness Services', slug: 'meditation', description: 'Mindfulness and meditation instruction' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Disability Support Services', slug: 'disability-support', description: 'Support for persons with disabilities' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Elder Care Services', slug: 'elder-care', description: 'Support for senior citizens' },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Youth Mentoring Services', slug: 'youth-mentors', description: 'Guidance and support for young people' },

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
  
  // Bedsitters Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Single Bedsitters', slug: 'single-bedsitters', description: 'Basic single-room units', parentId: rootIds['HOUSING:bedsitters'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bedsitters with Kitchen', slug: 'bedsitters-with-kitchen', description: 'Bedsitters with kitchen area', parentId: rootIds['HOUSING:bedsitters'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Bedsitters with Bathroom', slug: 'bedsitters-with-bathroom', description: 'Bedsitters with private bathroom', parentId: rootIds['HOUSING:bedsitters'] },
  
  // Studio Apartments Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Compact Studios', slug: 'compact-studios', description: 'Small efficient studio units', parentId: rootIds['HOUSING:studio-apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Loft Studios', slug: 'loft-studios', description: 'Open-space loft apartments', parentId: rootIds['HOUSING:studio-apartments'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Executive Studios', slug: 'executive-studios', description: 'Premium studio apartments', parentId: rootIds['HOUSING:studio-apartments'] },
  
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
  
  // Commercial Spaces Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Retail Shops', slug: 'retail-shops', description: 'Shops and retail outlets', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Office Spaces', slug: 'office-spaces', description: 'Commercial office space', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Restaurants', slug: 'restaurants-commercial', description: 'Restaurant premises', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Cafés', slug: 'cafes-commercial', description: 'Coffee shop and café spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Salons', slug: 'salons-commercial', description: 'Beauty salon and barbershop spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Gyms', slug: 'gyms-commercial', description: 'Fitness center spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Clinics', slug: 'clinics-commercial', description: 'Medical clinic spaces', parentId: rootIds['HOUSING:commercial-spaces'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Showrooms', slug: 'showrooms', description: 'Product display showrooms', parentId: rootIds['HOUSING:commercial-spaces'] },
  
  // Warehouses Subcategories
  { vertical: 'HOUSING', type: 'MAIN', name: 'Storage Warehouses', slug: 'storage-warehouses', description: 'General storage facilities', parentId: rootIds['HOUSING:warehouses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Cold Storage', slug: 'cold-storage', description: 'Refrigerated warehouse space', parentId: rootIds['HOUSING:warehouses'] },
  { vertical: 'HOUSING', type: 'MAIN', name: 'Industrial Warehouses', slug: 'industrial-warehouses', description: 'Heavy industrial storage', parentId: rootIds['HOUSING:warehouses'] },
  
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
  
  // Maintenance & Repair Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Electrical Services', slug: 'electrical-services', description: 'Wiring, repairs, installations, and fault finding', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Plumbing Services', slug: 'plumbing-services', description: 'Pipe fitting, leak repairs, bathroom installations', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Carpentry Services', slug: 'carpentry-services', description: 'Woodwork, furniture repair, custom builds', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Painting Services', slug: 'painting-services', description: 'Interior and exterior painting', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Flooring Services', slug: 'flooring-services', description: 'Floor installation and repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tiling Services', slug: 'tiling-services', description: 'Tile installation and repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Glass & Window Services', slug: 'glass-window-services', description: 'Glass repair, window installation', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Locksmith Services', slug: 'locksmith-services', description: 'Lock repair, key cutting, security upgrades', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Handyman Services', slug: 'handyman-services', description: 'General household repairs and odd jobs', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Roofing Repair Services', slug: 'roofing-repair-services', description: 'Roof leak repair and maintenance', parentId: rootIds['HOUSING:maintenance-repairs'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Fence & Gate Repair Services', slug: 'fence-gate-repair', description: 'Fence and gate installation and repair', parentId: rootIds['HOUSING:maintenance-repairs'] },
  
  // Cleaning Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'House Cleaning Services', slug: 'house-cleaning', description: 'Regular home cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Deep Cleaning Services', slug: 'deep-cleaning', description: 'Thorough cleaning services', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Move-in/Move-out Cleaning', slug: 'move-cleaning', description: 'Cleaning for moving', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Carpet Cleaning Services', slug: 'carpet-cleaning', description: 'Professional carpet cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Window Cleaning Services', slug: 'window-cleaning', description: 'Window washing services', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Office Cleaning Services', slug: 'office-cleaning', description: 'Commercial cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Post-Construction Cleaning', slug: 'post-construction-cleaning', description: 'Clean-up after construction', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Sofa & Upholstery Cleaning', slug: 'upholstery-cleaning', description: 'Furniture and fabric cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Mattress Cleaning Services', slug: 'mattress-cleaning', description: 'Mattress deep cleaning', parentId: rootIds['HOUSING:cleaning-services'] },
  
  // Security Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Guard Services', slug: 'security-guards', description: 'On-site security personnel', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'CCTV Installation Services', slug: 'cctv-installation', description: 'Camera system installation', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Alarm System Services', slug: 'alarm-systems', description: 'Burglar alarm installation', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Access Control Services', slug: 'access-control', description: 'Gate and door access systems', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Electric Fence Services', slug: 'electric-fences', description: 'Perimeter security', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Security Consulting Services', slug: 'security-consulting', description: 'Security assessment and advice', parentId: rootIds['HOUSING:security-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Boarding & Detection Services', slug: 'boarding-detection', description: 'Sniffer dogs and detection services', parentId: rootIds['HOUSING:security-services'] },
  
  // Moving & Relocation Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Local Moving Services', slug: 'local-movers', description: 'Local moving services', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Long Distance Moving Services', slug: 'long-distance-movers', description: 'Inter-city moving', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Packing Services', slug: 'packing-services', description: 'Professional packing', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Storage Services', slug: 'storage-services', description: 'Moving and storage solutions', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Furniture Assembly Services', slug: 'furniture-assembly', description: 'Furniture setup after move', parentId: rootIds['HOUSING:moving-relocation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Office Relocation Services', slug: 'office-relocation', description: 'Corporate moving services', parentId: rootIds['HOUSING:moving-relocation'] },
  
  // Construction & Renovation Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'General Contracting Services', slug: 'general-contractors', description: 'Overall construction management', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Building Services', slug: 'home-builders', description: 'New home construction', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Renovation Services', slug: 'renovation-specialists', description: 'Home remodeling and updates', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Kitchen Remodeling Services', slug: 'kitchen-remodeling', description: 'Kitchen renovation', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Bathroom Remodeling Services', slug: 'bathroom-remodeling', description: 'Bathroom renovation', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Basement Finishing Services', slug: 'basement-finishing', description: 'Basement conversion', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Addition Services', slug: 'home-additions', description: 'Adding rooms or extensions', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Roofing Installation Services', slug: 'roofing-installation', description: 'New roof installation', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Masonry Services', slug: 'masonry', description: 'Brick and stone work', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Concrete Services', slug: 'concrete-work', description: 'Concrete foundations and slabs', parentId: rootIds['HOUSING:construction-renovation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Demolition Services', slug: 'demolition', description: 'Safe building demolition', parentId: rootIds['HOUSING:construction-renovation'] },
  
  // Interior Design Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Interior Design', slug: 'residential-interior-design', description: 'Home interior design', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Interior Design', slug: 'commercial-interior-design', description: 'Office and business design', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Furniture Selection Services', slug: 'furniture-selection', description: 'Furniture sourcing and selection', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Color Consulting Services', slug: 'color-consulting', description: 'Paint and color advice', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Space Planning Services', slug: 'space-planning', description: 'Room layout and organization', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Home Staging Services', slug: 'home-staging', description: 'Preparing homes for sale', parentId: rootIds['HOUSING:interior-design'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Curtain & Blinds Services', slug: 'curtain-blinds', description: 'Custom curtain and blind installation', parentId: rootIds['HOUSING:interior-design'] },
  
  // Landscaping & Gardening Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Garden Design Services', slug: 'garden-design', description: 'Garden planning and design', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Lawn Care Services', slug: 'lawn-care', description: 'Lawn maintenance', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tree Services', slug: 'tree-services', description: 'Tree trimming and removal', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Irrigation System Services', slug: 'irrigation-systems', description: 'Sprinkler and watering systems', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Hardscaping Services', slug: 'hardscaping', description: 'Patios, walkways, and decks', parentId: rootIds['HOUSING:landscaping-gardening'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Outdoor Lighting Services', slug: 'outdoor-lighting', description: 'Garden and landscape lighting', parentId: rootIds['HOUSING:landscaping-gardening'] },
  
  // Pest Control Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'General Pest Control', slug: 'general-pest-control', description: 'Common household pests', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Termite Control Services', slug: 'termite-control', description: 'Termite treatment', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rodent Control Services', slug: 'rodent-control', description: 'Rat and mouse removal', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Bed Bug Treatment Services', slug: 'bed-bug-treatment', description: 'Bed bug extermination', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Fumigation Services', slug: 'fumigation-services', description: 'Whole-property fumigation', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Mosquito Control Services', slug: 'mosquito-control', description: 'Mosquito fogging and prevention', parentId: rootIds['HOUSING:pest-control'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Bird Control Services', slug: 'bird-control', description: 'Pigeon and bird management', parentId: rootIds['HOUSING:pest-control'] },
  
  // Appliance Repair Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Refrigerator Repair Services', slug: 'refrigerator-repair', description: 'Fridge and freezer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Washing Machine Repair Services', slug: 'washing-machine-repair', description: 'Washer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Dryer Repair Services', slug: 'dryer-repair', description: 'Clothes dryer repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Oven & Stove Repair Services', slug: 'oven-stove-repair', description: 'Cooking appliance repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Dishwasher Repair Services', slug: 'dishwasher-repair', description: 'Dishwasher repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Microwave Repair Services', slug: 'microwave-repair', description: 'Microwave oven repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Air Conditioner Repair Services', slug: 'ac-repair', description: 'AC and cooling repair', parentId: rootIds['HOUSING:appliance-repair'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'TV & Electronics Repair', slug: 'tv-electronics-repair', description: 'Television and electronic repair', parentId: rootIds['HOUSING:appliance-repair'] },
  
  // Property Management Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rental Management Services', slug: 'rental-management', description: 'Managing rental properties', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Tenant Screening Services', slug: 'tenant-screening', description: 'Background checks for tenants', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rent Collection Services', slug: 'rent-collection', description: 'Rent collection services', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Maintenance Services', slug: 'property-maintenance', description: 'Ongoing property upkeep', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Eviction Services', slug: 'eviction-services', description: 'Legal eviction process', parentId: rootIds['HOUSING:property-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Lease Management Services', slug: 'lease-management', description: 'Lease agreement handling', parentId: rootIds['HOUSING:property-management'] },
  
  // Real Estate Agency Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Sales Agents', slug: 'residential-sales-agents', description: 'Home buying and selling', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Rental Agents', slug: 'rental-agents', description: 'Property rental agents', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Agents', slug: 'commercial-agents', description: 'Commercial property agents', parentId: rootIds['HOUSING:real-estate-agents'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Property Consultants', slug: 'property-consultants', description: 'Real estate advisory', parentId: rootIds['HOUSING:real-estate-agents'] },
  
  // Architecture & Design Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Architects', slug: 'residential-architects', description: 'Home design architects', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Architects', slug: 'commercial-architects', description: 'Business building design', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Landscape Architects', slug: 'landscape-architects', description: 'Outdoor space design', parentId: rootIds['HOUSING:architects'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Interior Architects', slug: 'interior-architects', description: 'Interior space planning', parentId: rootIds['HOUSING:architects'] },
  
  // Home Automation Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Smart Home Installation', slug: 'smart-home-installation', description: 'Complete smart home setup', parentId: rootIds['HOUSING:home-automation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Smart Lighting Services', slug: 'smart-lighting', description: 'Automated lighting systems', parentId: rootIds['HOUSING:home-automation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Smart Security Systems', slug: 'smart-security', description: 'Integrated security solutions', parentId: rootIds['HOUSING:home-automation'] },
  
  // Solar Installation Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Solar Installation', slug: 'residential-solar', description: 'Home solar panel installation', parentId: rootIds['HOUSING:solar-installation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Solar Installation', slug: 'commercial-solar', description: 'Business solar solutions', parentId: rootIds['HOUSING:solar-installation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Solar Water Heating', slug: 'solar-water-heating', description: 'Solar water heater installation', parentId: rootIds['HOUSING:solar-installation'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Solar Maintenance Services', slug: 'solar-maintenance', description: 'Solar panel cleaning and repair', parentId: rootIds['HOUSING:solar-installation'] },
  
  // HVAC Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'AC Installation Services', slug: 'ac-installation', description: 'Air conditioner installation', parentId: rootIds['HOUSING:hvac-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'AC Repair Services', slug: 'ac-repair-hvac', description: 'Air conditioner repair', parentId: rootIds['HOUSING:hvac-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'AC Maintenance Services', slug: 'ac-maintenance', description: 'Regular AC servicing', parentId: rootIds['HOUSING:hvac-services'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Ventilation Services', slug: 'ventilation-services', description: 'Ventilation system installation', parentId: rootIds['HOUSING:hvac-services'] },
  
  // Waste Management Services Subcategories
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Residential Waste Collection', slug: 'residential-waste', description: 'Home garbage collection', parentId: rootIds['HOUSING:waste-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Commercial Waste Collection', slug: 'commercial-waste', description: 'Business waste management', parentId: rootIds['HOUSING:waste-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Recycling Services', slug: 'recycling-services', description: 'Waste recycling pickup', parentId: rootIds['HOUSING:waste-management'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Skip Bin Hire', slug: 'skip-bin-hire', description: 'Bin rental for large waste', parentId: rootIds['HOUSING:waste-management'] },

    // Logistics & Courier Services Subcategories (under HOUSING)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Same-Day Delivery Services', slug: 'same-day-delivery', description: 'Urgent local delivery', parentId: rootIds['HOUSING:logistics-courier'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Next-Day Delivery', slug: 'next-day-delivery', description: '24-hour delivery service', parentId: rootIds['HOUSING:logistics-courier'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Freight & Cargo Services', slug: 'freight-cargo', description: 'Large shipment transport', parentId: rootIds['HOUSING:logistics-courier'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Warehousing & Fulfillment', slug: 'warehousing-fulfillment', description: 'Storage and order fulfillment', parentId: rootIds['HOUSING:logistics-courier'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Motorcycle Courier Services', slug: 'boda-courier', description: 'Boda boda delivery services', parentId: rootIds['HOUSING:logistics-courier'] },

  // Agriculture & Farming Services Subcategories (under HOUSING)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Crop Spraying Services', slug: 'crop-spraying', description: 'Pesticide and fertilizer application', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Farm Mechanization', slug: 'farm-mechanization', description: 'Tractor and equipment rental', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Irrigation Installation', slug: 'irrigation-installation', description: 'Farm irrigation systems', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Soil Testing Services', slug: 'soil-testing', description: 'Soil analysis and recommendations', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Veterinary Services', slug: 'veterinary', description: 'Animal health care', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Poultry Services', slug: 'poultry-services', description: 'Chicken farming support', parentId: rootIds['HOUSING:agriculture-farming'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Greenhouse Installation', slug: 'greenhouse-installation', description: 'Greenhouse setup and maintenance', parentId: rootIds['HOUSING:agriculture-farming'] },

  // Event Planning Services Subcategories (under HOUSING)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Wedding Planning', slug: 'wedding-planning', description: 'Full wedding coordination', parentId: rootIds['HOUSING:event-planning'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Corporate Event Planning', slug: 'corporate-events', description: 'Conferences and business events', parentId: rootIds['HOUSING:event-planning'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Party Planning', slug: 'party-planning', description: 'Birthday and private parties', parentId: rootIds['HOUSING:event-planning'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Catering Services', slug: 'catering', description: 'Event food and beverage', parentId: rootIds['HOUSING:event-planning'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Decor & Styling', slug: 'event-decor', description: 'Event decoration services', parentId: rootIds['HOUSING:event-planning'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'DJ & Entertainment', slug: 'dj-entertainment', description: 'Music and event entertainment', parentId: rootIds['HOUSING:event-planning'] },

  // Automotive Services Subcategories (under HOUSING)
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Car Repair & Maintenance', slug: 'car-repair', description: 'General auto repair', parentId: rootIds['HOUSING:automotive'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Car Wash & Detailing', slug: 'car-wash', description: 'Exterior and interior cleaning', parentId: rootIds['HOUSING:automotive'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Towing Services', slug: 'towing', description: 'Emergency vehicle towing', parentId: rootIds['HOUSING:automotive'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Auto Electrical Services', slug: 'auto-electrical', description: 'Vehicle electrical systems', parentId: rootIds['HOUSING:automotive'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Car Paint & Body Work', slug: 'auto-body', description: 'Respray and dent repair', parentId: rootIds['HOUSING:automotive'] },
  { vertical: 'HOUSING', type: 'COMPLIMENTARY', name: 'Boda Boda Repair', slug: 'boda-repair', description: 'Motorcycle repair services', parentId: rootIds['HOUSING:automotive'] },

  // ======================================================================
  // JOBS - COMPLIMENTARY Subcategories (Career Support Services)
  // ======================================================================
  
  // Career Coaching Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Planning Services', slug: 'career-planning', description: 'Long-term career strategy', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Change Services', slug: 'career-change-guidance', description: 'Switching careers', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Coaching Services', slug: 'executive-coaching', description: 'Leadership development', parentId: rootIds['JOBS:career-coaching'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Graduate Coaching Services', slug: 'graduate-coaching', description: 'Support for new graduates', parentId: rootIds['JOBS:career-coaching'] },
  
  // CV Writing Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Professional CV Writing', slug: 'professional-cv-writing', description: 'Expert resume creation', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'CV Makeover Services', slug: 'cv-makeover', description: 'Resume refresh', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Cover Letter Writing', slug: 'cover-letter-writing', description: 'Custom cover letters', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'LinkedIn Profile Writing', slug: 'linkedin-profile-writing', description: 'Professional profile creation', parentId: rootIds['JOBS:cv-writing'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Portfolio Development Services', slug: 'portfolio-development', description: 'Work portfolio creation', parentId: rootIds['JOBS:cv-writing'] },
  
  // Interview Preparation Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Mock Interview Services', slug: 'mock-interviews', description: 'Practice interviews', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Interview Coaching Services', slug: 'interview-coaching', description: 'One-on-one interview training', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Technical Interview Prep', slug: 'technical-interview-prep', description: 'Coding and technical interviews', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Behavioral Interview Prep', slug: 'behavioral-interview-prep', description: 'Soft skills interview practice', parentId: rootIds['JOBS:interview-preparation'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Salary Negotiation Services', slug: 'salary-negotiation', description: 'Negotiation skills training', parentId: rootIds['JOBS:interview-preparation'] },
  
  // Recruitment Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'IT Recruitment Services', slug: 'it-recruitment', description: 'Tech industry placement', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Finance Recruitment Services', slug: 'finance-recruitment', description: 'Finance sector placement', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Healthcare Recruitment', slug: 'healthcare-recruitment', description: 'Medical staff placement', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Executive Search Services', slug: 'executive-search', description: 'Senior leadership placement', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Temporary Staffing Services', slug: 'temporary-staffing', description: 'Short-term placements', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Mass Recruitment Services', slug: 'mass-recruitment', description: 'High-volume hiring', parentId: rootIds['JOBS:recruitment-agencies-main'] },
  
  // Skills Training Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Leadership Training', slug: 'leadership-training', description: 'Management skills development', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Communication Skills Training', slug: 'communication-skills', description: 'Verbal and written communication', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Time Management Training', slug: 'time-management', description: 'Productivity training', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Project Management Training', slug: 'project-management-training', description: 'Project management skills', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Team Building Services', slug: 'team-building', description: 'Collaboration training', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Negotiation Skills Training', slug: 'negotiation-skills', description: 'Negotiation training', parentId: rootIds['JOBS:skills-training'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Digital Skills Training', slug: 'digital-skills', description: 'Computer and software training', parentId: rootIds['JOBS:skills-training'] },
  
  // LinkedIn Optimization Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Profile Optimization', slug: 'profile-optimization', description: 'LinkedIn profile enhancement', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Networking Strategies', slug: 'networking-strategies', description: 'Professional networking', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'LinkedIn Content Services', slug: 'linkedin-content', description: 'LinkedIn content strategy', parentId: rootIds['JOBS:linkedin-optimization'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Personal Branding Services', slug: 'personal-branding', description: 'Brand development', parentId: rootIds['JOBS:linkedin-optimization'] },
  
  // Job Search Assistance Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Job Search Strategy', slug: 'job-search-strategy', description: 'Job hunting techniques', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Company Research Services', slug: 'company-research', description: 'Employer research assistance', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Application Tracking', slug: 'application-tracking', description: 'Managing job applications', parentId: rootIds['JOBS:job-search-assistance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Follow-up Strategies', slug: 'follow-up-strategies', description: 'Post-application follow-up', parentId: rootIds['JOBS:job-search-assistance'] },
  
  // Career Assessment Services Subcategories
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Aptitude Testing', slug: 'aptitude-testing', description: 'Skills and abilities assessment', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Personality Assessment', slug: 'personality-assessment', description: 'Career personality tests', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Skills Gap Analysis', slug: 'skills-gap-analysis', description: 'Identifying training needs', parentId: rootIds['JOBS:career-assessment'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Career Fit Assessment', slug: 'career-fit-assessment', description: 'Career matching', parentId: rootIds['JOBS:career-assessment'] },


    // IT & Digital Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Web Design & Development', slug: 'web-design-dev', description: 'Website creation and maintenance', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Mobile App Development', slug: 'mobile-app-dev', description: 'iOS and Android app development', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Computer Repair & IT Support', slug: 'computer-repair', description: 'Laptop/PC fixes and IT help desk', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Network Setup & Support', slug: 'network-setup', description: 'WiFi, LAN, and network configuration', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Cybersecurity Services', slug: 'cybersecurity-services', description: 'Security audits and protection', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Cloud Services', slug: 'cloud-services', description: 'Cloud migration and management', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'SEO & Digital Marketing', slug: 'seo-digital-marketing', description: 'Search engine optimization and online marketing', parentId: rootIds['JOBS:it-digital-services'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Social Media Management', slug: 'social-media-management', description: 'Social media account management', parentId: rootIds['JOBS:it-digital-services'] },

  // Media & Creative Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Photography Services', slug: 'photography-services', description: 'Event and portrait photography', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Videography Services', slug: 'videography-services', description: 'Video production and editing', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Graphic Design Services', slug: 'graphic-design-services', description: 'Logo, branding, and print design', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Content Writing Services', slug: 'content-writing', description: 'Blog, article, and copywriting', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Translation Services', slug: 'translation-services', description: 'Language translation and localization', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Voice Over Services', slug: 'voice-over', description: 'Audio recording and voice talent', parentId: rootIds['JOBS:media-creative'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Animation Services', slug: 'animation-services', description: '2D and 3D animation', parentId: rootIds['JOBS:media-creative'] },

  // Beauty & Wellness Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Hair Salon Services', slug: 'hair-salon', description: 'Haircut, styling, and treatments', parentId: rootIds['JOBS:beauty-wellness'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Barber Services', slug: 'barber-services', description: 'Men\'s haircut and grooming', parentId: rootIds['JOBS:beauty-wellness'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Makeup Services', slug: 'makeup-services', description: 'Professional makeup application', parentId: rootIds['JOBS:beauty-wellness'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Nail Care Services', slug: 'nail-care', description: 'Manicure and pedicure', parentId: rootIds['JOBS:beauty-wellness'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Massage Therapy', slug: 'massage-therapy', description: 'Relaxation and therapeutic massage', parentId: rootIds['JOBS:beauty-wellness'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Braiding & Weaving Services', slug: 'braiding-weaving', description: 'Hair braiding and extension installation', parentId: rootIds['JOBS:beauty-wellness'] },

  // Legal & Compliance Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Corporate Legal Services', slug: 'corporate-legal', description: 'Business legal advice', parentId: rootIds['JOBS:legal-compliance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Notary Services', slug: 'notary-services', description: 'Document notarization', parentId: rootIds['JOBS:legal-compliance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Contract Drafting', slug: 'contract-drafting', description: 'Legal agreement preparation', parentId: rootIds['JOBS:legal-compliance'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Business Registration', slug: 'business-registration', description: 'Company and business registration', parentId: rootIds['JOBS:legal-compliance'] },

  // Accounting & Tax Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Bookkeeping Services', slug: 'bookkeeping', description: 'Daily financial record keeping', parentId: rootIds['JOBS:accounting-tax'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Tax Filing Services', slug: 'tax-filing', description: 'Individual and business tax returns', parentId: rootIds['JOBS:accounting-tax'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Payroll Services', slug: 'payroll', description: 'Employee salary management', parentId: rootIds['JOBS:accounting-tax'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Financial Advisory', slug: 'financial-advisory', description: 'Business financial planning', parentId: rootIds['JOBS:accounting-tax'] },

  // Tutoring & Academic Support Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Primary School Tutoring', slug: 'primary-tutoring', description: 'Grades 1-8 academic support', parentId: rootIds['JOBS:tutoring-academic'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'High School Tutoring', slug: 'high-school-tutoring', description: 'Secondary school subjects', parentId: rootIds['JOBS:tutoring-academic'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Exam Preparation', slug: 'exam-preparation', description: 'KCSE, KCPE, SAT, IELTS prep', parentId: rootIds['JOBS:tutoring-academic'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Language Tutoring', slug: 'language-tutoring', description: 'English, Kiswahili, French, etc.', parentId: rootIds['JOBS:tutoring-academic'] },

  // Printing & Stationery Services Subcategories (under JOBS)
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Document Printing', slug: 'document-printing', description: 'General document printing', parentId: rootIds['JOBS:printing-stationery'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Large Format Printing', slug: 'large-format', description: 'Banners, posters, signs', parentId: rootIds['JOBS:printing-stationery'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'Business Card Printing', slug: 'business-card-printing', description: 'Professional business cards', parentId: rootIds['JOBS:printing-stationery'] },
  { vertical: 'JOBS', type: 'COMPLIMENTARY', name: 'T-Shirt Printing', slug: 'tshirt-printing', description: 'Custom apparel printing', parentId: rootIds['JOBS:printing-stationery'] },

  // ======================================================================
  // SOCIAL SUPPORT - COMPLIMENTARY Subcategories (Professional Helpers)
  // ======================================================================
  
  // Counseling & Therapy Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Individual Counseling', slug: 'individual-counseling', description: 'One-on-one therapy', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Group Counseling', slug: 'group-counseling', description: 'Therapy groups', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Online Counseling', slug: 'online-counseling', description: 'Virtual therapy sessions', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Crisis Counseling', slug: 'crisis-counseling', description: 'Emergency mental health support', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Cognitive Behavioral Therapy', slug: 'cbt-therapy', description: 'CBT treatment', parentId: rootIds['SOCIAL_SUPPORT:counseling-services'] },
  
  // Family Therapy Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Counseling', slug: 'family-counseling', description: 'Therapy for families', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Parenting Support', slug: 'parenting-support', description: 'Parenting guidance', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Counseling', slug: 'child-counseling', description: 'Therapy for children', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Adolescent Counseling', slug: 'adolescent-counseling', description: 'Teen therapy', parentId: rootIds['SOCIAL_SUPPORT:family-therapy'] },
  
  // Marriage Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Couples Counseling', slug: 'couples-counseling', description: 'Relationship therapy', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Pre-marital Counseling', slug: 'pre-marital-counseling', description: 'Preparation for marriage', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Divorce Counseling', slug: 'divorce-counseling', description: 'Support through separation', parentId: rootIds['SOCIAL_SUPPORT:marriage-counseling'] },
  
  // Grief Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Bereavement Support', slug: 'bereavement-support', description: 'Loss of loved one', parentId: rootIds['SOCIAL_SUPPORT:grief-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Loss Counseling', slug: 'loss-counseling', description: 'Coping with loss', parentId: rootIds['SOCIAL_SUPPORT:grief-counseling'] },
  
  // Trauma Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'PTSD Counseling', slug: 'ptsd-counseling', description: 'Trauma recovery', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Abuse Survivor Support', slug: 'abuse-survivors', description: 'Support for abuse survivors', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Accident Trauma Support', slug: 'accident-trauma', description: 'Post-accident support', parentId: rootIds['SOCIAL_SUPPORT:trauma-counseling'] },
  
  // Addiction Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Alcohol Addiction Counseling', slug: 'alcohol-addiction', description: 'Alcohol abuse counseling', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Drug Addiction Counseling', slug: 'drug-addiction', description: 'Substance abuse counseling', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Gambling Addiction Counseling', slug: 'gambling-addiction', description: 'Problem gambling support', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Recovery Coaching', slug: 'recovery-coaching', description: 'Ongoing recovery support', parentId: rootIds['SOCIAL_SUPPORT:addiction-counseling'] },
  
  // Social Work Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Case Management', slug: 'case-management', description: 'Coordinated care planning', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Welfare Services', slug: 'child-welfare', description: 'Child protection services', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Foster Care Support', slug: 'foster-care-support', description: 'Foster family assistance', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Adoption Services', slug: 'adoption-services', description: 'Adoption support', parentId: rootIds['SOCIAL_SUPPORT:social-work'] },
  
  // Legal Aid Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Family Law Services', slug: 'family-law', description: 'Divorce, custody, support', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Housing Law Services', slug: 'housing-law', description: 'Tenant rights, eviction', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Immigration Law Services', slug: 'immigration-law', description: 'Visas, asylum, citizenship', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Employment Law Services', slug: 'employment-law', description: 'Workplace rights', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Criminal Law Services', slug: 'criminal-law', description: 'Legal defense', parentId: rootIds['SOCIAL_SUPPORT:legal-aid-services'] },
  
  // Financial Counseling Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Budgeting Help', slug: 'budgeting-help', description: 'Personal budgeting', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Debt Management', slug: 'debt-management', description: 'Debt reduction strategies', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Savings Planning', slug: 'savings-planning', description: 'Building savings', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Credit Repair Services', slug: 'credit-repair', description: 'Credit score improvement', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Banking Assistance', slug: 'banking-assistance', description: 'Financial system navigation', parentId: rootIds['SOCIAL_SUPPORT:financial-counseling'] },
  
  // Rehabilitation Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Physical Therapy', slug: 'physical-therapy', description: 'Physical rehabilitation', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Occupational Therapy', slug: 'occupational-therapy', description: 'Daily living skills', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Speech Therapy', slug: 'speech-therapy', description: 'Communication therapy', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Vocational Rehabilitation', slug: 'vocational-rehabilitation', description: 'Work readiness', parentId: rootIds['SOCIAL_SUPPORT:rehabilitation-services'] },
  
  // Physiotherapy Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Sports Physiotherapy', slug: 'sports-physiotherapy', description: 'Sports injury recovery', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Orthopedic Physiotherapy', slug: 'orthopedic-physiotherapy', description: 'Bone and joint therapy', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Neurological Physiotherapy', slug: 'neurological-physiotherapy', description: 'Nerve and brain rehabilitation', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Pediatric Physiotherapy', slug: 'pediatric-physiotherapy', description: "Children's physical therapy", parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Geriatric Physiotherapy', slug: 'geriatric-physiotherapy', description: 'Elderly physical therapy', parentId: rootIds['SOCIAL_SUPPORT:physiotherapy'] },
  
  // Nutrition & Dietetics Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Dietary Planning', slug: 'dietary-planning', description: 'Personal meal plans', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Weight Management', slug: 'weight-management', description: 'Healthy weight programs', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Medical Nutrition', slug: 'medical-nutrition', description: 'Diet for health conditions', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Sports Nutrition', slug: 'sports-nutrition', description: 'Athlete dietary advice', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Child Nutrition', slug: 'child-nutrition', description: 'Healthy eating for kids', parentId: rootIds['SOCIAL_SUPPORT:nutritionists'] },
  
  // Community Health Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Home Health Aides', slug: 'home-health-aides', description: 'In-home care assistance', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Health Education', slug: 'health-education', description: 'Community health teaching', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Outreach Workers', slug: 'outreach-workers', description: 'Community engagement', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Patient Navigation', slug: 'patient-navigation', description: 'Healthcare system guidance', parentId: rootIds['SOCIAL_SUPPORT:community-health-workers'] },
  
  // Youth Mentoring Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Academic Mentoring', slug: 'academic-mentoring', description: 'School support for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Life Skills Mentoring', slug: 'life-skills-mentoring', description: 'Practical skills for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Career Mentoring', slug: 'career-mentoring', description: 'Career guidance for youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'At-risk Youth Programs', slug: 'at-risk-youth-programs', description: 'Support for vulnerable youth', parentId: rootIds['SOCIAL_SUPPORT:youth-mentors'] },
  
  // Disability Support Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Personal Care Assistants', slug: 'personal-care-assistants', description: 'Daily living assistance', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Mobility Assistance', slug: 'mobility-assistance', description: 'Movement support', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Communication Support', slug: 'communication-support', description: 'Assistive communication', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Independent Living Skills', slug: 'independent-living-skills', description: 'Self-sufficiency training', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Sign Language Interpretation', slug: 'sign-language', description: 'Sign language services', parentId: rootIds['SOCIAL_SUPPORT:disability-support'] },
  
  // Elder Care Services Subcategories
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Companion Care', slug: 'companion-care', description: 'Social support for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Personal Care for Seniors', slug: 'personal-care-seniors', description: 'Daily assistance for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Memory Care', slug: 'memory-care', description: "Dementia and Alzheimer's support", parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Respite Care', slug: 'respite-care', description: 'Temporary caregiver relief', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },
  { vertical: 'SOCIAL_SUPPORT', type: 'COMPLIMENTARY', name: 'Senior Transportation', slug: 'senior-transportation', description: 'Transport for elderly', parentId: rootIds['SOCIAL_SUPPORT:elder-care'] },

 
  
];