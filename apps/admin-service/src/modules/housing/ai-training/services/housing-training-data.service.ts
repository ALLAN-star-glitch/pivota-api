/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-training-data.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { BaseResponseDto, DatasetStatsResponseDto, ExportDataDto, TrainingDatasetResponseDto } from '@pivota-api/dtos';
import { TrainingDataParams } from '@pivota-api/interfaces';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class HousingTrainingDataService {
  private readonly logger = new Logger(HousingTrainingDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive training dataset for AI/ML models
   */
  async getTrainingDataset(params: TrainingDataParams): Promise<BaseResponseDto<TrainingDatasetResponseDto>> {
    try {
        
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        limit = 50000,
        includeLabels = true,
        onlyLabeled = false,
        excludeBots = true,
        userIds,
        minDwellTime,
        includeFeatureImportance = false,
        minOverallMatchScore,
        listingTypes,
        propertyTypes
      } = params;

      this.logger.log(`📊 Generating training dataset from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Build where clause for SmartMatchyBase
      const where: any = {
        vertical: 'HOUSING',
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      };

      if (excludeBots) {
        where.isBot = false;
      }

      if (userIds && userIds.length > 0) {
        where.userUuid = { in: userIds };
      }

      if (onlyLabeled) {
        where.housing = {
          OR: [
            { userScheduledViewing: true },
            { userCompletedViewing: true }
          ]
        };
      }

      if (minDwellTime) {
        where.dwellTime = { gte: minDwellTime };
      }

      if (minOverallMatchScore) {
        where.overallMatchScore = { gte: minOverallMatchScore };
      }

      // Filter by listing types and property types (in housing table)
      if (listingTypes && listingTypes.length > 0) {
        where.housing = {
          ...where.housing,
          housingType: { in: listingTypes }
        };
      }

      if (propertyTypes && propertyTypes.length > 0) {
        where.housing = {
          ...where.housing,
          housingPropertyType: { in: propertyTypes }
        };
      }

      // Query SmartMatchyBase with join to SmartMatchyHousing
      const records = await this.prisma.smartMatchyBase.findMany({
        where,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          housing: true
        }
      });

      this.logger.log(`✅ Found ${records.length} training records`);

      // Get all unique user UUIDs from records
      const userUuids = [...new Set(records.map(r => r.userUuid))];
      
      // Fetch user preferences for all users in ONE query
      const userPreferences = await this.prisma.userHousingPreferences.findMany({
        where: { userUuid: { in: userUuids } }
      });
      
      // Create a map for quick lookup
      const prefsMap = new Map();
      userPreferences.forEach(pref => {
        prefsMap.set(pref.userUuid, pref);
      });

      // Transform records into training format with preferences
      const samples = records.map(record => 
        this.transformToTrainingSample(record, includeLabels, prefsMap.get(record.userUuid))
      );

      // Build feature and label schemas
      const featureSchema = this.getFeatureSchema();
      const labelSchema = this.getLabelSchema();

      // Calculate feature importance if requested
      let featureImportance = null;
      if (includeFeatureImportance && samples.length > 100) {
        featureImportance = await this.calculateFeatureImportance(samples);
      }

      // Create properly typed types records
      const featureTypes: Record<string, 'numeric' | 'categorical' | 'boolean' | 'datetime'> = {};
      const featureDescriptions: Record<string, string> = {};
      
      Object.entries(featureSchema).forEach(([name, schema]) => {
        featureTypes[name] = schema.type;
        featureDescriptions[name] = schema.description;
      });

      const labelTypes: Record<string, 'binary' | 'continuous' | 'multiclass'> = {};
      const labelDescriptions: Record<string, string> = {};
      
      Object.entries(labelSchema).forEach(([name, schema]) => {
        labelTypes[name] = schema.type;
        labelDescriptions[name] = schema.description;
      });

      const dataset: TrainingDatasetResponseDto = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalRecords: samples.length,
          dateRange: { 
            from: startDate.toISOString(), 
            to: endDate.toISOString() 
          },
          version: '2.0.0',
          filters: {
            onlyLabeled,
            excludeBots,
            minDwellTime,
            userIds: userIds?.length || 0,
            minOverallMatchScore,
            listingTypes,
            propertyTypes
          }
        },
        features: {
          names: Object.keys(featureSchema),
          types: featureTypes,
          description: featureDescriptions,
          data: samples.map(s => s.features)
        },
        labels: includeLabels ? {
          names: Object.keys(labelSchema),
          types: labelTypes,
          description: labelDescriptions,
          data: samples.map(s => s.labels!)
        } : { names: [], types: {}, description: {}, data: [] },
        samples: samples.map(sample => ({
          ...sample,
          timestamp: sample.timestamp.toISOString()
        }))
      };

      if (featureImportance) {
        (dataset as any).featureImportance = featureImportance;
      }

      return BaseResponseDto.ok(dataset, 'Training dataset generated successfully', 'OK');

    } catch (error) {
      this.logger.error(`Failed to generate training dataset: ${error.message}`);
      return BaseResponseDto.fail('Failed to generate training dataset', 'INTERNAL_ERROR');
    }
  }

  /**
   * Get dataset statistics and insights
   */
  async getDatasetStats(params: TrainingDataParams): Promise<BaseResponseDto<DatasetStatsResponseDto>> {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = params;

      const records = await this.prisma.smartMatchyBase.findMany({
        where: {
          vertical: 'HOUSING',
          timestamp: { gte: startDate, lte: endDate }
        },
        include: {
          housing: true
        }
      });

      const stats: DatasetStatsResponseDto = {
        totalEvents: records.length,
        dateRange: { 
          from: startDate.toISOString(), 
          to: endDate.toISOString() 
        },
        uniqueUsers: new Set(records.map(r => r.userUuid)).size,
        uniqueListings: new Set(records.map(r => r.listingId)).size,
        labelDistribution: {
          clicked: records.filter(r => r.userClicked).length,
          saved: records.filter(r => r.userSaved).length,
          contacted: records.filter(r => r.userContacted).length,
          scheduledViewing: records.filter(r => r.housing?.userScheduledViewing).length,
          completedViewing: records.filter(r => r.housing?.userCompletedViewing).length,
          anyInteraction: records.filter(r => r.userClicked || r.userSaved || r.userContacted).length
        },
        botTraffic: records.filter(r => r.isBot).length,
        averageDwellTime: this.calculateAverage(records.map(r => r.dwellTime).filter(t => t !== null && t !== undefined)),
        priceRange: {
          min: Math.min(...records.map(r => r.listingPrice).filter(p => p !== null && p !== undefined)),
          max: Math.max(...records.map(r => r.listingPrice).filter(p => p !== null && p !== undefined)),
          avg: this.calculateAverage(records.map(r => r.listingPrice).filter(p => p !== null && p !== undefined))
        },
        matchScores: {
          avgOverallMatchScore: this.calculateAverage(records.map(r => r.overallMatchScore).filter(s => s !== null && s !== undefined)),
          avgPriceToBudgetRatio: this.calculateAverage(records.map(r => r.housing?.priceToBudgetRatio).filter(r => r !== null && r !== undefined)),
          avgLocationDistance: this.calculateAverage(records.map(r => r.locationDistance).filter(d => d !== null && d !== undefined))
        },
        temporalDistribution: this.getTemporalDistribution(records),
        hourDistribution: this.getHourDistribution(records),
        dayDistribution: this.getDayDistribution(records)
      };

      return BaseResponseDto.ok(stats, 'Dataset statistics retrieved', 'OK');

    } catch (error) {
      this.logger.error(`Failed to get dataset stats: ${error.message}`);
      return BaseResponseDto.fail('Failed to get dataset statistics', 'INTERNAL_ERROR');
    }
  }

  /**
   * Export dataset in different formats
   */
  async exportTrainingData(
    params: TrainingDataParams,
    format: 'json' | 'csv' | 'parquet' = 'json'
  ): Promise<BaseResponseDto<ExportDataDto>> {
    try {
      const datasetResponse = await this.getTrainingDataset(params);
      if (!datasetResponse.success || !datasetResponse.data) {
        return datasetResponse as unknown as BaseResponseDto<ExportDataDto>;
      }

      const dataset = datasetResponse.data;

      if (format === 'csv') {
        const csv = this.convertSamplesToCSV(dataset.samples);
        return BaseResponseDto.ok({
          format: 'csv',
          data: csv,
          filename: `housing_training_data_${Date.now()}.csv`
        }, 'CSV export ready', 'OK');
      }

      if (format === 'parquet') {
        const parquetBuffer = await this.convertToParquet(dataset);
        return BaseResponseDto.ok({
          format: 'parquet',
          data: parquetBuffer.toString('base64'),
          filename: `housing_training_data_${Date.now()}.parquet`
        }, 'Parquet export ready', 'OK');
      }

      return BaseResponseDto.ok({
        format: 'json',
        data: JSON.stringify(dataset),
        filename: `housing_training_data_${Date.now()}.json`
      }, 'JSON export ready', 'OK');

    } catch (error) {
      this.logger.error(`Failed to export training data: ${error.message}`);
      return BaseResponseDto.fail('Failed to export training data', 'INTERNAL_ERROR');
    }
  }

  /**
   * Convert samples to CSV format (clean, flat structure)
   */
  private convertSamplesToCSV(samples: TrainingDatasetResponseDto['samples']): string {
    if (!samples || samples.length === 0) return '';
    
    const rows = samples.map(sample => {
      const row: any = {
        id: sample.id,
        userUuid: sample.userUuid,
        listingId: sample.listingId,
        timestamp: sample.timestamp,
        ...sample.features,
        ...(sample.labels || {})
      };
      
      Object.keys(row).forEach(key => {
        if (Array.isArray(row[key])) {
          row[key] = JSON.stringify(row[key]);
        }
        if (row[key] === null || row[key] === undefined) {
          row[key] = '';
        }
      });
      
      return row;
    });
    
    if (rows.length === 0) return '';
    
    const allHeaders = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => allHeaders.add(key));
    });
    
    const headers = Array.from(allHeaders).sort();
    
    const csvRows = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === undefined || value === null) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private transformToTrainingSample(record: any, includeLabels: boolean, userPrefs: any) {
    const features: Record<string, any> = {};

    // ==================== USER PREFERENCES (from UserHousingPreferences) ====================
    features.userMinBudget = userPrefs?.minBudget || null;
    features.userMaxBudget = userPrefs?.maxBudget || null;
    features.userBudgetMidpoint = userPrefs?.budgetMidpoint || null;
    features.userBudgetFlexibility = userPrefs?.budgetFlexibility || null;
    features.userMinBedrooms = userPrefs?.minBedrooms || null;
    features.userMaxBedrooms = userPrefs?.maxBedrooms || null;
    features.userMinBathrooms = userPrefs?.minBathrooms || null;
    features.userPreferredNeighborhood = userPrefs?.preferredNeighborhood || null;
    features.userPreferredLocations = userPrefs?.preferredLocations || null;
    features.userPreferredPropertyTypes = userPrefs?.preferredPropertyTypes || null;
    features.userPreferredPropertyType = userPrefs?.preferredPropertyType || null;
    features.userFavoriteAmenities = userPrefs?.favoriteAmenities || null;
    features.userPrefersFurnished = userPrefs?.prefersFurnished ? 1 : 0;
    features.userHasPets = userPrefs?.hasPets ? 1 : 0;
    features.userSearchRadiusKm = userPrefs?.searchRadiusKm || null;
    features.userPreferredLat = userPrefs?.preferredLat || null;
    features.userPreferredLng = userPrefs?.preferredLng || null;
    features.userHasAgent = userPrefs?.hasAgent ? 1 : 0;
    features.userPreferredHousingType = userPrefs?.preferredHousingType || null;
    features.userHouseholdSize = userPrefs?.householdSize || null;
    features.userPreferredMoveInDate = userPrefs?.preferredMoveInDate?.toISOString() || null;
    
    // ==================== LISTING FEATURES (from SmartMatchyBase) ====================
    features.listingPrice = record.listingPrice;
    features.listingBedrooms = record.listingBedrooms;
    features.listingBathrooms = record.listingBathrooms;
    features.listingPropertyType = record.listingPropertyType;
    features.listingSquareFootage = record.listingSquareFootage;
    features.listingYearBuilt = record.listingYearBuilt;
    features.listingNeighborhood = record.listingNeighborhood;
    features.listingAge = record.listingAge;
    features.listingPhotoCount = record.listingPhotoCount;
    features.listingIsFurnished = record.listingIsFurnished ? 1 : 0;
    features.listingAmenities = record.listingAmenities;
    
    // ==================== HOUSING-SPECIFIC FEATURES (from SmartMatchyHousing) ====================
    if (record.housing) {
      features.housingType = record.housing.housingType;
      features.housingBedrooms = record.housing.housingBedrooms;
      features.housingBathrooms = record.housing.housingBathrooms;
      features.housingPropertyType = record.housing.housingPropertyType;
      features.housingNeighborhood = record.housing.housingNeighborhood;
      features.housingIsFurnished = record.housing.housingIsFurnished ? 1 : 0;
      features.housingAmenities = record.housing.housingAmenities;
      features.housingMinimumStay = record.housing.housingMinimumStay;
      features.housingSquareFootage = record.housing.housingSquareFootage;
      features.housingYearBuilt = record.housing.housingYearBuilt;
      
      // ==================== TRACKING FIELDS ====================
      features.viewingUserId = record.housing.viewerId;  // Who viewed the listing
      features.attendingUserId = record.housing.schedulerId;  // Who will attend (maps to schedulerId)
      features.listingCreatorId = record.housing.creatorId;  // Listing owner
      features.scheduledAt = record.housing.scheduledAt;
      features.scheduledFor = record.housing.scheduledFor;
      features.viewingStatus = record.housing.viewingStatus;
      
      // Match scores from housing
      features.priceToBudgetRatio = record.housing.priceToBudgetRatio;
      features.isWithinBudget = record.housing.isWithinBudget ? 1 : 0;
      features.bedroomsMatch = record.housing.bedroomsMatch ? 1 : 0;
      features.bathroomsMatch = record.housing.bathroomsMatch ? 1 : 0;
      features.propertyTypeMatch = record.housing.propertyTypeMatch ? 1 : 0;
      features.furnishedMatch = record.housing.furnishedMatch ? 1 : 0;
    } else {
      features.housingType = null;
      features.housingBedrooms = null;
      features.housingBathrooms = null;
      features.housingPropertyType = null; 
      features.housingNeighborhood = null;
      features.housingIsFurnished = 0;
      features.housingAmenities = null;
      features.housingMinimumStay = null;
      features.housingSquareFootage = null;
      features.housingYearBuilt = null;
      features.viewingUserId = null;
      features.attendingUserId = null;
      features.listingCreatorId = null;
      features.scheduledAt = null;
      features.scheduledFor = null;
      features.viewingStatus = null;
      features.priceToBudgetRatio = null;
      features.isWithinBudget = 0;
      features.bedroomsMatch = 0;
      features.bathroomsMatch = 0;
      features.propertyTypeMatch = 0;
      features.furnishedMatch = 0;
    }
    
    // ==================== BASE MATCH SCORES (from SmartMatchyBase) ====================
    features.locationDistance = record.locationDistance;
    features.locationScore = record.locationScore;
    features.priceScore = record.priceScore;
    features.overallMatchScore = record.overallMatchScore;
    features.recencyScore = record.recencyScore;
    features.engagementScore = record.engagementScore;
    
    // ==================== SESSION CONTEXT ====================
    features.sessionDevice = record.sessionDevice;
    features.sessionPlatform = record.sessionPlatform;
    features.deviceType = record.deviceType;
    features.os = record.os;
    features.browser = record.browser;
    features.isBot = record.isBot ? 1 : 0;
    features.searchPosition = record.searchPosition;
    
    // ==================== INTERACTION ====================
    features.interactionType = record.interactionType;
    features.scrollDepth = record.scrollDepth;
    features.viewDuration = record.viewDuration;
    features.dwellTime = record.dwellTime;
    
    // ==================== TEMPORAL ====================
    features.hourOfDay = record.hourOfDay;
    features.dayOfWeek = record.dayOfWeek;
    features.isWeekend = record.isWeekend ? 1 : 0;

    const sample: any = {
      id: record.id,
      userUuid: record.userUuid,
      listingId: record.listingId,
      timestamp: record.timestamp,
      features
    };

    if (includeLabels) {
      sample.labels = {
        userClicked: record.userClicked || false,
        userSaved: record.userSaved || false,
        userContacted: record.userContacted || false,
        userScheduledViewing: record.housing?.userScheduledViewing || false,
        userCompletedViewing: record.housing?.userCompletedViewing || false,
        userConverted: record.userConverted || false,
        dwellTime: record.dwellTime,
        isInterested: !!(record.userClicked || record.userSaved || record.userContacted),
        isHighlyEngaged: !!(record.housing?.userScheduledViewing || record.housing?.userCompletedViewing),
        engagementScore: record.engagementScore || 0
      };
    }

    return sample;
  }

  private getFeatureSchema() {
    return {
      // User Preference Numeric Features
      userMinBudget: { type: 'numeric' as const, description: 'Minimum budget user is willing to spend' },
      userMaxBudget: { type: 'numeric' as const, description: 'Maximum budget user is willing to spend' },
      userBudgetMidpoint: { type: 'numeric' as const, description: 'Midpoint of user\'s budget range' },
      userBudgetFlexibility: { type: 'numeric' as const, description: 'User\'s budget flexibility (0-1)' },
      userMinBedrooms: { type: 'numeric' as const, description: 'Minimum bedrooms desired' },
      userMaxBedrooms: { type: 'numeric' as const, description: 'Maximum bedrooms desired' },
      userMinBathrooms: { type: 'numeric' as const, description: 'Minimum bathrooms desired' },
      userSearchRadiusKm: { type: 'numeric' as const, description: 'Search radius in km' },
      userPreferredLat: { type: 'numeric' as const, description: 'Preferred location latitude' },
      userPreferredLng: { type: 'numeric' as const, description: 'Preferred location longitude' },
      userHouseholdSize: { type: 'numeric' as const, description: 'Number of people in household' },
      
      // Listing Numeric Features
      listingPrice: { type: 'numeric' as const, description: 'Price of the listing' },
      listingBedrooms: { type: 'numeric' as const, description: 'Number of bedrooms' },
      listingBathrooms: { type: 'numeric' as const, description: 'Number of bathrooms' },
      listingSquareFootage: { type: 'numeric' as const, description: 'Square footage of property' },
      listingYearBuilt: { type: 'numeric' as const, description: 'Year property was built' },
      listingAge: { type: 'numeric' as const, description: 'Days since listing was posted' },
      listingPhotoCount: { type: 'numeric' as const, description: 'Number of photos' },
      
      // Housing-specific Numeric Features
      housingSquareFootage: { type: 'numeric' as const, description: 'Square footage of property (housing specific)' },
      housingYearBuilt: { type: 'numeric' as const, description: 'Year property was built (housing specific)' },
      
      // Tracking Numeric Features
      scheduledAt: { type: 'datetime' as const, description: 'When the viewing was scheduled' },
      scheduledFor: { type: 'datetime' as const, description: 'When the viewing is scheduled for' },
      
      // Match Score Numeric Features
      priceToBudgetRatio: { type: 'numeric' as const, description: 'Listing price divided by user\'s max budget' },
      locationDistance: { type: 'numeric' as const, description: 'Distance from user\'s preferred location (km)' },
      overallMatchScore: { type: 'numeric' as const, description: 'Composite match score' },
      priceScore: { type: 'numeric' as const, description: 'Normalized price match (0-1)' },
      locationScore: { type: 'numeric' as const, description: 'Normalized location match (0-1)' },
      recencyScore: { type: 'numeric' as const, description: 'Normalized recency match (0-1)' },
      engagementScore: { type: 'numeric' as const, description: 'Composite engagement score (0-1)' },
      
      hourOfDay: { type: 'numeric' as const, description: 'Hour of the day (0-23)' },
      dayOfWeek: { type: 'numeric' as const, description: 'Day of the week (0-6)' },
      scrollDepth: { type: 'numeric' as const, description: 'How far user scrolled (%)' },
      viewDuration: { type: 'numeric' as const, description: 'Time spent viewing listing (seconds)' },
      searchPosition: { type: 'numeric' as const, description: 'Position in search results' },
      dwellTime: { type: 'numeric' as const, description: 'Time spent viewing (seconds)' },
      
      // User Preference Categorical Features
      userPreferredNeighborhood: { type: 'categorical' as const, description: 'Preferred neighborhood' },
      userPreferredLocations: { type: 'categorical' as const, description: 'Preferred locations (array)' },
      userPreferredPropertyTypes: { type: 'categorical' as const, description: 'Preferred property types (array)' },
      userPreferredPropertyType: { type: 'categorical' as const, description: 'Primary property type preference' },
      userFavoriteAmenities: { type: 'categorical' as const, description: 'Favorite amenities (array)' },
      userPreferredHousingType: { type: 'categorical' as const, description: 'Preferred housing type (RENTAL, SALE, SHORT_STAY)' },
      userPreferredMoveInDate: { type: 'datetime' as const, description: 'Preferred move-in date' },
      
      // Listing Categorical Features
      listingPropertyType: { type: 'categorical' as const, description: 'Type of property' },
      listingNeighborhood: { type: 'categorical' as const, description: 'Listing neighborhood' },
      listingAmenities: { type: 'categorical' as const, description: 'Listing amenities (array)' },
      
      housingType: { type: 'categorical' as const, description: 'Housing type (RENTAL, SALE, SHORT_STAY)' },
      housingPropertyType: { type: 'categorical' as const, description: 'Property type (APARTMENT, HOUSE, CONDO)' },
      housingNeighborhood: { type: 'categorical' as const, description: 'Housing neighborhood' },
      housingAmenities: { type: 'categorical' as const, description: 'Housing amenities (array)' },
      housingMinimumStay: { type: 'categorical' as const, description: 'Minimum stay requirement' },
      
      // Tracking Categorical Features
      viewingUserId: { type: 'categorical' as const, description: 'User who viewed the listing' },
      attendingUserId: { type: 'categorical' as const, description: 'User who will attend the viewing' },
      listingCreatorId: { type: 'categorical' as const, description: 'User who created/owns the listing' },
      viewingStatus: { type: 'categorical' as const, description: 'Viewing status (SCHEDULED, COMPLETED, etc.)' },
      
      sessionDevice: { type: 'categorical' as const, description: 'Device type' },
      sessionPlatform: { type: 'categorical' as const, description: 'Platform (web, ios, android)' },
      deviceType: { type: 'categorical' as const, description: 'Device classification' },
      os: { type: 'categorical' as const, description: 'Operating system' },
      browser: { type: 'categorical' as const, description: 'Browser type' },
      interactionType: { type: 'categorical' as const, description: 'Type of interaction' },
      
      // Boolean Features
      userPrefersFurnished: { type: 'boolean' as const, description: 'Whether user prefers furnished' },
      userHasPets: { type: 'boolean' as const, description: 'Whether user has pets' },
      userHasAgent: { type: 'boolean' as const, description: 'Whether user has an agent' },
      listingIsFurnished: { type: 'boolean' as const, description: 'Whether listing is furnished' },
      housingIsFurnished: { type: 'boolean' as const, description: 'Whether property is furnished (housing specific)' },
      isWithinBudget: { type: 'boolean' as const, description: 'Whether listing is within budget' },
      bedroomsMatch: { type: 'boolean' as const, description: 'Whether bedrooms match requirement' },
      bathroomsMatch: { type: 'boolean' as const, description: 'Whether bathrooms match requirement' },
      propertyTypeMatch: { type: 'boolean' as const, description: 'Whether property type matches preference' },
      furnishedMatch: { type: 'boolean' as const, description: 'Whether furnished status matches preference' },
      isWeekend: { type: 'boolean' as const, description: 'Whether event occurred on weekend' },
      isBot: { type: 'boolean' as const, description: 'Whether from bot' },
      isAdminBooking: { type: 'boolean' as const, description: 'Whether admin-initiated booking' }
    };
  }

  private getLabelSchema() {
    return {
      userClicked: { type: 'binary' as const, description: 'User clicked on the listing' },
      userSaved: { type: 'binary' as const, description: 'User saved the listing' },
      userContacted: { type: 'binary' as const, description: 'User contacted about the listing' },
      userScheduledViewing: { type: 'binary' as const, description: 'User scheduled a viewing' },
      userCompletedViewing: { type: 'binary' as const, description: 'User completed a viewing' },
      userConverted: { type: 'binary' as const, description: 'User completed transaction' },
      dwellTime: { type: 'continuous' as const, description: 'Time spent viewing (seconds)' },
      isInterested: { type: 'binary' as const, description: 'Any interest (click, save, or contact)' },
      isHighlyEngaged: { type: 'binary' as const, description: 'High engagement (scheduled/completed viewing)' },
      engagementScore: { type: 'continuous' as const, description: 'Composite engagement score (0-1)' }
    };
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private getTemporalDistribution(records: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    records.forEach(record => {
      if (record.timestamp) {
        const date = record.timestamp.toISOString().split('T')[0];
        distribution[date] = (distribution[date] || 0) + 1;
      }
    });
    
    return distribution;
  }

  private getHourDistribution(records: any[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    records.forEach(record => {
      if (record.hourOfDay !== undefined && record.hourOfDay !== null) {
        distribution[record.hourOfDay] = (distribution[record.hourOfDay] || 0) + 1;
      }
    });
    
    return distribution;
  }

  private getDayDistribution(records: any[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    records.forEach(record => {
      if (record.dayOfWeek !== undefined && record.dayOfWeek !== null) {
        distribution[record.dayOfWeek] = (distribution[record.dayOfWeek] || 0) + 1;
      }
    });
    
    return distribution;
  }

  private async calculateFeatureImportance(samples: any[]): Promise<any> {
    this.logger.warn('Feature importance calculation not implemented yet');
    return null;
  }

  private async convertToParquet(dataset: TrainingDatasetResponseDto): Promise<Buffer> {
    this.logger.warn('Parquet conversion not implemented yet');
    return Buffer.from(JSON.stringify(dataset));
  }
}