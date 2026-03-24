/* eslint-disable @typescript-eslint/no-explicit-any */
// housing-training-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { BaseResponseDto, DatasetStatsResponseDto, ExportDataDto, TrainingDatasetResponseDto } from '@pivota-api/dtos';
import { TrainingDataParams } from '@pivota-api/interfaces';


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

      // Build where clause
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
        where.OR = [
          { userClicked: true },
          { userSaved: true },
          { userContacted: true },
          { userScheduledViewing: true },
          { userCompletedViewing: true }
        ];
      }

      if (minDwellTime) {
        where.dwellTime = { gte: minDwellTime };
      }

      if (minOverallMatchScore) {
        where.overallMatchScore = { gte: minOverallMatchScore };
      }

      if (listingTypes && listingTypes.length > 0) {
        where.userPreferredListingTypes = { hasSome: listingTypes };
      }

      if (propertyTypes && propertyTypes.length > 0) {
        where.listingPropertyType = { in: propertyTypes };
      }

      // Query the SmartMatchy table
      const records = await this.prisma.smartMatchy.findMany({
        where,
        take: limit,
        orderBy: { timestamp: 'desc' },
        select: this.getSelectFields()
      });

      this.logger.log(`✅ Found ${records.length} training records`);

      // Transform records into training format
      const samples = records.map(record => this.transformToTrainingSample(record, includeLabels));

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

      const records = await this.prisma.smartMatchy.findMany({
        where: {
          vertical: 'HOUSING',
          timestamp: { gte: startDate, lte: endDate }
        },
        select: {
          userUuid: true,
          listingId: true,
          timestamp: true,
          userClicked: true,
          userSaved: true,
          userContacted: true,
          userScheduledViewing: true,
          userCompletedViewing: true,
          dwellTime: true,
          isBot: true,
          listingPrice: true,
          locationDistance: true,
          amenityMatchScore: true,
          overallMatchScore: true,
          priceToBudgetRatio: true,
          hourOfDay: true,
          dayOfWeek: true,
          isWeekend: true
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
          scheduledViewing: records.filter(r => r.userScheduledViewing).length,
          completedViewing: records.filter(r => r.userCompletedViewing).length,
          anyInteraction: records.filter(r => r.userClicked || r.userSaved || r.userContacted).length
        },
        botTraffic: records.filter(r => r.isBot).length,
        averageDwellTime: this.calculateAverage(records.map(r => r.dwellTime).filter(t => t)),
        priceRange: {
          min: Math.min(...records.map(r => r.listingPrice).filter(p => p)),
          max: Math.max(...records.map(r => r.listingPrice).filter(p => p)),
          avg: this.calculateAverage(records.map(r => r.listingPrice).filter(p => p))
        },
        matchScores: {
          avgOverallMatchScore: this.calculateAverage(records.map(r => r.overallMatchScore).filter(s => s !== null)),
          avgPriceToBudgetRatio: this.calculateAverage(records.map(r => r.priceToBudgetRatio).filter(r => r !== null)),
          avgAmenityMatchScore: this.calculateAverage(records.map(r => r.amenityMatchScore).filter(s => s !== null)),
          avgLocationDistance: this.calculateAverage(records.map(r => r.locationDistance).filter(d => d))
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
        const csv = this.convertToCSV(dataset);
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

  // ==================== PRIVATE HELPER METHODS ====================

  private getSelectFields() {
    return {
      id: true,
      userUuid: true,
      listingId: true,
      timestamp: true,
      vertical: true,
      featureSetVersion: true,
      
      // User preference features
      userMaxBudget: true,
      userMinBudget: true,
      userBudgetMidpoint: true,
      userBudgetFlexibility: true,
      userMinBedrooms: true,
      userMaxBedrooms: true,
      userPreferredBathrooms: true,
      userPropertyType: true,
      userPreferredPropertyTypes: true,
      userPreferredNeighborhood: true,
      userPreferredLat: true,
      userPreferredLng: true,
      userPreferredRadius: true,
      userPreferredLocations: true,
      userFavoriteAmenities: true,
      userPreferredAmenities: true,
      userPreferredListingTypes: true,
      userPreviousSearches: true,
      userPreviousViewings: true,
      
      // Listing features
      listingPrice: true,
      listingPriceCurrency: true,
      listingBedrooms: true,
      listingBathrooms: true,
      listingPropertyType: true,
      listingSquareFootage: true,
      listingYearBuilt: true,
      listingNeighborhood: true,
      listingLat: true,
      listingLng: true,
      listingLatitude: true,
      listingLongitude: true,
      listingAge: true,
      listingPhotoCount: true,
      listingVerified: true,
      listingStatus: true,
      listingCategoryId: true,
      listingCategorySlug: true,
      listingAmenities: true,
      listingIsFurnished: true,
      
      // Match scores
      isWithinBudget: true,
      priceToBudgetDiff: true,
      priceToBudgetRatio: true,
      priceVsCategoryAvg: true,
      priceVsNeighborhoodAvg: true,
      bedroomDiff: true,
      meetsBedroomRequirement: true,
      bathroomDiff: true,
      locationDistance: true,
      isPreferredNeighborhood: true,
      locationMatchScore: true,
      isExactNeighborhoodMatch: true,
      isCityMatch: true,
      distanceFromPreferred: true,
      amenityMatchScore: true,
      amenityMatchCount: true,
      propertyTypeMatch: true,
      propertyTypeMatchScore: true,
      overallMatchScore: true,
      priceScore: true,
      locationScore: true,
      propertyScore: true,
      recencyScore: true,
      
      // Session context
      sessionReferrer: true,
      sessionReferrerType: true,
      sessionDevice: true,
      sessionPlatform: true,
      deviceType: true,
      os: true,
      osVersion: true,
      browser: true,
      browserVersion: true,
      isBot: true,
      appVersion: true,
      sessionSearchId: true,
      sessionSearchQuery: true,
      sessionSearchMaxBudget: true,
      sessionSearchNeighborhood: true,
      sessionSearchFilters: true,
      searchPosition: true,
      
      // Interaction
      interactionType: true,
      scrollDepth: true,
      viewDuration: true,
      timeSpent: true,
      dwellTime: true,
      
      // Temporal
      hourOfDay: true,
      dayOfWeek: true,
      isWeekend: true,
      daysSinceListingPosted: true,
      timeToViewing: true,
      
      // Viewing specific
      viewingDate: true,
      isAdminBooking: true,
      viewingDuration: true,
      viewingParticipants: true,
      
      // AI metadata
      aiEventType: true,
      aiEventId: true,
      aiEventTimestamp: true,
      
      // Labels
      userClicked: true,
      userSaved: true,
      userContacted: true,
      userConverted: true,
      userScheduledViewing: true,
      userCompletedViewing: true,
      viewingCompletedAt: true,
      viewingFeedback: true,
      
      // Timestamps
      createdAt: true,
      updatedAt: true
    };
  }

  private transformToTrainingSample(record: any, includeLabels: boolean) {
    const features: Record<string, any> = {};

    // User preference features
    features.userBudgetMidpoint = record.userBudgetMidpoint;
    features.userBudgetFlexibility = record.userBudgetFlexibility;
    features.userMinBedrooms = record.userMinBedrooms;
    features.userMaxBedrooms = record.userMaxBedrooms;
    features.userPreferredBathrooms = record.userPreferredBathrooms;
    features.userPropertyType = record.userPropertyType;
    features.userPreferredPropertyTypes = record.userPreferredPropertyTypes;
    features.userPreferredNeighborhood = record.userPreferredNeighborhood;
    features.userPreferredRadius = record.userPreferredRadius;
    features.userPreferredLocations = record.userPreferredLocations;
    features.userFavoriteAmenities = record.userFavoriteAmenities;
    features.userPreferredAmenities = record.userPreferredAmenities;
    features.userPreferredListingTypes = record.userPreferredListingTypes;
    
    // Listing features
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
    features.listingVerified = record.listingVerified ? 1 : 0;
    features.listingAmenities = record.listingAmenities;
    
    // Match scores
    features.priceToBudgetRatio = record.priceToBudgetRatio;
    features.priceVsCategoryAvg = record.priceVsCategoryAvg;
    features.priceVsNeighborhoodAvg = record.priceVsNeighborhoodAvg;
    features.bedroomDiff = record.bedroomDiff;
    features.bathroomDiff = record.bathroomDiff;
    features.locationDistance = record.locationDistance;
    features.distanceFromPreferred = record.distanceFromPreferred;
    features.amenityMatchScore = record.amenityMatchScore;
    features.amenityMatchCount = record.amenityMatchCount;
    features.propertyTypeMatchScore = record.propertyTypeMatchScore;
    features.overallMatchScore = record.overallMatchScore;
    features.priceScore = record.priceScore;
    features.locationScore = record.locationScore;
    features.propertyScore = record.propertyScore;
    features.recencyScore = record.recencyScore;
    
    // Boolean match features (convert to 0/1)
    features.isWithinBudget = record.isWithinBudget ? 1 : 0;
    features.meetsBedroomRequirement = record.meetsBedroomRequirement ? 1 : 0;
    features.isPreferredNeighborhood = record.isPreferredNeighborhood ? 1 : 0;
    features.isExactNeighborhoodMatch = record.isExactNeighborhoodMatch ? 1 : 0;
    features.isCityMatch = record.isCityMatch ? 1 : 0;
    features.propertyTypeMatch = record.propertyTypeMatch ? 1 : 0;
    
    // Session context
    features.sessionReferrerType = record.sessionReferrerType;
    features.sessionDevice = record.sessionDevice;
    features.sessionPlatform = record.sessionPlatform;
    features.deviceType = record.deviceType;
    features.os = record.os;
    features.browser = record.browser;
    features.isBot = record.isBot ? 1 : 0;
    features.searchPosition = record.searchPosition;
    features.sessionSearchMaxBudget = record.sessionSearchMaxBudget;
    
    // Interaction
    features.interactionType = record.interactionType;
    features.scrollDepth = record.scrollDepth;
    features.viewDuration = record.viewDuration;
    
    // Temporal
    features.hourOfDay = record.hourOfDay;
    features.dayOfWeek = record.dayOfWeek;
    features.isWeekend = record.isWeekend ? 1 : 0;
    features.daysSinceListingPosted = record.daysSinceListingPosted;
    features.timeToViewing = record.timeToViewing;
    
    // Viewing specific
    features.isAdminBooking = record.isAdminBooking ? 1 : 0;
    features.viewingDuration = record.viewingDuration;
    features.viewingParticipants = record.viewingParticipants;

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
        userScheduledViewing: record.userScheduledViewing || false,
        userCompletedViewing: record.userCompletedViewing || false,
        userConverted: record.userConverted || false,
        dwellTime: record.dwellTime,
        isInterested: !!(record.userClicked || record.userSaved || record.userContacted),
        isHighlyEngaged: !!(record.userScheduledViewing || record.userCompletedViewing),
        engagementScore: this.calculateEngagementScore(record)
      };
    }

    return sample;
  }

  private getFeatureSchema() {
    return {
      // Numeric features
      userBudgetMidpoint: { type: 'numeric' as const, description: 'Midpoint of user\'s budget range' },
      userBudgetFlexibility: { type: 'numeric' as const, description: 'User\'s budget flexibility (0-1)' },
      userMinBedrooms: { type: 'numeric' as const, description: 'Minimum bedrooms desired' },
      userMaxBedrooms: { type: 'numeric' as const, description: 'Maximum bedrooms desired' },
      userPreferredRadius: { type: 'numeric' as const, description: 'Preferred search radius in km' },
      
      listingPrice: { type: 'numeric' as const, description: 'Price of the listing' },
      listingBedrooms: { type: 'numeric' as const, description: 'Number of bedrooms' },
      listingBathrooms: { type: 'numeric' as const, description: 'Number of bathrooms' },
      listingSquareFootage: { type: 'numeric' as const, description: 'Square footage of property' },
      listingYearBuilt: { type: 'numeric' as const, description: 'Year property was built' },
      listingAge: { type: 'numeric' as const, description: 'Days since listing was posted' },
      listingPhotoCount: { type: 'numeric' as const, description: 'Number of photos' },
      
      priceToBudgetRatio: { type: 'numeric' as const, description: 'Listing price divided by user\'s max budget' },
      priceVsCategoryAvg: { type: 'numeric' as const, description: 'Price compared to category average' },
      priceVsNeighborhoodAvg: { type: 'numeric' as const, description: 'Price compared to neighborhood average' },
      bedroomDiff: { type: 'numeric' as const, description: 'Bedrooms difference from preference' },
      bathroomDiff: { type: 'numeric' as const, description: 'Bathrooms difference from preference' },
      locationDistance: { type: 'numeric' as const, description: 'Distance from user\'s preferred location (km)' },
      distanceFromPreferred: { type: 'numeric' as const, description: 'Distance from preferred location' },
      amenityMatchScore: { type: 'numeric' as const, description: 'Percentage of preferred amenities matched' },
      amenityMatchCount: { type: 'numeric' as const, description: 'Number of matching amenities' },
      propertyTypeMatchScore: { type: 'numeric' as const, description: 'Property type match score (0 or 1)' },
      overallMatchScore: { type: 'numeric' as const, description: 'Composite match score' },
      priceScore: { type: 'numeric' as const, description: 'Normalized price match (0-1)' },
      locationScore: { type: 'numeric' as const, description: 'Normalized location match (0-1)' },
      propertyScore: { type: 'numeric' as const, description: 'Normalized property match (0-1)' },
      recencyScore: { type: 'numeric' as const, description: 'Normalized recency match (0-1)' },
      
      hourOfDay: { type: 'numeric' as const, description: 'Hour of the day (0-23)' },
      dayOfWeek: { type: 'numeric' as const, description: 'Day of the week (0-6)' },
      scrollDepth: { type: 'numeric' as const, description: 'How far user scrolled (%)' },
      viewDuration: { type: 'numeric' as const, description: 'Time spent viewing listing (seconds)' },
      searchPosition: { type: 'numeric' as const, description: 'Position in search results' },
      daysSinceListingPosted: { type: 'numeric' as const, description: 'Age of listing when viewed' },
      timeToViewing: { type: 'numeric' as const, description: 'Days until scheduled viewing' },
      viewingDuration: { type: 'numeric' as const, description: 'Expected viewing duration (minutes)' },
      viewingParticipants: { type: 'numeric' as const, description: 'Number of attendees' },
      
      // Categorical features
      userPropertyType: { type: 'categorical' as const, description: 'Primary property type preference' },
      userPreferredPropertyTypes: { type: 'categorical' as const, description: 'Preferred property types (array)' },
      userPreferredNeighborhood: { type: 'categorical' as const, description: 'Preferred neighborhood' },
      userPreferredLocations: { type: 'categorical' as const, description: 'Preferred locations (array)' },
      userFavoriteAmenities: { type: 'categorical' as const, description: 'Favorite amenities (array)' },
      userPreferredListingTypes: { type: 'categorical' as const, description: 'Preferred listing types (array)' },
      
      listingPropertyType: { type: 'categorical' as const, description: 'Type of property' },
      listingNeighborhood: { type: 'categorical' as const, description: 'Listing neighborhood' },
      listingAmenities: { type: 'categorical' as const, description: 'Listing amenities (array)' },
      
      sessionReferrerType: { type: 'categorical' as const, description: 'How user arrived (HOME, SEARCH, etc.)' },
      sessionDevice: { type: 'categorical' as const, description: 'Device type' },
      sessionPlatform: { type: 'categorical' as const, description: 'Platform (web, ios, android)' },
      deviceType: { type: 'categorical' as const, description: 'Device classification' },
      os: { type: 'categorical' as const, description: 'Operating system' },
      browser: { type: 'categorical' as const, description: 'Browser type' },
      interactionType: { type: 'categorical' as const, description: 'Type of interaction' },
      sessionSearchMaxBudget: { type: 'numeric' as const, description: 'Budget filter in search' },
      
      // Boolean features (0/1)
      listingIsFurnished: { type: 'boolean' as const, description: 'Whether listing is furnished' },
      listingVerified: { type: 'boolean' as const, description: 'Whether listing is verified' },
      isWithinBudget: { type: 'boolean' as const, description: 'Whether listing is within budget' },
      meetsBedroomRequirement: { type: 'boolean' as const, description: 'Whether meets bedroom requirements' },
      isPreferredNeighborhood: { type: 'boolean' as const, description: 'Whether in preferred neighborhood' },
      isExactNeighborhoodMatch: { type: 'boolean' as const, description: 'Exact neighborhood match' },
      isCityMatch: { type: 'boolean' as const, description: 'Same city match' },
      propertyTypeMatch: { type: 'boolean' as const, description: 'Property type matches preference' },
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

  private calculateEngagementScore(record: any): number {
    let score = 0;
    if (record.userClicked) score += 0.2;
    if (record.userSaved) score += 0.25;
    if (record.userContacted) score += 0.3;
    if (record.userScheduledViewing) score += 0.4;
    if (record.userCompletedViewing) score += 0.5;
    if (record.userConverted) score += 0.6;
    
    if (record.dwellTime) {
      score += Math.min(0.25, record.dwellTime / 120);
    }
    
    if (record.scrollDepth && record.scrollDepth > 50) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
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
    // Placeholder for feature importance calculation
    this.logger.warn('Feature importance calculation not implemented yet');
    return null;
  }

  private convertToCSV(dataset: TrainingDatasetResponseDto): string {
    const rows = dataset.samples.map(sample => {
      const row: any = {
        id: sample.id,
        userUuid: sample.userUuid,
        listingId: sample.listingId,
        timestamp: sample.timestamp,
        ...sample.features
      };
      
      if (sample.labels) {
        Object.assign(row, sample.labels);
      }
      
      // Convert arrays to JSON strings for CSV
      Object.keys(row).forEach(key => {
        if (Array.isArray(row[key])) {
          row[key] = JSON.stringify(row[key]);
        }
      });
      
      return row;
    });
    
    if (rows.length === 0) return '';
    
    const headers = Object.keys(rows[0]);
    const csvRows = [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const value = row[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
    ];
    
    return csvRows.join('\n');
  }

  private async convertToParquet(dataset: TrainingDatasetResponseDto): Promise<Buffer> {
    // Placeholder - would require parquet library
    this.logger.warn('Parquet conversion not implemented yet');
    return Buffer.from(JSON.stringify(dataset));
  }
}