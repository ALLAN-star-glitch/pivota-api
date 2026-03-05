// analytics/services/housing/housing-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SmartMatchy, Prisma } from '../../../../../generated/prisma/client';
import { BaseResponseDto, ListingDataDto, ListingViewedEventDto } from '@pivota-api/dtos';

@Injectable()
export class HousingStorageService {
  private readonly logger = new Logger(HousingStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store housing listing view in SmartMatchy table
   * Housing-specific storage logic
   */
  async storeHousingView(event: ListingViewedEventDto): Promise<BaseResponseDto<null>> {
    try {
      this.logger.debug(`🏠 Storing housing view: ${event.listingId}`);

      // Calculate listing age
      const listingAge = this.calculateListingAge(event.listingData.createdAt);

      // Housing-specific validation
      if (!this.isValidHousingData(event.listingData)) {
        return BaseResponseDto.fail('Invalid housing data', 'INVALID_DATA');
      }

      // Store in database
      await this.prisma.smartMatchy.create({
        data: {
          // Core identifiers
          userUuid: event.userUuid,
          listingId: event.listingId,
          vertical: 'HOUSING',
          timestamp: new Date(event.timestamp),
          featureSetVersion: 'v1.0',

          // Housing-specific fields
          listingPrice: event.listingData.price,
          listingBedrooms: event.listingData.bedrooms ?? null,
          listingBathrooms: event.listingData.bathrooms ?? null,
          listingPropertyType: event.listingData.listingType,
          listingNeighborhood: event.listingData.locationNeighborhood ?? null,
          listingLat: event.listingData.latitude ?? null,
          listingLng: event.listingData.longitude ?? null,
          listingAge: listingAge,
          listingPhotoCount: event.listingData.imagesCount,
          
          // Session context
          sessionReferrer: event.referrer,
          sessionDevice: event.clientInfo?.device ?? null,
          sessionPlatform: event.platform,
          sessionSearchNeighborhood: event.searchQuery ?? null,

          // All other fields null (will be populated later)
          userMaxBudget: null,
          userMinBudget: null,
          userBudgetMidpoint: null,
          userMinBedrooms: null,
          userMaxBedrooms: null,
          userPropertyType: null,
          userPreferredNeighborhood: null,
          userPreferredLat: null,
          userPreferredLng: null,
          userPreferredRadius: null,
          listingPriceCurrency: 'KES',
          listingVerified: false,
          listingStatus: 'ACTIVE',
          sessionReferrerType: null,
          sessionSearchMaxBudget: null,
          sessionSearchFilters: null,
          isWithinBudget: null,
          priceToBudgetDiff: null,
          priceToBudgetRatio: null,
          bedroomDiff: null,
          meetsBedroomRequirement: null,
          locationDistance: null,
          isPreferredNeighborhood: null,
          propertyTypeMatch: null,
          overallMatchScore: null,
          priceScore: null,
          locationScore: null,
          propertyScore: null,
          recencyScore: null,
          userClicked: null,
          userSaved: null,
          userContacted: null,
          userConverted: null,
          dwellTime: null,
          interactionId: null,
        },
      });

      return BaseResponseDto.ok(null, 'Housing view stored', 'OK');
      
    } catch (error) {
      this.logger.error(`❌ Failed to store housing view: ${error.message}`);
      return BaseResponseDto.fail('Storage failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get housing training data for AI
   */
  async getHousingTrainingData(fromDate: Date, toDate: Date, limit = 10000): Promise<SmartMatchy[]> {
    return this.prisma.smartMatchy.findMany({
      where: {
        vertical: 'HOUSING',
        timestamp: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Update housing-specific labels
   */
  async updateHousingLabel(
    userUuid: string, 
    listingId: string, 
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT',
    dwellTime?: number
  ): Promise<BaseResponseDto<null>> {
    try {
      const updateData: Prisma.SmartMatchyUpdateManyMutationInput = {};
      
      switch (action) {
        case 'SAVE':
          updateData.userSaved = true;
          break;
        case 'CONTACT':
          updateData.userContacted = true;
          break;
        case 'CLICK':
          updateData.userClicked = true;
          if (dwellTime) updateData.dwellTime = dwellTime;
          break;
        case 'CONVERT':
          updateData.userConverted = true;
          break;
      }

      await this.prisma.smartMatchy.updateMany({
        where: {
          userUuid,
          listingId,
          [Object.keys(updateData)[0]]: null,
        },
        data: updateData,
      });

      return BaseResponseDto.ok(null, 'Label updated', 'OK');
      
    } catch (error) {
      this.logger.error(`Failed to update label: ${error.message}`);
      return BaseResponseDto.fail('Update failed', 'INTERNAL_ERROR');
    }
  }

  private calculateListingAge(createdAt: string): number | null {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      return Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  private isValidHousingData(data: ListingDataDto): boolean {
  // Housing-specific validation
  return !!(
    data.price &&
    data.locationCity &&
    (data.listingType === 'RENTAL' || data.listingType === 'SALE')
  );
}
}