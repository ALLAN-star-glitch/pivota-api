/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Email Client Service
 * 
 * Core service responsible for sending emails via Resend.
 * 
 * Responsibilities:
 * - Initializes and manages Resend client connection
 * - Handles email sending with error logging
 * - Provides consistent email delivery across the application
 * 
 * This service is a wrapper around the Resend SDK and should be used by
 * higher-level email services (AuthEmailService, OrganizationEmailService, etc.)
 * to send emails. It focuses solely on the transport layer.
 * 
 * @example
 * // Used by other email services:
 * await this.emailClient.sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome!</h1>'
 * });
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

@Injectable()
export class EmailClientService implements OnModuleInit {
  private readonly logger = new Logger(EmailClientService.name);
  private resend: Resend;
  private defaultFrom: string;
  private defaultFromName: string;

  constructor() {
    // Initialize will happen in onModuleInit
  }

  async onModuleInit() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.MAIL_FROM_EMAIL;
    this.defaultFromName = process.env.MAIL_FROM_NAME || 'PivotaConnect';

    if (!apiKey) {
      this.logger.error('❌ RESEND_API_KEY is not set in environment variables');
      throw new Error('RESEND_API_KEY is required for email service');
    }

    if (!this.defaultFrom) {
      this.logger.error('❌ MAIL_FROM_EMAIL is not set in environment variables');
      throw new Error('MAIL_FROM_EMAIL is required for email service');
    }

    this.resend = new Resend(apiKey);
    this.logger.log('✅ Resend email client initialized successfully');
    this.logger.log(`📧 Default from: "${this.defaultFromName}" <${this.defaultFrom}>`);
  }

  /**
   * Send an email using Resend API
   * 
   * @param options - Email options (to, subject, html, text, etc.)
   * @returns Promise that resolves when email is sent or fails
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; data?: any; error?: any }> {
    const recipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    
    try {
      const from = options.from || `"${this.defaultFromName}" <${this.defaultFrom}>`;

      const { data, error } = await this.resend.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      });

      if (error) {
        this.logger.error(`❌ Failed to send email to ${recipient}: ${error.message}`);
        return { success: false, error };
      }

      this.logger.log(`📧 Email sent to ${recipient} with ID: ${data?.id}`);
      return { success: true, data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`❌ Failed to send email to ${recipient}: ${message}`);
      
      // Enhanced error logging for debugging Resend API issues
      if (err && typeof err === 'object' && 'response' in err) {
        const responseErr = err as { response?: { data?: unknown } };
        this.logger.error(`Resend error details: ${JSON.stringify(responseErr.response?.data || {})}`);
      }
      
      return { success: false, error: err };
    }
  }

  /**
   * Send an email using the legacy Mailjet-style interface
   * This method is for backward compatibility with existing code
   * 
   * @param body - Object containing email body in Mailjet format
   * @param recipient - Recipient email address (for logging)
   * @deprecated Use sendEmail(options) instead
   */
  async sendEmailLegacy(body: any, recipient: string): Promise<void> {
    this.logger.warn('sendEmailLegacy is deprecated. Please migrate to sendEmail(options)');
    
    // Try to extract information from Mailjet-style body
    try {
      const message = body?.Messages?.[0];
      if (message) {
        const to = message.To?.[0]?.Email;
        const subject = message.Subject;
        const html = message.HTMLPart;
        const text = message.TextPart;
        
        await this.sendEmail({
          to: to || recipient,
          subject: subject || 'No Subject',
          html,
          text,
        });
      } else {
        this.logger.error('Invalid Mailjet-style email body format');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send legacy email: ${message}`);
    }
  }
}