/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { SmartMatchy, Prisma } from '../../../../../../generated/prisma/client';
import { HousingViewEvent } from '@pivota-api/interfaces';

@Injectable()
export class HousingStorageService {
  private readonly logger = new Logger(HousingStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store housing listing view in SmartMatchy table
   * Now accepts the transformed SmartMatchy data
   */
  async storeHousingView(data: any): Promise<{ success: boolean; message?: string; code?: string }> {
    try {
      this.logger.debug(`🏠 Storing housing view: ${data.listingId}`);

      await this.prisma.smartMatchy.create({
        data: data,
      });

      return { success: true };
      
    } catch (error) {
      this.logger.error(`❌ Failed to store housing view: ${error.message}`);
      return { 
        success: false, 
        message: error.message,
        code: 'STORAGE_ERROR'
      };
    }
  }

  /**
   * Store raw AI event for audit/reprocessing
   */
  async storeRawAIEvent(event: HousingViewEvent): Promise<{ success: boolean; message?: string }> {
    try {
      // Create a raw events table if you have one, or log to file
      // For now, we'll just log it
      this.logger.debug(`📦 Raw AI event: ${JSON.stringify({
        userId: event.userId,
        listingId: event.listingId,
        eventType: event.eventType,
        timestamp: event.metadata.timestamp
      })}`);
      
      // If you have an AIEvent model, you can store it like this:
      /*
      await this.prisma.aIEvent.create({
        data: {
          eventId: `${event.userId}_${event.listingId}_${Date.now()}`,
          userId: event.userId,
          listingId: event.listingId,
          eventType: event.eventType,
          vertical: 'HOUSING',
          payload: event as any,
          eventTimestamp: new Date(event.metadata.timestamp),
          receivedAt: new Date(),
          isProcessed: true,
          processedAt: new Date()
        }
      });
      */
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to store raw event: ${error.message}`);
      return { success: false, message: error.message };
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
   * Get housing training data with filters for AI
   */
  /**
 * Get housing training data with filters for AI
 */
async getFilteredHousingTrainingData(
  fromDate: Date, 
  toDate: Date, 
  filters: {
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    neighborhoods?: string[];
    propertyTypes?: string[];
    onlyWithLabels?: boolean;
  },
  limit = 10000
): Promise<SmartMatchy[]> {
  const where: Prisma.SmartMatchyWhereInput = {
    vertical: 'HOUSING',
    timestamp: {
      gte: fromDate,
      lte: toDate,
    },
  };

  if (filters.minPrice !== undefined) {
    where.listingPrice = {
      ...(where.listingPrice as Prisma.FloatFilter),
      gte: filters.minPrice
    };
  }
  
  if (filters.maxPrice !== undefined) {
    where.listingPrice = {
      ...(where.listingPrice as Prisma.FloatFilter),
      lte: filters.maxPrice
    };
  }
  
  if (filters.minBedrooms !== undefined) {
    where.listingBedrooms = {
      gte: filters.minBedrooms
    };
  }
  
  if (filters.neighborhoods?.length) {
    where.listingNeighborhood = {
      in: filters.neighborhoods
    };
  }
  
  if (filters.propertyTypes?.length) {
    where.listingPropertyType = {
      in: filters.propertyTypes
    };
  }
  
  if (filters.onlyWithLabels) {
    where.OR = [
      { userSaved: true },
      { userContacted: true },
      { userConverted: true }
    ];
  }

  return this.prisma.smartMatchy.findMany({
    where,
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
    action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING',
    dwellTime?: number,
    metadata?: any
  ): Promise<{ success: boolean; message?: string; code?: string }> {
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
        case 'SCHEDULE_VIEWING':
          updateData.userScheduledViewing = true;
          if (metadata?.viewingDate) {
            updateData.viewingDate = new Date(metadata.viewingDate);
          }
          break;
        case 'COMPLETE_VIEWING':
          updateData.userCompletedViewing = true;
          updateData.viewingCompletedAt = new Date();
          if (metadata?.feedback) {
            updateData.viewingFeedback = metadata.feedback;
          }
          break;
      }

      const result = await this.prisma.smartMatchy.updateMany({
        where: {
          userUuid,
          listingId,
        },
        data: updateData,
      });

      if (result.count === 0) {
        return { 
          success: false, 
          message: 'No matching record found',
          code: 'NOT_FOUND'
        };
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

  /**
   * Get user stats for housing
   */
  async getUserHousingStats(userUuid: string): Promise<{
    totalViews: number;
    averagePrice: number | null;
    favoriteNeighborhoods: string[];
    savedCount: number;
    contactedCount: number;
  }> {
    const views = await this.prisma.smartMatchy.findMany({
      where: {
        userUuid,
        vertical: 'HOUSING',
        userClicked: true
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    const savedCount = await this.prisma.smartMatchy.count({
      where: {
        userUuid,
        vertical: 'HOUSING',
        userSaved: true
      }
    });

    const contactedCount = await this.prisma.smartMatchy.count({
      where: {
        userUuid,
        vertical: 'HOUSING',
        userContacted: true
      }
    });

    return {
      totalViews: views.length,
      averagePrice: this.calculateAveragePrice(views),
      favoriteNeighborhoods: this.getTopNeighborhoods(views),
      savedCount,
      contactedCount
    };
  }

  /**
   * Delete old records (for data retention policies)
   */
  async deleteOldRecords(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.smartMatchy.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        },
        // Only delete unlabeled or processed records
        OR: [
          { userSaved: null },
          { userContacted: null },
          { userConverted: null }
        ]
      }
    });

    return result.count;
  }

  // ==================== HELPER METHODS ====================

  private calculateAveragePrice(views: SmartMatchy[]): number | null {
    if (views.length === 0) return null;
    const sum = views.reduce((acc, v) => acc + (v.listingPrice || 0), 0);
    return sum / views.length;
  }

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

  private calculateListingAge(createdAt: string): number | null {
    try {
      const created = new Date(createdAt);
      const now = new Date();
      return Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }
}