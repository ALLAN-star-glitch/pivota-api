// apps/notification-service/src/email/controllers/service-offering-email.controller.ts

/**
 * Service Offering Email Controller
 * 
 * Handles service offering-related email events from the email queue.
 * This controller processes jobs added by the notification worker in the listings service.
 * 
 * Events Handled:
 * - service-offering-created - Confirmation email when a professional posts a new service
 * - service-offering-updated - Notification when a service offering is updated
 * - service-offering-deleted - Notification when a service offering is deleted
 * 
 * @example
 * // Event payload for service offering created
 * {
 *   to: 'professional@example.com',
 *   professionalName: 'Jane Smith',
 *   professionalPhone: '+254712345678',
 *   serviceId: 'service-id-123',
 *   serviceExternalId: 'service-uuid-123',
 *   serviceTitle: 'Android Development Services',
 *   serviceDescription: 'Custom Android app development',
 *   categoryName: 'Mobile App Development',
 *   categorySlug: 'mobile-app-dev',
 *   vertical: 'JOBS',
 *   basePrice: '50,000 KES',
 *   priceUnit: 'PER_PROJECT',
 *   isNegotiable: true,
 *   priceRange: '45,000 - 60,000 KES',
 *   bookingFeeAmount: '500 KES - Call-out fee covers travel',
 *   bookingFeeRefundable: false,
 *   coverageAreas: 'Nairobi, Kiambu, Machakos',
 *   createdAt: 'March 25, 2024 at 2:00 PM',
 *   serviceUrl: 'https://pivota.com/services/service-uuid-123',
 *   dashboardUrl: 'https://pivota.com/professional/dashboard/services/service-uuid-123'
 * }
 * 
 * // Event payload for service offering updated
 * {
 *   to: 'professional@example.com',
 *   professionalName: 'Jane Smith',
 *   serviceId: 'service-id-123',
 *   serviceExternalId: 'service-uuid-123',
 *   serviceTitle: 'Android Development Services',
 *   updatedAt: 'March 26, 2024 at 3:00 PM',
 *   dashboardUrl: 'https://pivota.com/professional/dashboard/services/service-uuid-123'
 * }
 * 
 * // Event payload for service offering deleted
 * {
 *   to: 'professional@example.com',
 *   professionalName: 'Jane Smith',
 *   serviceId: 'service-id-123',
 *   serviceExternalId: 'service-uuid-123',
 *   serviceTitle: 'Android Development Services',
 *   deletedAt: 'March 26, 2024 at 4:00 PM',
 *   dashboardUrl: 'https://pivota.com/professional/dashboard/services'
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
      professionalPhone?: string;
      serviceId?: string;
      serviceExternalId: string;
      serviceTitle: string;
      serviceDescription?: string;
      categoryName: string;
      categorySlug?: string;
      vertical?: string;
      basePrice: string;
      priceUnit: string;
      isNegotiable?: boolean;
      priceRange?: string;
      bookingFeeAmount?: string;
      bookingFeeRefundable?: boolean;
      coverageAreas?: string;
      createdAt: string;
      serviceUrl?: string;
      dashboardUrl?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== SERVICE OFFERING CREATED EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Professional:', data.professionalName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('📂 Category:', data.categoryName);
    console.log('💰 Price:', data.basePrice);
    console.log('🎯 Negotiable:', data.isNegotiable ? 'Yes' : 'No');
    if (data.bookingFeeAmount) {
      console.log('💵 Booking Fee:', data.bookingFeeAmount);
    }
    
    this.logger.debug(`[RMQ] Service offering created event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.serviceOfferingEmailService.sendServiceOfferingCreated(data),
      data.to
    );
  }

  /**
   * Handle service offering updated - Professional notification email
   */
  @EventPattern('service-offering-updated', Transport.RMQ)
  async handleServiceOfferingUpdated(
    @Payload() data: {
      to: string;
      professionalName: string;
      serviceId: string;
      serviceExternalId: string;
      serviceTitle: string;
      updatedAt: string;
      dashboardUrl: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== SERVICE OFFERING UPDATED EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Professional:', data.professionalName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('🕐 Updated At:', data.updatedAt);
    
    this.logger.debug(`[RMQ] Service offering updated event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.serviceOfferingEmailService.sendServiceOfferingUpdated(data),
      data.to
    );
  }

  /**
   * Handle service offering deleted - Professional notification email
   */
  @EventPattern('service-offering-deleted', Transport.RMQ)
  async handleServiceOfferingDeleted(
    @Payload() data: {
      to: string;
      professionalName: string;
      serviceId: string;
      serviceExternalId: string;
      serviceTitle: string;
      deletedAt: string;
      dashboardUrl: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== SERVICE OFFERING DELETED EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Professional:', data.professionalName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('🕐 Deleted At:', data.deletedAt);
    
    this.logger.debug(`[RMQ] Service offering deleted event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.serviceOfferingEmailService.sendServiceOfferingDeleted(data),
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