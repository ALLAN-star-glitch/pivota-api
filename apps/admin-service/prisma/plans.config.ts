// ================================
// PivotaConnect Plans — Prisma-Aligned & Strictly Typed
// ================================

export type Vertical = 'HOUSING' | 'JOBS' | 'SOCIAL_SUPPORT';

export interface ModuleRestrictions {
  isAllowed: boolean;
  listingLimit?: number;
  listingDurationDays?: number;
  imageLimit?: number;
  offeringLimit?: number;
  allowedVerticals?: Vertical[];
  canAppearInSmartMatch?: boolean;
  approvalRequired?: boolean;
  requiresVerification?: boolean;
  canMarkAsUrgent?: boolean;
  externalLinksAllowed?: boolean;
}


export interface PlanModule {
  slug: 'houses' | 'jobs' | 'help-and-support' | 'services';
  restrictions: ModuleRestrictions;
}

export interface PlanFeatures {
  prices?: Record<string, number>;
  support: 'community' | 'email' | 'priority' | 'dedicated';
  boost: boolean;
  analytics: boolean;
}

export interface Plan {
  name: string;
  slug: string;
  isPremium: boolean;
  totalListings: number;
  description: string;
  features: PlanFeatures;
  modules: PlanModule[];
}

// ------------------------------
// Plans Definition
// ------------------------------
export const plans: Plan[] = [
  {
    name: 'Free Forever',
    slug: 'free-forever',
    isPremium: false,
    totalListings: 2,
    description: 'Community access for individuals; House listings and Professional services require a paid plan.',
    features: { prices: {}, support: 'community', boost: false, analytics: false },
    modules: [
      {
        slug: 'houses',
        restrictions: { isAllowed: false, listingLimit: 0, imageLimit: 0, approvalRequired: true },
      },
      {
        slug: 'jobs',
        restrictions: { isAllowed: true, listingLimit: 1, listingDurationDays: 7, imageLimit: 1, approvalRequired: true },
      },
      {
        slug: 'help-and-support',
        restrictions: { isAllowed: true, listingLimit: 1, listingDurationDays: 14, imageLimit: 1, requiresVerification: true, approvalRequired: true },
      },
      {
        slug: 'services',
        restrictions: { isAllowed: false, offeringLimit: 0, allowedVerticals: [], canAppearInSmartMatch: false },
      },
    ],
  },
  {
    name: 'Starter',
    slug: 'starter',
    isPremium: true,
    totalListings: 20,
    description: 'Ideal for individuals; professional presence in one pillar.',
    features: { prices: { monthly: 500 }, support: 'email', boost: false, analytics: true },
    modules: [
      {
        slug: 'houses',
        restrictions: { isAllowed: true, listingLimit: 10, listingDurationDays: 30, imageLimit: 10, canMarkAsUrgent: true, approvalRequired: false },
      },
      {
        slug: 'jobs',
        restrictions: { isAllowed: true, listingLimit: 5, listingDurationDays: 14, imageLimit: 3, approvalRequired: true },
      },
      {
        slug: 'help-and-support',
        restrictions: { isAllowed: true, listingLimit: 10, listingDurationDays: 30, imageLimit: 5, canMarkAsUrgent: true, externalLinksAllowed: true, requiresVerification: true, approvalRequired: false },
      },
      {
        slug: 'services',
        restrictions: { isAllowed: true, offeringLimit: 1, allowedVerticals: ['HOUSING'], canAppearInSmartMatch: true },
      },
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    isPremium: true,
    totalListings: 80,
    description: 'Perfect for growing businesses and local NGOs.',
    features: { prices: { monthly: 2000, annually: 22000 }, support: 'priority', boost: true, analytics: true },
    modules: [
      {
        slug: 'houses',
        restrictions: { isAllowed: true, listingLimit: 40, listingDurationDays: 60, imageLimit: 20, canMarkAsUrgent: true, externalLinksAllowed: true, approvalRequired: false },
      },
      {
        slug: 'jobs',
        restrictions: { isAllowed: true, listingLimit: 25, listingDurationDays: 30, imageLimit: 5, canMarkAsUrgent: true, externalLinksAllowed: true, approvalRequired: false },
      },
      {
        slug: 'help-and-support',
        restrictions: { isAllowed: true, listingLimit: 30, listingDurationDays: 90, imageLimit: 15, canMarkAsUrgent: true, externalLinksAllowed: true, requiresVerification: true, approvalRequired: false },
      },
      {
        slug: 'services',
        restrictions: { isAllowed: true, offeringLimit: 5, allowedVerticals: ['HOUSING', 'JOBS'], canAppearInSmartMatch: true },
      },
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    isPremium: true,
    totalListings: 200,
    description: 'Full capacity for large organizations and international NGOs.',
    features: { prices: { monthly: 5000, quarterly: 14000, annually: 55000 }, support: 'dedicated', boost: true, analytics: true },
    modules: [
      {
        slug: 'houses',
        restrictions: { isAllowed: true, listingLimit: 100, listingDurationDays: 180, imageLimit: 50, canMarkAsUrgent: true, externalLinksAllowed: true, approvalRequired: false },
      },
      {
        slug: 'jobs',
        restrictions: { isAllowed: true, listingLimit: 60, listingDurationDays: 60, imageLimit: 10, canMarkAsUrgent: true, externalLinksAllowed: true, approvalRequired: false },
      },
      {
        slug: 'help-and-support',
        restrictions: { isAllowed: true, listingLimit: 80, listingDurationDays: 365, imageLimit: 30, canMarkAsUrgent: true, externalLinksAllowed: true, requiresVerification: true, approvalRequired: false },
      },
      {
        slug: 'services',
        restrictions: { isAllowed: true, offeringLimit: 25, allowedVerticals: ['HOUSING', 'JOBS', 'SOCIAL_SUPPORT'], canAppearInSmartMatch: true },
      },
    ],
  },
];
