export const ROOT_CATEGORIES = [
  { name: 'Plumbing', description: 'All plumbing-related jobs' },
  { name: 'Electrical', description: 'Electrical repair and installation jobs' },
  { name: 'House Help', description: 'Domestic work in homes' },
  { name: 'Security Services', description: 'Private security and guarding' },
  { name: 'Transport & Delivery', description: 'Boda boda, courier, ride-sharing' },
  { name: 'Beauty & Personal Care', description: 'Hairdressing, makeup, spa services' },
  { name: 'Cleaning & Housekeeping', description: 'Home and office cleaning' },
  { name: 'Tutoring & Coaching', description: 'Tuition, skills training, sports coaching' },
  { name: 'Events & Entertainment', description: 'DJs, MCs, event setup, catering' },

  { name: 'Software Development', description: 'Formal software development positions' },
  { name: 'Finance & Accounting', description: 'Accounting, auditing, payroll' },
  { name: 'Marketing & Communications', description: 'Marketing, PR, content creation' },
  { name: 'Education & Training', description: 'Teachers, lecturers, trainers' },
  { name: 'Healthcare & Medical', description: 'Nurses, doctors, lab techs, health assistants' },
  { name: 'Administration & HR', description: 'Office admin, HR, clerical roles' },
  { name: 'Sales & Customer Service', description: 'Sales reps, call centers, customer support' },
  { name: 'Engineering & Technical', description: 'Civil, mechanical, electrical engineers, technicians' },
  { name: 'Hospitality & Tourism', description: 'Hotels, restaurants, travel agencies' },
  { name: 'Logistics & Supply Chain', description: 'Warehouse, distribution, transport management' },
];

export const SUB_CATEGORIES = (rootIds: Record<string, string>) => [
  { name: 'Residential Plumbing', description: 'Plumbing jobs for homes', parentId: rootIds['Plumbing'] },
  { name: 'Commercial Plumbing', description: 'Plumbing jobs for businesses', parentId: rootIds['Plumbing'] },

  { name: 'House Wiring', description: 'Electrical wiring jobs in homes', parentId: rootIds['Electrical'] },
  { name: 'Office Electrical Installations', description: 'Electrical jobs for offices', parentId: rootIds['Electrical'] },

  { name: 'Cooking', description: 'Home cooking services', parentId: rootIds['House Help'] },
  { name: 'Babysitting', description: 'Childcare services', parentId: rootIds['House Help'] },
  { name: 'Elderly Care', description: 'Care for seniors at home', parentId: rootIds['House Help'] },

  { name: 'Home Security', description: 'Security guarding for homes', parentId: rootIds['Security Services'] },
  { name: 'Event Security', description: 'Security for events', parentId: rootIds['Security Services'] },

  { name: 'Boda Boda Rides', description: 'Motorcycle transport', parentId: rootIds['Transport & Delivery'] },
  { name: 'Courier Delivery', description: 'Package delivery services', parentId: rootIds['Transport & Delivery'] },

  { name: 'Hairdressing', description: 'Haircut and styling', parentId: rootIds['Beauty & Personal Care'] },
  { name: 'Makeup & Aesthetics', description: 'Makeup and beauty services', parentId: rootIds['Beauty & Personal Care'] },

  { name: 'House Cleaning', description: 'Cleaning homes', parentId: rootIds['Cleaning & Housekeeping'] },
  { name: 'Office Cleaning', description: 'Cleaning offices', parentId: rootIds['Cleaning & Housekeeping'] },

  { name: 'Web Development', description: 'Frontend and backend development', parentId: rootIds['Software Development'] },
  { name: 'Mobile App Development', description: 'iOS and Android apps', parentId: rootIds['Software Development'] },

  { name: 'Accounting', description: 'Bookkeeping and accounts', parentId: rootIds['Finance & Accounting'] },
  { name: 'Audit', description: 'Auditing services', parentId: rootIds['Finance & Accounting'] },

  { name: 'Marketing Executive', description: 'Marketing campaigns', parentId: rootIds['Marketing & Communications'] },
  { name: 'PR Officer', description: 'Public relations and media', parentId: rootIds['Marketing & Communications'] },

  { name: 'Teacher', description: 'School teacher', parentId: rootIds['Education & Training'] },
  { name: 'Lecturer', description: 'College or university lecturer', parentId: rootIds['Education & Training'] },

  { name: 'Nurse', description: 'Hospital or clinic nurse', parentId: rootIds['Healthcare & Medical'] },
  { name: 'Lab Technician', description: 'Medical lab assistant', parentId: rootIds['Healthcare & Medical'] },

  { name: 'HR Assistant', description: 'Human resources support', parentId: rootIds['Administration & HR'] },
  { name: 'Office Administrator', description: 'Office admin roles', parentId: rootIds['Administration & HR'] },

  { name: 'Sales Representative', description: 'Sales jobs', parentId: rootIds['Sales & Customer Service'] },
  { name: 'Customer Service Agent', description: 'Call center / client support', parentId: rootIds['Sales & Customer Service'] },

  { name: 'Civil Engineer', description: 'Civil engineering projects', parentId: rootIds['Engineering & Technical'] },
  { name: 'Mechanical Engineer', description: 'Mechanical engineering projects', parentId: rootIds['Engineering & Technical'] },

  { name: 'Chef / Cook', description: 'Hotel or restaurant cook', parentId: rootIds['Hospitality & Tourism'] },
  { name: 'Hotel Front Desk', description: 'Receptionist or front office', parentId: rootIds['Hospitality & Tourism'] },

  { name: 'Warehouse Assistant', description: 'Logistics and warehouse support', parentId: rootIds['Logistics & Supply Chain'] },
];
