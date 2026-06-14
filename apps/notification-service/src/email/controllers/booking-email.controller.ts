/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/notification-service/src/email/controllers/booking-email.controller.ts

/**
 * Booking Email Controller
 * 
 * Handles booking-related email events from the email queue.
 * This controller processes jobs added by the notification worker in the listings service.
 * 
 * PAYMENT MODEL: Standard Freelancing Platform Model (Escrow)
 * - Funds are authorized at booking and held in escrow
 * - Customer's payment method is not charged at booking
 * - Customer is charged only AFTER service is completed and they confirm satisfaction
 * - Funds are released to professional after customer approval
 * - Auto-approval after 48 hours if customer takes no action
 * 
 * Events Handled:
 * - booking.created.* - New booking created (customer/contractor) with negotiation support
 * - booking.confirmed.* - Booking confirmed (customer/contractor) with price info
 * - booking.declined.* - Booking declined (customer/contractor)
 * - booking.cancelled.* - Booking cancelled (customer/contractor)
 * - booking.reminder.* - Upcoming booking reminder
 * - contractor.daily.summary - Daily summary for contractors with negotiation flags
 * - review.request - Request for service review
 * 
 * @example
 * // Event payload for booking created with negotiation
 * {
 *   to: 'contractor@example.com',
 *   contractorName: 'Jane Smith',
 *   customerName: 'John Doe',
 *   serviceTitle: 'House Painting',
 *   scheduledDate: 'March 25, 2024 at 2:00 PM',
 *   location: 'Nairobi',
 *   servicePrice: 'KES 3,000',
 *   servicePricePerUnit: '/hour',
 *   bookingFee: 'KES 500',
 *   totalPrice: 'KES 3,500',
 *   isNegotiated: true,
 *   hasBookingFee: true,
 *   originalPrice: 'KES 3,500',
 *   proposedPrice: 'KES 3,000',
 *   savingsAmount: 'KES 500',
 *   savingsPercentage: '14.3',
 *   priceUnitDisplay: 'hourly',
 *   durationDisplay: '2 hours',
 *   calculationBreakdown: { ... },
 *   priceBreakdown: { ... },
 *   negotiationDetails: { ... }
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { BookingEmailService } from '../services/handlers/booking-email.service';


@Controller()
export class BookingEmailController {
  private readonly logger = new Logger(BookingEmailController.name);

  constructor(private readonly bookingEmailService: BookingEmailService) {
    console.log('BookingEmailController CONSTRUCTOR CALLED');
  }

  /**
   * Handle booking created - Customer email
   * Standard freelancing platform model: Funds authorized but not charged. Payment after service completion.
   */
