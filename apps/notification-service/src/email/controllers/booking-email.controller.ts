// apps/notification-service/src/email/controllers/booking-email.controller.ts

/**
 * Booking Email Controller
 * 
 * Handles booking-related email events from the email queue.
 * This controller processes jobs added by the notification worker in the listings service.
 * 
 * Events Handled:
 * - booking.created.* - New booking created (customer/contractor)
 * - booking.confirmed.* - Booking confirmed (customer/contractor)
 * - booking.declined.* - Booking declined (customer/contractor)
 * - booking.cancelled.* - Booking cancelled (customer/contractor)
 * - booking.completed.* - Service completed (customer/contractor)
 * - booking.reminder.* - Upcoming booking reminder
 * - contractor.daily.summary - Daily summary for contractors
 * - review.request - Request for service review
 * 
 * @example
 * // Event payload for booking created (customer)
 * {
 *   to: 'customer@example.com',
 *   customerName: 'John Doe',
 *   contractorName: 'Jane Smith',
 *   serviceTitle: 'House Painting',
 *   scheduledDate: 'March 25, 2024 at 2:00 PM',
 *   location: 'Nairobi',
 *   price: 'KES 5,000',
 *   notes: 'Please call when you arrive'
 * }
 * 
 * // Event payload for booking created (contractor)
 * {
 *   to: 'contractor@example.com',
 *   contractorName: 'Jane Smith',
 *   customerName: 'John Doe',
 *   customerPhone: '+254712345678',
 *   serviceTitle: 'House Painting',
 *   scheduledDate: 'March 25, 2024 at 2:00 PM',
 *   location: 'Nairobi',
 *   price: 'KES 5,000',
 *   bookingExternalId: 'booking-uuid-123',
 *   notes: 'Please call when you arrive'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { BookingEmailService } from '../services/handlers/booking-email.service';


@Controller()
export class BookingEmailController {
  private readonly logger = new Logger(BookingEmailController.name);

  constructor(private readonly bookingEmailService: BookingEmailService) {
    console.log('🔥🔥🔥 BookingEmailController CONSTRUCTOR CALLED 🔥🔥🔥');
  }

  /**
   * Handle booking created - Customer email
   */
  @EventPattern('booking-created-customer', Transport.RMQ)
  async handleBookingCreatedCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      price: string;
      notes?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CREATED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('🔧 Contractor:', data.contractorName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking created event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCreatedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking created - Contractor email
   */
  @EventPattern('booking-created-contractor', Transport.RMQ)
  async handleBookingCreatedContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      customerPhone: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      price: string;
      bookingExternalId: string;
      notes?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CREATED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('🆔 Booking ID:', data.bookingExternalId);
    
    this.logger.debug(`[RMQ] Booking created event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCreatedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking confirmed - Customer email
   */
  @EventPattern('booking-confirmed-customer', Transport.RMQ)
  async handleBookingConfirmedCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      price: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CONFIRMED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('🔧 Contractor:', data.contractorName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking confirmed event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingConfirmedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking confirmed - Contractor email
   */
  @EventPattern('booking-confirmed-contractor', Transport.RMQ)
  async handleBookingConfirmedContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      customerPhone: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      price: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CONFIRMED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking confirmed event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingConfirmedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking declined - Customer email
   */
  @EventPattern('booking-declined-customer', Transport.RMQ)
  async handleBookingDeclinedCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      reason?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING DECLINED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('🔧 Contractor:', data.contractorName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking declined event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingDeclinedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking declined - Contractor email
   */
  @EventPattern('booking-declined-contractor', Transport.RMQ)
  async handleBookingDeclinedContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      serviceTitle: string;
      scheduledDate: string;
      reason?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING DECLINED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking declined event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingDeclinedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking cancelled - Customer email
   */
  @EventPattern('booking-cancelled-customer', Transport.RMQ)
  async handleBookingCancelledCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      reason?: string;
      cancelledBy: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CANCELLED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('🔧 Contractor:', data.contractorName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('❌ Cancelled by:', data.cancelledBy);
    
    this.logger.debug(`[RMQ] Booking cancelled event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCancelledCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking cancelled - Contractor email
   */
  @EventPattern('booking-cancelled-contractor', Transport.RMQ)
  async handleBookingCancelledContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      serviceTitle: string;
      scheduledDate: string;
      reason?: string;
      cancelledBy: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING CANCELLED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('❌ Cancelled by:', data.cancelledBy);
    
    this.logger.debug(`[RMQ] Booking cancelled event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCancelledContractor(data),
      data.to
    );
  }

  /**
   * Handle booking completed - Customer email
   */
  @EventPattern('booking-completed-customer', Transport.RMQ)
  async handleBookingCompletedCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      price: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING COMPLETED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('🔧 Contractor:', data.contractorName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking completed event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCompletedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking completed - Contractor email
   */
  @EventPattern('booking-completed-contractor', Transport.RMQ)
  async handleBookingCompletedContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      serviceTitle: string;
      price: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING COMPLETED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking completed event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCompletedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking reminder - Customer email
   */
  @EventPattern('booking-reminder-customer', Transport.RMQ)
  async handleBookingReminderCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      hoursRemaining: number;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING REMINDER (CUSTOMER) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('⏰ Hours remaining:', data.hoursRemaining);
    
    this.logger.debug(`[RMQ] Booking reminder event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingReminderCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking reminder - Contractor email
   */
  @EventPattern('booking-reminder-contractor', Transport.RMQ)
  async handleBookingReminderContractor(
    @Payload() data: {
      to: string;
      contractorName: string;
      customerName: string;
      customerPhone: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      hoursRemaining: number;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== BOOKING REMINDER (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('⏰ Hours remaining:', data.hoursRemaining);
    
    this.logger.debug(`[RMQ] Booking reminder event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingReminderContractor(data),
      data.to
    );
  }

  /**
   * Handle contractor daily summary
   */
  @EventPattern('contractor-daily-summary', Transport.RMQ)
  async handleContractorDailySummary(
    @Payload() data: {
      to: string;
      contractorName: string;
      date: string;
      totalBookings: number;
      confirmedBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      totalEarnings: number;
      bookings: Array<{
        time: string;
        clientName: string;
        serviceTitle: string;
        status: string;
        price: string;
      }>;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== CONTRACTOR DAILY SUMMARY EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Contractor:', data.contractorName);
    console.log('📊 Total Bookings:', data.totalBookings);
    console.log('💰 Total Earnings:', data.totalEarnings);
    
    this.logger.debug(`[RMQ] Contractor daily summary event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendContractorDailySummary(data),
      data.to
    );
  }

  /**
   * Handle review request
   */
  @EventPattern('review-request', Transport.RMQ)
  async handleReviewRequest(
    @Payload() data: {
      to: string;
      customerName: string;
      serviceTitle: string;
      bookingId: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('🔍🔍🔍 ========== REVIEW REQUEST EVENT RECEIVED ==========');
    console.log('📧 Email:', data.to);
    console.log('👤 Customer:', data.customerName);
    console.log('📋 Service:', data.serviceTitle);
    console.log('🆔 Booking ID:', data.bookingId);
    
    this.logger.debug(`[RMQ] Review request event for: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendReviewRequest(data),
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