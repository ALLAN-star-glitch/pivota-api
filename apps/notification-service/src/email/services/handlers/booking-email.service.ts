/* eslint-disable @typescript-eslint/no-explicit-any */
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

 async sendBookingCreatedCustomer(data: {
  to: string;
  customerName: string;
  customerPhone: string;
  contractorName: string;
  serviceTitle: string;
  scheduledDate: string;
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
}): Promise<void> {
  const startTime = Date.now();

  let negotiatedText = '';
  let priceComparisonHtml = '';
  let durationHtml = '';
  let pricingTypeHtml = '';
  let paymentInfoHtml = '';
  
  // Add pricing type and duration information
  if (data.priceUnitDisplay) {
    pricingTypeHtml = `<li><strong>Pricing Type:</strong> ${data.priceUnitDisplay}</li>`;
  }
  if (data.durationDisplay) {
    durationHtml = `<li><strong>Duration:</strong> ${data.durationDisplay}</li>`;
  }
  
  // Standard freelancing platform payment information
  paymentInfoHtml = `
    <div class="info-box" style="background-color: #E3F2FD; border-left-color: #2196F3;">
      <p><strong>Payment Information</strong></p>
      <p>To secure this booking, <strong>${data.totalPrice}</strong> has been authorized and is being held securely by PivotaConnect. Your payment method will not be charged at this time.</p>
      <p>You will only be charged after the service provider completes the work and you confirm satisfaction.</p>
      <p><strong>What is escrow?</strong> Your funds are held safely by PivotaConnect and will only be released to the service provider after you approve the completed work.</p>
    </div>
  `;
  
  if (data.isNegotiated && data.originalPrice && data.proposedPrice) {
    
    negotiatedText = `
      <div class="success-box" style="background-color: #E8F5E9; border-left-color: #4CAF50;">
        <p><strong>Negotiated Price Submitted</strong></p>
        <p>You have proposed a negotiated price for this service. The service provider will review your proposal.</p>
        <ul>
          <li><strong>Your Proposed Rate:</strong> ${data.proposedPrice}${data.servicePricePerUnit || ''}</li>
          <li><strong>Original Rate:</strong> <span style="text-decoration: line-through;">${data.originalPrice}${data.servicePricePerUnit || ''}</span></li>
          <li><strong>Duration:</strong> ${data.calculationBreakdown?.durationLabel || ''}</li>
          <li><strong>Your Proposed Total:</strong> ${data.proposedPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown?.durationLabel || ''} = ${data.servicePrice}</li>
          <li><strong>Original Total (for reference):</strong> ${data.originalPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown?.durationLabel || ''} = ${data.calculationBreakdown?.subtotalFormatted || ''}</li>
          <li><strong>You Save:</strong> ${data.savingsAmount} (${data.savingsPercentage}% off)</li>
        </ul>
        <p><strong>Note:</strong> If the professional accepts your negotiated price, the total amount will be adjusted to ${data.servicePrice}.</p>
      </div>
    `;
    
    priceComparisonHtml = `
      <div class="info-box">
        <h3>Price Breakdown</h3>
        <ul>
          <li><strong>Your Proposed Rate:</strong> ${data.proposedPrice}${data.servicePricePerUnit || ''}</li>
          <li><strong>Original Rate:</strong> <span style="text-decoration: line-through;">${data.originalPrice}${data.servicePricePerUnit || ''}</span></li>
          <li><strong>Duration:</strong> ${data.calculationBreakdown?.durationLabel || ''}</li>
          <li><strong>Your Proposed Total:</strong> ${data.proposedPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown?.durationLabel || ''} = ${data.servicePrice}</li>
          <li><strong>Original Total (for reference):</strong> ${data.originalPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown?.durationLabel || ''} = ${data.calculationBreakdown?.subtotalFormatted || ''}</li>
          <li><strong>You Save:</strong> ${data.savingsAmount} (${data.savingsPercentage}% off)</li>
          ${data.hasBookingFee && parseFloat(data.bookingFee) > 0 ? `<li><strong>Booking Fee:</strong> ${data.bookingFee}</li>` : ''}
          ${data.platformCommissionFormatted ? `<li><strong>Platform Commission (${data.platformCommissionPercentage}%):</strong> ${data.platformCommissionFormatted}</li>` : ''}
          <li><strong>Total Authorized Amount:</strong> <strong>${data.totalPrice}</strong></li>
        </ul>
        <p><em>Your payment method will not be charged until after service completion.</em></p>
      </div>
    `;
  } else {
    negotiatedText = '<p><strong>Note:</strong> This is the standard price for this service.</p>';
    
    priceComparisonHtml = `
      <div class="info-box">
        <h3>Price Breakdown</h3>
        <ul>
          <li><strong>Service Price:</strong> ${data.originalPrice}${data.servicePricePerUnit || ''}</li>
          ${data.calculationBreakdown ? `<li><strong>Calculation:</strong> ${data.calculationBreakdown.baseRateFormatted}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown.durationLabel} = ${data.calculationBreakdown.subtotalFormatted}</li>` : ''}
          ${data.hasBookingFee && parseFloat(data.bookingFee) > 0 ? `<li><strong>Booking Fee:</strong> ${data.bookingFee}</li>` : ''}
          ${data.platformCommissionFormatted ? `<li><strong>Platform Commission (${data.platformCommissionPercentage}%):</strong> ${data.platformCommissionFormatted}</li>` : ''}
          <li><strong>Total Authorized Amount:</strong> <strong>${data.totalPrice}</strong></li>
        </ul>
        <p><em>Your payment method will not be charged until after service completion.</em></p>
      </div>
    `;
  }

  const content = `
    <h1>Booking Request Sent</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
    <p>Your booking request for <strong>${data.serviceTitle}</strong> has been sent to <strong>${data.contractorName}</strong>.</p>
    
    ${paymentInfoHtml}
    
    ${negotiatedText}
    
    <div class="info-box">
      <h3>Booking Details</h3>
      <ul>
        <li><strong>Service:</strong> ${data.serviceTitle}</li>
        <li><strong>Service Provider:</strong> ${data.contractorName}</li>
        ${pricingTypeHtml}
        ${durationHtml}
        <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
        <li><strong>Location:</strong> ${data.location}</li>
        ${priceComparisonHtml}
        ${data.notes ? `<li><strong>Your Notes:</strong> ${data.notes}</li>` : ''}
      </ul>
    </div>
    
    <div class="security-alert">
      <p><strong>What happens next?</strong></p>
      <p>1. The service provider will review your request and respond within 24 hours.</p>
      <p>2. If accepted, your booking will be confirmed and the amount will remain secured.</p>
      <p>3. The service provider will perform the service at the scheduled time.</p>
      <p>4. After the service is complete, you will confirm satisfaction.</p>
      <p>5. Your payment will then be processed and released to the service provider.</p>
      <p>6. If the service provider does not show up, you pay nothing and the authorization will be released.</p>
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
      subject: `Booking Request Sent: ${data.serviceTitle}`,
      html: htmlContent,
      text: textContent,
    });
    
    const duration = Date.now() - startTime;
    this.logger.log(`Booking created email sent to customer ${data.to} in ${duration}ms`);
  } catch (error) {
    this.logger.error(`Failed to send booking created email to customer ${data.to}: ${error.message}`);
    throw error;
  }
}

  /**
   * Send booking created email to contractor
   * Standard freelancing platform model: Funds are secured in escrow
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
  servicePricePerUnit?: string;
  bookingFee: string;
  totalPrice: string;
  isNegotiated: boolean;
  hasBookingFee: boolean;
  bookingExternalId: string;
  notes?: string;
  originalPrice?: string;
  originalPricePerUnit?: string;
  proposedPrice?: string;
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
  negotiationDetails?: {
    proposedAmount: number;
    proposedAmountFormatted: string;
    totalProposedAmountFormatted?: string;  
    originalAmount: number;
    originalAmountFormatted: string;
    savingsAmount: number;
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
}): Promise<void> {
  const startTime = Date.now();

  let negotiationHtml = '';
  let pricingTypeHtml = '';
  let durationHtml = '';
  let calculationHtml = '';
  let paymentInfoHtml = '';
  
  // Add pricing type and duration information
  if (data.priceUnitDisplay) {
    pricingTypeHtml = `<li><strong>Pricing Type:</strong> ${data.priceUnitDisplay}</li>`;
  }
  if (data.durationDisplay) {
    durationHtml = `<li><strong>Duration:</strong> ${data.durationDisplay}</li>`;
  }
  
  // Add calculation breakdown - handle null negotiationDetails
  if (data.calculationBreakdown) {
    if (data.isNegotiated && data.negotiationDetails) {
      calculationHtml = `
        <li><strong>Negotiated Price Calculation:</strong> ${data.proposedPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown.durationLabel} = ${data.servicePrice}</li>
        <li><strong>Original Price Calculation (for reference):</strong> ${data.originalPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown.durationLabel} = ${data.calculationBreakdown.subtotalFormatted}</li>
        <li><strong>Customer Savings:</strong> ${data.negotiationDetails.savingsAmountFormatted} (${data.negotiationDetails.savingsPercentage}% off)</li>
      `;
    } else {
      calculationHtml = `
        <li><strong>Price Calculation:</strong> ${data.originalPrice}${data.servicePricePerUnit || ''} × ${data.calculationBreakdown.durationLabel} = ${data.calculationBreakdown.subtotalFormatted}</li>
      `;
    }
  }
  
  // Standard freelancing platform payment information for contractors
  paymentInfoHtml = `
    <div class="info-box" style="background-color: #E3F2FD; border-left-color: #2196F3;">
      <p><strong>Payment Information</strong></p>
      <p><strong>${data.totalPrice}</strong> has been authorized by the customer and is secured in escrow.</p>
      <p>Funds will be released to you after you complete the service and the customer confirms satisfaction.</p>
      <p><strong>What is escrow?</strong> Customer funds are held safely by PivotaConnect. You are guaranteed payment for completed work once the customer approves.</p>
    </div>
  `;
  
  if (data.isNegotiated && data.negotiationDetails) {
    const direction = data.negotiationDetails.isLower ? 'lower' : 'higher';
    negotiationHtml = `
      <div class="security-alert" style="background-color: #FFF3E0; border-left-color: #FF9800;">
        <p><strong>Negotiation Alert</strong></p>
        <p>${data.negotiationDetails.message}</p>
        <ul>
          <li><strong>Customer's Proposed Price:</strong> ${data.negotiationDetails.proposedAmountFormatted}${data.originalPricePerUnit || ''}</li>
          <li><strong>Original Price:</strong> ${data.negotiationDetails.originalAmountFormatted}${data.originalPricePerUnit || ''}</li>
          <li><strong>Difference:</strong> ${data.negotiationDetails.savingsAmountFormatted} (${data.negotiationDetails.savingsPercentage}% ${direction})</li>
        </ul>
        <p><strong>Action Required:</strong> ${data.negotiationDetails.actionRequired}</p>
        <p><strong>Note:</strong> If you accept the negotiated price, the total amount will be adjusted to ${data.negotiationDetails.totalProposedAmountFormatted || data.servicePrice}.</p>
      </div>
    `;
  }

  const content = `
    <h1>New Booking Request</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
    <p>You have a new booking request from <strong>${data.customerName}</strong> for your service.</p>
    
    ${paymentInfoHtml}
    
    ${negotiationHtml}
    
    <div class="info-box">
      <h3>Booking Details</h3>
      <ul>
        <li><strong>Service:</strong> ${data.serviceTitle}</li>
        <li><strong>Customer:</strong> ${data.customerName}</li>
        <li><strong>Customer Phone:</strong> ${data.customerPhone || 'Not provided'}</li>
        ${pricingTypeHtml}
        ${durationHtml}
        <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
        <li><strong>Location:</strong> ${data.location}</li>
        ${calculationHtml}
        ${data.hasBookingFee && parseFloat(data.bookingFee) > 0 ? `<li><strong>Booking Fee (Goes to Service Provider):</strong> ${data.bookingFee}</li>` : ''}
        ${data.platformCommissionFormatted ? `<li><strong>Platform Commission (${data.platformCommissionPercentage}%):</strong> ${data.platformCommissionFormatted}</li>` : ''}
        ${data.serviceProviderPayoutFormatted ? `<li><strong>Your Payout (after commission):</strong> <strong>${data.serviceProviderPayoutFormatted}</strong></li>` : ''}
        <li><strong>Total Amount (secured in escrow):</strong> <strong>${data.totalPrice}</strong></li>
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
      subject: `${data.isNegotiated ? 'Negotiated Price - ' : ''}New Booking Request: ${data.serviceTitle}`,
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
 * Funds remain secured. Customer will pay after service completion.
 */