@EventPattern('booking-created-customer', Transport.RMQ)
async handleBookingCreatedCustomer(
  @Payload() data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    customerPhone: string;
    location: string;
    servicePrice: string;
    servicePricePerUnit?: string;
    bookingFee: string;
    totalPrice: string;
    isNegotiated: boolean;
    hasBookingFee: boolean;
    notes?: string;
    originalPrice?: string;
    proposedPrice?: string;
    savingsAmount?: string;
    savingsPercentage?: string;
    priceBreakdown?: any; 
    priceUnitDisplay?: string;
    durationDisplay?: string;
    calculationBreakdown?: {
      baseRate: number;
      baseRateFormatted: string;
      duration: number | null;
      durationLabel: string;
      multiplier: number;
      subtotal: number;
      subtotalFormatted: string;
      bookingFee: number;
      bookingFeeFormatted: string;
      total: number;
      totalFormatted: string;
    };
    // NEW: Platform commission fields
    platformCommissionPercentage?: number;
    platformCommissionFormatted?: string;
    serviceProviderPayoutFormatted?: string;
  },
  @Ctx() context: RmqContext
) {
  console.log('========== BOOKING CREATED (CUSTOMER) EVENT RECEIVED ==========');
  console.log('Email:', data.to);
  console.log('Customer:', data.customerName);
  console.log('Contractor:', data.contractorName);
  console.log('Service:', data.serviceTitle);
  console.log('Service Price:', data.servicePrice);
  if (data.servicePricePerUnit) console.log('Price Unit:', data.servicePricePerUnit);
  if (data.priceUnitDisplay) console.log('Pricing Type:', data.priceUnitDisplay);
  if (data.durationDisplay) console.log('Duration:', data.durationDisplay);
  console.log('Booking Fee:', data.bookingFee);
  console.log('Total Amount Authorized:', data.totalPrice);
  console.log('Has Booking Fee:', data.hasBookingFee);
  console.log('Negotiated:', data.isNegotiated);
  if (data.isNegotiated) {
    console.log('Original Price:', data.originalPrice);
    console.log('Proposed Price:', data.proposedPrice);
    console.log('Savings:', data.savingsAmount);
    console.log('Savings %:', data.savingsPercentage);
  }
  
  this.logger.debug(`[RMQ] Booking created event for customer: ${data.to}`);
  await this.processEvent(
    context,
    () => this.bookingEmailService.sendBookingCreatedCustomer({
      to: data.to,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      scheduledDate: data.scheduledDate,
      location: data.location,
      servicePrice: data.servicePrice,
      servicePricePerUnit: data.servicePricePerUnit,
      bookingFee: data.bookingFee,
      totalPrice: data.totalPrice,
      isNegotiated: data.isNegotiated,
      hasBookingFee: data.hasBookingFee,
      notes: data.notes,
      originalPrice: data.originalPrice,
      proposedPrice: data.proposedPrice,
      savingsAmount: data.savingsAmount,
      savingsPercentage: data.savingsPercentage,
      priceBreakdown: data.priceBreakdown,
      priceUnitDisplay: data.priceUnitDisplay,
      durationDisplay: data.durationDisplay,
      calculationBreakdown: data.calculationBreakdown,
      // NEW: Platform commission fields
      platformCommissionPercentage: data.platformCommissionPercentage,
      platformCommissionFormatted: data.platformCommissionFormatted,
      serviceProviderPayoutFormatted: data.serviceProviderPayoutFormatted,
    }),
    data.to
  );
}

  /**
   * Handle booking created - Contractor email
   * Standard freelancing platform model: Funds secured in escrow. Payment after service completion.
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
    servicePrice: string;
    servicePricePerUnit?: string;
    bookingFee: string;
    totalPrice: string;
    isNegotiated: boolean;
    hasBookingFee: boolean;
    bookingExternalId: string;
    notes?: string;
    priceUnitDisplay?: string;
    durationDisplay?: string;
    calculationBreakdown?: {
      baseRate: number;
      baseRateFormatted: string;
      duration: number | null;
      durationLabel: string;
      multiplier: number;
      subtotal: number;
      subtotalFormatted: string;
      bookingFee: number;
      bookingFeeFormatted: string;
      total: number;
      totalFormatted: string;
    };
    originalPrice?: string;
    originalPricePerUnit?: string;
    proposedPrice?: string;
    priceBreakdown?: any;
    negotiationDetails?: {
      proposedAmount: number;
      proposedAmountFormatted: string;
      originalAmount: number;
      originalAmountFormatted: string;
      savingsAmount: number;
      totalProposedAmount?: number;
      totalProposedAmountFormatted?: string;
      totalOriginalAmount?: number;
      totalOriginalAmountFormatted?: string;
      savingsAmountFormatted: string;
      savingsPercentage: string;
      isLower: boolean;
      negotiationStatus: string;
      message: string;
      actionRequired: string;
    };
    actionRequired?: string;
    // NEW: Platform commission fields
    platformCommissionPercentage?: number;
    platformCommissionAmount?: number;
    platformCommissionFormatted?: string;
    serviceProviderPayout?: number;
    serviceProviderPayoutFormatted?: string;
  },
  @Ctx() context: RmqContext
) {
  console.log('========== BOOKING CREATED (CONTRACTOR) EVENT RECEIVED ==========');
  console.log('Email:', data.to);
  console.log('Contractor:', data.contractorName);
  console.log('Customer:', data.customerName);
  console.log('Service:', data.serviceTitle);
  console.log('Service Price:', data.servicePrice);
  if (data.servicePricePerUnit) console.log('Price Unit:', data.servicePricePerUnit);
  if (data.priceUnitDisplay) console.log('Pricing Type:', data.priceUnitDisplay);
  if (data.durationDisplay) console.log('Duration:', data.durationDisplay);
  console.log('Booking Fee:', data.bookingFee);
  console.log('Total Amount Secured in Escrow:', data.totalPrice);
  console.log('Has Booking Fee:', data.hasBookingFee);
  console.log('Booking ID:', data.bookingExternalId);
  console.log('Negotiated:', data.isNegotiated);
  if (data.isNegotiated && data.negotiationDetails) {
    console.log('Original Price:', data.originalPrice);
    console.log('Proposed Price:', data.proposedPrice);
    console.log('Difference:', data.negotiationDetails.savingsAmountFormatted);
    console.log('Difference %:', data.negotiationDetails.savingsPercentage);
    console.log('Action Required:', data.negotiationDetails.actionRequired);
  }
  
  this.logger.debug(`[RMQ] Booking created event for contractor: ${data.to}`);
  await this.processEvent(
    context,
    () => this.bookingEmailService.sendBookingCreatedContractor({
      to: data.to,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: data.scheduledDate,
      location: data.location,
      servicePrice: data.servicePrice,
      servicePricePerUnit: data.servicePricePerUnit,
      bookingFee: data.bookingFee,
      totalPrice: data.totalPrice,
      isNegotiated: data.isNegotiated,
      hasBookingFee: data.hasBookingFee,
      bookingExternalId: data.bookingExternalId,
      notes: data.notes,
      originalPrice: data.originalPrice,
      originalPricePerUnit: data.originalPricePerUnit,
      proposedPrice: data.proposedPrice,
      priceBreakdown: data.priceBreakdown,
      priceUnitDisplay: data.priceUnitDisplay,
      durationDisplay: data.durationDisplay,
      calculationBreakdown: data.calculationBreakdown,
      negotiationDetails: data.negotiationDetails,
      actionRequired: data.actionRequired,  
      // NEW: Platform commission fields
      platformCommissionPercentage: data.platformCommissionPercentage,
      platformCommissionAmount: data.platformCommissionAmount,
      platformCommissionFormatted: data.platformCommissionFormatted,
      serviceProviderPayout: data.serviceProviderPayout,
      serviceProviderPayoutFormatted: data.serviceProviderPayoutFormatted,
    }),

    data.to    
  );
}

  
  /**
   * Handle booking confirmed - Customer email
   * Standard freelancing platform model: Funds remain secured. Customer confirms completion to trigger payment.
   */
  @EventPattern('booking-confirmed-customer', Transport.RMQ)
  async handleBookingConfirmedCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      customerPhone?: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      totalAmount: string;
      isNegotiated?: boolean;
      finalPrice?: string;
      originalPrice?: string;
      servicePrice?: string;
      hasBookingFee?: boolean;
      bookingFee?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING CONFIRMED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Customer:', data.customerName);
    console.log('Contractor:', data.contractorName);
    console.log('Service:', data.serviceTitle);
    console.log('Total Amount Secured:', data.totalAmount);
    console.log('Service Price:', data.servicePrice);
    console.log('Has Service Fee:', data.hasBookingFee);
    console.log('Service Fee:', data.bookingFee);
    console.log('Negotiated:', data.isNegotiated);
    
    this.logger.debug(`[RMQ] Booking confirmed event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingConfirmedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking confirmed - Contractor email
   * Standard freelancing platform model: Funds secured. Customer will pay after service completion.
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
      totalAmount: string;
      isNegotiated?: boolean;
      finalPrice?: string;
      servicePrice?: string;
      hasBookingFee?: boolean;
      bookingFee?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING CONFIRMED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Contractor:', data.contractorName);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    console.log('Total Amount Secured in Escrow:', data.totalAmount);
    console.log('Service Price:', data.servicePrice);
    console.log('Has Service Fee:', data.hasBookingFee);
    console.log('Service Fee:', data.bookingFee);
    console.log('Negotiated:', data.isNegotiated);
    
    this.logger.debug(`[RMQ] Booking confirmed event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingConfirmedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking declined - Customer email
   * Standard freelancing platform model: Authorization released, no charge.
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
      declinedBy: string;
      hasBookingFee?: boolean;
      bookingFee?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING DECLINED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Customer:', data.customerName);
    console.log('Contractor:', data.contractorName);
    console.log('Service:', data.serviceTitle);
    console.log('Declined by:', data.declinedBy);
    console.log('Has Service Fee:', data.hasBookingFee);
    if (data.hasBookingFee) console.log('Service Fee:', data.bookingFee);
    
    this.logger.debug(`[RMQ] Booking declined event for customer: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingDeclinedCustomer(data),
      data.to
    );
  }

  /**
   * Handle booking declined - Contractor email (confirmation)
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
    console.log('========== BOOKING DECLINED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Contractor:', data.contractorName);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    
    this.logger.debug(`[RMQ] Booking declined event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingDeclinedContractor(data),
      data.to
    );
  }

  /**
   * Handle booking cancelled - Customer email
   * Standard freelancing platform model: Authorization released, no charge.
   */
  @EventPattern('booking-cancelled-customer', Transport.RMQ)
  async handleBookingCancelledCustomer(
    @Payload() data: {
      to: string;
      customerName: string;
      contractorName: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      reason?: string;
      cancelledBy: string;
      hasBookingFee?: boolean;
      bookingFee?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING CANCELLED (CUSTOMER) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Customer:', data.customerName);
    console.log('Contractor:', data.contractorName);
    console.log('Service:', data.serviceTitle);
    console.log('Cancelled by:', data.cancelledBy);
    console.log('Has Service Fee:', data.hasBookingFee);
    if (data.hasBookingFee) console.log('Service Fee:', data.bookingFee);
    
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
      customerPhone: string;
      serviceTitle: string;
      scheduledDate: string;
      location: string;
      reason?: string;
      cancelledBy: string;
      hasBookingFee?: boolean;
      bookingFee?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING CANCELLED (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Contractor:', data.contractorName);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    console.log('Cancelled by:', data.cancelledBy);
    console.log('Has Service Fee:', data.hasBookingFee);
    if (data.hasBookingFee) console.log('Service Fee:', data.bookingFee);
    
    this.logger.debug(`[RMQ] Booking cancelled event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingCancelledContractor(data),
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
      totalAmount?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING REMINDER (CUSTOMER) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    console.log('Hours remaining:', data.hoursRemaining);
    
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
      totalAmount?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== BOOKING REMINDER (CONTRACTOR) EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Contractor:', data.contractorName);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    console.log('Hours remaining:', data.hoursRemaining);
    
    this.logger.debug(`[RMQ] Booking reminder event for contractor: ${data.to}`);
    await this.processEvent(
      context,
      () => this.bookingEmailService.sendBookingReminderContractor(data),
      data.to
    );
  }

  /**
   * Handle contractor daily summary (with negotiation flags)
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
        executionStatus?: string;
        price: string;
        totalAmount: string;
        isNegotiated?: boolean;
        originalPrice?: string | null;
      }>;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== CONTRACTOR DAILY SUMMARY EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Contractor:', data.contractorName);
    console.log('Total Bookings:', data.totalBookings);
    console.log('Total Earnings:', data.totalEarnings);
    const negotiatedCount = data.bookings.filter(b => b.isNegotiated).length;
    if (negotiatedCount > 0) {
      console.log('Negotiated Bookings:', negotiatedCount);
    }
    
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
      amountPaid?: string;
    },
    @Ctx() context: RmqContext
  ) {
    console.log('========== REVIEW REQUEST EVENT RECEIVED ==========');
    console.log('Email:', data.to);
    console.log('Customer:', data.customerName);
    console.log('Service:', data.serviceTitle);
    console.log('Booking ID:', data.bookingId);
    
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
    
    console.log(`STEP 1: Processing event: ${pattern} for ${identifier}`);
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      console.log(`STEP 2: About to execute action for ${identifier}`);
      await action();
      console.log(`STEP 3: Action completed successfully for ${identifier}`);
      
      console.log(`STEP 4: Acknowledging message for ${identifier}`);
      channel.ack(originalMsg);
      console.log(`STEP 5: Message acknowledged for ${identifier}`);
       
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`STEP ERROR: Failed at ${duration}ms: ${error.message}`);
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      channel.nack(originalMsg, false, false);
    }
  } 
}