// /Users/admin/Desktop/pivota/pivota-api/libs/interfaces/src/lib/housing-ai-tracking.interface.ts

export interface HousingAIEvent {
  userId: string;
  listingId: string;
  eventType: 'VIEW' | 'SEARCH' | 'SAVE' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING' | 'INQUIRY' | 'LISTING_MILESTONE';
  metadata: {
    // Core tracking
    timestamp: string;
    sessionId?: string;
    platform?: 'WEB' | 'MOBILE' | 'API' | 'CLI';
    referrer?: string;
    referrerType?: 'DIRECT' | 'SEARCH' | 'SOCIAL' | 'EMAIL' | 'INTERNAL';
    
     // Device context - ENHANCED
    deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT';
    os?: string;              // Operating system name
    osVersion?: string;       // OS version
    browser?: string;         // Browser name
    browserVersion?: string;  // Browser version
    appVersion?: string;      // App version (if applicable)
    isBot?: boolean;          // Bot detection flag
    
    
    // Search context
    searchId?: string;
    searchQuery?: string;
    searchFilters?: Record<string, unknown>;
    position?: number; // Position in search results
    
    // Interaction data
    timeSpent?: number; // Time spent viewing in seconds
    interactionType?: 'CLICK' | 'SCROLL' | 'DWELL';
    viewDuration?: number; // How long they viewed
    scrollDepth?: number; // How far they scrolled (0-100)
    
    // Housing-specific listing data (ENHANCED)
    listingData: {
      // Core fields
      price: number;
      currency?: string;
      bedrooms?: number | null;
      bathrooms?: number | null;
      locationCity: string;
      locationNeighborhood?: string | null;
      listingType: string; // 'RENTAL' | 'SALE' | 'LEASE'
      
      // Category
      categoryId?: string | null;
      categorySlug?: string; // 'apartment', 'house', 'condo', etc.
      
      // Property details
      amenities: string[];
      isFurnished: boolean;
      squareFootage?: number | null;
      yearBuilt?: number | null;
      propertyType?: 'APARTMENT' | 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'VILLA' | 'STUDIO';
      
      // Location coordinates
      latitude?: number | null;
      longitude?: number | null;
      
      // Listing metadata
      imagesCount?: number;
      daysSincePosted?: number;
      accountId?: string;
      creatorId?: string;
      status?: string;
    };
    
    // User context for housing recommendations (ENHANCED)
    userContext: {
      // Historical data
      previousSearches?: string[];
      previousViewings?: string[];
      
      // Location preferences
      preferredLocations?: string[]; // Cities/neighborhoods they've shown interest in
      
      // Property preferences
      preferredBedrooms?: number;
      preferredBathrooms?: number;
      preferredPropertyTypes?: string[]; // ['APARTMENT', 'HOUSE']
      preferredListingTypes?: string[]; // ['RENTAL', 'SALE']
      
      // Budget preferences
      priceRange?: { 
        min?: number; 
        max?: number 
      };
      budgetFlexibility?: number; // 0-1 indicating how flexible on price
      
      // Amenity preferences
      favoriteAmenities?: string[];
      
      // User profile
      userType?: 'PROVIDER' | 'BENEFICIARY' | 'BOTH';
      userTrustScore?: number;
      userVerificationLevel?: 'NONE' | 'BASIC' | 'VERIFIED';
    };
    
    // Pre-computed match scores (can be calculated by analytics service)
    matchScores?: {
      overallMatchScore?: number;
      priceScore?: number;
      locationScore?: number;
      propertyScore?: number;
      recencyScore?: number;
      amenityScore?: number;
      
      // Price comparisons
      priceVsCategoryAvg?: number;
      priceVsNeighborhoodAvg?: number;
      
      // Location metrics
      locationDistance?: number; // Distance in km
      isExactNeighborhoodMatch?: boolean;
      isCityMatch?: boolean;
      distanceFromPreferred?: number;
      
      // Bedroom match
      bedroomDiff?: number;
      meetsBedroomRequirement?: boolean;
      bathroomDiff?: number;
      
      // Amenity match
      amenityMatchCount?: number;
    };
  };
}

