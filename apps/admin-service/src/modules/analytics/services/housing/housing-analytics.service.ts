// analytics/services/housing/housing-analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HousingStorageService } from './housing-storage.service';
import { 
  BaseResponseDto, 
  ListingViewedEventDto,
  UserHousingStatsResponseDto,
  HousingTrainingDataResponseDto,
  LabelUpdateResponseDto,
  HousingViewRecordDto  
} from '@pivota-api/dtos';
import { SmartMatchy } from '../../../../../generated/prisma/client';

export interface HousingViewedEvent {
  key: string; // userId
  value: ListingViewedEventDto;
}

@Injectable()
export class HousingAnalyticsService {
  private readonly logger = new Logger(HousingAnalyticsService.name);

  constructor(
    private readonly housingStorage: HousingStorageService,
  ) {}

  /**
   * Process housing listing viewed events directly
   */
  async processHousingView(event: HousingViewedEvent): Promise<BaseResponseDto<null>> {
    try {
      const value = event.value;
      
      this.logger.debug(`🏠 Processing housing view for user ${value.userUuid}, listing ${value.listingId}`);

      // 1. Validate it's a housing listing
      if (!this.isHousingListing(value)) {
        return BaseResponseDto.fail('Not a housing listing', 'INVALID_VERTICAL');
      }

      // 2. Validate required fields
      const validationResult = this.validateHousingEvent(value);
      if (!validationResult.isValid) {
        return BaseResponseDto.fail(`Invalid event: ${validationResult.error}`, 'INVALID_EVENT');
      }

      // 3. Store using housing-specific storage service
      const result = await this.housingStorage.storeHousingView(value);
      
      if (!result.success) {
        return BaseResponseDto.fail(
          `Storage failed: ${result.message}`,
          result.code
        );
      }

      return BaseResponseDto.ok(null, 'Housing view processed successfully', 'OK');
      
    } catch (error) {
      this.logger.error(`❌ Failed to process housing view: ${error.message}`);
      return BaseResponseDto.fail('Processing failed', 'INTERNAL_ERROR');
    }
  }

  /**
   * Validate housing-specific event
   */
  private validateHousingEvent(event: ListingViewedEventDto): { isValid: boolean; error?: string } {
    if (!event.userUuid) return { isValid: false, error: 'Missing userUuid' };
    if (!event.listingId) return { isValid: false, error: 'Missing listingId' };
    if (!event.listingData) return { isValid: false, error: 'Missing listingData' };
    
    // Housing-specific validation
    if (!event.listingData.price || event.listingData.price <= 0) {
      return { isValid: false, error: 'Invalid price' };
    }
    
    if (!event.listingData.locationCity) {
      return { isValid: false, error: 'Missing location city' };
    }
    
    return { isValid: true };
  }

  /**
   * Check if this is a housing listing
   */
  private isHousingListing(event: ListingViewedEventDto): boolean {
    const type = event.listingData.listingType;
    return type === 'RENTAL' || type === 'SALE';
  }

  /**
   * Get housing-specific analytics for a user
   */
  async getUserHousingStats(userUuid: string): Promise<BaseResponseDto<UserHousingStatsResponseDto>> {
    try {
      // Get training data from housing storage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const housingViews = await this.housingStorage.getHousingTrainingData(
        thirtyDaysAgo,
        new Date(),
        1000
      );
      
      // Filter for specific user
      const userViews = housingViews.filter(v => v.userUuid === userUuid);
      
      // Map to response DTO
      const recentViews: HousingViewRecordDto[] = userViews.slice(0, 10).map(v => ({
        listingId: v.listingId,
        price: v.listingPrice || 0,
        neighborhood: v.listingNeighborhood,
        viewedAt: v.timestamp
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
      );
      
      const response: HousingTrainingDataResponseDto = {
        recordCount: data.length,
        sampleData: data.slice(0, 5),
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
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT',
    dwellTime?: number
  ): Promise<BaseResponseDto<LabelUpdateResponseDto>> {
    try {
      const result = await this.housingStorage.updateHousingLabel(
        userUuid,
        listingId,
        action,
        dwellTime
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