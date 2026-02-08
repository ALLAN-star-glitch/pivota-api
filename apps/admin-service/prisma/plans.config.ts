export const plans = [
  {
  name: 'Free Forever',
  slug: 'free-forever',
  isPremium: false,
  totalListings: 3, // Increased from 2 to accommodate 1 listing per module
  description: 'Basic access for individuals and community starters',
  features: {
    prices: {}, // Free
    support: 'community',
    boost: false,
    analytics: false,
  },
  modules: [
    {
      slug: 'houses',
      restrictions: {
        isAllowed: true,
        listingLimit: 1,
        listingDurationDays: 7,
        imageLimit: 2,
        canMarkAsUrgent: false,
        externalLinksAllowed: false,
        approvalRequired: true,
        maxPostsPerMonth: 1,
      },
    },
    {
      slug: 'jobs',
      restrictions: { 
        isAllowed: true, // Set to true to match GeneralUser permissions
        listingLimit: 1, // Restrict to a single active post
        listingDurationDays: 7,
        imageLimit: 1,
        canMarkAsUrgent: false,
        externalLinksAllowed: false,
        approvalRequired: true,
      },
    },
    {
      slug: 'help-and-support',
      restrictions: {
        isAllowed: true,
        listingLimit: 1,
        listingDurationDays: 14,
        imageLimit: 1,
        canMarkAsUrgent: false,
        externalLinksAllowed: false,
        requiresVerification: true,
        approvalRequired: true,
      },
    },
  ],
},

  {
    name: 'Starter',
    slug: 'starter',
    isPremium: true,
    totalListings: 20,
    description: 'Ideal for individuals and active community members',
    features: {
      prices: { monthly: 500 },
      support: 'email',
      boost: false,
      analytics: true,
    },
    modules: [
      {
        slug: 'houses',
        restrictions: {
          isAllowed: true,
          listingLimit: 10,
          listingDurationDays: 30,
          imageLimit: 10,
          canMarkAsUrgent: true,
          externalLinksAllowed: false,
          approvalRequired: false,
          maxPostsPerMonth: 10,
        },
      },
      {
        slug: 'jobs',
        restrictions: {
          isAllowed: true,
          listingLimit: 5,
          listingDurationDays: 14,
          imageLimit: 3,
          canMarkAsUrgent: false,
          externalLinksAllowed: false,
          approvalRequired: true,
        },
      },
      {
        slug: 'help-and-support',
        restrictions: {
          isAllowed: true,
          listingLimit: 10,
          listingDurationDays: 30,
          imageLimit: 5,
          canMarkAsUrgent: true,
          externalLinksAllowed: true, // Allow individuals to link to social profiles
          requiresVerification: true,
          approvalRequired: false,
        },
      },
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    isPremium: true,
    totalListings: 80,
    description: 'Perfect for growing businesses and local NGOs',
    features: {
      prices: { monthly: 2000, annually: 22000 },
      support: 'priority',
      boost: true,
      analytics: true,
    },
    modules: [
      {
        slug: 'houses',
        restrictions: {
          isAllowed: true,
          listingLimit: 40,
          listingDurationDays: 60,
          imageLimit: 20,
          canMarkAsUrgent: true,
          externalLinksAllowed: true,
          approvalRequired: false,
          maxPostsPerMonth: 30,
        },
      },
      {
        slug: 'jobs',
        restrictions: {
          isAllowed: true,
          listingLimit: 25,
          listingDurationDays: 30,
          imageLimit: 5,
          canMarkAsUrgent: true,
          externalLinksAllowed: true,
          approvalRequired: false,
        },
      },
      {
        slug: 'help-and-support',
        restrictions: {
          isAllowed: true,
          listingLimit: 30,
          listingDurationDays: 90,
          imageLimit: 15,
          canMarkAsUrgent: true,
          externalLinksAllowed: true, // NGOs can link to donation pages
          requiresVerification: true,
          approvalRequired: false,
        },
      },
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    isPremium: true,
    totalListings: 200,
    description: 'Full capacity for large organizations and international NGOs',
    features: {
      prices: { monthly: 5000, quarterly: 14000, annually: 55000 },
      support: 'dedicated',
      boost: true,
      analytics: true,
    },
    modules: [
      {
        slug: 'houses',
        restrictions: {
          isAllowed: true,
          listingLimit: 100,
          listingDurationDays: 180,
          imageLimit: 50,
          canMarkAsUrgent: true,
          externalLinksAllowed: true,
          approvalRequired: false,
          maxPostsPerMonth: 50,
        },
      },
      {
        slug: 'jobs',
        restrictions: {
          isAllowed: true,
          listingLimit: 60,
          listingDurationDays: 60,
          imageLimit: 10,
          canMarkAsUrgent: true,
          externalLinksAllowed: true,
          approvalRequired: false,
        },
      },
      {
        slug: 'help-and-support',
        restrictions: {
          isAllowed: true,
          listingLimit: 80,
          listingDurationDays: 365,
          imageLimit: 30,
          canMarkAsUrgent: true,
          externalLinksAllowed: true,
          requiresVerification: true,
          approvalRequired: false,
        },
      },
    ],
  },
];