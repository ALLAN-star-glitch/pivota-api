// apps/notification-service/src/email/services/payment-email.service.ts

/**
 * Payment Email Service
 * 
 * Handles all payment-related email communications for the PivotaConnect platform.
 * 
 * Responsibilities:
 * - Sends payment required emails when user selects a paid plan
 * - Sends payment confirmation emails after successful payment
 * 
 * Dependencies:
 * - MailerService: NestJS Mailer for email sending with timeout support
 * - EmailTemplateService: Template rendering and formatting utilities
 * 
 * @example
 * // Send payment required email
 * await paymentEmailService.sendPaymentRequired({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   plan: 'Pro',
 *   redirectUrl: 'https://payment.pivota.com/checkout/123'
 * });
 * 
 * // Send payment confirmation email
 * await paymentEmailService.sendPaymentConfirmed({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   plan: 'Pro',
 *   accountId: 'ACC-12345'
 * });
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class PaymentEmailService {
  private readonly logger = new Logger(PaymentEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send payment required email when user selects a paid plan
   */
  async sendPaymentRequired(data: {
    email: string;
    firstName: string;
    plan: string;
    redirectUrl: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Complete Your Subscription</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
      <p>Thank you for choosing PivotaConnect. To activate your ${data.plan} plan, please complete the payment process.</p>
      
      <div class="info-box">
        <h3>Plan Details</h3>
        <ul>
          <li><strong>Plan:</strong> ${data.plan}</li>
          <li><strong>Status:</strong> Awaiting Payment</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.redirectUrl}" class="button">Complete Payment</a>
      </div>
      
      <p>Your account has been created but is pending payment activation. Once payment is confirmed, you'll have full access to all features.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Complete Payment for ${data.plan} Plan`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Payment required email sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send payment required email to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send payment confirmation email after successful payment
   */
  async sendPaymentConfirmed(data: {
    email: string;
    firstName: string;
    plan: string;
    accountId: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Payment Confirmed!</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Congratulations ${data.firstName},</p>
      <p>Your payment has been successfully processed. Your ${data.plan} plan is now active.</p>
      
      <div class="info-box">
        <h3>What's included in ${data.plan}</h3>
        <ul>
          <li>Access to all premium features</li>
          <li>Priority support</li>
          <li>Advanced analytics and insights</li>
          <li>Unlimited opportunities and listings</li>
        </ul>
      </div>
      
      <p><strong>Account ID:</strong> ${data.accountId}</p>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <p>Thank you for upgrading your PivotaConnect experience!</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Payment Confirmed: ${data.plan} Plan Activated`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Payment confirmation email sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send payment confirmation email to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }
}