// Specific event types with enhanced typing
export interface HousingViewEvent extends HousingAIEvent {
  eventType: 'VIEW';
  metadata: HousingAIEvent['metadata'] & {
    viewDuration?: number;
    scrollDepth?: number;
  };
}

export interface HousingSearchEvent extends Omit<HousingAIEvent, 'listingId'> {
  eventType: 'SEARCH';
  listingId: ''; // Empty string for searches
  metadata: HousingAIEvent['metadata'] & {
    resultsCount: number;
    searchId: string;
    filters: Record<string, unknown>;
    searchDuration?: number; // How long search took
    resultsShown?: number; // Number of results actually shown
    pagination?: {
      page: number;
      limit: number;
      offset: number;
    };
  };
}

export interface HousingSaveEvent extends HousingAIEvent {
  eventType: 'SAVE';
  metadata: HousingAIEvent['metadata'] & {
    saveMethod: 'BOOKMARK' | 'FAVORITE' | 'SHORTCUT';
    saveLocation?: string; // Where they saved from (details page, search results, etc.)
  };
}

export interface HousingInquiryEvent extends HousingAIEvent {
  eventType: 'INQUIRY';
  metadata: HousingAIEvent['metadata'] & {
    inquiryType: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'CONTACT_FORM';
    message?: string;
    responseTime?: number; // How long until response (if applicable)
  };
}

export interface HousingViewingScheduledEvent extends HousingAIEvent {
  eventType: 'SCHEDULE_VIEWING';
  metadata: HousingAIEvent['metadata'] & {
    viewingId: string;
    viewingDate: string;
    isAdminBooking?: boolean;
    viewingDuration?: number; // Expected duration in minutes
    participants?: number; // Number of people attending
  };
}

export interface HousingViewingCompletedEvent extends HousingAIEvent {
  eventType: 'COMPLETE_VIEWING';
  metadata: HousingAIEvent['metadata'] & {
    viewingId: string;
    viewingDate: string; // When viewing occurred
    duration?: number; // Actual duration in minutes
    attended?: boolean; // Did they actually attend
    feedback?: {
      liked: boolean;
      rating?: number; // 1-5 rating
      comments?: string;
      wouldRecommend?: boolean;
      wouldApply?: boolean; // Will they apply/rent
      concerns?: string[]; // Any concerns they had
    };
    outcome?: 'INTERESTED' | 'NOT_INTERESTED' | 'APPLIED' | 'RENTED';
  };
}

// NEW: Listing Milestone Event Interface
export interface HousingListingMilestoneEvent extends Omit<HousingAIEvent, 'userId' | 'listingId'> {
  eventType: 'LISTING_MILESTONE';
  accountId: string;  // Account that owns the listings
  listingId: string;  // The listing that triggered the milestone
  metadata: HousingAIEvent['metadata'] & {
    // Milestone specific data
    milestone: number;  // 1, 2, 3, 5, 10, 25, 50, 100
    milestoneTier: 'ONBOARDING' | 'ENGAGEMENT' | 'GROWTH' | 'POWER' | 'PROFESSIONAL';
    suggestedTeam: 'onboarding' | 'success' | 'sales' | 'marketing' | 'partnerships';
    
    // Account metrics
    accountId: string;
    accountName: string;
    creatorId: string;
    creatorName?: string;
    
    // Listing details
    listingId: string;
    listingTitle: string;
    listingPrice: number;
    listingType: string;
    locationCity: string;
    categoryId?: string;
    
    // Calculated metrics
    totalListings: number;
    totalValue: number;
    averagePrice: number;
    daysSinceFirstListing?: number;
    categories?: string[];
    
    // Milestone-specific messaging
    message: string;
    
    // Routing hints for notification service
    routing: {
      primaryTeam: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      requiresFollowUp: boolean;
      notificationTemplate: string;
    };
    
    // User context (optional - who triggered this)
    userContext?: HousingAIEvent['metadata']['userContext'];
    
    // Match scores (optional - not typically used for milestones)
    matchScores?: HousingAIEvent['metadata']['matchScores'];
  };
}

// You might also want a batch event type
export interface HousingBatchEvent {
  batchId: string;
  userId: string;
  sessionId: string;
  events: HousingAIEvent[];
  metadata: {
    timestamp: string;
    clientId?: string;
    platform?: string;
    appVersion?: string;
  };
}