async sendBookingConfirmedCustomer(data: {
  to: string;
  customerName: string;
  customerPhone?: string;
  contractorName: string;
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
}): Promise<void> {
  const startTime = Date.now();

  const negotiationText = data.isNegotiated && data.originalPrice && data.finalPrice
    ? `<p><strong>Negotiated Price Accepted:</strong> Original: ${data.originalPrice} → Final price: ${data.finalPrice}</p>`
    : '';

  // Build booking fee display if present
  const bookingFeeHtml = data.hasBookingFee && parseFloat(data.bookingFee || '0') > 0
    ? `<li><strong>Booking Fee:</strong> ${data.bookingFee}</li>`
    : '';

  const content = `
    <h1>Booking Confirmed</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
    <p><strong>${data.contractorName}</strong> has confirmed your booking.</p>
    
    ${negotiationText}
    
    <div class="success-box" style="background-color: #E8F5E9; border-left-color: #4CAF50;">
      <h3>Booking Confirmed</h3>
      <ul>
        <li><strong>Service:</strong> ${data.serviceTitle}</li>
        <li><strong>Service Provider:</strong> ${data.contractorName}</li>
        <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
        <li><strong>Location:</strong> ${data.location}</li>
        <li><strong>Your Phone:</strong> ${data.customerPhone}</li>
        ${bookingFeeHtml}
        <li><strong>Total Amount Secured:</strong> ${data.totalAmount}</li>
      </ul>
    </div>
    
    <div class="info-box">
      <p><strong>Payment Information</strong></p>
      <p>Your payment method has not been charged. The amount of <strong>${data.totalAmount}</strong> remains secured in escrow.</p>
      <p><strong>When will you be charged?</strong> After the service provider completes the work, you will need to log in and confirm satisfaction. Your payment will then be processed.</p>
      <p><strong>What if something is wrong?</strong> You have 48 hours after service completion to raise any issues. If no action is taken, the payment will be automatically processed.</p>
      <p><strong>What if the professional does not show up?</strong> If the professional does not show up, you pay nothing. Report the no-show through the platform and the funds will be released back to you.</p>
    </div>
    
    <div class="security-alert">
      <p><strong>What happens next?</strong></p>
      <p>1. The service provider will arrive at the scheduled time.</p>
      <p>2. After the service is complete, log in to your account.</p>
      <p>3. Confirm that the service was completed satisfactorily.</p>
      <p>4. Your payment will then be processed and released to the service provider.</p>
      <p>5. If you do not respond within 48 hours, the payment will be automatically processed.</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${this.template.getSocial().website}/bookings" class="button">View My Booking</a>
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
    this.logger.error(`Failed to send booking confirmed email to customer ${data.to}: ${error.message}`);
    throw error;
  }
}

  /**
   * Send booking confirmed email to contractor
   * Informs that funds are secured and will be released after service completion
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
    isNegotiated?: boolean;
    finalPrice?: string;
    servicePrice?: string;
    hasBookingFee?: boolean;
    bookingFee?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const negotiationText = data.isNegotiated && data.finalPrice
      ? `<p><strong>Negotiated Price Accepted:</strong> Final price: ${data.finalPrice}</p>`
      : '';

    const content = `
      <h1>Booking Confirmed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have confirmed the booking for <strong>${data.customerName}</strong>.</p>
      
      ${negotiationText}
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Date & Time:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Total Amount Secured in Escrow:</strong> ${data.totalAmount}</li>
        </ul>
      </div>
       
      <div class="success-box" style="background-color: #E8F5E9; border-left-color: #4CAF50;">
        <p><strong>Payment Information</strong></p>
        <p>The customer has authorized <strong>${data.totalAmount}</strong>. Funds are secured in escrow.</p>
        <p>After you complete the work, the customer will confirm satisfaction. Once confirmed, the funds will be released to your account.</p>
        <p>If the customer does not respond within 48 hours, the payment will be automatically released.</p>
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
    hasBookingFee?: boolean;
    bookingFee?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Booking Declined</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p><strong>${data.contractorName}</strong> has declined your booking request.</p>
      
      <div class="info-box">
        <h3>Booking Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Requested Date:</strong> ${data.scheduledDate}</li>
          ${data.reason ? `<li><strong>Reason Given:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div>
      
      <div class="security-alert">
        <p><strong>Payment Information:</strong> No payment has been processed. The authorization on your payment method has been released.</p>
        <p>You can search for other service providers who offer similar services.</p>
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
      this.logger.error(`Failed to send booking declined email to customer ${data.to}: ${error.message}`);
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
      
      <div class="security-alert">
        <p><strong>Payment Information:</strong> No payment was processed. The customer's funds have been released.</p>
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
    hasBookingFee?: boolean;
    bookingFee?: string;
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
        <p><strong>Payment Information:</strong> No payment has been processed. The authorization on your payment method has been released.</p>
        <p>You can browse other services.</p>
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
      this.logger.error(`Failed to send booking cancelled email to customer ${data.to}: ${error.message}`);
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
    hasBookingFee?: boolean;
    bookingFee?: string;
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
      
      <div class="security-alert">
        <p><strong>Payment Information:</strong> No payment was processed. The customer's funds have been released.</p>
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
    totalAmount?: string;
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
          ${data.totalAmount ? `<li><strong>Amount Secured:</strong> ${data.totalAmount}</li>` : ''}
        </ul>
      </div>
      
      <div class="viewing-card">
        <p><strong>Need to reschedule or cancel?</strong></p>
        <p>Please contact the service provider directly or visit your bookings page.</p>
        <p><strong>Note:</strong> No payment has been processed. Your payment method will only be charged after service completion.</p>
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
      this.logger.error(`Failed to send booking reminder email to customer ${data.to}: ${error.message}`);
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
    totalAmount?: string;
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
          ${data.totalAmount ? `<li><strong>Amount Secured in Escrow:</strong> ${data.totalAmount}</li>` : ''}
        </ul>
      </div>
      
      <div class="security-alert">
        <p><strong>Payment Information:</strong> Funds are secured and will be released after you complete the service and the customer confirms satisfaction.</p>
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
   * Send contractor daily summary (with negotiation flags)
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
      isNegotiated?: boolean;
      originalPrice?: string | null;
    }>;
  }): Promise<void> {
    const startTime = Date.now();
    const formattedDate = this.template.formatDate(new Date(data.date), 'MMMM do, yyyy');
    const negotiatedCount = data.bookings.filter(b => b.isNegotiated).length;

    const bookingsList = data.bookings.map(booking => {
      const statusDisplay = booking.executionStatus && booking.executionStatus !== booking.status
        ? `${booking.status} (Service: ${booking.executionStatus})`
        : booking.status;
      
      const negotiationBadge = booking.isNegotiated 
        ? '<span style="background-color: #FF9800; color: white; padding: 2px 6px; border-radius: 12px; font-size: 10px; margin-left: 8px;">Negotiated</span>'
        : '';
      
      const priceDisplay = booking.isNegotiated && booking.originalPrice
        ? `<span style="text-decoration: line-through; color: #999;">${booking.originalPrice}</span> → ${booking.price}`
        : booking.price;
      
      return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.time}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.clientName}${negotiationBadge}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.serviceTitle}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">
          <span class="role-badge">${statusDisplay}</span>
        </td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${priceDisplay}</td>
        <td style="padding: 8px; border-bottom: 1px solid ${this.template.getColors().borderLight};">${booking.totalAmount}</td>
      </tr>
    `}).join('');

    const content = `
      <h1>Daily Summary</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>Here is your summary for ${formattedDate}.</p>
      
      <div class="info-box">
        <h3>Quick Stats</h3>
        <ul>
          <li><strong>Total Bookings:</strong> ${data.totalBookings}</li>
          <li><strong>Confirmed:</strong> ${data.confirmedBookings}</li>
          <li><strong>Completed:</strong> ${data.completedBookings}</li>
          <li><strong>Cancelled:</strong> ${data.cancelledBookings}</li>
          ${negotiatedCount > 0 ? `<li><strong>Negotiated Bookings:</strong> ${negotiatedCount}</li>` : ''}
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
    amountPaid?: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Share Your Experience</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>How was your experience with <strong>${data.serviceTitle}</strong>?</p>
      
      <div class="info-box">
        <p>Your feedback helps other customers make informed decisions and helps service providers improve.</p>
        <p>It only takes a minute to leave a review</p>
        ${data.amountPaid ? `<p><strong>Amount Paid:</strong> ${data.amountPaid}</p>` : ''}
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