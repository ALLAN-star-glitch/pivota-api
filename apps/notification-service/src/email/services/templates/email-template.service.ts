// apps/notification-service/src/email/services/templates/email-template.service.ts

/**
 * Email Template Service
 * 
 * Core service responsible for rendering email templates and providing formatting utilities.
 * This service acts as the bridge between email content and the base HTML template,
 * ensuring consistent branding across all email communications.
 * 
 * Responsibilities:
 * - Wraps email content in the base HTML template with proper header, footer, and styling
 * - Converts HTML content to plain text for email clients that don't support HTML
 * - Provides date formatting utilities for consistent date/time display
 * - Provides currency formatting for consistent monetary values
 * - Exposes color palette and social links to other services
 * 
 * Key Features:
 * - Centralized template rendering: All emails use the same base template
 * - Consistent formatting: Dates, times, and currency formatted uniformly
 * - HTML to text conversion: Fallback for text-only email clients
 * - Single source of truth for brand colors and social links
 * 
 * Usage Pattern:
 * 1. Other services (AuthEmailService, PropertyEmailService, etc.) build email content
 * 2. They call this service's `render()` method to wrap content in base template
 * 3. They use formatting methods for consistent date/time/currency display
 * 4. They access colors/social links via getters when needed
 * 
 * @example
 * // Render full email HTML
 * const fullHtml = this.template.render(emailContent);
 * 
 * // Format a date for display
 * const formattedDate = this.template.formatDate(new Date(), 'MMMM do, yyyy');
 * 
 * // Get brand colors
 * const primaryColor = this.template.getColors().primary;
 * 
 * // Get social links
 * const websiteUrl = this.template.getSocial().website;
 */

import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { EMAIL_COLORS, SOCIAL_LINKS } from '@pivota-api/constants';
import { getBaseHtmlTemplate } from '../shared/templates/email-base.service';

@Injectable()
export class EmailTemplateService {
  private readonly colors = EMAIL_COLORS;
  private readonly social = SOCIAL_LINKS;

  /**
   * Renders the full email HTML by wrapping content in the base template
   */
  render(content: string): string {
    return getBaseHtmlTemplate(content, this.colors, this.social);
  }

  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  formatDate(date: Date | string, formatPattern = 'MMMM do, yyyy'): string {
    return format(new Date(date), formatPattern);
  }

  formatDateTime(date: Date | string): string {
    return format(new Date(date), 'MMMM do, yyyy \'at\' h:mm a');
  }

  formatCurrency(amount: number): string {
    return `KES ${amount.toLocaleString()}`;
  }

  getColors() {
    return this.colors;
  }

  getSocial() {
    return this.social;
  }
}