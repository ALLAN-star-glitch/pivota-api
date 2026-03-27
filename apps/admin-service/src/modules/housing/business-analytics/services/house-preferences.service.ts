/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/admin-service/src/modules/housing/business-analytics/services/house-preferences.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface HousingPreferencesEvent {
  seekerId: string;
  timestamp: string;
  action: 'CREATED' | 'UPDATED';
  data: {
    // Budget preferences
    minBudget?: number;
    maxBudget?: number;
    budgetMidpoint?: number | null;
    budgetFlexibility?: number;
    
    // Bedroom preferences
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    
    // Location preferences (matches new schema)
    preferredCities?: string[];           // Array of preferred cities
    preferredNeighborhoods?: string[];    // Array of preferred neighborhoods
    latitude?: number;
    longitude?: number;
    searchRadiusKm?: number;
    
    // Property preferences (matches new schema)
    preferredTypes?: string[];            // Array of preferred property types
    preferredHousingType?: string;        // RENTAL, SALE, SHORT_STAY
    
    // Amenities
    favoriteAmenities?: string[];
    prefersFurnished?: boolean;
    hasPets?: boolean;
    
    // Move-in preferences
    moveInDate?: string;
    householdSize?: number;
    
    // Agent preference
    hasAgent?: boolean;
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
    const { seekerId, data } = event;
    
    try {
      this.logger.log(`Processing preferences for seeker ${seekerId}`);

      // Prepare preferences data for UserHousingPreferences table
      const preferencesData: any = {};

      // ==================== BUDGET PREFERENCES ====================
      if (data.minBudget !== undefined) preferencesData.minBudget = data.minBudget;
      if (data.maxBudget !== undefined) preferencesData.maxBudget = data.maxBudget;
      if (data.budgetMidpoint !== undefined) preferencesData.budgetMidpoint = data.budgetMidpoint;
      if (data.budgetFlexibility !== undefined) preferencesData.budgetFlexibility = data.budgetFlexibility;
      
      // ==================== BEDROOM PREFERENCES ====================
      if (data.minBedrooms !== undefined) preferencesData.minBedrooms = data.minBedrooms;
      if (data.maxBedrooms !== undefined) preferencesData.maxBedrooms = data.maxBedrooms;
      if (data.minBathrooms !== undefined) preferencesData.minBathrooms = data.minBathrooms;
      
      // ==================== LOCATION PREFERENCES ====================
      // Handle preferred cities (JSON array)
      if (data.preferredCities !== undefined && data.preferredCities.length > 0) {
        preferencesData.preferredCities = data.preferredCities;
      }
      
      // Handle preferred neighborhoods (JSON array)
      if (data.preferredNeighborhoods !== undefined && data.preferredNeighborhoods.length > 0) {
        preferencesData.preferredNeighborhoods = data.preferredNeighborhoods;
      }
      
      // Location coordinates
      if (data.latitude !== undefined) preferencesData.preferredLat = data.latitude;
      if (data.longitude !== undefined) preferencesData.preferredLng = data.longitude;
      if (data.searchRadiusKm !== undefined) preferencesData.searchRadiusKm = data.searchRadiusKm;
      
      // ==================== PROPERTY PREFERENCES ====================
      // Handle preferred property types (JSON array)
      if (data.preferredTypes !== undefined && data.preferredTypes.length > 0) {
        preferencesData.preferredTypes = data.preferredTypes;
        
        // Auto-set preferredHousingType based on property type
        const propertyType = data.preferredTypes[0].toUpperCase();
        if (propertyType === 'RENTAL' || propertyType === 'RENT') {
          preferencesData.preferredHousingType = 'RENTAL';
        } else if (propertyType === 'SALE' || propertyType === 'BUY') {
          preferencesData.preferredHousingType = 'SALE';
        } else if (propertyType === 'SHORT_STAY' || propertyType === 'HOLIDAY') {
          preferencesData.preferredHousingType = 'SHORT_STAY';
        }
      }
      
      // Handle preferred housing type (single value)
      if (data.preferredHousingType !== undefined) {
        preferencesData.preferredHousingType = data.preferredHousingType;
      }
      
      // ==================== AMENITIES ====================
      if (data.favoriteAmenities !== undefined && data.favoriteAmenities.length > 0) {
        preferencesData.favoriteAmenities = data.favoriteAmenities;
      }
      
      if (data.prefersFurnished !== undefined) {
        preferencesData.prefersFurnished = data.prefersFurnished;
      }
      
      if (data.hasPets !== undefined) {
        preferencesData.hasPets = data.hasPets;
      }
      
      // ==================== MOVE-IN PREFERENCES ====================
      if (data.moveInDate !== undefined) {
        preferencesData.preferredMoveInDate = new Date(data.moveInDate);
      }
      
      if (data.householdSize !== undefined) {
        preferencesData.householdSize = data.householdSize;
      }
      
      // ==================== AGENT PREFERENCE ====================
      if (data.hasAgent !== undefined) {
        preferencesData.hasAgent = data.hasAgent;
      }

      // Upsert user preferences (create or update)
      await this.prisma.userHousingPreferences.upsert({
        where: { seekerId },
        update: preferencesData,
        create: {
          seekerId,
          ...preferencesData,
        }
      });
      
      this.logger.log(`Updated user preferences for seeker ${seekerId}`);
      
    } catch (error) {
      this.logger.error(`Failed to process preferences event: ${error.message}`);
    }
  }

  /**
   * Get user preferences for debugging and verification
   */
  async getUserPreferences(seekerId: string): Promise<any> {
    try {
      const preferences = await this.prisma.userHousingPreferences.findUnique({
        where: { seekerId }
      });

      if (!preferences) {
        return null;
      }

      return {
        seekerId: preferences.seekerId,
        budget: {
          min: preferences.minBudget,
          max: preferences.maxBudget,
          midpoint: preferences.budgetMidpoint,
          flexibility: preferences.budgetFlexibility,
        },
        bedrooms: {
          min: preferences.minBedrooms,
          max: preferences.maxBedrooms,
          minBathrooms: preferences.minBathrooms,
        },
        location: {
          preferredCities: preferences.preferredCities,
          preferredNeighborhoods: preferences.preferredNeighborhoods,
          lat: preferences.preferredLat,
          lng: preferences.preferredLng,
          searchRadiusKm: preferences.searchRadiusKm,
        },
        property: {
          preferredTypes: preferences.preferredTypes,
          preferredHousingType: preferences.preferredHousingType,
        },
        amenities: {
          favoriteAmenities: preferences.favoriteAmenities,
          prefersFurnished: preferences.prefersFurnished,
          hasPets: preferences.hasPets,
        },
        moveIn: {
          preferredDate: preferences.preferredMoveInDate?.toISOString(),
          householdSize: preferences.householdSize,
        },
        agent: {
          hasAgent: preferences.hasAgent,
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
  async deleteUserPreferences(seekerId: string): Promise<boolean> {
    try {
      await this.prisma.userHousingPreferences.delete({
        where: { seekerId }
      });
      this.logger.log(`Deleted user preferences for seeker ${seekerId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete user preferences: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has preferences set
   */
  async hasUserPreferences(seekerId: string): Promise<boolean> {
    try {
      const count = await this.prisma.userHousingPreferences.count({
        where: { seekerId }
      });
      return count > 0;
    } catch (error) {
      this.logger.error(`Failed to check user preferences: ${error.message}`);
      return false;
    }
  }
}