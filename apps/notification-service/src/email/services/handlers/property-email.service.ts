// apps/notification-service/src/email/services/property-email.service.ts

/**
 * Property Email Service
 * 
 * Handles all property-related email communications for the PivotaConnect platform.
 * 
 * Responsibilities:
 * - Sends viewing confirmation emails to viewers
 * - Sends viewing request emails to property owners
 * - Sends admin-scheduled viewing notifications
 * - Sends listing creation confirmation emails to property owners
 * 
 * Dependencies:
 * - EmailClientService: Core email transport layer
 * - EmailTemplateService: Template rendering and formatting utilities
 * 
 * @example
 * // Send viewing confirmation to viewer
 * await propertyEmailService.sendViewingScheduledViewer({
 *   email: 'viewer@example.com',
 *   firstName: 'John',
 *   houseTitle: 'Beautiful Apartment in Nairobi',
 *   viewingDate: 'March 25, 2026 at 2:00 PM',
 *   location: 'Kilimani, Nairobi'
 * });
 * 
 * // Send viewing request to property owner
 * await propertyEmailService.sendViewingRequestedOwner({
 *   email: 'owner@example.com',
 *   ownerName: 'Jane Doe',
 *   houseTitle: 'Beautiful Apartment in Nairobi',
 *   viewingDate: 'March 25, 2026 at 2:00 PM',
 *   location: 'Kilimani, Nairobi',
 *   viewerName: 'John Smith'
 * });
 * 
 * // Send listing created confirmation
 * await propertyEmailService.sendListingCreated({
 *   email: 'owner@example.com',
 *   firstName: 'Jane',
 *   listingTitle: 'Beautiful Apartment in Nairobi',
 *   listingId: 'LST-12345',
 *   listingUrl: 'https://pivotaconnect.com/listings/12345',
 *   listingPrice: 25000000,
 *   locationCity: 'Nairobi',
 *   listingType: 'APARTMENT',
 *   status: 'ACTIVE'
 * });
 */

import { Injectable } from '@nestjs/common';
import { SendEmailV3_1 } from 'node-mailjet';
import { EmailClientService } from '../core/email-client.service';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class PropertyEmailService {
  constructor(
    private readonly emailClient: EmailClientService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send viewing confirmation email to viewer (self-booking)
   */
  async sendViewingScheduledViewer(data: {
    email: string;
    firstName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    notes?: string;
  }): Promise<void> {
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Viewing Confirmed</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
      <p>Your property viewing has been scheduled successfully.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>Your notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>What to expect</h3>
        <ul>
          <li>The property owner/agent has been notified</li>
          <li>They may contact you to confirm or ask questions</li>
          <li>Arrive on time for your appointment</li>
          <li>Bring any questions you have about the property</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/my-viewings" class="button">View My Schedule</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Viewing Confirmed: ${data.houseTitle}`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }

  /**
   * Send viewing confirmation email to viewer (admin-booking)
   */
  async sendViewingScheduledAdminViewer(data: {
    email: string;
    firstName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    notes?: string;
  }): Promise<void> {
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Viewing Scheduled by Support Team</h1>
      <div class="admin-badge">SCHEDULED BY ADMIN</div>
      
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
      <p>A property viewing has been scheduled on your behalf by our support team.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>Next Steps</h3>
        <ul>
          <li>The property owner has been notified</li>
          <li>You'll receive any updates about this viewing</li>
          <li>Questions? Reply to this email or contact support</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/my-viewings" class="button">View Details</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Viewing Scheduled: ${data.houseTitle}`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }

  /**
   * Send viewing request email to property owner (self-booking by viewer)
   */
  async sendViewingRequestedOwner(data: {
    email: string;
    ownerName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    viewerName: string;
    viewerEmail?: string;
    notes?: string;
  }): Promise<void> {
    const viewerInfo = data.viewerEmail 
      ? `${data.viewerName} (${data.viewerEmail})`
      : data.viewerName;
      
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';
      
    const content = `
      <h1>New Viewing Request</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.ownerName},</p>
      <p>A viewing has been scheduled for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>Viewer notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>What to do next</h3>
        <ul>
          <li>Prepare the property for viewing</li>
          <li>Be available at the scheduled time</li>
          <li>Consider contacting the viewer to confirm</li>
          <li>Have property documents ready to share</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/my-listings" class="button">Manage My Listings</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.ownerName }],
        Subject: `New Viewing Request: ${data.houseTitle}`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }

  /**
   * Send viewing request email to property owner (admin-booking)
   */
  async sendViewingRequestedAdminOwner(data: {
    email: string;
    ownerName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    viewerName: string;
    viewerEmail?: string;
    notes?: string;
  }): Promise<void> {
    const viewerInfo = data.viewerEmail 
      ? `${data.viewerName} (${data.viewerEmail})`
      : data.viewerName;
      
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';
      
    const content = `
      <h1>Viewing Scheduled by Admin</h1>
      <div class="admin-badge">ADMIN SCHEDULED</div>
      
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.ownerName},</p>
      <p>Our support team has scheduled a viewing for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>Information</h3>
        <ul>
          <li>This viewing was arranged by our support team</li>
          <li>Please accommodate the viewer at the scheduled time</li>
          <li>Contact support if you have questions</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/my-listings" class="button">View My Listings</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.ownerName }],
        Subject: `Admin Scheduled Viewing: ${data.houseTitle}`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }

  /**
   * Send listing created confirmation email to property owner
   */
  async sendListingCreated(data: {
    email: string;
    firstName: string;
    listingTitle: string;
    listingId: string;
    listingUrl: string;
    listingPrice: number;
    locationCity: string;
    listingType: string;
    status: string;
    imageUrl?: string;
  }): Promise<void> {
    const listingDate = this.template.formatDate(new Date());
    
    const imageHtml = data.imageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.imageUrl}" alt="${data.listingTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Listing Posted Successfully</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
      <p>Your property listing has been successfully posted on PivotaConnect and is now live.</p>
      
      ${imageHtml}
      
      <div class="viewing-card">
        <div class="property-highlight">${data.listingTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Location:</strong> ${data.locationCity}</p>
          <p><strong>Price:</strong> ${this.template.formatCurrency(data.listingPrice)}</p>
          <p><strong>Type:</strong> ${data.listingType}</p>
          <p><strong>Posted:</strong> ${listingDate}</p>
          <p><strong>Status:</strong> ${data.status}</p>
        </div>
      </div>
      
      <div class="info-box">
        <h3>What's Next</h3>
        <ul>
          <li><strong>Share your listing</strong> - Share the link on social media and with your network</li>
          <li><strong>Respond to inquiries</strong> - You will be notified when someone contacts you</li>
          <li><strong>Schedule viewings</strong> - Manage viewing requests from potential buyers and renters</li>
          <li><strong>Update your listing</strong> - You can edit details or add more photos at any time</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.listingUrl}" class="button" style="margin-right: 10px;">View Your Listing</a>
        <a href="${this.template.getSocial().website}/my-listings" class="button">Manage Listings</a>
      </div>
      
      <div class="divider"></div>
      
      <div style="text-align: center;">
        <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
          <strong>Pro Tip:</strong> Listings with high-quality photos get three times more views. 
          <a href="${this.template.getSocial().website}/help/listing-tips" style="color: ${this.template.getColors().primary};">View our listing tips →</a>
        </p>
      </div>
      
      <div class="expiry-box">
        <p style="margin: 0; font-size: 12px;">Listing ID: ${data.listingId}</p>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Your listing "${data.listingTitle}" is now live on PivotaConnect`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }
}