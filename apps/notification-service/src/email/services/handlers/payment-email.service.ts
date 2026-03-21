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
 * - EmailClientService: Core email transport layer
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

import { Injectable } from '@nestjs/common';
import { SendEmailV3_1 } from 'node-mailjet';
import { EmailClientService } from '../core/email-client.service';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class PaymentEmailService {
  constructor(
    private readonly emailClient: EmailClientService,
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Complete Payment for ${data.plan} Plan`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Payment Confirmed: ${data.plan} Plan Activated`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }
}