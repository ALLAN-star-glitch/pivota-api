// apps/notification-service/src/email/controllers/organization-email.controller.ts

/**
 * Organization Email Controller
 * 
 * Handles organization-related email events from RabbitMQ.
 * 
 * Events Handled:
 * - organization.onboarded - New organization registration
 * - organization.invitation.sent.new - Invitation to new user (needs account)
 * - organization.invitation.sent.existing - Invitation to existing user
 * - organization.invitation.resend - Resend invitation
 * - user.invitation.welcome - Welcome user who joined via invitation
 * - admin.invitation.accepted - Notify admin when invitation accepted
 * 
 * @example
 * // Event payload for organization.onboarded
 * {
 *   adminEmail: 'admin@company.com',
 *   adminFirstName: 'John',
 *   name: 'Company Name',
 *   accountId: 'ACC-12345',
 *   orgEmail: 'info@company.com',
 *   plan: 'Free Business Tier'
 * }
 * 
 * // Event payload for organization.invitation.sent.new
 * {
 *   email: 'user@example.com',
 *   organizationName: 'Company Name',
 *   inviterName: 'John Doe',
 *   inviteToken: 'token123',
 *   roleName: 'Member',
 *   message: 'Join our team!'
 * }
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { OrganizationOnboardedEventDto } from '@pivota-api/dtos';
import { OrganizationEmailService } from '../services/handlers/organization-email.service';

// Invitation DTOs
interface InvitationSentDto {
  email: string;
  organizationName: string;
  inviterName: string;
  inviteToken: string;
  message?: string;
  roleName: string;
}

interface InvitationResendDto {
  email: string;
  organizationName: string;
  inviterName: string;
  inviteToken: string;
  userType: 'EXISTING' | 'NEW';
  roleName: string;
  message?: string;
}

interface InvitationWelcomeDto {
  email: string;
  firstName: string;
  organizationName: string;
  accountId: string;
}

interface AdminInvitationAcceptedDto {
  adminEmail: string;
  adminName: string;
  newMemberEmail: string;
  newMemberName: string;
  organizationName: string;
}

@Controller()
export class OrganizationEmailController {
  private readonly logger = new Logger(OrganizationEmailController.name);

  constructor(private readonly orgEmailService: OrganizationEmailService) {}

  /**
   * Handle organization onboarded event - Send welcome email to admin
   */
  @EventPattern('organization.onboarded')
  async handleOrganizationOnboarded(
    @Payload() data: OrganizationOnboardedEventDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Organization onboarded event for: ${data.name}`);
    await this.processEvent(
      context,
      () => this.orgEmailService.sendOrganizationWelcome(data),
      data.adminEmail
    );
  }

  /**
   * Handle invitation sent to new user (needs to create account)
   */
  @EventPattern('organization.invitation.sent.new')
  async handleInvitationSentNewUser(
    @Payload() data: InvitationSentDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] New user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.orgEmailService.sendInvitationNewUser(data),
      data.email
    );
  }

  /**
   * Handle invitation sent to existing user (already has account)
   */
  @EventPattern('organization.invitation.sent.existing')
  async handleInvitationSentExistingUser(
    @Payload() data: InvitationSentDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Existing user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.orgEmailService.sendInvitationExistingUser(data),
      data.email
    );
  }

  /**
   * Handle invitation resend
   */
  @EventPattern('organization.invitation.resend')
  async handleInvitationResend(
    @Payload() data: InvitationResendDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Invitation resend for: ${data.email} to ${data.organizationName}`);
    
    if (data.userType === 'NEW') {
      await this.processEvent(
        context,
        () => this.orgEmailService.sendInvitationNewUser({
          email: data.email,
          organizationName: data.organizationName,
          inviterName: data.inviterName,
          inviteToken: data.inviteToken,
          roleName: data.roleName,
          message: data.message
        }),
        data.email
      );
    } else {
      await this.processEvent(
        context,
        () => this.orgEmailService.sendInvitationExistingUser({
          email: data.email,
          organizationName: data.organizationName,
          inviterName: data.inviterName,
          inviteToken: data.inviteToken,
          roleName: data.roleName,
          message: data.message
        }),
        data.email
      );
    }
  }

  /**
   * Handle welcome event for user who joined via invitation
   */
  @EventPattern('user.invitation.welcome')
  async handleInvitationWelcome(
    @Payload() data: InvitationWelcomeDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Invitation welcome for: ${data.email}`);
    
    // Convert to OrganizationOnboardedEventDto format for sendUserWelcome
    // Note: OrganizationEmailService doesn't have sendUserWelcome directly,
    // this should be handled by AuthEmailService. This event might need to be moved.
    this.logger.warn(`user.invitation.welcome event should be handled by AuthEmailService`);
    
    await this.processEvent(
      context,
      async () => {
        // This should call AuthEmailService.sendUserWelcome, not OrganizationEmailService
        this.logger.log(`Welcome email would be sent to ${data.email} from AuthEmailService`);
      },
      data.email
    );
  }

  /**
   * Handle admin notification when user accepts invitation
   */
  @EventPattern('admin.invitation.accepted')
  async handleAdminInvitationAccepted(
    @Payload() data: AdminInvitationAcceptedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Admin notification for accepted invitation to: ${data.adminEmail}`);
    await this.processEvent(
      context,
      () => this.orgEmailService.sendAdminInvitationAccepted(data),
      data.adminEmail
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