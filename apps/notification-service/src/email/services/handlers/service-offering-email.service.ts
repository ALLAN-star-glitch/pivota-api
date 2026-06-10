// apps/notification-service/src/email/services/service-offering-email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class ServiceOfferingEmailService {
  private readonly logger = new Logger(ServiceOfferingEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send service offering created confirmation to professional
   */
  async sendServiceOfferingCreated(data: {
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
  }): Promise<void> {
    const startTime = Date.now();

    // Format price unit for display
    const priceUnitDisplay = this.formatPriceUnit(data.priceUnit);
    
    // Build negotiable section
    let negotiableSection = '';
    if (data.isNegotiable) {
      negotiableSection = `
        <div class="info-box" style="margin-top: 16px;">
          <h3>Negotiable Pricing</h3>
          <p>You've marked this service as negotiable.</p>
          ${data.priceRange ? `<p><strong>Price Range:</strong> ${data.priceRange}</p>` : ''}
          <p>Customers can propose their price within your acceptable range.</p>
        </div>
      `;
    }

    // Build booking fee section
    let bookingFeeSection = '';
    if (data.bookingFeeAmount) {
      bookingFeeSection = `
        <div class="info-box" style="margin-top: 16px;">
          <h3>Booking Fee</h3>
          <p><strong>Amount:</strong> ${data.bookingFeeAmount}</p>
          ${data.bookingFeeRefundable !== undefined ? `<p><strong>Refundable on cancellation:</strong> ${data.bookingFeeRefundable ? 'Yes' : 'No'}</p>` : ''}
          <p>This fee will be charged to customers when they book this service.</p>
        </div>
      `;
    }

    // Build coverage areas section
    let coverageSection = '';
    if (data.coverageAreas) {
      coverageSection = `
        <div class="info-box" style="margin-top: 16px;">
          <h3>Service Coverage Areas</h3>
          <p>${data.coverageAreas}</p>
        </div>
      `;
    }

    const content = `
      <h1>Service Offering Posted Successfully!</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.professionalName},</p>
      <p>Your service offering has been successfully posted on PivotaConnect and is now live on the platform.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service Offering:</strong> ${data.serviceTitle}</li>
          ${data.serviceDescription ? `<li><strong>Description:</strong> ${data.serviceDescription}</li>` : ''}
          <li><strong>Category:</strong> ${data.categoryName} ${data.vertical ? `(${data.vertical})` : ''}</li>
          <li><strong>Base Price:</strong> ${data.basePrice} (${priceUnitDisplay})</li>
          <li><strong>Posted:</strong> ${data.createdAt}</li>
        </ul>
      </div>
      
      ${negotiableSection}
      ${bookingFeeSection}
      ${coverageSection}
      
      <div class="success-box">
        <p><strong>What's next?</strong></p>
        <p>Clients can now discover and book your service offering. You'll receive email notifications when someone books.</p>
        <p>Keep your availability updated to avoid scheduling conflicts.</p>
        <p>Respond to booking requests within 24 hours to maintain a high response rate.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl || `${this.template.getSocial().website}/professional/dashboard/services/${data.serviceExternalId}`}" class="button">View My Service Offering</a>
      </div>
      
      <div style="text-align: center; margin: 16px 0;">
        <a href="${data.serviceUrl || `${this.template.getSocial().website}/services/${data.serviceExternalId}`}" style="color: ${this.template.getColors().textSecondary};">View Public Listing</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">Need to make changes? You can edit or pause your service offering anytime from your dashboard.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Service Offering Posted: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service offering confirmation email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service offering email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send service offering updated notification to professional
   */
  async sendServiceOfferingUpdated(data: {
    to: string;
    professionalName: string;
    serviceId: string;
    serviceExternalId: string;
    serviceTitle: string;
    updatedAt: string;
    dashboardUrl: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Service Offering Updated</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.professionalName},</p>
      <p>Your service offering <strong>${data.serviceTitle}</strong> has been successfully updated.</p>
      
      <div class="info-box">
        <h3>Update Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Updated:</strong> ${data.updatedAt}</li>
        </ul>
      </div>
      
      <div class="success-box">
        <p>The changes are now live and visible to customers.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">View My Service Offering</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">If you didn't make these changes, please contact support immediately.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Service Offering Updated: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service offering update notification sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service offering update email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send service offering deleted notification to professional
   */
  async sendServiceOfferingDeleted(data: {
    to: string;
    professionalName: string;
    serviceId: string;
    serviceExternalId: string;
    serviceTitle: string;
    deletedAt: string;
    dashboardUrl: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Service Offering Deleted</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.professionalName},</p>
      <p>Your service offering <strong>${data.serviceTitle}</strong> has been deleted.</p>
      
      <div class="info-box">
        <h3>Deletion Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Deleted:</strong> ${data.deletedAt}</li>
        </ul>
      </div>
      
      <div class="security-alert">
        <p>This service offering is no longer visible to customers. No further bookings can be made for this service.</p>
        <p>If this was a mistake, you can create a new service offering from your dashboard.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">If you didn't delete this service offering, please contact support immediately.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Service Offering Deleted: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service offering deletion notification sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service offering deletion email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format price unit for display
   */
  private formatPriceUnit(priceUnit: string): string {
    const unitMap: Record<string, string> = {
      'PER_HOUR': 'per hour',
      'PER_DAY': 'per day',
      'PER_WEEK': 'per week',
      'PER_MONTH': 'per month',
      'PER_YEAR': 'per year',
      'FIXED': 'fixed price',
      'PER_SESSION': 'per session',
      'PER_PROJECT': 'per project',
      'PER_VISIT': 'per visit',
      'PER_UNIT': 'per unit',
    };
    return unitMap[priceUnit] || priceUnit.toLowerCase().replace('_', ' ');
  }
}