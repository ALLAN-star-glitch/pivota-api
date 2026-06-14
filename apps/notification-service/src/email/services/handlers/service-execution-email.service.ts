/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';
import {
  EvidenceUploadedData,
  ServiceStartedData,
  ServiceCompletedData,
  CustomerConfirmedData,
  CustomerDissatisfiedData,
  PaymentAutoReleasedData,
} from '@pivota-api/interfaces';

@Injectable()
export class ServiceExecutionEmailService {
  private readonly logger = new Logger(ServiceExecutionEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  // ===========================================================
  // SERVICE STARTED
  // ===========================================================

  async sendServiceStartedCustomer(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Work Has Started</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p><strong>${data.contractorName}</strong> has started working on your service.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Provider Phone:</strong> ${data.contractorPhone}</li>
          <li><strong>Scheduled Date:</strong> ${data.scheduledDate}</li>
          <li><strong>Started At:</strong> ${data.startedAt}</li>
          <li><strong>Location:</strong> ${data.location}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Work Started: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service started email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service started email to customer ${data.to}: ${error.message}`);
      throw error;
    }
  }

  async sendServiceStartedContractor(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Work Started Confirmation</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have marked that you have started working on <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Customer Phone:</strong> ${data.customerPhone}</li>
          <li><strong>Scheduled Date:</strong> ${data.scheduledDate}</li>
          <li><strong>Started At:</strong> ${data.startedAt}</li>
          <li><strong>Location:</strong> ${data.location}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/contractor/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Work Started: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service started confirmation email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service started confirmation to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================
  // SERVICE COMPLETED
  // ===========================================================

  async sendServiceCompletedCustomer(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Work Completed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p><strong>${data.contractorName}</strong> has completed the work for your service.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Completed At:</strong> ${data.completedAt}</li>
          <li><strong>Evidence Files:</strong> ${data.evidenceCount}</li>
        </ul>
      </div>
      
      <div class="security-alert">
        <p><strong>Action Required</strong></p>
        <p>Please review the work and confirm completion. If you do not respond within ${data.autoReleaseHours} hours, payment will be automatically released to the provider.</p>
        <p><strong>Total Amount Secured:</strong> ${data.totalAmount}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingExternalId}" class="button">Review & Confirm</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Work Completed: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service completed email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service completed email to customer ${data.to}: ${error.message}`);
      throw error;
    }
  }

  async sendServiceCompletedContractor(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Work Completed Confirmation</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>You have marked <strong>${data.serviceTitle}</strong> as completed.</p>
      
      <div class="info-box">
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Completed At:</strong> ${data.completedAt}</li>
          <li><strong>Auto-Release:</strong> In ${data.autoReleaseHours} hours if customer does not respond</li>
        </ul>
      </div>
      
      <div class="success-box">
        <p><strong>Payment Information</strong></p>
        <p>Funds will be released to your account after the customer confirms satisfaction or after the auto-release period.</p>
        <p><strong>Amount Secured:</strong> ${data.totalAmount}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/contractor/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Work Completed: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Service completed confirmation email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send service completed confirmation to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================
  // CUSTOMER CONFIRMED / PAYMENT RELEASED
  // ===========================================================

  async sendPaymentReleasedContractor(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Payment Released</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>Payment has been released for <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="success-box">
        <h3>Payment Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Confirmed At:</strong> ${data.confirmedAt}</li>
          <li><strong>Amount Received:</strong> ${data.amountReceived}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/contractor/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Payment Released: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Payment released email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send payment released email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  async sendCustomerConfirmedCustomer(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Confirmation Received</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>Thank you for confirming the completion of <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="success-box">
        <h3>Confirmation Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Confirmed At:</strong> ${data.confirmedAt}</li>
          <li><strong>Amount Paid:</strong> ${data.amountPaid}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Confirmation Received: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Customer confirmation email sent to ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send customer confirmation email to ${data.to}: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================
  // CUSTOMER DISSATISFIED / DISPUTE
  // ===========================================================

  async sendDisputeRaisedAdmin(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Dispute Raised</h1>
      <p>A dispute has been raised for <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="info-box">
        <h3>Dispute Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName} (${data.customerEmail}, ${data.customerPhone})</li>
          <li><strong>Contractor:</strong> ${data.contractorName} (${data.contractorEmail}, ${data.contractorPhone})</li>
          <li><strong>Scheduled Date:</strong> ${data.scheduledDate}</li>
          <li><strong>Location:</strong> ${data.location}</li>
          <li><strong>Dispute ID:</strong> ${data.disputeId}</li>
        </ul>
      </div>
      
      <div class="security-alert">
        <p>Please log in to the admin panel to review this dispute.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/admin/disputes/${data.disputeId}" class="button">Review Dispute</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: process.env.ADMIN_EMAIL || 'admin@pivotaconnect.com',
        subject: `Dispute Raised: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Dispute raised email sent to admin in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send dispute raised email to admin: ${error.message}`);
      throw error;
    }
  }

  async sendCustomerDissatisfiedContractor(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Customer Not Satisfied</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p><strong>${data.customerName}</strong> has reported that they are not satisfied with the work for <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="security-alert">
        <p>A dispute has been created. Please check the platform for details and provide any evidence you have.</p>
        <p><strong>Dispute ID:</strong> ${data.disputeId}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/contractor/disputes/${data.disputeId}" class="button">View Dispute</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Customer Not Satisfied: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Customer dissatisfied email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send customer dissatisfied email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  async sendDisputeCreatedCustomer(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Dispute Created</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>We have received your dispute regarding <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="info-box">
        <h3>Dispute Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Dispute ID:</strong> ${data.disputeId}</li>
        </ul>
      </div>
      
      <div class="security-alert">
        <p>Our team will review your dispute and get back to you within 5 business days.</p>
        <p>Funds related to this booking have been frozen until the dispute is resolved.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingExternalId}" class="button">View Dispute</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Dispute Created: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Dispute created email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send dispute created email to customer ${data.to}: ${error.message}`);
      throw error;
    }
  }

  // ===========================================================
  // PAYMENT AUTO-RELEASED
  // ===========================================================

  async sendPaymentAutoReleasedContractor(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Payment Auto-Released</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.contractorName},</p>
      <p>Payment has been automatically released for <strong>${data.serviceTitle}</strong>.</p>
      
      <div class="success-box">
        <h3>Payment Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Customer:</strong> ${data.customerName}</li>
          <li><strong>Auto-Released At:</strong> ${data.autoReleasedAt}</li>
          <li><strong>Amount Received:</strong> ${data.amountReceived}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/contractor/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Payment Auto-Released: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Payment auto-released email sent to contractor ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send payment auto-released email to contractor ${data.to}: ${error.message}`);
      throw error;
    }
  }

  async sendPaymentAutoReleasedCustomer(data: any): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Payment Auto-Released</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.customerName},</p>
      <p>Payment for <strong>${data.serviceTitle}</strong> has been automatically released to the service provider.</p>
      
      <div class="info-box">
        <h3>Payment Details</h3>
        <ul>
          <li><strong>Service:</strong> ${data.serviceTitle}</li>
          <li><strong>Service Provider:</strong> ${data.contractorName}</li>
          <li><strong>Auto-Released At:</strong> ${data.autoReleasedAt}</li>
          <li><strong>Amount Released:</strong> ${data.amountReleased}</li>
        </ul>
      </div>
      
      <div class="security-alert">
        <p>Since you did not respond within 48 hours of service completion, payment was automatically released.</p>
        <p>If you have any issues with the service, please contact support.</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/bookings/${data.bookingExternalId}" class="button">View Booking</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject: `Payment Auto-Released: ${data.serviceTitle}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`Payment auto-released email sent to customer ${data.to} in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Failed to send payment auto-released email to customer ${data.to}: ${error.message}`);
      throw error;
    }
  }


}