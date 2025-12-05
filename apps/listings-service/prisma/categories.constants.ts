import { JobType } from '../generated/prisma/client';

export const ROOT_CATEGORIES = [
  // Informal jobs
  { name: 'Plumbing', description: 'All plumbing-related jobs', categoryType: JobType.INFORMAL },
  { name: 'Electrical', description: 'Electrical repair and installation jobs', categoryType: JobType.INFORMAL },
  { name: 'House Help', description: 'Domestic work in homes', categoryType: JobType.INFORMAL },
  { name: 'Security Services', description: 'Private security and guarding', categoryType: JobType.INFORMAL },
  { name: 'Transport & Delivery', description: 'Boda boda, courier, ride-sharing', categoryType: JobType.INFORMAL },
  { name: 'Beauty & Personal Care', description: 'Hairdressing, makeup, spa services', categoryType: JobType.INFORMAL },
  { name: 'Cleaning & Housekeeping', description: 'Home and office cleaning', categoryType: JobType.INFORMAL },
  { name: 'Tutoring & Coaching', description: 'Tuition, skills training, sports coaching', categoryType: JobType.INFORMAL },
  { name: 'Events & Entertainment', description: 'DJs, MCs, event setup, catering', categoryType: JobType.INFORMAL },

  // Formal jobs
  { name: 'Software Development', description: 'Formal software development positions', categoryType: JobType.FORMAL },
  { name: 'Finance & Accounting', description: 'Accounting, auditing, payroll', categoryType: JobType.FORMAL },
  { name: 'Marketing & Communications', description: 'Marketing, PR, content creation', categoryType: JobType.FORMAL },
  { name: 'Education & Training', description: 'Teachers, lecturers, trainers', categoryType: JobType.FORMAL },
  { name: 'Healthcare & Medical', description: 'Nurses, doctors, lab techs, health assistants', categoryType: JobType.FORMAL },
  { name: 'Administration & HR', description: 'Office admin, HR, clerical roles', categoryType: JobType.FORMAL },
  { name: 'Sales & Customer Service', description: 'Sales reps, call centers, customer support', categoryType: JobType.FORMAL },
  { name: 'Engineering & Technical', description: 'Civil, mechanical, electrical engineers, technicians', categoryType: JobType.FORMAL },
  { name: 'Hospitality & Tourism', description: 'Hotels, restaurants, travel agencies', categoryType: JobType.FORMAL },
  { name: 'Logistics & Supply Chain', description: 'Warehouse, distribution, transport management', categoryType: JobType.FORMAL },
];

