export const VERTICALS = ['JOBS', 'HOUSING', 'SOCIAL_SUPPORT'] as const;
export type Vertical = typeof VERTICALS[number];

export const PRICE_UNITS = [
  'FIXED', 'PER_HOUR', 'PER_DAY', 'PER_VISIT', 'PER_SQFT', 
  'PER_TRIP', 'PER_ITEM', 'PER_PROJECT', 'PER_PACKAGE', 
  'PER_SESSION', 'PER_PERSON', 'PER_KM', 'PER_MONTH'
];
