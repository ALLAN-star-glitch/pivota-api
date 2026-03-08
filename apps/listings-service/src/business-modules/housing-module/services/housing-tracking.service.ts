/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
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
  HousingInquiryEvent
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
  [key: string]: unknown;
}

@Injectable()
export class HousingTrackingService {
  private readonly logger = new Logger(HousingTrackingService.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka
  ) {}

  /**
   * Track when user views a listing
   */
  trackView(
    userId: string,
    listingId: string,
    listingData: HouseListingData,
    context?: ListingViewContextDto
  ): void {
    if (!userId) return;

    const event: HousingViewEvent = {
      userId,
      listingId,
      eventType: 'VIEW',
      metadata: {
        // Core tracking from ListingViewContextDto
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined, // Not in DTO yet
        
        // Device context from client object
        deviceType: context?.client?.device as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        osVersion: context?.client?.os,
        appVersion: undefined, // Not in DTO
        
        // Search context from search object
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        // Interaction data
        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,
        
        // Housing listing data
        listingData: {
          price: listingData.price,
          currency: undefined, // Not in HouseListingData yet
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
          creatorId: listingData.creatorId,
          status: listingData.status
        },
        
        // User context - will be enriched by analytics service
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.userId,
      value: event
    });

    this.logger.debug(`📤 Tracked VIEW event for listing ${listingId} by user ${userId}`);
  }

  /**
   * Track when user performs a search
   */
  trackSearch(
    userId: string,
    searchDto: SearchHouseListingsDto,
    resultsCount: number,
    context?: ListingViewContextDto
  ): void {
    if (!userId) return;

    // Convert search DTO to a plain object for filters
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
      offset: searchDto.offset
    };

    // Remove undefined values
    Object.keys(filtersObject).forEach(key => 
      filtersObject[key] === undefined && delete filtersObject[key]
    );

    const searchId = context?.search?.searchId || `search_${Date.now()}`;

    const event: HousingSearchEvent = {
      userId,
      listingId: '',
      eventType: 'SEARCH',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        // Device context
        deviceType: context?.client?.device as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        osVersion: context?.client?.os,
        appVersion: undefined,
        
        // Search context
        searchId,
        searchQuery: context?.search?.query,
        searchFilters: filtersObject,
        position: context?.search?.position,
        
        // Interaction data (minimal for search)
        timeSpent: undefined,
        interactionType: undefined,
        viewDuration: undefined,
        scrollDepth: undefined,
        
        // Search specific
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
      key: event.userId,
      value: event
    });

    this.logger.debug(`📤 Tracked SEARCH event for user ${userId} - ${resultsCount} results`);
  }

  /**
   * Track when user saves a listing
   */
  trackSave(
    userId: string,
    listingId: string,
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    saveMethod: 'BOOKMARK' | 'FAVORITE' | 'SHORTCUT' = 'BOOKMARK'
  ): void {
    if (!userId) return;

    const event: HousingSaveEvent = {
      userId,
      listingId,
      eventType: 'SAVE',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        // Device context
        deviceType: context?.client?.device as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        osVersion: context?.client?.os,
        appVersion: undefined,
        
        // Search context (if saved from search results)
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        // Interaction data
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
          creatorId: listingData.creatorId,
          status: listingData.status
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.userId,
      value: event
    });

    this.logger.debug(`📤 Tracked SAVE event for listing ${listingId}`);
  }

  /**
   * Track when user schedules a viewing
   */
  trackViewingScheduled(
    userId: string,
    listingId: string,
    viewingId: string,
    viewingDate: Date,
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    isAdminBooking = false,
    adminMetadata?: any
  ): void {
    if (!userId) return;

    const event: HousingViewingScheduledEvent = {
      userId,
      listingId,
      eventType: 'SCHEDULE_VIEWING',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        // Device context
        deviceType: context?.client?.device as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        osVersion: context?.client?.os,
        appVersion: undefined,
        
        // Search context (if scheduled from search results)
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        // Interaction data (if coming from a view)
        timeSpent: context?.timeSpent,
        interactionType: context?.interactionType as 'CLICK' | 'SCROLL' | 'DWELL' | undefined ,
        viewDuration: context?.viewDuration,
        scrollDepth: context?.scrollDepth,
        
        // Viewing specific data
        viewingId,
        viewingDate: viewingDate.toISOString(),
        isAdminBooking,
        viewingDuration: 60, // Default 60 minutes, could be configurable
        participants: 1, // Default 1 person
        
        // Admin metadata if applicable
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
          creatorId: listingData.creatorId,
          status: listingData.status
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.userId,
      value: event
    });

    this.logger.debug(`📤 Tracked SCHEDULE_VIEWING event for listing ${listingId}`);
  }

  /**
   * Track when user makes an inquiry
   */
  trackInquiry(
    userId: string,
    listingId: string,
    inquiryType: 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'CONTACT_FORM',
    listingData: HouseListingData,
    context?: ListingViewContextDto,
    message?: string
  ): void {
    if (!userId) return;

    const event: HousingInquiryEvent = {
      userId,
      listingId,
      eventType: 'INQUIRY',
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: context?.sessionId,
        platform: context?.platform as 'WEB' | 'MOBILE' | 'API' | 'CLI' | undefined,
        referrer: context?.referrer,
        referrerType: undefined,
        
        // Device context
        deviceType: context?.client?.device as 'MOBILE' | 'TABLET' | 'DESKTOP' | undefined,
        osVersion: context?.client?.os,
        appVersion: undefined,
        
        // Search context (if from search results)
        searchId: context?.search?.searchId,
        searchQuery: context?.search?.query,
        searchFilters: context?.search?.filters,
        position: context?.search?.position,
        
        // Interaction data
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
          creatorId: listingData.creatorId,
          status: listingData.status
        },
        
        userContext: {}
      }
    };

    this.kafkaClient.emit('housing.ai.tracking', {
      key: event.userId,
      value: event
    });

    this.logger.debug(`📤 Tracked INQUIRY event for listing ${listingId}`);
  }
}