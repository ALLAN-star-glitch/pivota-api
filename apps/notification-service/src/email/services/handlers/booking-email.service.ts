// apps/notification-service/src/email/services/booking-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';


@Injectable()
export class BookingEmailService {
  private readonly logger = new Logger(BookingEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send booking created email to customer
   */
  async sendBookingCreatedCustomer(data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    servicePrice: string;
    bookingFee: string;
    totalPrice: string;
    isNegotiated: boolean;
    notes?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const negotiatedText = data.isNegotiated 
      ? '<p><strong>Note:</strong> This price was negotiated and agreed upon.</p>'
      : '';

    const content = `
      <h1>Booking Request Sent</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>Your booking request for <strong>${data.serviceTitle}</strong> has been sent to <strong>${data.contractorName}</strong>.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Service Price:</strong> ${data.servicePrice}</li>
          <li><strong>Booking Fee:</strong> ${data.bookingFee}</li>
          <li><strong>Total Price:</strong> ${data.totalPrice}</li>
          ${negotiatedText}
          ${data.notes ? `<li><strong>Your Notes:</strong> ${data.notes}</li>` : ''}
        </ul>
      </div>
      
      <div class="security-alert">
        <p><strong>What happens next?</strong></p>
        <p>The service provider will review your request and respond within 24 hours.</p>
        <p>Your payment will only be processed after they confirm the booking.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/bookings" class="button">Track My Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Request Sent: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking created email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking created email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking created email to contractor
   */
  async sendBookingCreatedContractor(data: {
    to: string;
    contractorName: string;
    customerName: string;
    customerPhone: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    servicePrice: string;
    bookingFee: string;
    totalPrice: string;
    isNegotiated: boolean;
    bookingExternalId: string;
    notes?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const negotiatedText = data.isNegotiated 
      ? '<p><strong>Note:</strong> The customer has proposed a negotiated price for this service.</p>'
      : '';

    const content = `
      <h1>New Booking Request</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have a new booking request from <strong>${data.customerName}</strong> for your service.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Service Price:</strong> ${data.servicePrice}</li>
          <li><strong>Booking Fee:</strong> ${data.bookingFee}</li>
          <li><strong>Total Price:</strong> ${data.totalPrice}</li>
          ${negotiatedText}
          ${data.notes ? `<li><strong>Customer Notes:</strong> ${data.notes}</li>` : ''}
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.template.getSocial().website}/contractor/bookings/${data.bookingExternalId}" class="button">Review & Respond</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">Please respond within 24 hours to confirm or decline this booking.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `New Booking Request: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking created email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking created email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking confirmed email to customer
   */
  async sendBookingConfirmedCustomer(data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    totalAmount: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Booking Confirmed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>Good news! <strong>${data.contractorName}</strong> has confirmed your booking.</p>
      
      <div class="success-box">
        <h3>Booking Confirmed</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Total Amount:</strong> ${data.totalAmount}</li>
        </ul>
      </div>
      
      <div class="info-box">
        <p><strong>What's next?</strong></p>
        <p>Your payment is now secured in escrow. The service provider will perform the service as scheduled.</p>
        <p>After the service is completed, you'll have 48 hours to review and release payment.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/bookings" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Confirmed: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking confirmed email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmed email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking confirmed email to contractor
   */
  async sendBookingConfirmedContractor(data: {
    to: string;
    contractorName: string;
    customerName: string;
    customerPhone: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    totalAmount: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Booking Confirmed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have confirmed the booking for <strong>${data.customerName}</strong>.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Total Amount:</strong> ${data.totalAmount}</li>
        </ul>
      </div>
       
      <div class="success-box">
        <p>Payment is secured in escrow and will be released after you complete the service.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/contractor/bookings" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Confirmed: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking confirmed email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmed email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking declined email to customer
   */
  async sendBookingDeclinedCustomer(data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    reason?: string;
    declinedBy: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Booking Declined</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>Unfortunately, <strong>${data.contractorName}</strong> has declined your booking request.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Requested Date:</strong> ${data.scheduledDate}</li>
          ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div>
      
      <div class="security-alert">
        <p>No payment has been processed. You can search for other service providers or try a different time.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.template.getSocial().website}/services" class="button">Find Other Providers</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Declined: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking declined email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking declined email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking declined email to contractor (confirmation)
   */
  async sendBookingDeclinedContractor(data: {
    to: string;
    contractorName: string;
    customerName: string;
    serviceTitle: string;
    scheduledDate: string;
    reason?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Booking Declined</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have declined the booking request from <strong>${data.customerName}</strong>.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Requested Date:</strong> ${data.scheduledDate}</li>
          ${data.reason ? `<li><strong>Reason Provided:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div> 
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/contractor/bookings" class="button">View All Bookings</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Declined: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking declined confirmation sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking declined confirmation to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking cancelled email to customer
   */
  async sendBookingCancelledCustomer(data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    reason?: string;
    cancelledBy: string;
  }): Promise<void> {
    const startTime = Date.now();
    
    const content = `
      <h1>Booking Cancelled</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>The booking for <strong>${data.serviceTitle}</strong> has been cancelled.</p>
      
      <div class="info-box">
        <h3>Cancelled Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Cancelled By:</strong> ${data.cancelledBy === 'client' ? 'You' : data.cancelledBy}</li>
          <li><strong>Original Date:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          ${data.reason ? `<li><strong>Cancellation Reason:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div>
      
      <div class="security-alert">
        <p><strong>Refund Information:</strong> If payment was processed, it will be refunded to your original payment method within 3-5 business days.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.template.getSocial().website}/services" class="button">Browse Other Services</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Cancelled: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking cancelled email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking cancelled email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking cancelled email to contractor
   */
  async sendBookingCancelledContractor(data: {
    to: string;
    contractorName: string;
    customerName: string;
    customerPhone: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    reason?: string;
    cancelledBy: string;
  }): Promise<void> {
    const startTime = Date.now();
    const cancelledByText = data.cancelledBy === 'contractor' ? 'you' : `the customer (${data.customerName})`;

    const content = `
      <h1>Booking Cancelled</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>The booking has been cancelled by ${cancelledByText}.</p>
      
      <div class="info-box">
        <h3>Cancelled Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Original Date:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          ${data.reason ? `<li><strong>Cancellation Reason:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/contractor/bookings" class="button">View Your Bookings</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Booking Cancelled: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking cancelled email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking cancelled email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking reminder email to customer
   */
  async sendBookingReminderCustomer(data: {
    to: string;
    customerName: string;
    contractorName: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    hoursRemaining: number;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Upcoming Booking Reminder</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>This is a reminder that your booking is coming up in ${data.hoursRemaining} hours.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
        </ul>
      </div>
      
      <div class="viewing-card">
        <p><strong>Need to reschedule or cancel?</strong></p>
        <p>Please contact the service provider directly or visit your bookings page.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/bookings" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Reminder: ${data.serviceTitle} in ${data.hoursRemaining} hours`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking reminder email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking reminder email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking reminder email to contractor
   */
  async sendBookingReminderContractor(data: {
    to: string;
    contractorName: string;
    customerName: string;
    customerPhone: string;
    serviceTitle: string;
    scheduledDate: string;
    location: string;
    hoursRemaining: number;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Upcoming Booking Reminder</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have a booking scheduled in ${data.hoursRemaining} hours.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/contractor/bookings" class="button">View Booking Details</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Reminder: ${data.serviceTitle} in ${data.hoursRemaining} hours`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Booking reminder email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send booking reminder email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send contractor daily summary
   */
  async sendContractorDailySummary(data: {
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
    }>;
  }): Promise<void> {
    const startTime = Date.now();
    const formattedDate = this.template.formatDate(new Date(data.date), 'MMMM do, yyyy');

    const bookingsList = data.bookings.map(booking => {
      const statusDisplay = booking.executionStatus && booking.executionStatus !== booking.status
        ? `${booking.status} (Service: ${booking.executionStatus})`
        : booking.status;
      
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.time}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.clientName}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.serviceTitle}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">
          <span class="role-badge">${statusDisplay}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.price}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.totalAmount}</td>
      </tr>
    `}).join('');

    const content = `
      <h1>Daily Summary</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>Here's your summary for ${formattedDate}.</p>
      
      <div class="info-box">
        <h3>Quick Stats</h3>
        <ul>
          <li><strong>Total Bookings:</strong> ${data.totalBookings}</li>
          <li><strong>Confirmed:</strong> ${data.confirmedBookings}</li>
          <li><strong>Completed:</strong> ${data.completedBookings}</li>
          <li><strong>Cancelled:</strong> ${data.cancelledBookings}</li>
          <li><strong>Total Earnings:</strong> ${this.template.formatCurrency(data.totalEarnings)}</li>
        </ul>
      </div>
      
      ${data.bookings.length > 0 ? `
        <h3>Today's Bookings</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Time</th>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Customer</th>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Service</th>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Status</th>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Price</th>
              <th style="text-align: left; padding: 8px; background: ${this.template.getColors().neutralVariant}20;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bookingsList}
          </tbody>
        </table>
      ` : '<p>No bookings for today.</p>'}
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/contractor/dashboard" class="button">Go to Dashboard</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Daily Summary - ${formattedDate}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Daily summary email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send daily summary to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send review request email
   */
  async sendReviewRequest(data: {
    to: string;
    customerName: string;
    serviceTitle: string;
    bookingId: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Share Your Experience</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>How was your experience with <strong>${data.serviceTitle}</strong>?</p>
      
      <div class="info-box">
        <p>Your feedback helps other customers make informed decisions and helps service providers improve.</p>
        <p>It only takes a minute to leave a review!</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingId}/review" class="button">Write a Review</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">Your review will be visible to the community and helps build trust on PivotaConnect.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Share Your Experience: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Review request email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send review request email to ${data.to}: ${error.message}`);
      throw error;
    }
  }
}