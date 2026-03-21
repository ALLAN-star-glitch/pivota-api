// apps/notification-service/src/email/controllers/security-email.controller.ts

/**
 * Security Email Controller
 * 
 * Handles security-related email events from RabbitMQ.
 * 
 * Events Handled:
 * - user.password.setup.required - New user needs to set up password
 * - user.password.setup.completed - Password successfully set
 * - user.account.linked - Account linked with external provider (Google, etc.)
 * - admin.new.registration - New user registration notification for admins
 * - admin.new.organization.registration - New organization notification for admins
 * - admin.listing.milestone - Listing milestone alerts for internal teams
 * 
 * @example
 * // Event payload for user.password.setup.required
 * {
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   setupToken: 'token123',
 *   organizationName: 'Company Name',
 *   expiresAt: '2026-04-21T10:00:00Z'
 * }
 * 
 * // Event payload for user.account.linked
 * {
 *   email: 'user@example.com',
 *   provider: 'Google',
 *   timestamp: '2026-03-21T10:00:00Z'
 * }
 * 
 * // Event payload for admin.new.registration
 * {
 *   adminEmail: 'admin@pivota.com',
 *   userEmail: 'user@example.com',
 *   userName: 'John Doe',
 *   accountType: 'INDIVIDUAL',
 *   registrationDate: '2026-03-21T10:00:00Z',
 *   plan: 'Free Forever'
 * }
 * 
 * // Event payload for admin.listing.milestone
 * {
 *   recipientEmail: 'team@pivota.com',
 *   accountName: 'Property Owner Ltd',
 *   listingTitle: 'Luxury Apartment',
 *   listingPrice: 25000000,
 *   locationCity: 'Nairobi',
 *   milestone: 5,
 *   milestoneTier: 'GROWTH',
 *   totalValue: 125000000,
 *   averagePrice: 25000000,
 *   message: 'User reached 5 listings!',
 *   priority: 'MEDIUM',
 *   listingId: 'LST-12345',
 *   accountId: 'ACC-12345',
 *   timestamp: '2026-03-21T10:00:00Z'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { SecurityEmailService } from '../services/handlers/security-email.service';

// Password Setup Required DTO
interface PasswordSetupRequiredDto {
  email: string;
  firstName: string;
  setupToken: string;
  organizationName: string;
  expiresAt: string;
}

// Password Setup Completed DTO
interface PasswordSetupCompletedDto {
  email: string;
  userUuid: string;
}

// Account Linked DTO
interface AccountLinkedDto {
  email: string;
  provider: string;
  timestamp: string;
}

// Admin New User Registration DTO (from auth service)
interface AdminNewRegistrationFromAuthDto {
  adminEmail: string;
  userEmail: string;
  userName: string;
  accountType: string;
  registrationMethod?: string;
  registrationDate: string;
  userCount?: number;
  plan: string;
}

// Admin New Organization Registration DTO
interface AdminNewOrganizationRegistrationDto {
  recipientEmail: string;
  organizationName: string;
  adminName: string;
  adminEmail: string;
  organizationEmail: string;
  registrationDate: string;
  plan: string;
}

// Listing Milestone DTO
interface ListingMilestoneEmailDto {
  recipientEmail: string;
  accountId: string;
  accountName: string;
  creatorId: string;
  creatorName?: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingType: string;
  locationCity: string;
  milestone: number;
  milestoneTier: 'ONBOARDING' | 'ENGAGEMENT' | 'GROWTH' | 'POWER' | 'PROFESSIONAL';
  suggestedTeam: 'onboarding' | 'success' | 'sales' | 'marketing' | 'partnerships';
  totalValue: number;
  averagePrice: number;
  message: string;
  timestamp: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Controller()
export class SecurityEmailController {
  private readonly logger = new Logger(SecurityEmailController.name);

  constructor(private readonly securityEmailService: SecurityEmailService) {}

  /**
   * Handle password setup required event - Send password setup email
   */
  @EventPattern('user.password.setup.required')
  async handlePasswordSetupRequired(
    @Payload() data: PasswordSetupRequiredDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Password setup required for: ${data.email}`);
    
    if (!data || !data.email) {
      this.logger.error('❌ user.password.setup.required event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.securityEmailService.sendPasswordSetup(data),
      data.email
    );
  }

  /**
   * Handle password setup completed event - Send confirmation email
   */
  @EventPattern('user.password.setup.completed')
  async handlePasswordSetupCompleted(
    @Payload() data: PasswordSetupCompletedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Password setup completed for: ${data.email}`);
    
    if (!data || !data.email) {
      this.logger.error('❌ user.password.setup.completed event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.securityEmailService.sendPasswordSetupConfirmation(data),
      data.email
    );
  }

  /**
   * Handle account linked event - Send account linking notification
   */
  @EventPattern('user.account.linked')
  async handleAccountLinked(
    @Payload() data: AccountLinkedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Account linked for: ${data.email} with ${data.provider}`);
    
    if (!data || !data.email) {
      this.logger.error('❌ user.account.linked event missing email');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.securityEmailService.sendAccountLinked(data),
      data.email
    );
  }

  /**
   * Handle admin new user registration event - Send admin notification
   */
  @EventPattern('admin.new.registration')
  async handleAdminNewRegistration(
    @Payload() data: AdminNewRegistrationFromAuthDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] New user registration notification for admin: ${data?.adminEmail}`);
    
    // Validate that we have an admin email
    if (!data || !data.adminEmail) {
      this.logger.error('❌ admin.new.registration event missing adminEmail field');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    // Map the fields from what auth service sends to what email service expects
    const serviceData = {
      recipientEmail: data.adminEmail,
      userEmail: data.userEmail,
      userName: data.userName,
      accountType: data.accountType,
      registrationMethod: data.registrationMethod,
      registrationDate: data.registrationDate,
      userCount: data.userCount,
      plan: data.plan
    };
    
    this.logger.debug(`[MAPPED] Service data: ${JSON.stringify(serviceData)}`);
    
    await this.processEvent(
      context,
      () => this.securityEmailService.sendAdminNewUser(serviceData),
      data.adminEmail
    );
  }

  /**
   * Handle admin new organization registration event - Send admin notification
   */
  @EventPattern('admin.new.organization.registration')
  async handleAdminNewOrganizationRegistration(
    @Payload() data: AdminNewOrganizationRegistrationDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] New organization registration notification for admin: ${data?.recipientEmail}`);
    
    if (!data || !data.recipientEmail) {
      this.logger.error('❌ admin.new.organization.registration event missing recipientEmail');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.securityEmailService.sendAdminNewOrganization(data),
      data.recipientEmail
    );
  }

  /**
   * Handle listing milestone event - Send milestone notification to internal teams
   */
  @EventPattern('admin.listing.milestone')
  async handleListingMilestone(
    @Payload() data: ListingMilestoneEmailDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.log(`🏆 [RMQ] Received listing milestone event: ${data.milestone} for account ${data.accountName}`);
    
    if (!data || !data.recipientEmail) {
      this.logger.error('❌ admin.listing.milestone event missing recipientEmail');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }

    // Map milestone to appropriate email subject
    let subject: string;
    switch (data.milestone) {
      case 1:
        subject = `First Listing: ${data.accountName} just posted their first property!`;
        break;
      case 2:
        subject = `Second Listing: ${data.accountName} is getting engaged!`;
        break;
      case 3:
        subject = `Third Listing: ${data.accountName} is on a roll!`;
        break;
      case 5:
        subject = `Milestone: ${data.accountName} has posted 5 listings!`;
        break;
      case 10:
        subject = `Power User: ${data.accountName} hit 10 listings!`;
        break;
      default:
        subject = `Listing Milestone: ${data.accountName} reached ${data.milestone} listings`;
    }

    // Prepare email data for the service
    const emailData = {
      recipientEmail: data.recipientEmail,
      accountName: data.accountName,
      listingTitle: data.listingTitle,
      listingPrice: data.listingPrice,
      locationCity: data.locationCity,
      milestone: data.milestone,
      milestoneTier: data.milestoneTier,
      suggestedTeam: data.suggestedTeam,
      totalValue: data.totalValue,
      averagePrice: data.averagePrice,
      message: data.message,
      priority: data.priority,
      listingUrl: `https://pivotaconnect.com/listings/${data.listingId}`,
      accountDashboardUrl: `https://pivotaconnect.com/admin/accounts/${data.accountId}`,
      timestamp: data.timestamp
    };

    await this.processEvent(
      context,
      () => this.securityEmailService.sendListingMilestone(emailData, subject),
      data.recipientEmail
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
      channel.nack(originalMsg, false, true);
    }
  }
}