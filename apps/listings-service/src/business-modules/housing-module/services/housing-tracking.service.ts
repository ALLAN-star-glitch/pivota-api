/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ClientKafka, ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { 

  ListingViewContextDto,
  SearchHouseListingsDto,
} from '@pivota-api/dtos';

// Import the interfaces for event structure
import { 
  HousingViewEvent,
  HousingSearchEvent,
  HousingSaveEvent,
  HousingViewingScheduledEvent,
  HousingInquiryEvent,
  HousingListingMilestoneEvent
} from '@pivota-api/interfaces';

// Interface for listing data structure (internal to the service)
interface HouseListingData {
  id: string;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  locationCity: string;
  locationNeighborhood?: string | null;
  listingType: string;
  categoryId?: string | null;
  category?: {
    slug?: string;
  } | null;
  amenities: string[];
  isFurnished: boolean;
  squareFootage?: number | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  images?: Array<{ url: string; isMain: boolean }>;
  accountId?: string;
  creatorId?: string;
  status?: string;
  daysSincePosted?: number;
  // NEW RENTAL FIELDS
  minimumLeaseTerm?: number | null;
  maximumLeaseTerm?: number | null;
  depositAmount?: number | null;
  isPetFriendly?: boolean;
  utilitiesIncluded?: boolean;
  utilitiesDetails?: string | null;
  // NEW SALE FIELDS
  isNegotiable?: boolean;
  titleDeedAvailable?: boolean;
  [key: string]: unknown;
}

// Interface for milestone tracking data
interface MilestoneData {
  accountId: string;
  accountName: string;
  creatorId: string;
  creatorName?: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingType: string;
  locationCity: string;
  categoryId?: string;
  milestone: number;
  previousMilestone?: number;
  daysSinceFirstListing?: number;
  totalValue?: number;
  averagePrice?: number;
  categories?: string[];
}

