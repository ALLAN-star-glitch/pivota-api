// analytics/controllers/housing-analytics.controller.ts
import { Controller, Logger, OnModuleInit, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod, EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices'; // Change RmqContext to KafkaContext
import { HousingAnalyticsService } from '../services/housing/housing-analytics.service';
import { 
  BaseResponseDto, 
  ListingViewedEventDto,
  ListingSavedEventDto,
  ListingContactedEventDto,
  SearchPerformedEventDto,
  UserHousingStatsResponseDto,
  HousingTrainingDataResponseDto,
  LabelUpdateResponseDto
} from '@pivota-api/dtos';

export interface HousingViewedEventRequest {
  key: string;
  value: ListingViewedEventDto;
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
  action: 'SAVE' | 'CONTACT' | 'CLICK' | 'CONVERT';
  dwellTime?: number;
}

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HousingAnalyticsController implements OnModuleInit {
  private readonly logger = new Logger(HousingAnalyticsController.name);

  constructor(
    private readonly housingAnalyticsService: HousingAnalyticsService,
  ) {}

  onModuleInit() {
    this.logger.log('🚀 KAFKA HANDLER INITIALIZED: I am ready for events.');
  }

  // ======================================================
  // KAFKA EVENT HANDLERS (for consuming from housing service)
  // ======================================================

  /**
   * Handle listing.viewed events from Kafka
   * This is the primary event for the feature store
   */
  @EventPattern('listing.viewed')
  async handleListingViewed(
    @Payload() data: ListingViewedEventDto,
    @Ctx() context: KafkaContext // Changed from RmqContext to KafkaContext
  ): Promise<void> {
    // Get Kafka-specific context
    const message = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();
    const offset = message.offset;
    
    // VISIBLE LOGGING
    console.log('\n');
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('🔥 KAFKA EVENT RECEIVED IN ADMIN SERVICE!');
    console.log('🔥 Topic:', topic);
    console.log('🔥 Partition:', partition);
    console.log('🔥 Offset:', offset);
    console.log('🔥 User:', data?.userUuid);
    console.log('🔥 Listing:', data?.listingId);
    console.log('🔥 Platform:', data?.platform);
    console.log('🔥 Timestamp:', data?.timestamp);
    console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
    console.log('\n');

    this.logger.log(`📥 [Kafka] Received listing.viewed event for user ${data.userUuid}, listing ${data.listingId}`);

    try {
      const event: HousingViewedEventRequest = {
        key: data.userUuid,
        value: data
      };
      
      const result = await this.housingAnalyticsService.processHousingView(event);
      
      if (result.success) {
        this.logger.log(`✅ Successfully processed event for listing ${data.listingId}`);
        // Kafka auto-commits by default, no need to manually ack
      } else {
        this.logger.error(`❌ Processing failed: ${result.message}`);
        throw new Error(result.message); // Throw to trigger retry
      }
    } catch (error) {
      this.logger.error(`❌ Error processing event: ${error.message}`);
      throw error; // Kafka will retry the message
    }
  }

  /**
   * Handle listing.saved events from Kafka for labeling
   */
  @EventPattern('listing.saved')
  async handleListingSaved(
    @Payload() data: ListingSavedEventDto,
    @Ctx() context: KafkaContext // Changed to KafkaContext
  ): Promise<void> {
    this.logger.log(`📥 [Kafka] Received listing.saved event for user ${data.userUuid}, listing ${data.listingId}`);
    
    try {
      const result = await this.housingAnalyticsService.updateHousingLabel(
        data.userUuid,
        data.listingId,
        'SAVE'
      );
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      this.logger.debug(`✅ Successfully processed listing.saved event`);
    } catch (error) {
      this.logger.error(`❌ Error processing listing.saved: ${error.message}`);
      throw error; // Kafka will retry
    }
  }

  /**
   * Handle listing.contacted events from Kafka for labeling
   */
  @EventPattern('listing.contacted')
  async handleListingContacted(
    @Payload() data: ListingContactedEventDto,
    @Ctx() context: KafkaContext // Changed to KafkaContext
  ): Promise<void> {
    this.logger.log(`📥 [Kafka] Received listing.contacted event for user ${data.userUuid}, listing ${data.listingId}`);
    
    try {
      const result = await this.housingAnalyticsService.updateHousingLabel(
        data.userUuid,
        data.listingId,
        'CONTACT'
      );
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      this.logger.debug(`✅ Successfully processed listing.contacted event`);
    } catch (error) {
      this.logger.error(`❌ Error processing listing.contacted: ${error.message}`);
      throw error; // Kafka will retry
    }
  }

  /**
   * Handle search.performed events from Kafka for context
   */
  @EventPattern('search.performed')
  async handleSearchPerformed(
    @Payload() data: SearchPerformedEventDto,
    @Ctx() context: KafkaContext // Changed to KafkaContext
  ): Promise<void> {
    this.logger.log(`📥 [Kafka] Received search.performed event for user ${data.userUuid}`);
    
    try {
      // You can store search data here if needed
      this.logger.debug(`🔍 Search performed: ${JSON.stringify(data.filters)}`);
    } catch (error) {
      this.logger.error(`❌ Error processing search.performed: ${error.message}`);
      throw error; // Kafka will retry
    }
  }

  // ======================================================
  // GRPC METHODS (for AI developer and dashboard) - NO CHANGES NEEDED
  // ======================================================

  @GrpcMethod('HousingAnalyticsService', 'ProcessHousingView')
  async processHousingView(
    request: HousingViewedEventRequest,
  ): Promise<BaseResponseDto<null>> {
    this.logger.log(`📊 gRPC: Processing housing view for user ${request.value.userUuid}`);
    
    try {
      const result = await this.housingAnalyticsService.processHousingView(request);
      
      if (!result.success) {
        this.logger.warn(`⚠️ Failed to process housing view: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Error processing housing view: ${error.message}`);
      return BaseResponseDto.fail('Internal server error', 'INTERNAL_ERROR');
    }
  }

  @GrpcMethod('HousingAnalyticsService', 'GetUserHousingStats')
  async getUserHousingStats(
    request: GetUserStatsRequest,
  ): Promise<BaseResponseDto<UserHousingStatsResponseDto>> {
    this.logger.log(`📊 gRPC: Getting housing stats for user ${request.userUuid}`);
    
    try {
      const result = await this.housingAnalyticsService.getUserHousingStats(request.userUuid);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error getting user stats: ${error.message}`);
      return BaseResponseDto.fail('Failed to get user stats', 'INTERNAL_ERROR');
    }
  }

  @GrpcMethod('HousingAnalyticsService', 'GetHousingTrainingData')
  async getHousingTrainingData(
    request: GetTrainingDataRequest,
  ): Promise<BaseResponseDto<HousingTrainingDataResponseDto>> {
    this.logger.log(`📚 gRPC: Getting housing training data for AI (days: ${request.days || 30})`);
    
    try {
      const result = await this.housingAnalyticsService.getHousingTrainingData(
        request.days || 30,
        request.limit || 10000
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error getting training data: ${error.message}`);
      return BaseResponseDto.fail('Failed to get training data', 'INTERNAL_ERROR');
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
        request.dwellTime
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Error updating label: ${error.message}`);
      return BaseResponseDto.fail('Failed to update label', 'INTERNAL_ERROR');
    }
  }
}