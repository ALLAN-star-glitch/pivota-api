/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

import { 
  BaseResponseDto, 
  UserHousingStatsResponseDto,
  HousingTrainingDataResponseDto,
  LabelUpdateResponseDto,
  HousingViewRecordDto  
} from '@pivota-api/dtos';
import type { SmartMatchy } from '../../../../../../generated/prisma/client';
import { 
  HousingViewEvent, 
  HousingSearchEvent, 
  HousingViewingScheduledEvent 
} from '@pivota-api/interfaces';
import { HousingStorageService } from './housing-storage.service';

export interface HousingViewedEvent {
  key: string;
  value: HousingViewEvent;
}

export interface HousingSearchEventRequest {
  key: string;
  value: HousingSearchEvent;
}

export interface HousingViewingScheduledEventRequest {
  key: string;
  value: HousingViewingScheduledEvent;
}

export type HousingEventRequest = 
  | HousingViewedEvent 
  | HousingSearchEventRequest 
  | HousingViewingScheduledEventRequest;

@Injectable()
export class HousingAnalyticsService {
  private readonly logger = new Logger(HousingAnalyticsService.name);

  constructor(
    private readonly housingStorage: HousingStorageService,
  ) {}

  /**
   * Process housing listing viewed events
   */
  async processHousingView(event: HousingViewedEvent): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`🏠 Processing housing view for user ${value.userId}, listing ${value.listingId}`);

      // 1. Validate it's a housing listing
      if (!this.isHousingListing(value)) {
        return BaseResponseDto.fail('Not a housing listing', 'INVALID_VERTICAL');
      }

      // 2. Validate required fields
      const validationResult = this.validateHousingEvent(value);
      if (!validationResult.isValid) {
        return BaseResponseDto.fail(`Invalid event: ${validationResult.error}`, 'INVALID_EVENT');
      }

      // 3. Transform to SmartMatchy format
      const smartMatchyData = await this.transformViewToSmartMatchy(value);

      // 4. Store using housing-specific storage service
      const result = await this.housingStorage.storeHousingView(smartMatchyData);
      
      if (!result.success) {
        return BaseResponseDto.fail(
          `Storage failed: ${result.message}`,
          result.code
        );
      }

      // 5. Also store raw event for audit/reprocessing (optional)
      await this.housingStorage.storeRawAIEvent(value).catch(error => {
        this.logger.error(`Failed to store raw event: ${error.message}`);
      });

      return BaseResponseDto.ok(null, 'Housing view processed successfully', 'OK');
      
    } catch (error) {
      this.logger.error(`❌ Failed to process housing view: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Process housing search events
   */
  async processHousingSearch(event: HousingSearchEventRequest): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`🔍 Processing housing search for user ${value.userId}`);

      // Transform search to SmartMatchy format
      const smartMatchyData = await this.transformSearchToSmartMatchy(value);

      // Store using housing-specific storage service
      const result = await this.housingStorage.storeHousingView(smartMatchyData);
      
      if (!result.success) {
        return BaseResponseDto.fail(
          `Storage failed: ${result.message}`,
          result.code
        );
      }

      return BaseResponseDto.ok(null, 'Housing search processed successfully', 'OK');
      
    } catch (error) {
      this.logger.error(`❌ Failed to process housing search: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Process housing viewing scheduled events
   */
  async processHousingViewingScheduled(event: HousingViewingScheduledEventRequest): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`📅 Processing housing viewing scheduled for user ${value.userId}, listing ${value.listingId}`);

      // Transform viewing scheduled to SmartMatchy format
      const smartMatchyData = await this.transformViewingScheduledToSmartMatchy(value);

      // Store using housing-specific storage service
      const result = await this.housingStorage.storeHousingView(smartMatchyData);
      
      if (!result.success) {
        return BaseResponseDto.fail(
          `Storage failed: ${result.message}`,
          result.code
        );
      }

      return BaseResponseDto.ok(null, 'Housing viewing scheduled processed successfully', 'OK');
      
    } catch (error) {
      this.logger.error(`❌ Failed to process housing viewing scheduled: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Transform HousingViewEvent to SmartMatchy format
   */
  private async transformViewToSmartMatchy(event: HousingViewEvent): Promise<Record<string, any>> {
    const { userId, listingId, metadata } = event;
    
    return {
      // Composite Identifiers
      userUuid: userId,
      listingId: listingId,
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '1.0.0',
      aiEventType: event.eventType,
      aiEventId: `${userId}_${listingId}_${Date.now()}`,
      aiEventTimestamp: new Date(metadata.timestamp),
      
      // User Preferences
      userMaxBudget: metadata.userContext?.priceRange?.max,
      userMinBudget: metadata.userContext?.priceRange?.min,
      userBudgetMidpoint: this.calculateMidpoint(
        metadata.userContext?.priceRange?.min,
        metadata.userContext?.priceRange?.max
      ),
      userBudgetFlexibility: metadata.userContext?.budgetFlexibility,
      userMinBedrooms: metadata.userContext?.preferredBedrooms,
      userMaxBedrooms: metadata.userContext?.preferredBedrooms,
      userPreferredBathrooms: metadata.userContext?.preferredBathrooms,
      userPropertyType: metadata.userContext?.preferredPropertyTypes?.[0],
      userPreferredPropertyTypes: metadata.userContext?.preferredPropertyTypes,
      userPreferredNeighborhood: metadata.userContext?.preferredLocations?.[0],
      userPreferredLocations: metadata.userContext?.preferredLocations,
      userFavoriteAmenities: metadata.userContext?.favoriteAmenities,
      userPreferredAmenities: metadata.userContext?.favoriteAmenities?.reduce((acc, amenity) => {
        acc[amenity] = 1.0;
        return acc;
      }, {} as Record<string, number>),
      userPreferredListingTypes: metadata.userContext?.preferredListingTypes,
      userPreviousSearches: metadata.userContext?.previousSearches,
      userPreviousViewings: metadata.userContext?.previousViewings,
      
      // Listing Features
      listingPrice: metadata.listingData.price,
      listingPriceCurrency: metadata.listingData.currency || 'KES',
      listingBedrooms: metadata.listingData.bedrooms,
      listingBathrooms: metadata.listingData.bathrooms,
      listingPropertyType: metadata.listingData.propertyType,
      listingSquareFootage: metadata.listingData.squareFootage,
      listingYearBuilt: metadata.listingData.yearBuilt,
      listingNeighborhood: metadata.listingData.locationNeighborhood,
      listingLat: metadata.listingData.latitude,
      listingLng: metadata.listingData.longitude,
      listingLatitude: metadata.listingData.latitude,
      listingLongitude: metadata.listingData.longitude,
      listingCategoryId: metadata.listingData.categoryId,
      listingCategorySlug: metadata.listingData.categorySlug,
      listingAmenities: metadata.listingData.amenities,
      listingIsFurnished: metadata.listingData.isFurnished,
      listingPhotoCount: metadata.listingData.imagesCount || 0,
      listingAge: metadata.listingData.daysSincePosted,
      listingStatus: metadata.listingData.status,
      
      // Session Context - ENHANCED with all browser/device fields
      sessionReferrer: metadata.referrer,
      sessionReferrerType: metadata.referrerType,
      sessionDevice: metadata.deviceType,
      sessionPlatform: metadata.platform,
      deviceType: metadata.deviceType,
      os: metadata.os,
      osVersion: metadata.osVersion,
      browser: metadata.browser,
      browserVersion: metadata.browserVersion,
      isBot: metadata.isBot,
      appVersion: metadata.appVersion,
      sessionSearchId: metadata.searchId,
      sessionSearchQuery: metadata.searchQuery,
      sessionSearchMaxBudget: this.extractMaxBudgetFromFilters(metadata.searchFilters),
      sessionSearchNeighborhood: this.extractNeighborhoodFromFilters(metadata.searchFilters),
      sessionSearchFilters: metadata.searchFilters,
      searchPosition: metadata.position,
      
      // Interaction Context
      interactionType: metadata.interactionType,
      scrollDepth: metadata.scrollDepth,
      viewDuration: metadata.viewDuration,
      timeSpent: metadata.timeSpent,
      
      // Match Scores
      isWithinBudget: this.calculateIsWithinBudget(
        metadata.listingData.price,
        metadata.userContext?.priceRange
      ),
      priceToBudgetDiff: this.calculatePriceDiff(
        metadata.listingData.price,
        metadata.userContext?.priceRange
      ),
      priceToBudgetRatio: this.calculatePriceRatio(
        metadata.listingData.price,
        metadata.userContext?.priceRange?.max
      ),
      priceVsCategoryAvg: metadata.matchScores?.priceVsCategoryAvg,
      priceVsNeighborhoodAvg: metadata.matchScores?.priceVsNeighborhoodAvg,
      
      bedroomDiff: this.calculateBedroomDiff(
        metadata.listingData.bedrooms,
        metadata.userContext?.preferredBedrooms
      ),
      meetsBedroomRequirement: this.calculateMeetsBedroomRequirement(
        metadata.listingData.bedrooms,
        metadata.userContext?.preferredBedrooms
      ),
      bathroomDiff: this.calculateBathroomDiff(
        metadata.listingData.bathrooms,
        metadata.userContext?.preferredBathrooms
      ),
      
      locationDistance: metadata.matchScores?.locationDistance,
      isPreferredNeighborhood: this.calculateIsPreferredNeighborhood(
        metadata.listingData.locationNeighborhood,
        metadata.userContext?.preferredLocations
      ),
      locationMatchScore: metadata.matchScores?.locationScore,
      isExactNeighborhoodMatch: metadata.matchScores?.isExactNeighborhoodMatch,
      isCityMatch: metadata.matchScores?.isCityMatch,
      distanceFromPreferred: metadata.matchScores?.distanceFromPreferred,
      
      amenityMatchScore: this.calculateAmenityMatchScore(
        metadata.listingData.amenities,
        metadata.userContext?.favoriteAmenities
      ),
      amenityMatchCount: this.calculateAmenityMatchCount(
        metadata.listingData.amenities,
        metadata.userContext?.favoriteAmenities
      ),
      
      propertyTypeMatch: this.calculatePropertyTypeMatch(
        metadata.listingData.propertyType,
        metadata.userContext?.preferredPropertyTypes
      ),
      propertyTypeMatchScore: this.calculatePropertyTypeMatchScore(
        metadata.listingData.propertyType,
        metadata.userContext?.preferredPropertyTypes
      ),
      
      // Temporal Features
      hourOfDay: new Date(metadata.timestamp).getHours(),
      dayOfWeek: new Date(metadata.timestamp).getDay(),
      isWeekend: [0, 6].includes(new Date(metadata.timestamp).getDay()),
      
      // Labels
      userClicked: true,
      dwellTime: metadata.timeSpent,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Transform HousingSearchEvent to SmartMatchy format
   */
 private async transformSearchToSmartMatchy(event: HousingSearchEvent): Promise<Record<string, any>> {
    const { userId, metadata } = event;
    
    return {
      // Composite Identifiers
      userUuid: userId,
      listingId: '',
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '1.0.0',
      aiEventType: event.eventType,
      aiEventId: `search_${userId}_${Date.now()}`,
      aiEventTimestamp: new Date(metadata.timestamp),
      
      // Session Context - CORRECTLY MAPPED to schema
      sessionReferrer: metadata.referrer,                    // Traffic source URL
      sessionReferrerType: metadata.referrerType,            // SEARCH, SOCIAL, etc.
      sessionDevice: metadata.deviceType,                    // Device type
      sessionPlatform: metadata.platform,                    // Platform
      os: metadata.os,
      osVersion: metadata.osVersion,
      browser: metadata.browser,
      browserVersion: metadata.browserVersion,
      isBot: metadata.isBot,
      appVersion: metadata.appVersion,
      sessionSearchId: metadata.searchId,
      sessionSearchQuery: metadata.searchQuery,
      sessionSearchFilters: metadata.searchFilters,
      searchPosition: metadata.position,
      
      // Search specific
      searchResultsCount: metadata.resultsCount,
      searchFilters: metadata.filters,
      searchDuration: metadata.searchDuration,
      searchPagination: metadata.pagination,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }


  /**
   * Transform HousingViewingScheduledEvent to SmartMatchy format
   */
private async transformViewingScheduledToSmartMatchy(event: HousingViewingScheduledEvent): Promise<Record<string, any>> {
    const { userId, listingId, metadata } = event;
    
    return {
      // Composite Identifiers
      userUuid: userId,
      listingId: listingId,
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '1.0.0',
      aiEventType: event.eventType,
      aiEventId: `viewing_${userId}_${metadata.viewingId}`,
      aiEventTimestamp: new Date(metadata.timestamp),
      
      // User Preferences
      userMaxBudget: metadata.userContext?.priceRange?.max,
      userMinBudget: metadata.userContext?.priceRange?.min,
      userBudgetMidpoint: this.calculateMidpoint(
        metadata.userContext?.priceRange?.min,
        metadata.userContext?.priceRange?.max
      ),
      userBudgetFlexibility: metadata.userContext?.budgetFlexibility,
      userMinBedrooms: metadata.userContext?.preferredBedrooms,
      userMaxBedrooms: metadata.userContext?.preferredBedrooms,
      userPreferredBathrooms: metadata.userContext?.preferredBathrooms,
      userPropertyType: metadata.userContext?.preferredPropertyTypes?.[0],
      userPreferredPropertyTypes: metadata.userContext?.preferredPropertyTypes,
      userPreferredNeighborhood: metadata.userContext?.preferredLocations?.[0],
      userPreferredLocations: metadata.userContext?.preferredLocations,
      userFavoriteAmenities: metadata.userContext?.favoriteAmenities,
      
      // Listing Features
      listingPrice: metadata.listingData.price,
      listingBedrooms: metadata.listingData.bedrooms,
      listingBathrooms: metadata.listingData.bathrooms,
      listingPropertyType: metadata.listingData.propertyType,
      listingSquareFootage: metadata.listingData.squareFootage,
      listingYearBuilt: metadata.listingData.yearBuilt,
      listingNeighborhood: metadata.listingData.locationNeighborhood,
      listingCategoryId: metadata.listingData.categoryId,
      listingCategorySlug: metadata.listingData.categorySlug,
      listingAmenities: metadata.listingData.amenities,
      listingIsFurnished: metadata.listingData.isFurnished,
      
      // Session Context - CORRECTLY MAPPED to schema (NO sessionId)
      sessionReferrer: metadata.referrer,                    // Traffic source URL
      sessionReferrerType: metadata.referrerType,            // SEARCH, SOCIAL, etc.
      sessionDevice: metadata.deviceType,                    // Device type
      sessionPlatform: metadata.platform,                    // Platform
      deviceType: metadata.deviceType,   
      os: metadata.os,
      osVersion: metadata.osVersion,
      browser: metadata.browser,
      browserVersion: metadata.browserVersion,
      isBot: metadata.isBot,
      sessionSearchId: metadata.searchId,
      sessionSearchQuery: metadata.searchQuery,
      sessionSearchFilters: metadata.searchFilters,
      searchPosition: metadata.position,
      
      // Interaction Context
      interactionType: metadata.interactionType,
      scrollDepth: metadata.scrollDepth,
      viewDuration: metadata.viewDuration,
      timeSpent: metadata.timeSpent,
      
      // Viewing specific
      viewingDate: new Date(metadata.viewingDate),
      isAdminBooking: metadata.isAdminBooking,
      viewingDuration: metadata.viewingDuration,
      viewingParticipants: metadata.participants,
      
      // Temporal Features - ADDED
      hourOfDay: new Date(metadata.timestamp).getHours(),
      dayOfWeek: new Date(metadata.timestamp).getDay(),
      isWeekend: [0, 6].includes(new Date(metadata.timestamp).getDay()),
      
      // Match Scores
      isWithinBudget: this.calculateIsWithinBudget(
        metadata.listingData.price,
        metadata.userContext?.priceRange
      ),
      
      // Labels
      userScheduledViewing: true,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Extract max budget from search filters
   */
  private extractMaxBudgetFromFilters(filters?: Record<string, unknown>): number | undefined {
    if (!filters) return undefined;
    
    const budgetFields = ['maxPrice', 'maxBudget', 'priceMax', 'budgetMax'];
    for (const field of budgetFields) {
      const value = filters[field];
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return undefined;
  }

  /**
   * Extract neighborhood from search filters
   */
  private extractNeighborhoodFromFilters(filters?: Record<string, unknown>): string | undefined {
    if (!filters) return undefined;
    
    const neighborhoodFields = ['neighborhood', 'locationNeighborhood', 'area', 'location'];
    for (const field of neighborhoodFields) {
      const value = filters[field];
      if (typeof value === 'string') return value;
    }
    return undefined;
  }

  /**
   * Validate housing-specific event
   */
  private validateHousingEvent(event: HousingViewEvent): { isValid: boolean; error?: string } {
    if (!event.userId) return { isValid: false, error: 'Missing userId' };
    if (!event.listingId) return { isValid: false, error: 'Missing listingId' };
    if (!event.metadata?.listingData) return { isValid: false, error: 'Missing listingData' };
    
    if (!event.metadata.listingData.price || event.metadata.listingData.price <= 0) {
      return { isValid: false, error: 'Invalid price' };
    }
    
    if (!event.metadata.listingData.locationCity) {
      return { isValid: false, error: 'Missing location city' };
    }
    
    return { isValid: true };
  }

  /**
   * Check if this is a housing listing
   */
  private isHousingListing(event: HousingViewEvent): boolean {
    const type = event.metadata.listingData.listingType;
    return type === 'RENTAL' || type === 'SALE';
  }

  /**
   * Get housing-specific analytics for a user
   */
  async getUserHousingStats(userUuid: string): Promise<BaseResponseDto<UserHousingStatsResponseDto>> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const housingViews = await this.housingStorage.getHousingTrainingData(
        thirtyDaysAgo,
        new Date(),
        1000
      ) as SmartMatchy[];
      
      const userViews = housingViews.filter(v => v.userUuid === userUuid);
      
      const recentViews: HousingViewRecordDto[] = userViews.slice(0, 10).map(v => ({
        listingId: v.listingId,
        price: v.listingPrice || 0,
        neighborhood: v.listingNeighborhood || undefined,
        viewedAt: v.timestamp || new Date()
      }));

      const response: UserHousingStatsResponseDto = {
        totalViews: userViews.length,
        averagePrice: this.calculateAveragePrice(userViews),
        favoriteNeighborhoods: this.getTopNeighborhoods(userViews),
        recentViews
      };

      return BaseResponseDto.ok(response, 'Housing stats retrieved', 'OK');
      
    } catch (error) {
      this.logger.error(`Failed to get housing stats: ${error.message}`);
      return BaseResponseDto.fail('Failed to get housing stats', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get housing training data for AI developer
   */
  async getHousingTrainingData(days = 30, limit = 10000): Promise<BaseResponseDto<HousingTrainingDataResponseDto>> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      const toDate = new Date();
      
      const data = await this.housingStorage.getHousingTrainingData(
        fromDate,
        toDate,
        limit
      ) as SmartMatchy[];
      
      const response: HousingTrainingDataResponseDto = {
        recordCount: data.length,
        sampleData: data.slice(0, 5).map(item => ({
          id: item.id,
          userUuid: item.userUuid,
          listingId: item.listingId,
          timestamp: item.timestamp,
          listingPrice: item.listingPrice,
          listingBedrooms: item.listingBedrooms,
          listingBathrooms: item.listingBathrooms,
          listingNeighborhood: item.listingNeighborhood,
          isWithinBudget: item.isWithinBudget,
          locationDistance: item.locationDistance,
          overallMatchScore: item.overallMatchScore,
          userClicked: item.userClicked,
          userSaved: item.userSaved,
          userContacted: item.userContacted
        })),
        dateRange: {
          from: fromDate,
          to: toDate
        },
        vertical: 'HOUSING'
      };

      return BaseResponseDto.ok(response, 'Housing training data retrieved', 'OK');
      
    } catch (error) {
      this.logger.error(`Failed to get training data: ${error.message}`);
      return BaseResponseDto.fail('Failed to get housing data', 'INTERNAL_ERROR');
    }
  }

  /**
   * Update housing label (save, contact, click, convert)
   */
  async updateHousingLabel(
    userUuid: string,
    listingId: string,
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING',
    dwellTime?: number,
    metadata?: any
  ): Promise<BaseResponseDto<LabelUpdateResponseDto>> {
    try {
      const result = await this.housingStorage.updateHousingLabel(
        userUuid,
        listingId,
        action,
        dwellTime,
        metadata
      );
      
      if (!result.success) {
        return BaseResponseDto.fail(result.message, result.code);
      }

      const response: LabelUpdateResponseDto = {
        userUuid,
        listingId,
        action,
        updated: true
      };
      
      return BaseResponseDto.ok(response, `${action} label updated`, 'OK');
      
    } catch (error) {
      this.logger.error(`Failed to update label: ${error.message}`);
      return BaseResponseDto.fail('Label update failed', 'INTERNAL_ERROR');
    }
  }

  // ==================== HELPER METHODS ====================

  private calculateMidpoint(min?: number, max?: number): number | undefined {
    if (min && max) return (min + max) / 2;
    return undefined;
  }

  private calculateIsWithinBudget(price: number, priceRange?: { min?: number; max?: number }): boolean | undefined {
    if (!priceRange?.max) return undefined;
    return price <= priceRange.max;
  }

  private calculatePriceDiff(price: number, priceRange?: { min?: number; max?: number }): number | undefined {
    if (!priceRange?.max) return undefined;
    const midpoint = this.calculateMidpoint(priceRange.min, priceRange.max) || priceRange.max;
    return price - midpoint;
  }

  private calculatePriceRatio(price: number, maxBudget?: number): number | undefined {
    if (!maxBudget || maxBudget === 0) return undefined;
    return price / maxBudget;
  }

  private calculateBedroomDiff(listingBedrooms?: number | null, preferredBedrooms?: number): number | undefined {
    if (!listingBedrooms || !preferredBedrooms) return undefined;
    return listingBedrooms - preferredBedrooms;
  }

  private calculateMeetsBedroomRequirement(
    listingBedrooms?: number | null,
    preferredBedrooms?: number
  ): boolean | undefined {
    if (!listingBedrooms || !preferredBedrooms) return undefined;
    return listingBedrooms >= preferredBedrooms;
  }

  private calculateBathroomDiff(listingBathrooms?: number | null, preferredBathrooms?: number): number | undefined {
    if (!listingBathrooms || !preferredBathrooms) return undefined;
    return listingBathrooms - preferredBathrooms;
  }

  private calculateIsPreferredNeighborhood(
    neighborhood?: string | null,
    preferredLocations?: string[]
  ): boolean | undefined {
    if (!neighborhood || !preferredLocations?.length) return undefined;
    return preferredLocations.includes(neighborhood);
  }

  private calculateAmenityMatchScore(
    listingAmenities: string[] = [],
    favoriteAmenities: string[] = []
  ): number | undefined {
    if (!listingAmenities.length || !favoriteAmenities.length) return undefined;
    const matches = listingAmenities.filter(a => favoriteAmenities.includes(a)).length;
    return matches / favoriteAmenities.length;
  }

  private calculateAmenityMatchCount(
    listingAmenities: string[] = [],
    favoriteAmenities: string[] = []
  ): number | undefined {
    if (!listingAmenities.length || !favoriteAmenities.length) return undefined;
    return listingAmenities.filter(a => favoriteAmenities.includes(a)).length;
  }

  private calculatePropertyTypeMatch(
    listingType?: string | null,
    preferredTypes?: string[]
  ): boolean | undefined {
    if (!listingType || !preferredTypes?.length) return undefined;
    return preferredTypes.includes(listingType);
  }

  private calculatePropertyTypeMatchScore(
    listingType?: string | null,
    preferredTypes?: string[]
  ): number | undefined {
    if (!listingType || !preferredTypes?.length) return undefined;
    return preferredTypes.includes(listingType) ? 1.0 : 0.0;
  }

  /**
   * Calculate average price from views
   */
  private calculateAveragePrice(views: SmartMatchy[]): number | null {
    if (views.length === 0) return null;
    const sum = views.reduce((acc, v) => acc + (v.listingPrice || 0), 0);
    return sum / views.length;
  }

  /**
   * Get top neighborhoods from views
   */
  private getTopNeighborhoods(views: SmartMatchy[]): string[] {
    const neighborhoods = views
      .map(v => v.listingNeighborhood)
      .filter((n): n is string => n !== null && n !== undefined);
    
    const counts = neighborhoods.reduce((acc, n) => {
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }
}