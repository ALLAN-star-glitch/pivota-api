/* eslint-disable @typescript-eslint/no-explicit-any */



/**
 * Email Client Service
 * 
 * Core service responsible for sending emails via Mailjet.
 * 
 * Responsibilities:
 * - Initializes and manages Mailjet client connection
 * - Handles email sending with error logging
 * - Provides consistent email delivery across the application
 * 
 * This service is a wrapper around the Mailjet SDK and should be used by
 * higher-level email services (AuthEmailService, OrganizationEmailService, etc.)
 * to send emails. It focuses solely on the transport layer.
 * 
 * @example
 * // Used by other email services:
 * await this.emailClient.sendEmail(emailBody, recipientEmail);
 */

import { Injectable, Logger } from "@nestjs/common";
import { Client, SendEmailV3_1 } from "node-mailjet";
@Injectable()
export class EmailClientService {
  private readonly logger = new Logger(EmailClientService.name);
  private readonly mailjet: Client;

  constructor() {
    this.mailjet = new Client({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    });
  }

  /**
   * Send an email using Mailjet API
   * 
   * @param body - Mailjet email body (SendEmailV3_1 format)
   * @param recipient - Recipient email address (for logging purposes)
   * @returns Promise that resolves when email is sent or fails
   */
  async sendEmail(body: SendEmailV3_1.Body, recipient: string): Promise<void> {
    try {
      const result = await this.mailjet
        .post('send', { version: 'v3.1' })
        .request(body) as any;

      if (result?.body?.Messages?.[0]?.Status) {
        this.logger.log(`📧 Email sent to ${recipient} with status: ${result.body.Messages[0].Status}`);
      } else {
        this.logger.log(`📧 Email sent to ${recipient}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`❌ Failed to send email to ${recipient}: ${message}`);
      
      // Enhanced error logging for debugging Mailjet API issues
      if (err && typeof err === 'object') {
        if ('response' in err) {
          const responseErr = err as { response?: { data?: unknown } };
          this.logger.error(`Mailjet error details: ${JSON.stringify(responseErr.response?.data || {})}`);
        } else if ('statusCode' in err) {
          this.logger.error(`Mailjet status code: ${(err as { statusCode: number }).statusCode}`);
        }
      }
    }
  }
}