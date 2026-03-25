/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/admin-service/src/modules/housing/business-analytics/services/house-preferences.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface HousingPreferencesEvent {
  userUuid: string;
  timestamp: string;
  action: 'CREATED' | 'UPDATED';
  data: {
    minBudget?: number;
    maxBudget?: number;
    budgetMidpoint?: number | null;
    preferredLocations?: string[];
    preferredNeighborhoods?: string[];
    preferredPropertyTypes?: string[];
    minBedrooms?: number;
    maxBedrooms?: number;
    moveInDate?: string;
    hasPets?: boolean;
    latitude?: number;
    longitude?: number;
    searchRadiusKm?: number;
  };
}

@Injectable()
export class HousePreferencesService {
  private readonly logger = new Logger(HousePreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process the housing preferences event and update UserHousingPreferences table
   */
  async processPreferencesEvent(event: HousingPreferencesEvent): Promise<void> {
    const { userUuid, data } = event;
    
    try {
      this.logger.log(`🔄 Processing preferences for user ${userUuid}`);

      // Prepare preferences data for UserHousingPreferences table
      const preferencesData: any = {};

      // Budget preferences
      if (data.minBudget !== undefined) preferencesData.minBudget = data.minBudget;
      if (data.maxBudget !== undefined) preferencesData.maxBudget = data.maxBudget;
      if (data.budgetMidpoint !== undefined) preferencesData.budgetMidpoint = data.budgetMidpoint;
      
      // Bedroom preferences
      if (data.minBedrooms !== undefined) preferencesData.minBedrooms = data.minBedrooms;
      
      // Location preferences
      if (data.preferredLocations && data.preferredLocations.length > 0) {
        preferencesData.preferredLocations = data.preferredLocations;
        preferencesData.preferredNeighborhood = data.preferredLocations[0];
      }
      
      if (data.preferredNeighborhoods && data.preferredNeighborhoods.length > 0) {
        preferencesData.preferredNeighborhoods = data.preferredNeighborhoods;
      }
      
      // Property type preferences
      if (data.preferredPropertyTypes && data.preferredPropertyTypes.length > 0) {
        preferencesData.preferredPropertyTypes = data.preferredPropertyTypes;
        preferencesData.preferredPropertyType = data.preferredPropertyTypes[0];
        
        // Map property type to housing type
        const propertyType = data.preferredPropertyTypes[0].toUpperCase();
        if (propertyType === 'RENTAL' || propertyType === 'RENT') {
          preferencesData.preferredHousingType = 'RENTAL';
        } else if (propertyType === 'SALE' || propertyType === 'BUY') {
          preferencesData.preferredHousingType = 'SALE';
        } else if (propertyType === 'SHORT_STAY' || propertyType === 'HOLIDAY') {
          preferencesData.preferredHousingType = 'SHORT_STAY';
        }
      }
      
      // Location coordinates
      if (data.latitude !== undefined) preferencesData.preferredLat = data.latitude;
      if (data.longitude !== undefined) preferencesData.preferredLng = data.longitude;
      if (data.searchRadiusKm !== undefined) preferencesData.searchRadiusKm = data.searchRadiusKm;
      
      // Move-in date
      if (data.moveInDate !== undefined) {
        preferencesData.preferredMoveInDate = new Date(data.moveInDate);
      }
      
      // Pet preference
      if (data.hasPets !== undefined) {
        preferencesData.hasPets = data.hasPets;
      }
      
      // Furnished preference (if property types indicate)
      if (data.preferredPropertyTypes && data.preferredPropertyTypes.includes('FURNISHED')) {
        preferencesData.prefersFurnished = true;
      }

      // Upsert user preferences (create or update)
      await this.prisma.userHousingPreferences.upsert({
        where: { userUuid },
        update: preferencesData,
        create: {
          userUuid,
          ...preferencesData,
        }
      });
      
      this.logger.log(`✅ Updated user preferences for ${userUuid}`);
      
    } catch (error) {
      this.logger.error(`Failed to process preferences event: ${error.message}`);
    }
  }

  /**
   * Get user preferences for debugging and verification
   */
  async getUserPreferences(userUuid: string): Promise<any> {
    try {
      const preferences = await this.prisma.userHousingPreferences.findUnique({
        where: { userUuid }
      });

      if (!preferences) {
        return null;
      }

      return {
        userUuid: preferences.userUuid,
        budget: {
          min: preferences.minBudget,
          max: preferences.maxBudget,
          midpoint: preferences.budgetMidpoint,
        },
        bedrooms: {
          min: preferences.minBedrooms,
        },
        location: {
          preferredNeighborhood: preferences.preferredNeighborhood,
          preferredLocations: preferences.preferredLocations,
          preferredNeighborhoods: preferences.preferredNeighborhoods,
          lat: preferences.preferredLat,
          lng: preferences.preferredLng,
          searchRadiusKm: preferences.searchRadiusKm,
        },
        property: {
          preferredType: preferences.preferredPropertyType,
          preferredTypes: preferences.preferredPropertyTypes,
          preferredHousingType: preferences.preferredHousingType,
        },
        amenities: {
          prefersFurnished: preferences.prefersFurnished,
          hasPets: preferences.hasPets,
        },
        moveIn: {
          preferredDate: preferences.preferredMoveInDate?.toISOString(),
        },
        createdAt: preferences.createdAt.toISOString(),
        updatedAt: preferences.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get user preferences: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete user preferences (for account deletion)
   */
  async deleteUserPreferences(userUuid: string): Promise<boolean> {
    try {
      await this.prisma.userHousingPreferences.delete({
        where: { userUuid }
      });
      this.logger.log(`✅ Deleted user preferences for ${userUuid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete user preferences: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has preferences set
   */
  async hasUserPreferences(userUuid: string): Promise<boolean> {
    try {
      const count = await this.prisma.userHousingPreferences.count({
        where: { userUuid }
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check user preferences: ${error.message}`);
      return false;
    }
  }
}