@Injectable()
export class HousingTrackingService {
  private readonly logger = new Logger(HousingTrackingService.name);
 
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    @Inject('NOTIFICATION_EVENT_BUS')
    private readonly notificationBus: ClientProxy,
  ) {} 

  /**
   * Track when a house seeker views a listing
   */
  trackView(
    seekerId: string,
    listingId: string,
    listingData: HouseListingData,
    context?: ListingViewContextDto
  ): void {
    this.logger.log(`trackView called - seekerId: ${seekerId}, listingId: ${listingId}`);
    
    if (!seekerId) {
      this.logger.warn(`trackView skipped - no seekerId provided`);
      return;
    }

    if (!this.kafkaClient) {
      this.logger.error(`Kafka client is not available!`);
      return;
    }

    const event: HousingViewEvent = {
      seekerId: seekerId,
      listingId,
      eventType: 'VIEW',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,

        deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
        os: context?.client?.os,
        osVersion: context?.client?.osVersion,
        browser: context?.client?.browser,
        browserVersion: context?.client?.browserVersion,
        appVersion: undefined,
        isBot: context?.client?.isBot,

        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,

        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,

        listingData: {
          price: listingData.price,
          currency: undefined,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          locationCity: listingData.locationCity,
          locationNeighborhood: listingData.locationNeighborhood,
          listingType: listingData.listingType,
          categoryId: listingData.categoryId,
          categorySlug: listingData.category?.slug,
          amenities: listingData.amenities,
          isFurnished: listingData.isFurnished,
          squareFootage: listingData.squareFootage,
          yearBuilt: listingData.yearBuilt,
          propertyType: listingData.propertyType as any,
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          imagesCount: listingData.images?.length || 0,
          daysSincePosted: listingData.daysSincePosted,
          accountId: listingData.accountId,
          listingCreatorId: listingData.creatorId,
          status: listingData.status,
          // NEW RENTAL FIELDS
          minimumLeaseTerm: listingData.minimumLeaseTerm,
          maximumLeaseTerm: listingData.maximumLeaseTerm,
          depositAmount: listingData.depositAmount,
          isPetFriendly: listingData.isPetFriendly,
          utilitiesIncluded: listingData.utilitiesIncluded,
          utilitiesDetails: listingData.utilitiesDetails,
          // NEW SALE FIELDS
          isNegotiable: listingData.isNegotiable,
          titleDeedAvailable: listingData.titleDeedAvailable,
        },

        userContext: {}
      },
    };

    this.logger.debug(`Sending VIEW event - payload: ${JSON.stringify({
      eventType: event.eventType,
      seekerId: event.seekerId,
      listingId: event.listingId,
      timestamp: event.metadata.timestamp
    })}`);

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.seekerId,
      value: event
    });

    this.logger.log(`VIEW event sent for listing ${listingId} by seeker ${seekerId}`);
  }

  /**
   * Track when house seeker performs a search
   */
  trackSearch(
    seekerId: string,
    searchDto: SearchHouseListingsDto,
    resultsCount: number,
    context?: ListingViewContextDto
  ): void {
    if (!seekerId) return;

    const filtersObject: Record<string, unknown> = {
      city: searchDto.city,
      minPrice: searchDto.minPrice,
      maxPrice: searchDto.maxPrice,
      bedrooms: searchDto.bedrooms,
      listingType: searchDto.listingType,
      categoryId: searchDto.categoryId,
      subCategoryId: searchDto.subCategoryId,
      propertyType: searchDto.propertyType,
      minSquareFootage: searchDto.minSquareFootage,
      maxSquareFootage: searchDto.maxSquareFootage,
      minYearBuilt: searchDto.minYearBuilt,
      isFurnished: searchDto.isFurnished,
      amenities: searchDto.amenities,
      limit: searchDto.limit,
      offset: searchDto.offset,
      // NEW SEARCH FILTERS
      minLeaseTerm: searchDto.minLeaseTerm,
      isPetFriendly: searchDto.isPetFriendly,
      utilitiesIncluded: searchDto.utilitiesIncluded,
      isNegotiable: searchDto.isNegotiable,
      titleDeedAvailable: searchDto.titleDeedAvailable,
    };

    Object.keys(filtersObject).forEach(key => 
      filtersObject[key] === undefined && delete filtersObject[key]
    );

    const searchId = context?.search?.searchId || `search_${Date.now()}`;

    const event: HousingSearchEvent = {
      seekerId: seekerId,
      eventType: 'SEARCH',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
        os: context?.client?.os,
        osVersion: context?.client?.osVersion,
        browser: context?.client?.browser,
        browserVersion: context?.client?.browserVersion,
        appVersion: undefined,
        isBot: context?.client?.isBot,
        
        searchId,
        searchQuery: context?.search?.query,
        searchFilters: filtersObject,
        position: context?.search?.position,
        
        timeSpent: undefined,
        interactionType: undefined,
        viewDuration: undefined,
        scrollDepth: undefined,
        
        resultsCount,
        filters: filtersObject,
        searchDuration: undefined,
        resultsShown: resultsCount,
        pagination: {
          page: Math.floor((searchDto.offset || 0) / (searchDto.limit || 20)) + 1,
          limit: searchDto.limit || 20,
          offset: searchDto.offset || 0
        },
        
        listingData: {
          price: 0,
          locationCity: '',
          listingType: '',
          amenities: [],
          isFurnished: false
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.seekerId,
      value: event
    });

    this.logger.debug(`Tracked SEARCH event for seeker ${seekerId} - ${resultsCount} results`);
  }

  /**
   * Track when house seeker saves a listing
   */
  trackSave(
    seekerId: string,
    listingId: string,
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    saveMethod: 'BOOKMARK' | 'FAVORITE' | 'SHORTCUT' = 'BOOKMARK'
  ): void {
    if (!seekerId) return;

    const event: HousingSaveEvent = {
      seekerId: seekerId,
      listingId,
      eventType: 'SAVE',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
        os: context?.client?.os,
        osVersion: context?.client?.osVersion,
        browser: context?.client?.browser,
        browserVersion: context?.client?.browserVersion,
        appVersion: undefined,
        isBot: context?.client?.isBot,
        
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,
        
        saveMethod,
        saveLocation: context?.search?.searchId ? 'SEARCH_RESULTS' : 'DETAILS_PAGE',
        
        listingData: {
          price: listingData.price,
          currency: undefined,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          locationCity: listingData.locationCity,
          locationNeighborhood: listingData.locationNeighborhood,
          listingType: listingData.listingType,
          categoryId: listingData.categoryId,
          categorySlug: listingData.category?.slug,
          amenities: listingData.amenities,
          isFurnished: listingData.isFurnished,
          squareFootage: listingData.squareFootage,
          yearBuilt: listingData.yearBuilt,
          propertyType: listingData.propertyType as any,
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          imagesCount: listingData.images?.length || 0,
          accountId: listingData.accountId,
          listingCreatorId: listingData.creatorId,
          status: listingData.status,
          // NEW RENTAL FIELDS
          minimumLeaseTerm: listingData.minimumLeaseTerm,
          maximumLeaseTerm: listingData.maximumLeaseTerm,
          depositAmount: listingData.depositAmount,
          isPetFriendly: listingData.isPetFriendly,
          utilitiesIncluded: listingData.utilitiesIncluded,
          utilitiesDetails: listingData.utilitiesDetails,
          // NEW SALE FIELDS
          isNegotiable: listingData.isNegotiable,
          titleDeedAvailable: listingData.titleDeedAvailable,
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.seekerId,
      value: event
    });

    this.logger.debug(`Tracked SAVE event for listing ${listingId} by seeker ${seekerId}`);
  }

  /**
   * Track when house seeker schedules a viewing
   */
  trackViewingScheduled(
    seekerId: string,
    listingId: string,
    viewingId: string,
    viewingDate: Date,
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    isAdminBooking = false,
    adminMetadata?: any,
    schedulerId?: string
  ): void {
    if (!seekerId) return;

    const event: HousingViewingScheduledEvent = {
      seekerId: seekerId,
      listingId,
      eventType: 'SCHEDULE_VIEWING',
      schedulerId: schedulerId || seekerId,
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
        os: context?.client?.os,
        osVersion: context?.client?.osVersion,
        browser: context?.client?.browser,
        browserVersion: context?.client?.browserVersion,
        appVersion: undefined,
        isBot: context?.client?.isBot,
        
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,
        
        viewingId,
        viewingDate: viewingDate.toISOString(),
        isAdminBooking,
        viewingDuration: 60,
        participants: 1,
        
        ...(adminMetadata && { adminMetadata }),
        
        listingData: {
          price: listingData.price,
          currency: undefined,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          locationCity: listingData.locationCity,
          locationNeighborhood: listingData.locationNeighborhood,
          listingType: listingData.listingType,
          categoryId: listingData.categoryId,
          categorySlug: listingData.category?.slug,
          amenities: listingData.amenities,
          isFurnished: listingData.isFurnished,
          squareFootage: listingData.squareFootage,
          yearBuilt: listingData.yearBuilt,
          propertyType: listingData.propertyType as any,
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          imagesCount: listingData.images?.length || 0,
          accountId: listingData.accountId,
          listingCreatorId: listingData.creatorId,
          status: listingData.status,
          // NEW RENTAL FIELDS
          minimumLeaseTerm: listingData.minimumLeaseTerm,
          maximumLeaseTerm: listingData.maximumLeaseTerm,
          depositAmount: listingData.depositAmount,
          isPetFriendly: listingData.isPetFriendly,
          utilitiesIncluded: listingData.utilitiesIncluded,
          utilitiesDetails: listingData.utilitiesDetails,
          // NEW SALE FIELDS
          isNegotiable: listingData.isNegotiable,
          titleDeedAvailable: listingData.titleDeedAvailable,
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.seekerId,
      value: event
    });

    this.logger.debug(`Tracked SCHEDULE_VIEWING event for listing ${listingId} by seeker ${seekerId}`);
  }

  /**
   * Track when house seeker makes an inquiry
   */
  trackInquiry(
    seekerId: string,
    listingId: string,
    inquiryType: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'CONTACT_FORM',
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    message?: string
  ): void {
    if (!seekerId) return;

    const event: HousingInquiryEvent = {
      seekerId: seekerId,
      listingId,
      eventType: 'INQUIRY',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
        os: context?.client?.os,
        osVersion: context?.client?.osVersion,
        browser: context?.client?.browser,
        browserVersion: context?.client?.browserVersion,
        appVersion: undefined,
        isBot: context?.client?.isBot,
        
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,
        
        inquiryType,
        message,
        
        listingData: {
          price: listingData.price,
          currency: undefined,
          locationCity: listingData.locationCity,
          locationNeighborhood: listingData.locationNeighborhood,
          listingType: listingData.listingType,
          categoryId: listingData.categoryId,
          categorySlug: listingData.category?.slug,
          amenities: listingData.amenities,
          isFurnished: listingData.isFurnished,
          bedrooms: listingData.bedrooms,
          bathrooms: listingData.bathrooms,
          squareFootage: listingData.squareFootage,
          yearBuilt: listingData.yearBuilt,
          propertyType: listingData.propertyType as any,
          latitude: listingData.latitude,
          longitude: listingData.longitude,
          imagesCount: listingData.images?.length || 0,
          accountId: listingData.accountId,
          listingCreatorId: listingData.creatorId,
          status: listingData.status,
          // NEW RENTAL FIELDS
          minimumLeaseTerm: listingData.minimumLeaseTerm,
          maximumLeaseTerm: listingData.maximumLeaseTerm,
          depositAmount: listingData.depositAmount,
          isPetFriendly: listingData.isPetFriendly,
          utilitiesIncluded: listingData.utilitiesIncluded,
          utilitiesDetails: listingData.utilitiesDetails,
          // NEW SALE FIELDS
          isNegotiable: listingData.isNegotiable,
          titleDeedAvailable: listingData.titleDeedAvailable,
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.seekerId,
      value: event
    });

    this.logger.debug(`Tracked INQUIRY event for listing ${listingId} by seeker ${seekerId}`);
  }

  /**
   * Track listing milestones (1st, 2nd, 3rd, 5th, 10th listing)
   */
  async trackListingMilestone(
    milestoneData: MilestoneData,
    context?: ListingViewContextDto
  ): Promise<void> {
    try {
      const { milestone, accountId, listingId } = milestoneData;
      
      const significantMilestones = [1, 2, 3, 5, 10, 25, 50, 100];
      
      if (!significantMilestones.includes(milestone)) {
        return;
      }

      let milestoneTier: 'ONBOARDING' | 'ENGAGEMENT' | 'GROWTH' | 'POWER' | 'PROFESSIONAL';
      let suggestedTeam: 'onboarding' | 'success' | 'sales' | 'marketing' | 'partnerships';
       
      if (milestone === 1) {
        milestoneTier = 'ONBOARDING';
        suggestedTeam = 'onboarding';
      } else if (milestone <= 3) {
        milestoneTier = 'ENGAGEMENT';
        suggestedTeam = 'success';
      } else if (milestone <= 10) {
        milestoneTier = 'GROWTH';
        suggestedTeam = 'sales';
      } else if (milestone <= 50) {
        milestoneTier = 'POWER';
        suggestedTeam = 'marketing';
      } else {
        milestoneTier = 'PROFESSIONAL';
        suggestedTeam = 'partnerships';
      }

      const totalValue = milestoneData.totalValue || (milestoneData.listingPrice * milestone);
      const averagePrice = milestoneData.averagePrice || milestoneData.listingPrice;

      const event: HousingListingMilestoneEvent = {
        accountId,
        listingId,
        eventType: 'LISTING_MILESTONE',
        listingCreatorId: milestoneData.creatorId,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: context?.sessionId,
          platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
          
          deviceType: context?.client?.deviceType as 'MOBILE' | 'TABLET' | 'DESKTOP' | 'BOT' | undefined,
          os: context?.client?.os,
          osVersion: context?.client?.osVersion,
          browser: context?.client?.browser,
          browserVersion: context?.client?.browserVersion,
          isBot: context?.client?.isBot,
          
          milestone,
          milestoneTier,
          suggestedTeam,
          
          accountId: milestoneData.accountId,
          accountName: milestoneData.accountName,
          creatorId: milestoneData.creatorId,
          creatorName: milestoneData.creatorName,
          
          listingId: milestoneData.listingId,
          listingTitle: milestoneData.listingTitle,
          listingPrice: milestoneData.listingPrice,
          listingType: milestoneData.listingType,
          locationCity: milestoneData.locationCity,
          categoryId: milestoneData.categoryId,
          
          totalListings: milestone,
          totalValue,
          averagePrice,
          daysSinceFirstListing: milestoneData.daysSinceFirstListing,
          categories: milestoneData.categories || [milestoneData.categoryId].filter(Boolean),
          
          message: this.getMilestoneMessage(milestone, milestoneData.accountName),
          
          routing: {
            primaryTeam: suggestedTeam,
            priority: milestone <= 3 ? 'HIGH' : (milestone <= 10 ? 'MEDIUM' : 'LOW'),
            requiresFollowUp: milestone <= 5,
            notificationTemplate: `listing-milestone-${milestone}`
          },
          
          listingData: {
            price: milestoneData.listingPrice,
            locationCity: milestoneData.locationCity,
            listingType: milestoneData.listingType,
            amenities: [],
            isFurnished: false,
            categoryId: milestoneData.categoryId,
            categorySlug: undefined,
            bedrooms: null,
            bathrooms: null,
            locationNeighborhood: null,
            accountId: milestoneData.accountId,
            listingCreatorId: milestoneData.creatorId,
            imagesCount: 0
          },
          
          userContext: {}
        }
      };

      this.logger.log(`Emitting to analytics.listing.milestone for account ${accountId}, milestone ${milestone}`);

      this.kafkaClient.emit('analytics.listing.milestone', {
        key: event.accountId,
        value: {
          ...event,
          notificationType: 'LISTING_MILESTONE'
        }
      });

      try {
        const emailMilestones = [1, 2, 3, 5, 10];
        
        if (emailMilestones.includes(milestone)) {
          const recipientEmail = process.env.MILESTONE_NOTIFICATIONS_EMAIL || 'allanmathenge82@gmail.com';
          
          const emailData = {
            recipientEmail,
            accountId: milestoneData.accountId,
            accountName: milestoneData.accountName,
            creatorId: milestoneData.creatorId,
            creatorName: milestoneData.creatorName,
            listingId: milestoneData.listingId,
            listingTitle: milestoneData.listingTitle,
            listingPrice: milestoneData.listingPrice,
            listingType: milestoneData.listingType,
            locationCity: milestoneData.locationCity,
            milestone,
            milestoneTier,
            suggestedTeam,
            totalValue,
            averagePrice,
            message: this.getMilestoneMessage(milestone, milestoneData.accountName),
            timestamp: new Date().toISOString(),
            priority: milestone <= 3 ? 'HIGH' : 'MEDIUM'
          };

          if (this.notificationBus) {
            this.notificationBus.emit('admin.listing.milestone', emailData);
            this.logger.log(`Milestone email notification sent to ${recipientEmail} for milestone ${milestone}`);
          } else {
            this.logger.debug(`Milestone email would be sent to ${recipientEmail} for milestone ${milestone} (notificationBus not configured)`);
          }
        }
      } catch (emailError) {
        this.logger.error(`Failed to send milestone email: ${emailError.message}`);
      }

      this.logger.log(`Tracked LISTING_MILESTONE ${milestone} for account ${accountId}`);
      
    } catch (error) {
      this.logger.error(`Failed to track listing milestone: ${error.message}`);
    }
  }

  /**
   * Helper to generate milestone-specific messages
   */
  private getMilestoneMessage(milestone: number, accountName: string): string {
    const messages = {
      1: `${accountName} just posted their FIRST listing! Welcome to PivotaConnect!`,
      2: `${accountName} is getting engaged - posted their SECOND listing!`,
      3: `${accountName} is on a roll with their THIRD listing!`,
      5: `${accountName} has posted 5 listings - becoming a serious seller!`,
      10: `${accountName} hit 10 listings - power user alert!`,
      25: `${accountName} is a top seller with 25 listings!`,
      50: `${accountName} joined the 50+ listings club - partnership opportunity!`,
      100: `${accountName} reached 100 listings - our elite seller!`
    };
    
    return messages[milestone] || `${accountName} reached ${milestone} listings!`;
  }
}