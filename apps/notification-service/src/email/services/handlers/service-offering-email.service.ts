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
    serviceTitle: string;
    serviceExternalId: string;
    categoryName: string;
    basePrice: string;
    priceUnit: string;
    createdAt: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Service Offering Posted Successfully!</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.professionalName},</p>
      <p>Your service offering has been successfully posted on PivotaConnect and is now live.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service Offering:</strong> ${data.serviceTitle}</li>
          <li><strong>Category:</strong> ${data.categoryName}</li>
          <li><strong>Price:</strong> ${data.basePrice} (${data.priceUnit})</li>
          <li><strong>Posted:</strong> ${data.createdAt}</li>
        </ul>
      </div>
      
      <div class="success-box">
        <p><strong>What's next?</strong></p>
        <p>Clients can now discover and book your service offering. You'll receive email notifications when someone books.</p>
        <p>Keep your availability updated to avoid scheduling conflicts.</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.template.getSocial().website}/professional/services/${data.serviceExternalId}" class="button">View My Service Offering</a>
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">Need to make changes? You can edit or pause your service offering anytime from your dashboard.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.to,
        subject: `Service Offering Posted: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Service offering confirmation email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to send service offering email to ${data.to}: ${error.message}`);
      throw error;
    }
  }
}