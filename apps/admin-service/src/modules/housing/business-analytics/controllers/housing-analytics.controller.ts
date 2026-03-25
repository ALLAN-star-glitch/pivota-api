/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Logger, OnModuleInit, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod, EventPattern, Payload } from '@nestjs/microservices';
import { HousingAnalyticsService } from '../services/housing-analytics.service';
import { 
  BaseResponseDto, 
  LabelUpdateResponseDto
} from '@pivota-api/dtos';
import { 
  HousingViewEvent, 
  HousingSearchEvent, 
  HousingViewingScheduledEvent 
} from '@pivota-api/interfaces';

export interface HousingViewEventRequest {
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

export interface GetUserStatsRequest {
  userUuid: string;
}

export interface GetTrainingDataRequest {
  days?: number;
  limit?: number;
}

export interface UpdateLabelRequest {
  userUuid: string;
  listingId: string;
  action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT' | 'SCHEDULE_VIEWING' | 'COMPLETE_VIEWING';
  dwellTime?: number;
  metadata?: unknown;
}

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HousingAnalyticsController implements OnModuleInit {
  private readonly logger = new Logger(HousingAnalyticsController.name);

  constructor(
    private readonly housingAnalyticsService: HousingAnalyticsService,
  ) {}

  onModuleInit() {
    this.logger.log('🚀 HOUSING ANALYTICS CONTROLLER INITIALIZED: Ready for housing AI events.');
  }
 
  // ======================================================
  // KAFKA EVENT HANDLERS
  // ======================================================
 
  /**
   * Handle all housing AI events from Kafka
   * Routes events to appropriate service methods based on event type
   */
 @EventPattern('housing.ai.tracking')
async handleHousingAIEvent(
  @Payload() data: HousingViewEvent | HousingSearchEvent | HousingViewingScheduledEvent,
): Promise<void> {
  // VISIBLE LOGGING
  console.log('\n');
  console.log('🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠');
  console.log('🏠 HOUSING AI EVENT RECEIVED!');
  console.log('🏠 User:', (data as any)?.userId);
  console.log('🏠 Event Type:', (data as any)?.eventType);
  
  // 🚨 TEMPORARY FIX: Skip any LISTING_MILESTONE events that are stuck in the queue
  // Use 'as any' to access properties that might not exist on the type
  const anyData = data as any;
  if (anyData?.eventType === 'LISTING_MILESTONE') {
    this.logger.warn(`⚠️ Skipping old LISTING_MILESTONE event for account ${anyData?.accountId || 'unknown'}`);
    return; // Just return, don't throw error
  }
  
  // Log different details based on event type
  switch (data.eventType) {
    case 'VIEW':
      console.log('🏠 Property:', data?.listingId);
      console.log('🏠 Location:', data?.metadata?.listingData?.locationCity);
      console.log('🏠 Price:', data?.metadata?.listingData?.price);
      break;
    case 'SEARCH':
      console.log('🏠 Search Query:', data?.metadata?.searchQuery);
      console.log('🏠 Results:', (data as HousingSearchEvent)?.metadata?.resultsCount);
      break;
    case 'SCHEDULE_VIEWING':
      console.log('🏠 Property:', data?.listingId);
      console.log('🏠 Viewing ID:', (data as HousingViewingScheduledEvent)?.metadata?.viewingId);
      break;
  }
  
  console.log('🏠 Timestamp:', data?.metadata?.timestamp);
  console.log('🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠');
  console.log('\n');

  this.logger.log(`📥 [Kafka] Received housing AI event: ${data.eventType} for user ${data.userId}`);

  try {
    // Validate required fields
    if (!data?.userId) {
      throw new Error('Missing userId in event data');
    }

    let result: BaseResponseDto<null>;

    // Route to appropriate service method based on event type
    switch (data.eventType) {
      case 'VIEW': {
        if (!data?.listingId) throw new Error('Missing listingId in view event');
        if (!data?.metadata?.listingData) throw new Error('Missing listingData in view event');
        
        const viewRequest: HousingViewEventRequest = {
          key: data.userId,
          value: data as HousingViewEvent
        };
        result = await this.housingAnalyticsService.processHousingView(viewRequest);
        break;
      }

      case 'SEARCH': {
        const searchRequest: HousingSearchEventRequest = {
          key: data.userId,
          value: data as HousingSearchEvent
        };
        result = await this.housingAnalyticsService.processHousingSearch(searchRequest);
        break;
      }

      case 'SCHEDULE_VIEWING': {
        if (!data?.listingId) throw new Error('Missing listingId in viewing event');
        
        const viewingRequest: HousingViewingScheduledEventRequest = {
          key: data.userId,
          value: data as HousingViewingScheduledEvent
        };
        result = await this.housingAnalyticsService.processHousingViewingScheduled(viewingRequest);
        break;
      }

      default: {
        this.logger.warn(`⚠️ Unhandled event type: ${(data as any).eventType}`);
        return;
      }
    }
    
    if (!result.success) {
      throw new Error(`Processing failed: ${result.message} (${result.code})`);
    }
    
    this.logger.debug(`✅ Successfully processed ${data.eventType} event for user ${data.userId}`);
    
  } catch (error) {
    this.logger.error(`❌ Error processing ${data.eventType} event: ${error.message}`);
    throw error; // Kafka will retry
  }
}

  // ======================================================
  // GRPC METHODS (for AI developer and dashboard)
  // ======================================================

  @GrpcMethod('HousingAnalyticsService', 'ProcessHousingView')
  async processHousingView(
    request: HousingViewEventRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📊 gRPC: Processing house view for user ${request.value.userId}, listing ${request.value.listingId}`);
    
    try {
      const result = await this.housingAnalyticsService.processHousingView(request);
      
      if (!result.success) {
        this.logger.warn(`⚠️ Failed to process house view: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error processing house view: ${error.message}`);
      return BaseResponseDto.fail('Internal server error', 'INTERNAL_ERROR');
    }
  }

  @GrpcMethod('HousingAnalyticsService', 'ProcessHousingSearch')
  async processHousingSearch(
    request: HousingSearchEventRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`🔍 gRPC: Processing house search for user ${request.value.userId}`);
    
    try {
      const result = await this.housingAnalyticsService.processHousingSearch(request);
      
      if (!result.success) {
        this.logger.warn(`⚠️ Failed to process house search: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error processing house search: ${error.message}`);
      return BaseResponseDto.fail('Internal server error', 'INTERNAL_ERROR');
    }
  }

  @GrpcMethod('HousingAnalyticsService', 'ProcessHousingViewingScheduled')
  async processHousingViewingScheduled(
    request: HousingViewingScheduledEventRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📅 gRPC: Processing house viewing scheduled for user ${request.value.userId}, listing ${request.value.listingId}`);
    
    try {
      const result = await this.housingAnalyticsService.processHousingViewingScheduled(request);
      
      if (!result.success) {
        this.logger.warn(`⚠️ Failed to process house viewing scheduled: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error processing house viewing scheduled: ${error.message}`);
      return BaseResponseDto.fail('Internal server error', 'INTERNAL_ERROR');
    }
  }


  @GrpcMethod('HousingAnalyticsService', 'UpdateHousingLabel')
  async updateHousingLabel(
    request: UpdateLabelRequest,
  ): Promise<BaseResponseDto<LabelUpdateResponseDto>> {
    this.logger.log(`🏷️ gRPC: Updating label for user ${request.userUuid}, listing ${request.listingId}, action: ${request.action}`);
    
    try {
      const result = await this.housingAnalyticsService.updateHousingLabel(
        request.userUuid,
        request.listingId,
        request.action,
        request.dwellTime,
        request.metadata
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error updating label: ${error.message}`);
      return BaseResponseDto.fail('Failed to update label', 'INTERNAL_ERROR');
    }
  }

  @EventPattern('analytics.listing.milestone')
  async handleListingMilestone(@Payload() data: any) {
    // Log the entire raw data to see its structure
    this.logger.log(`📨 RAW KAFKA MESSAGE: ${JSON.stringify(data)}`);
    
    // Try to extract event data - it might be directly the event, or wrapped
    const eventData = data?.value || data;
    
    this.logger.log(`📨 Extracted eventData: ${JSON.stringify(eventData)}`);
    this.logger.log(`🏆 Processing listing milestone: ${eventData?.metadata?.milestone}`);
     
    await this.housingAnalyticsService.processListingMilestone(eventData);
  }


}