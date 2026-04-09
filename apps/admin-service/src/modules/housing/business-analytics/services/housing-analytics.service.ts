/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

import { 
  BaseResponseDto, 
  LabelUpdateResponseDto,
} from '@pivota-api/dtos';
import { 
  HousingViewEvent, 
  HousingSearchEvent, 
  HousingViewingScheduledEvent 
} from '@pivota-api/interfaces';
import { HousingStorageService } from './housing-storage.service';
import { PrismaService } from '../../../../prisma/prisma.service';

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
    private readonly prisma: PrismaService, 
  ) {}

  /**
   * Process housing listing viewed events
   */
  async processHousingView(event: HousingViewedEvent): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`Processing housing view for seeker ${value.seekerId}, listing ${value.listingId}`);

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
      this.logger.error(`Failed to process housing view: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Process housing search events
   */
  async processHousingSearch(event: HousingSearchEventRequest): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`Processing housing search for seeker ${value.seekerId}`);

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
      this.logger.error(`Failed to process housing search: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Process housing viewing scheduled events
   */
  async processHousingViewingScheduled(event: HousingViewingScheduledEventRequest): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`Processing housing viewing scheduled for seeker ${value.seekerId}, listing ${value.listingId}`);

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
      this.logger.error(`Failed to process housing viewing scheduled: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Transform HousingViewEvent to SmartMatchy format
   */
  private async transformViewToSmartMatchy(event: HousingViewEvent): Promise<Record<string, any>> {
    const { seekerId, listingId, metadata, eventType } = event;
    
    return {
      // Core identifiers
      seekerId: seekerId,
      listingId: listingId,
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '2.1.0',
      
      // ==================== PROVIDER/OWNER IDENTIFIER ====================
      providerId: metadata.listingData.listingCreatorId,
      
      // ==================== AI METADATA ====================
      aiEventType: eventType,
      
      // ==================== VIEWING TRACKING (null for views) ====================
      viewingId: null,
      viewingDate: null,
      viewingStatus: null,
      
      // ==================== USER PREFERENCES (from metadata.userContext) ====================
      // Budget preferences
      userMinBudget: metadata.userContext?.priceRange?.min,
      userMaxBudget: metadata.userContext?.priceRange?.max,
      userBudgetMidpoint: metadata.userContext?.priceRange?.min && metadata.userContext?.priceRange?.max 
        ? (metadata.userContext.priceRange.min + metadata.userContext.priceRange.max) / 2 
        : null,
      userBudgetFlexibility: metadata.userContext?.budgetFlexibility,
      
      // Bedroom preferences
      userMinBedrooms: metadata.userContext?.preferredBedrooms,
      userMaxBedrooms: metadata.userContext?.preferredBedrooms,
      userMinBathrooms: metadata.userContext?.preferredBathrooms,
      
      // Location preferences (matches new schema)
      userPreferredCities: metadata.userContext?.preferredCities,
      userPreferredNeighborhoods: metadata.userContext?.preferredNeighborhoods,
      userSearchRadiusKm: metadata.userContext?.searchRadiusKm,
      userPreferredLat: metadata.userContext?.latitude,
      userPreferredLng: metadata.userContext?.longitude,
      
      // Property preferences (using preferredTypes)
      userPreferredTypes: metadata.userContext?.preferredTypes,
      
      // Amenities
      userFavoriteAmenities: metadata.userContext?.favoriteAmenities,
      userPrefersFurnished: metadata.userContext?.prefersFurnished,
      userHasPets: metadata.userContext?.hasPets,
      
      // Move-in preferences
      userHouseholdSize: metadata.userContext?.householdSize,
      
      // Agent preference
      userHasAgent: metadata.userContext?.hasAgent,
      
      // ==================== NEW RENTAL PREFERENCES ====================
      userPreferredLeaseTerm: metadata.userContext?.preferredLeaseTerm,
      userRequiresPetFriendly: metadata.userContext?.requiresPetFriendly,
      userRequiresUtilitiesIncluded: metadata.userContext?.requiresUtilitiesIncluded,
      
      // ==================== NEW SALE PREFERENCES ====================
      userRequiresNegotiable: metadata.userContext?.requiresNegotiable,
      userRequiresTitleDeed: metadata.userContext?.requiresTitleDeed,
      
      // ==================== LISTING FEATURES (from metadata.listingData) ====================
      listingPrice: metadata.listingData.price,
      listingCurrency: metadata.listingData.currency || 'KES',
      listingBedrooms: metadata.listingData.bedrooms,
      listingBathrooms: metadata.listingData.bathrooms,
      listingPropertyType: metadata.listingData.propertyType,
      listingSquareFootage: metadata.listingData.squareFootage,
      listingYearBuilt: metadata.listingData.yearBuilt,
      listingNeighborhood: metadata.listingData.locationNeighborhood,
      listingLat: metadata.listingData.latitude,
      listingLng: metadata.listingData.longitude,
      listingCategoryId: metadata.listingData.categoryId,
      listingCategorySlug: metadata.listingData.categorySlug,
      listingAmenities: metadata.listingData.amenities,
      listingIsFurnished: metadata.listingData.isFurnished,
      listingPhotoCount: metadata.listingData.imagesCount || 0,
      listingAge: metadata.listingData.daysSincePosted,
      listingStatus: metadata.listingData.status,
      
      // ==================== NEW RENTAL LISTING FIELDS ====================
      listingMinimumLeaseTerm: metadata.listingData.minimumLeaseTerm,
      listingMaximumLeaseTerm: metadata.listingData.maximumLeaseTerm,
      listingDepositAmount: metadata.listingData.depositAmount,
      listingIsPetFriendly: metadata.listingData.isPetFriendly,
      listingUtilitiesIncluded: metadata.listingData.utilitiesIncluded,
      listingUtilitiesDetails: metadata.listingData.utilitiesDetails,
      
      // ==================== NEW SALE LISTING FIELDS ====================
      listingIsNegotiable: metadata.listingData.isNegotiable,
      listingTitleDeedAvailable: metadata.listingData.titleDeedAvailable,
      
      // ==================== HOUSING-SPECIFIC FEATURES ====================
      housingType: metadata.listingData.listingType,
      housingBedrooms: metadata.listingData.bedrooms,
      housingBathrooms: metadata.listingData.bathrooms,
      housingPropertyType: metadata.listingData.propertyType,
      housingNeighborhood: metadata.listingData.locationNeighborhood,
      housingIsFurnished: metadata.listingData.isFurnished,
      housingAmenities: metadata.listingData.amenities,
      housingSquareFootage: metadata.listingData.squareFootage,
      housingYearBuilt: metadata.listingData.yearBuilt,
      
      // ==================== SESSION CONTEXT ====================
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
      sessionSearchFilters: metadata.searchFilters,
      searchPosition: metadata.position,
      
      // ==================== INTERACTION CONTEXT ====================
      interactionType: metadata.interactionType,
      scrollDepth: metadata.scrollDepth,
      viewDuration: metadata.viewDuration,
      dwellTime: metadata.timeSpent,
      
      // ==================== TEMPORAL FEATURES ====================
      hourOfDay: new Date(metadata.timestamp).getHours(),
      dayOfWeek: new Date(metadata.timestamp).getDay(),
      isWeekend: [0, 6].includes(new Date(metadata.timestamp).getDay()),
      
      // ==================== LABELS ====================
      userClicked: true,
      
      // ==================== TIMESTAMPS ====================
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Transform HousingSearchEvent to SmartMatchy format
   */
  private async transformSearchToSmartMatchy(event: HousingSearchEvent): Promise<Record<string, any>> {
    const { seekerId, metadata, eventType } = event;
    
    return {
      seekerId: seekerId,
      listingId: '',
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '2.1.0',
      
      // ==================== AI METADATA ====================
      aiEventType: eventType,
      
      // Session Context
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
      sessionSearchFilters: metadata.searchFilters,
      searchPosition: metadata.position,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Transform HousingViewingScheduledEvent to SmartMatchy format
   */
  private async transformViewingScheduledToSmartMatchy(event: HousingViewingScheduledEvent): Promise<Record<string, any>> {
    const { seekerId, listingId, metadata, eventType } = event;
    
    return {
      seekerId: seekerId,
      listingId: listingId,
      vertical: 'HOUSING',
      timestamp: new Date(metadata.timestamp),
      featureSetVersion: '2.1.0',
      
      // ==================== PROVIDER/OWNER IDENTIFIER ====================
      providerId: metadata.listingData.listingCreatorId,
      
      // ==================== AI METADATA ====================
      aiEventType: eventType,
      
      // ==================== VIEWING TRACKING ====================
      viewingId: metadata.viewingId,
      viewingDate: new Date(metadata.viewingDate),
      viewingStatus: 'SCHEDULED',
      
      // ==================== USER PREFERENCES (from metadata.userContext) ====================
      // Budget preferences
      userMinBudget: metadata.userContext?.priceRange?.min,
      userMaxBudget: metadata.userContext?.priceRange?.max,
      userBudgetMidpoint: metadata.userContext?.priceRange?.min && metadata.userContext?.priceRange?.max 
        ? (metadata.userContext.priceRange.min + metadata.userContext.priceRange.max) / 2 
        : null,
      userBudgetFlexibility: metadata.userContext?.budgetFlexibility,
      
      // Bedroom preferences
      userMinBedrooms: metadata.userContext?.preferredBedrooms,
      userMaxBedrooms: metadata.userContext?.preferredBedrooms,
      userMinBathrooms: metadata.userContext?.preferredBathrooms,
      
      // Location preferences (matches new schema)
      userPreferredCities: metadata.userContext?.preferredCities,
      userPreferredNeighborhoods: metadata.userContext?.preferredNeighborhoods,
      userSearchRadiusKm: metadata.userContext?.searchRadiusKm,
      userPreferredLat: metadata.userContext?.latitude,
      userPreferredLng: metadata.userContext?.longitude,
      
      // Property preferences (using preferredTypes, not preferredPropertyTypes)
      userPreferredTypes: metadata.userContext?.preferredTypes,
      
      // Amenities
      userFavoriteAmenities: metadata.userContext?.favoriteAmenities,
      userPrefersFurnished: metadata.userContext?.prefersFurnished,
      userHasPets: metadata.userContext?.hasPets,
      
      // Move-in preferences
      userHouseholdSize: metadata.userContext?.householdSize,
      
      // Agent preference
      userHasAgent: metadata.userContext?.hasAgent,
      
      // ==================== NEW RENTAL PREFERENCES ====================
      userPreferredLeaseTerm: metadata.userContext?.preferredLeaseTerm,
      userRequiresPetFriendly: metadata.userContext?.requiresPetFriendly,
      userRequiresUtilitiesIncluded: metadata.userContext?.requiresUtilitiesIncluded,
      
      // ==================== NEW SALE PREFERENCES ====================
      userRequiresNegotiable: metadata.userContext?.requiresNegotiable,
      userRequiresTitleDeed: metadata.userContext?.requiresTitleDeed,
      
      // ==================== LISTING FEATURES (from metadata.listingData) ====================
      listingPrice: metadata.listingData.price,
      listingCurrency: metadata.listingData.currency || 'KES',
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
      
      // ==================== NEW RENTAL LISTING FIELDS ====================
      listingMinimumLeaseTerm: metadata.listingData.minimumLeaseTerm,
      listingMaximumLeaseTerm: metadata.listingData.maximumLeaseTerm,
      listingDepositAmount: metadata.listingData.depositAmount,
      listingIsPetFriendly: metadata.listingData.isPetFriendly,
      listingUtilitiesIncluded: metadata.listingData.utilitiesIncluded,
      listingUtilitiesDetails: metadata.listingData.utilitiesDetails,
      
      // ==================== NEW SALE LISTING FIELDS ====================
      listingIsNegotiable: metadata.listingData.isNegotiable,
      listingTitleDeedAvailable: metadata.listingData.titleDeedAvailable,
      
      // ==================== HOUSING-SPECIFIC FEATURES ====================
      housingType: metadata.listingData.listingType,
      housingBedrooms: metadata.listingData.bedrooms,
      housingBathrooms: metadata.listingData.bathrooms,
      housingPropertyType: metadata.listingData.propertyType,
      housingNeighborhood: metadata.listingData.locationNeighborhood,
      housingIsFurnished: metadata.listingData.isFurnished,
      housingAmenities: metadata.listingData.amenities,
      housingSquareFootage: metadata.listingData.squareFootage,
      housingYearBuilt: metadata.listingData.yearBuilt,
      
      // ==================== SESSION CONTEXT ====================
      sessionDevice: metadata.deviceType,
      sessionPlatform: metadata.platform,
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
      
      // ==================== INTERACTION CONTEXT ====================
      interactionType: metadata.interactionType,
      scrollDepth: metadata.scrollDepth,
      viewDuration: metadata.viewDuration,
      dwellTime: metadata.timeSpent,
      
      // ==================== VIEWING SPECIFIC ====================
      isAdminBooking: metadata.isAdminBooking,
      viewingDuration: metadata.viewingDuration,
      viewingParticipants: metadata.participants,
      
      // ==================== TEMPORAL FEATURES ====================
      hourOfDay: new Date(metadata.timestamp).getHours(),
      dayOfWeek: new Date(metadata.timestamp).getDay(),
      isWeekend: [0, 6].includes(new Date(metadata.timestamp).getDay()),
      
      // ==================== LABELS ====================
      userScheduledViewing: true,
      
      // ==================== TIMESTAMPS ====================
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Update housing label (save, contact, click, convert, schedule viewing, complete viewing)
   */
  async updateHousingLabel(
    seekerId: string,
    listingId: string,
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING',
    dwellTime?: number,
    metadata?: any
  ): Promise<BaseResponseDto<LabelUpdateResponseDto>> {
    try {
      const result = await this.housingStorage.updateHousingLabel(
        seekerId,
        listingId,
        action,
        dwellTime,
        metadata
      );
      
      if (!result.success) {
        return BaseResponseDto.fail(result.message, result.code);
      }

      const response: LabelUpdateResponseDto = {
        userUuid: seekerId,
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

  // ==================== LISTING MILESTONE METHODS ====================

  async processListingMilestone(data: any): Promise<void> {
    try {
      const rootData = data;
      const milestone = rootData.milestone ?? rootData.metadata?.milestone;
      const accountId = rootData.accountId ?? rootData.metadata?.accountId;
      
      this.logger.log(`Processing listing milestone ${milestone} for account ${accountId}`);

      const getValue = (field: string) => {
        return rootData[field] ?? rootData.metadata?.[field];
      };

      await this.prisma.listingMilestoneEvent.create({
        data: {
          accountId: getValue('accountId'),
          accountName: getValue('accountName'),
          creatorId: getValue('creatorId'),
          creatorName: getValue('creatorName'),
          listingId: getValue('listingId'),
          listingTitle: getValue('listingTitle'),
          listingPrice: getValue('listingPrice'),
          listingType: getValue('listingType'),
          locationCity: getValue('locationCity'),
          categoryId: getValue('categoryId'),
          milestone: getValue('milestone'),
          milestoneTier: getValue('milestoneTier'),
          suggestedTeam: getValue('suggestedTeam'),
          totalListings: getValue('totalListings'),
          totalValue: getValue('totalValue'),
          averagePrice: getValue('averagePrice'),
          message: getValue('message'),
          priority: rootData.routing?.priority ?? rootData.metadata?.routing?.priority ?? 'MEDIUM',
          requiresFollowUp: (getValue('milestone') ?? 0) <= 5,
          deviceType: getValue('deviceType'),
          os: getValue('os'),
          osVersion: getValue('osVersion'),
          browser: getValue('browser'),
          browserVersion: getValue('browserVersion'),
          isBot: getValue('isBot'),
          platform: getValue('platform'),
          occurredAt: new Date(getValue('timestamp') || Date.now())
        }
      });

      await this.updateDailyMilestoneMetrics(rootData);
      await this.updateAccountMilestoneSummary(rootData);

      this.logger.log(`Milestone ${milestone} stored for account ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to process milestone: ${error.message}`);
    }
  }

  /**
   * Update or create account milestone summary
   */
  private async updateAccountMilestoneSummary(metadata: any): Promise<void> {
    try {
      const accountId = metadata.accountId ?? metadata.metadata?.accountId;
      const accountName = metadata.accountName ?? metadata.metadata?.accountName;
      const milestone = metadata.milestone ?? metadata.metadata?.milestone;
      const totalListings = metadata.totalListings ?? metadata.metadata?.totalListings;
      const totalValue = metadata.totalValue ?? metadata.metadata?.totalValue;
      const averagePrice = metadata.averagePrice ?? metadata.metadata?.averagePrice;
      const categoryId = metadata.categoryId ?? metadata.metadata?.categoryId;
      const locationCity = metadata.locationCity ?? metadata.metadata?.locationCity;
      const listingType = metadata.listingType ?? metadata.metadata?.listingType;
      
      if (!accountId || !milestone) {
        this.logger.warn(`Cannot update account summary: missing accountId or milestone`);
        return;
      }
      
      const existing = await this.prisma.accountMilestoneSummary.findUnique({
        where: { accountId }
      });
      
      let daysActive: number | undefined;
      if (milestone === 1) {
        daysActive = 0;
      } else if (existing?.firstListingAt) {
        const firstListingDate = new Date(existing.firstListingAt);
        const now = new Date();
        daysActive = Math.floor((now.getTime() - firstListingDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      if (existing) {
        const existingMilestones = (existing.milestonesAchieved as number[]) || [];
        const updatedMilestones = existingMilestones.includes(milestone) 
          ? existingMilestones 
          : [...existingMilestones, milestone].sort((a, b) => a - b);
        
        await this.prisma.accountMilestoneSummary.update({
          where: { accountId },
          data: {
            accountName: accountName || existing.accountName,
            currentMilestone: totalListings || existing.currentMilestone,
            lastMilestone: milestone,
            lastMilestoneAt: new Date(),
            milestonesAchieved: updatedMilestones,
            totalListings: totalListings || existing.totalListings,
            totalValue: totalValue || existing.totalValue,
            averagePrice: averagePrice || existing.averagePrice,
            primaryCategory: categoryId || existing.primaryCategory,
            primaryLocation: locationCity || existing.primaryLocation,
            primaryListingType: listingType || existing.primaryListingType,
            daysActive: daysActive ?? existing.daysActive,
            lastActiveAt: new Date(),
            isActive: true
          }
        });
      } else {
        await this.prisma.accountMilestoneSummary.create({
          data: {
            accountId,
            accountName: accountName || 'Unknown',
            currentMilestone: totalListings || milestone,
            lastMilestone: milestone,
            lastMilestoneAt: new Date(),
            milestonesAchieved: [milestone],
            totalListings: totalListings || milestone,
            totalValue: totalValue || 0,
            averagePrice: averagePrice || 0,
            primaryCategory: categoryId,
            primaryLocation: locationCity,
            primaryListingType: listingType,
            firstListingAt: milestone === 1 ? new Date() : undefined,
            daysActive: milestone === 1 ? 0 : undefined,
            lastActiveAt: new Date(),
            isActive: true
          }
        });
      }
      
      this.logger.debug(`Updated account milestone summary for ${accountId}`);
    } catch (error) {
      this.logger.error(`Failed to update account milestone summary: ${error.message}`);
    }
  }

  /**
   * Update daily aggregated milestone metrics
   */
  private async updateDailyMilestoneMetrics(metadata: any): Promise<void> {
    try {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      
      const milestone = metadata.milestone ?? metadata.metadata?.milestone;
      const listingPrice = metadata.listingPrice ?? metadata.metadata?.listingPrice;
      
      if (!milestone || !listingPrice) {
        this.logger.warn(`Cannot update daily metrics: missing milestone or listingPrice`);
        return;
      }

      const updateData: any = { 
        totalMilestones: { increment: 1 },
        totalListingValue: { increment: listingPrice }
      };
      
      if (milestone === 1) updateData.milestone1Count = { increment: 1 };
      else if (milestone === 2) updateData.milestone2Count = { increment: 1 };
      else if (milestone === 3) updateData.milestone3Count = { increment: 1 };
      else if (milestone === 5) updateData.milestone5Count = { increment: 1 };
      else if (milestone === 10) updateData.milestone10Count = { increment: 1 };
      else if (milestone === 25) updateData.milestone25Count = { increment: 1 };
      else if (milestone === 50) updateData.milestone50Count = { increment: 1 };
      else if (milestone === 100) updateData.milestone100Count = { increment: 1 };
      
      const milestoneTier = metadata.milestoneTier ?? metadata.metadata?.milestoneTier;
      if (milestoneTier === 'ONBOARDING') {
        updateData.onboardingMilestones = { increment: 1 };
      } else if (milestoneTier === 'ENGAGEMENT') {
        updateData.engagementMilestones = { increment: 1 };
      } else if (milestoneTier === 'GROWTH') {
        updateData.growthMilestones = { increment: 1 };
      } else if (milestoneTier === 'POWER') {
        updateData.powerMilestones = { increment: 1 };
      } else if (milestoneTier === 'PROFESSIONAL') {
        updateData.professionalMilestones = { increment: 1 };
      }
      
      await this.prisma.dailyListingMilestoneMetrics.upsert({
        where: { date },
        update: updateData,
        create: {
          date,
          totalMilestones: 1,
          totalListingValue: listingPrice,
          milestone1Count: milestone === 1 ? 1 : 0,
          milestone2Count: milestone === 2 ? 1 : 0,
          milestone3Count: milestone === 3 ? 1 : 0,
          milestone5Count: milestone === 5 ? 1 : 0,
          milestone10Count: milestone === 10 ? 1 : 0,
          milestone25Count: milestone === 25 ? 1 : 0,
          milestone50Count: milestone === 50 ? 1 : 0,
          milestone100Count: milestone === 100 ? 1 : 0,
          onboardingMilestones: milestoneTier === 'ONBOARDING' ? 1 : 0,
          engagementMilestones: milestoneTier === 'ENGAGEMENT' ? 1 : 0,
          growthMilestones: milestoneTier === 'GROWTH' ? 1 : 0,
          powerMilestones: milestoneTier === 'POWER' ? 1 : 0,
          professionalMilestones: milestoneTier === 'PROFESSIONAL' ? 1 : 0,
        }
      });
      
      this.logger.debug(`Updated daily milestone metrics for ${date.toISOString()}`);
      
    } catch (error) {
      this.logger.error(`Failed to update daily metrics: ${error.message}`);
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

  private extractNeighborhoodFromFilters(filters?: Record<string, unknown>): string | undefined {
    if (!filters) return undefined;
    
    const neighborhoodFields = ['neighborhood', 'locationNeighborhood', 'area', 'location'];
    for (const field of neighborhoodFields) {
      const value = filters[field];
      if (typeof value === 'string') return value;
    }
    return undefined;
  }

  private validateHousingEvent(event: HousingViewEvent): { isValid: boolean; error?: string } {
    if (!event.seekerId) return { isValid: false, error: 'Missing seekerId' };
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

  private isHousingListing(event: HousingViewEvent): boolean {
    const type = event.metadata.listingData.listingType;
    return type === 'RENTAL' || type === 'SALE';
  }

  private calculateAveragePrice(views: any[]): number | null {
    if (views.length === 0) return null;
    const sum = views.reduce((acc, v) => acc + (v.listingPrice || 0), 0);
    return sum / views.length;
  }

  private getTopNeighborhoods(views: any[]): string[] {
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