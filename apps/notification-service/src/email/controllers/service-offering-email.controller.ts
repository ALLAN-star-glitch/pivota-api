// apps/notification-service/src/email/controllers/service-offering-email.controller.ts

/**
 * Service Offering Email Controller
 * 
 * Handles service offering-related email events from the email queue.
 * This controller processes jobs added by the notification worker in the listings service.
 * 
 * Events Handled:
 * - service-offering-created - Confirmation email when a professional posts a new service
 * 
 * @example
 * // Event payload for service offering created
 * {
 *   to: 'professional@example.com',
 *   professionalName: 'Jane Smith',
 *   serviceTitle: 'Android Development Services',
 *   serviceExternalId: 'service-uuid-123',
 *   categoryName: 'Mobile App Development',
 *   basePrice: '50,000',
 *   priceUnit: 'PER_PROJECT',
 *   createdAt: 'March 25, 2024 at 2:00 PM'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { ServiceOfferingEmailService } from '../services/handlers/service-offering-email.service';


@Controller()
export class ServiceOfferingEmailController {
  private readonly logger = new Logger(ServiceOfferingEmailController.name);

  constructor(private readonly serviceOfferingEmailService: ServiceOfferingEmailService) {
    console.log('🔥🔥🔥 ServiceOfferingEmailController CONSTRUCTOR CALLED 🔥🔥🔥');
  }

  /**
   * Handle service offering created - Professional confirmation email
   */
  @EventPattern('service-offering-created', Transport.RMQ)
  async handleServiceOfferingCreated(
    @Payload() data: {
      to: string;
      professionalName: string;
      serviceTitle: string;
      serviceExternalId: string;
      categoryName: string;
      basePrice: string;
      priceUnit: string;
      createdAt: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== SERVICE OFFERING CREATED EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Professional:', data.professionalName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('📂 Category:', data.categoryName);
    console.log('💰 Price:', `${data.basePrice} (${data.priceUnit})`);
    
    this.logger.debug(`[RMQ] Service offering created event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.serviceOfferingEmailService.sendServiceOfferingCreated(data),
      data.to
    );
  }

  /**
   * Shared private processor for event handling with proper acknowledgment
   */
  private async processEvent(
    context: RmqContext,
    action: () => Promise<void>,
    identifier: string
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    
    console.log(`🔍 STEP 1: Processing event: ${pattern} for ${identifier}`);
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      console.log(`🔍 STEP 2: About to execute action for ${identifier}`);
      await action();
      console.log(`🔍 STEP 3: Action completed successfully for ${identifier}`);
      
      console.log(`🔍 STEP 4: Acknowledging message for ${identifier}`);
      channel.ack(originalMsg);
      console.log(`🔍 STEP 5: Message acknowledged for ${identifier}`);
      
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🔍 STEP ERROR: Failed at ${duration}ms: ${error.message}`);
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      channel.nack(originalMsg, false, false);
    }
  }
}