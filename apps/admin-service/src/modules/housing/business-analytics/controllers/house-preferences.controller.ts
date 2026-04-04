// apps/admin-service/src/modules/housing/business-analytics/controllers/house-preferences.controller.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { HousePreferencesService } from '../services/house-preferences.service';

@Controller('house-preferences')
export class HousePreferencesController {
  private readonly logger = new Logger(HousePreferencesController.name);

  constructor(private readonly housePreferencesService: HousePreferencesService) {}

  /**
   * Handle housing.preferences.updated event
   * Emitted when a Housing Seeker profile is created or updated in Profile Service
   */
  @EventPattern('housing.preferences.updated')
  async handleHousingPreferencesUpdated(@Payload() data: any) {
    this.logger.log(`📥 Received housing.preferences.updated event: ${JSON.stringify(data)}`);
    
    // ✅ MAP the event: userUuid from Kafka -> seekerId for the service
    const mappedEvent = {
      seekerId: data.userUuid,  // This is the fix
      timestamp: data.timestamp,
      action: data.action,
      data: data.data
    };
    
    await this.housePreferencesService.processPreferencesEvent(mappedEvent);
  }
}