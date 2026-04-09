/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HousingViewEvent } from '@pivota-api/interfaces';

@Injectable()
export class HousingStorageService {
  private readonly logger = new Logger(HousingStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store housing listing view in SmartMatchy tables
   * Stores data in SmartMatchyBase + SmartMatchyHousing
   * Fetches user preferences to calculate match scores
   */
  async storeHousingView(data: any): Promise<{ success: boolean; message?: string; code?: string }> {
    try {
      this.logger.debug(`Storing housing view: ${data.listingId}`);

      // Fetch user preferences from UserHousingPreferences table using seekerId
      const userPrefs = await this.prisma.userHousingPreferences.findUnique({
        where: { seekerId: data.seekerId }
      });

      // Separate base data from housing-specific data
      const { 
        // Housing-specific fields (go to SmartMatchyHousing)
        housingType,
        housingBedrooms,
        housingBathrooms,
        housingPropertyType,
        housingNeighborhood,
        housingIsFurnished,
        housingAmenities,
        housingMinimumStay,
        housingSquareFootage,
        housingYearBuilt,
        housingPetPolicy,
        // NEW RENTAL FIELDS
        listingMinimumLeaseTerm,
        listingMaximumLeaseTerm,
        listingDepositAmount,
        listingIsPetFriendly,
        listingUtilitiesIncluded,
        listingUtilitiesDetails,
        // NEW SALE FIELDS
        listingIsNegotiable,
        listingTitleDeedAvailable,
        // Tracking fields
        viewingId,
        viewingDate,
        viewingStatus,
        userScheduledViewing,
        userCompletedViewing,
        // Base fields (go to SmartMatchyBase)
        ...baseData
      } = data;

      // Calculate match scores using user preferences
      const matchScores = this.calculateMatchScores(data, userPrefs);

      // Create base record
      const baseRecord = await this.prisma.smartMatchyBase.create({
        data: {
          // Core identifiers
          seekerId: baseData.seekerId,
          listingId: baseData.listingId,
          vertical: baseData.vertical,
          timestamp: baseData.timestamp,
          featureSetVersion: baseData.featureSetVersion,
          
          // Provider/owner identifier
          providerId: baseData.providerId,
          
          // Raw location data
          seekerLat: baseData.userLat,
          seekerLng: baseData.userLng,
          listingLat: baseData.listingLat,
          listingLng: baseData.listingLng,
          locationDistance: matchScores.locationDistance,
          
          // Raw pricing data
          listingPrice: baseData.listingPrice,
          listingCurrency: baseData.listingCurrency,
          
          // Session data
          sessionDevice: baseData.sessionDevice,
          sessionPlatform: baseData.sessionPlatform,
          deviceType: baseData.deviceType,
          os: baseData.os,
          browser: baseData.browser,
          isBot: baseData.isBot,
          
          // Interaction data
          interactionType: baseData.interactionType,
          scrollDepth: baseData.scrollDepth,
          viewDuration: baseData.viewDuration,
          dwellTime: baseData.dwellTime,
          
          // Temporal features
          hourOfDay: baseData.hourOfDay,
          dayOfWeek: baseData.dayOfWeek,
          isWeekend: baseData.isWeekend,
          
          // Match scores
          locationScore: matchScores.locationScore,
          priceScore: matchScores.priceScore,
          recencyScore: matchScores.recencyScore,
          overallMatchScore: matchScores.overallMatchScore,
          
          // Labels
          userClicked: baseData.userClicked,
          userSaved: baseData.userSaved,
          userContacted: baseData.userContacted,
          userConverted: baseData.userConverted,
          engagementScore: matchScores.engagementScore,
          
          // AI metadata
          aiEventType: baseData.aiEventType,
          recommendationId: baseData.recommendationId,
          experimentId: baseData.experimentId,
          experimentVariant: baseData.experimentVariant,
          
          // Timestamps
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create housing-specific record
      await this.prisma.smartMatchyHousing.create({
        data: {
          baseId: baseRecord.id,
          
          // Listing features
          housingType,
          housingBedrooms,
          housingBathrooms,
          housingPropertyType,
          housingNeighborhood,
          housingIsFurnished: housingIsFurnished ?? false,
          housingAmenities,
          housingMinimumStay,
          housingSquareFootage,
          housingYearBuilt,
          housingPetPolicy,
          
          // NEW RENTAL FIELDS
          listingMinimumLeaseTerm,
          listingMaximumLeaseTerm,
          listingDepositAmount,
          listingIsPetFriendly: listingIsPetFriendly ?? false,
          listingUtilitiesIncluded: listingUtilitiesIncluded ?? false,
          listingUtilitiesDetails,
          
          // NEW SALE FIELDS
          listingIsNegotiable: listingIsNegotiable ?? true,
          listingTitleDeedAvailable: listingTitleDeedAvailable ?? false,
          
          // Listing owner (maps to providerId in base)
          listingOwnerId: baseData.providerId,
          
          // Match scores
          priceToBudgetRatio: matchScores.priceToBudgetRatio,
          isWithinBudget: matchScores.isWithinBudget,
          bedroomsMatch: matchScores.bedroomsMatch,
          bathroomsMatch: matchScores.bathroomsMatch,
          propertyTypeMatch: matchScores.propertyTypeMatch,
          furnishedMatch: matchScores.furnishedMatch,
          
          // NEW RENTAL MATCH SCORES
          leaseTermMatch: matchScores.leaseTermMatch,
          petFriendlyMatch: matchScores.petFriendlyMatch,
          utilitiesMatch: matchScores.utilitiesMatch,
          
          // NEW SALE MATCH SCORES
          negotiableMatch: matchScores.negotiableMatch,
          titleDeedMatch: matchScores.titleDeedMatch,
          
          // Viewing tracking
          viewingId: viewingId || null,
          viewingDate: viewingDate ? new Date(viewingDate) : null,
          viewingStatus: viewingStatus || null,
          
          // Labels
          userScheduledViewing: userScheduledViewing ?? false,
          userCompletedViewing: userCompletedViewing ?? false,
        },
      });

      return { success: true };
      
    } catch (error) {
      this.logger.error(`Failed to store housing view: ${error.message}`);
      return { 
        success: false, 
        message: error.message,
        code: 'STORAGE_ERROR'
      };
    }
  }

  /**
   * Calculate match scores using user preferences and listing data
   */
  private calculateMatchScores(listingData: any, userPrefs: any): {
    // Base table scores
    locationDistance?: number;
    locationScore?: number;
    priceScore?: number;
    recencyScore?: number;
    overallMatchScore?: number;
    engagementScore?: number;
    // Housing table scores
    priceToBudgetRatio?: number;
    isWithinBudget?: boolean;
    bedroomsMatch?: boolean;
    bathroomsMatch?: boolean;
    propertyTypeMatch?: boolean;
    furnishedMatch?: boolean;
    // NEW RENTAL MATCH SCORES
    leaseTermMatch?: boolean;
    petFriendlyMatch?: boolean;
    utilitiesMatch?: boolean;
    // NEW SALE MATCH SCORES
    negotiableMatch?: boolean;
    titleDeedMatch?: boolean;
  } {
    const scores: any = {};

    if (!userPrefs) {
      return scores;
    }

    // ==================== PRICE MATCH ====================
    if (listingData.listingPrice && userPrefs.maxBudget) {
      scores.priceToBudgetRatio = listingData.listingPrice / userPrefs.maxBudget;
      scores.isWithinBudget = listingData.listingPrice <= userPrefs.maxBudget;
      
      if (scores.isWithinBudget) {
        scores.priceScore = 1 - (listingData.listingPrice / userPrefs.maxBudget);
      } else {
        scores.priceScore = Math.max(0, 1 - ((listingData.listingPrice - userPrefs.maxBudget) / userPrefs.maxBudget));
      }
    }

    // ==================== BEDROOM MATCH ====================
    if (listingData.listingBedrooms !== undefined && userPrefs.minBedrooms !== undefined) {
      scores.bedroomsMatch = listingData.listingBedrooms >= userPrefs.minBedrooms;
    }

    // ==================== BATHROOM MATCH ====================
    if (listingData.listingBathrooms !== undefined && userPrefs.minBathrooms !== undefined) {
      scores.bathroomsMatch = listingData.listingBathrooms >= userPrefs.minBathrooms;
    }

    // ==================== PROPERTY TYPE MATCH ====================
    if (listingData.listingPropertyType && userPrefs.preferredTypes && userPrefs.preferredTypes.length > 0) {
      scores.propertyTypeMatch = userPrefs.preferredTypes.includes(listingData.listingPropertyType);
    } else if (listingData.listingPropertyType && userPrefs.preferredPropertyType) {
      scores.propertyTypeMatch = listingData.listingPropertyType === userPrefs.preferredPropertyType;
    }

    // ==================== FURNISHED MATCH ====================
    if (listingData.listingIsFurnished !== undefined && userPrefs.prefersFurnished !== undefined) {
      scores.furnishedMatch = listingData.listingIsFurnished === userPrefs.prefersFurnished;
    }

    // ==================== NEW RENTAL MATCH SCORES ====================
    // Lease term match (check if listing's lease term fits within user's preference)
    if (userPrefs.preferredLeaseTerm !== undefined && listingData.listingMinimumLeaseTerm !== undefined) {
      scores.leaseTermMatch = listingData.listingMinimumLeaseTerm <= userPrefs.preferredLeaseTerm;
    }
    
    // Pet friendly match
    if (userPrefs.requiresPetFriendly !== undefined && listingData.listingIsPetFriendly !== undefined) {
      if (userPrefs.requiresPetFriendly) {
        scores.petFriendlyMatch = listingData.listingIsPetFriendly === true;
      } else {
        scores.petFriendlyMatch = true; // Not required, so always matches
      }
    }
    
    // Utilities included match
    if (userPrefs.requiresUtilitiesIncluded !== undefined && listingData.listingUtilitiesIncluded !== undefined) {
      if (userPrefs.requiresUtilitiesIncluded) {
        scores.utilitiesMatch = listingData.listingUtilitiesIncluded === true;
      } else {
        scores.utilitiesMatch = true; // Not required, so always matches
      }
    }

    // ==================== NEW SALE MATCH SCORES ====================
    // Negotiable match
    if (userPrefs.requiresNegotiable !== undefined && listingData.listingIsNegotiable !== undefined) {
      if (userPrefs.requiresNegotiable) {
        scores.negotiableMatch = listingData.listingIsNegotiable === true;
      } else {
        scores.negotiableMatch = true; // Not required, so always matches
      }
    }
    
    // Title deed match
    if (userPrefs.requiresTitleDeed !== undefined && listingData.listingTitleDeedAvailable !== undefined) {
      if (userPrefs.requiresTitleDeed) {
        scores.titleDeedMatch = listingData.listingTitleDeedAvailable === true;
      } else {
        scores.titleDeedMatch = true; // Not required, so always matches
      }
    }

    // ==================== LOCATION MATCH ====================
    if (listingData.listingLat && listingData.listingLng && userPrefs.preferredLat && userPrefs.preferredLng) {
      const distance = this.calculateDistance(
        listingData.listingLat,
        listingData.listingLng,
        userPrefs.preferredLat,
        userPrefs.preferredLng
      );
      scores.locationDistance = distance;
      
      const maxRadius = userPrefs.searchRadiusKm || 10;
      scores.locationScore = Math.max(0, 1 - (distance / maxRadius));
    }

    // ==================== RECENCY SCORE ====================
    if (listingData.listingAge !== undefined) {
      scores.recencyScore = Math.max(0, 1 - (listingData.listingAge / 30));
    }

    // ==================== ENGAGEMENT SCORE ====================
    let engagementScore = 0;
    if (listingData.userClicked) engagementScore += 0.2;
    if (listingData.userSaved) engagementScore += 0.25;
    if (listingData.userContacted) engagementScore += 0.3;
    if (listingData.userScheduledViewing) engagementScore += 0.4;
    if (listingData.userCompletedViewing) engagementScore += 0.5;
    if (listingData.userConverted) engagementScore += 0.6;
    
    if (listingData.dwellTime) {
      engagementScore += Math.min(0.25, listingData.dwellTime / 120);
    }
    
    if (listingData.scrollDepth && listingData.scrollDepth > 50) {
      engagementScore += 0.1;
    }
    
    scores.engagementScore = Math.min(1.0, engagementScore);

    // ==================== OVERALL MATCH SCORE ====================
    let totalWeight = 0;
    let weightedSum = 0;

    if (scores.priceScore !== undefined) {
      weightedSum += scores.priceScore * 0.25;
      totalWeight += 0.25;
    }
    if (scores.locationScore !== undefined) {
      weightedSum += scores.locationScore * 0.2;
      totalWeight += 0.2;
    }
    if (scores.bedroomsMatch !== undefined) {
      weightedSum += (scores.bedroomsMatch ? 1 : 0) * 0.15;
      totalWeight += 0.15;
    }
    if (scores.propertyTypeMatch !== undefined) {
      weightedSum += (scores.propertyTypeMatch ? 1 : 0) * 0.1;
      totalWeight += 0.1;
    }
    if (scores.furnishedMatch !== undefined) {
      weightedSum += (scores.furnishedMatch ? 1 : 0) * 0.05;
      totalWeight += 0.05;
    }
    // NEW RENTAL WEIGHTS
    if (scores.leaseTermMatch !== undefined) {
      weightedSum += (scores.leaseTermMatch ? 1 : 0) * 0.1;
      totalWeight += 0.1;
    }
    if (scores.petFriendlyMatch !== undefined) {
      weightedSum += (scores.petFriendlyMatch ? 1 : 0) * 0.05;
      totalWeight += 0.05;
    }
    if (scores.utilitiesMatch !== undefined) {
      weightedSum += (scores.utilitiesMatch ? 1 : 0) * 0.05;
      totalWeight += 0.05;
    }
    // NEW SALE WEIGHTS
    if (scores.negotiableMatch !== undefined) {
      weightedSum += (scores.negotiableMatch ? 1 : 0) * 0.1;
      totalWeight += 0.1;
    }
    if (scores.titleDeedMatch !== undefined) {
      weightedSum += (scores.titleDeedMatch ? 1 : 0) * 0.1;
      totalWeight += 0.1;
    }

    if (totalWeight > 0) {
      scores.overallMatchScore = weightedSum / totalWeight;
    }

    return scores;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  async storeRawAIEvent(event: HousingViewEvent): Promise<{ success: boolean; message?: string }> {
    try {
      this.logger.debug(`Raw AI event: ${JSON.stringify({
        seekerId: event.seekerId,
        listingId: event.listingId,
        eventType: event.eventType,
        timestamp: event.metadata.timestamp
      })}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to store raw event: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async updateHousingLabel(
    seekerId: string, 
    listingId: string, 
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING',
    dwellTime?: number,
    metadata?: any
  ): Promise<{ success: boolean; message?: string; code?: string }> {
    try {
      const baseRecord = await this.prisma.smartMatchyBase.findFirst({
        where: {
          seekerId,
          listingId,
          vertical: 'HOUSING'
        }
      });

      if (!baseRecord) {
        return { 
          success: false, 
          message: 'No matching record found',
          code: 'NOT_FOUND'
        };
      }

      switch (action) {
        case 'SAVE':
          await this.prisma.smartMatchyBase.update({
            where: { id: baseRecord.id },
            data: { userSaved: true }
          });
          break;
        case 'CONTACT':
          await this.prisma.smartMatchyBase.update({
            where: { id: baseRecord.id },
            data: { userContacted: true }
          });
          break;
        case 'CLICK':
          await this.prisma.smartMatchyBase.update({
            where: { id: baseRecord.id },
            data: { 
              userClicked: true,
              dwellTime: dwellTime ?? undefined
            }
          });
          break;
        case 'CONVERT':
          await this.prisma.smartMatchyBase.update({
            where: { id: baseRecord.id },
            data: { userConverted: true }
          });
          break;
        case 'SCHEDULE_VIEWING':
          await this.prisma.smartMatchyHousing.update({
            where: { baseId: baseRecord.id },
            data: { 
              userScheduledViewing: true,
              viewingId: metadata?.viewingId,
              viewingDate: metadata?.viewingDate ? new Date(metadata.viewingDate) : undefined,
              viewingStatus: 'SCHEDULED'
            }
          });
          break;
        case 'COMPLETE_VIEWING':
          await this.prisma.smartMatchyHousing.update({
            where: { baseId: baseRecord.id },
            data: { 
              userCompletedViewing: true,
              viewingStatus: 'COMPLETED'
            }
          });
          break;
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update label: ${error.message}`);
      return { 
        success: false, 
        message: error.message,
        code: 'INTERNAL_ERROR'
      };
    }
  }

  async deleteOldRecords(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const baseRecords = await this.prisma.smartMatchyBase.findMany({
      where: {
        timestamp: { lt: cutoffDate },
        vertical: 'HOUSING',
        OR: [
          { userSaved: null },
          { userContacted: null },
          { userConverted: null }
        ]
      },
      select: { id: true }
    });

    const baseIds = baseRecords.map(r => r.id);

    if (baseIds.length === 0) return 0;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.smartMatchyHousing.deleteMany({
        where: { baseId: { in: baseIds } }
      });
      const deleted = await tx.smartMatchyBase.deleteMany({
        where: { id: { in: baseIds } }
      });
      return deleted.count;
    });

    return result;
  }
}