export const SUB_CATEGORIES = (rootIds: Record<string, string>) => [
  // Informal subcategories
  { name: 'Residential Plumbing', description: 'Plumbing jobs for homes', categoryType: JobType.INFORMAL, parentId: rootIds['Plumbing'] },
  { name: 'Commercial Plumbing', description: 'Plumbing jobs for businesses', categoryType: JobType.INFORMAL, parentId: rootIds['Plumbing'] },

  { name: 'House Wiring', description: 'Electrical wiring jobs in homes', categoryType: JobType.INFORMAL, parentId: rootIds['Electrical'] },
  { name: 'Office Electrical Installations', description: 'Electrical jobs for offices', categoryType: JobType.INFORMAL, parentId: rootIds['Electrical'] },

  { name: 'Cooking', description: 'Home cooking services', categoryType: JobType.INFORMAL, parentId: rootIds['House Help'] },
  { name: 'Babysitting', description: 'Childcare services', categoryType: JobType.INFORMAL, parentId: rootIds['House Help'] },
  { name: 'Elderly Care', description: 'Care for seniors at home', categoryType: JobType.INFORMAL, parentId: rootIds['House Help'] },

  { name: 'Home Security', description: 'Security guarding for homes', categoryType: JobType.INFORMAL, parentId: rootIds['Security Services'] },
  { name: 'Event Security', description: 'Security for events', categoryType: JobType.INFORMAL, parentId: rootIds['Security Services'] },

  { name: 'Boda Boda Rides', description: 'Motorcycle transport', categoryType: JobType.INFORMAL, parentId: rootIds['Transport & Delivery'] },
  { name: 'Courier Delivery', description: 'Package delivery services', categoryType: JobType.INFORMAL, parentId: rootIds['Transport & Delivery'] },

  { name: 'Hairdressing', description: 'Haircut and styling', categoryType: JobType.INFORMAL, parentId: rootIds['Beauty & Personal Care'] },
  { name: 'Makeup & Aesthetics', description: 'Makeup and beauty services', categoryType: JobType.INFORMAL, parentId: rootIds['Beauty & Personal Care'] },

  { name: 'House Cleaning', description: 'Cleaning homes', categoryType: JobType.INFORMAL, parentId: rootIds['Cleaning & Housekeeping'] },
  { name: 'Office Cleaning', description: 'Cleaning offices', categoryType: JobType.INFORMAL, parentId: rootIds['Cleaning & Housekeeping'] },

  // Formal subcategories
  { name: 'Web Development', description: 'Frontend and backend development', categoryType: JobType.FORMAL, parentId: rootIds['Software Development'] },
  { name: 'Mobile App Development', description: 'iOS and Android apps', categoryType: JobType.FORMAL, parentId: rootIds['Software Development'] },

  { name: 'Accounting', description: 'Bookkeeping and accounts', categoryType: JobType.FORMAL, parentId: rootIds['Finance & Accounting'] },
  { name: 'Audit', description: 'Auditing services', categoryType: JobType.FORMAL, parentId: rootIds['Finance & Accounting'] },

  { name: 'Marketing Executive', description: 'Marketing campaigns', categoryType: JobType.FORMAL, parentId: rootIds['Marketing & Communications'] },
  { name: 'PR Officer', description: 'Public relations and media', categoryType: JobType.FORMAL, parentId: rootIds['Marketing & Communications'] },

  { name: 'Teacher', description: 'School teacher', categoryType: JobType.FORMAL, parentId: rootIds['Education & Training'] },
  { name: 'Lecturer', description: 'College or university lecturer', categoryType: JobType.FORMAL, parentId: rootIds['Education & Training'] },

  { name: 'Nurse', description: 'Hospital or clinic nurse', categoryType: JobType.FORMAL, parentId: rootIds['Healthcare & Medical'] },
  { name: 'Lab Technician', description: 'Medical lab assistant', categoryType: JobType.FORMAL, parentId: rootIds['Healthcare & Medical'] },

  { name: 'HR Assistant', description: 'Human resources support', categoryType: JobType.FORMAL, parentId: rootIds['Administration & HR'] },
  { name: 'Office Administrator', description: 'Office admin roles', categoryType: JobType.FORMAL, parentId: rootIds['Administration & HR'] },

  { name: 'Sales Representative', description: 'Sales jobs', categoryType: JobType.FORMAL, parentId: rootIds['Sales & Customer Service'] },
  { name: 'Customer Service Agent', description: 'Call center / client support', categoryType: JobType.FORMAL, parentId: rootIds['Sales & Customer Service'] },

  { name: 'Civil Engineer', description: 'Civil engineering projects', categoryType: JobType.FORMAL, parentId: rootIds['Engineering & Technical'] },
  { name: 'Mechanical Engineer', description: 'Mechanical engineering projects', categoryType: JobType.FORMAL, parentId: rootIds['Engineering & Technical'] },

  { name: 'Chef / Cook', description: 'Hotel or restaurant cook', categoryType: JobType.FORMAL, parentId: rootIds['Hospitality & Tourism'] },
  { name: 'Hotel Front Desk', description: 'Receptionist or front office', categoryType: JobType.FORMAL, parentId: rootIds['Hospitality & Tourism'] },

  { name: 'Warehouse Assistant', description: 'Logistics and warehouse support', categoryType: JobType.FORMAL, parentId: rootIds['Logistics & Supply Chain'] },
];
