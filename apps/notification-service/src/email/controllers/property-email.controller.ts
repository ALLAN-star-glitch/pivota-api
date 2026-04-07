// apps/notification-service/src/email/controllers/property-email.controller.ts

/**
 * Property Email Controller
 * 
 * Handles property-related email events from RabbitMQ.
 * 
 * Events Handled:
 * - notification.email - General notification events from housing service
 * - listing.created.owner - Listing created confirmation
 * 
 * Notification Templates:
 * - viewing-scheduled-viewer - Viewer self-booking confirmation
 * - viewing-scheduled-admin-viewer - Admin-scheduled viewer confirmation
 * - viewing-scheduled-owner - Owner notification for self-booking
 * - viewing-scheduled-owner-admin - Owner notification for admin-scheduled
 * 
 * @example
 * // Event payload for notification.email (viewing-scheduled-viewer)
 * {
 *   recipientId: 'user123',
 *   recipientEmail: 'viewer@example.com',
 *   recipientName: 'John Doe',
 *   template: 'viewing-scheduled-viewer',
 *   data: {
 *     houseTitle: 'Beautiful Apartment',
 *     viewingDate: 'March 25, 2026 at 2:00 PM',
 *     location: 'Nairobi, Kenya',
 *     notes: 'Please call upon arrival'
 *   }
 * }
 * 
 * // Event payload for listing.created.owner
 * {
 *   email: 'owner@example.com',
 *   firstName: 'Jane',
 *   listingTitle: 'Beautiful Apartment',
 *   listingId: 'LST-12345',
 *   listingPrice: 25000000,
 *   locationCity: 'Nairobi',
 *   listingType: 'APARTMENT',
 *   status: 'ACTIVE'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, Transport } from '@nestjs/microservices';
import { PropertyEmailService } from '../services/handlers/property-email.service';

// Notification Email DTO
interface NotificationEmailData {
  type: string;
  recipientId: string;
  recipientEmail: string | null;
  recipientName: string;
  template: string;
  data: {
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    notes?: string;
    bookedBy?: string;
    viewerName?: string;
    viewerEmail?: string;
    bookedById?: string;
    isAdminBooking?: boolean;
  };
}

// Listing Created DTO
interface ListingCreatedEmailDto {
  email: string;
  firstName: string;
  listingTitle: string;
  listingId: string;
  listingPrice: number;
  locationCity: string;
  listingType: string;
  status: string;
  imageUrl?: string;
}

@Controller()
export class PropertyEmailController {
  private readonly logger = new Logger(PropertyEmailController.name);

  constructor(private readonly propertyEmailService: PropertyEmailService) {}

  /**
   * Handle notification email event from housing service
   * Routes to appropriate email template based on template type
   */
  @EventPattern('notification.email', Transport.RMQ)
  async handleNotificationEmail(
    @Payload() data: NotificationEmailData,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received notification email: ${data.template} for ${data.recipientId}`);
    
    // Check if we have a valid email to send to
    if (!data.recipientEmail) {
      this.logger.warn(`Cannot send email: No recipient email for ${data.recipientId}`);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }

    const firstName = data.recipientName.split(' ')[0] || 'User';

    try {
      switch (data.template) {
        case 'viewing-scheduled-viewer':
          await this.propertyEmailService.sendViewingScheduledViewer({
            email: data.recipientEmail,
            firstName,
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            notes: data.data.notes
          });
          break;
          
        case 'viewing-scheduled-admin-viewer':
          await this.propertyEmailService.sendViewingScheduledAdminViewer({
            email: data.recipientEmail,
            firstName,
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            notes: data.data.notes
          });
          break;
          
        case 'viewing-scheduled-owner':
          await this.propertyEmailService.sendViewingRequestedOwner({
            email: data.recipientEmail,
            ownerName: data.recipientName,
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            viewerName: data.data.viewerName || 'A potential buyer',
            viewerEmail: data.data.viewerEmail,
            notes: data.data.notes
          });
          break;
          
        case 'viewing-scheduled-owner-admin':
          await this.propertyEmailService.sendViewingRequestedAdminOwner({
            email: data.recipientEmail,
            ownerName: data.recipientName,
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            viewerName: data.data.viewerName || 'A potential buyer',
            viewerEmail: data.data.viewerEmail,
            notes: data.data.notes
          });
          break;
          
        default:
          this.logger.warn(`Unknown email template: ${data.template}`);
      }
      
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      this.logger.log(`[RMQ] Successfully sent ${data.template} email to ${data.recipientEmail}`);
      
    } catch (error) {
      this.logger.error(`[RMQ] Failed to send ${data.template} email: ${error.message}`);
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      // ✅ Don't requeue - just reject to prevent infinite retry loop
      channel.nack(originalMsg, false, false);
    }
  }

  /**
   * Handle listing created event - Send confirmation to property owner
   */
  @EventPattern('listing.created.owner', Transport.RMQ)
  async handleListingCreated(
    @Payload() data: ListingCreatedEmailDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.log(`🏠 [RMQ] Received listing created event for: ${data.email}`);
    this.logger.debug(`[RAW] Listing payload: ${JSON.stringify(data)}`);

    if (!data || !data.email) {
      this.logger.error('❌ listing.created.owner event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }

    const listingUrl = `https://pivotaconnect.com/listings/${data.listingId}`;

    await this.processEvent(
      context,
      () => this.propertyEmailService.sendListingCreated({
        email: data.email,
        firstName: data.firstName,
        listingTitle: data.listingTitle,
        listingId: data.listingId,
        listingUrl,
        listingPrice: data.listingPrice,
        locationCity: data.locationCity,
        listingType: data.listingType,
        status: data.status,
        imageUrl: data.imageUrl
      }),
      data.email
    );
  }

  /**
   * Shared private processor for event handling with proper acknowledgment
   */
  private async processEvent(
    context: RmqContext,
    action: () => Promise<void>,
    identifier: string
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    
    this.logger.log(`[RMQ] Processing event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      await action();
      channel.ack(originalMsg);
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      // ✅ Don't requeue - just reject to prevent infinite retry loop
      channel.nack(originalMsg, false, false);
    }
  }
}