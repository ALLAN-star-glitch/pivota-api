// auth-microservice/src/events/invitation-event.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { InvitationAcceptedNewUserEventPayload, InvitationAcceptedExistingUserEventPayload, PasswordSetupRequiredEventPayload, PasswordSetupCompletedEventPayload, InvitationErrorEventPayload } from '@pivota-api/interfaces';


@Controller()
export class InvitationEventController {
  private readonly logger = new Logger(InvitationEventController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Handles event when a new user accepts an organization invitation
   * Creates credentials and password setup token
   */
  @EventPattern('user.invitation.accepted.new')
  async handleInvitationAcceptedNewUser(
    @Payload() data: InvitationAcceptedNewUserEventPayload
  ): Promise<void> {
    this.logger.log(`[EVENT] Received user.invitation.accepted.new for: ${data.email}`);
    
    try {
      // Validate required fields
      if (!data.email || !data.userUuid || !data.firstName || !data.lastName || !data.phone) {
        throw new Error('Missing required fields in event payload');
      }

      await this.authService.handleInvitationAcceptedNewUser({
        email: data.email,
        userUuid: data.userUuid,
        organizationUuid: data.organizationUuid,
        organizationName: data.organizationName,
        roleName: data.roleName || 'GeneralUser',
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      
      this.logger.log(`[EVENT] Successfully processed invitation for new user: ${data.email}`);
    } catch (error) {
      this.logger.error(`[EVENT] Failed to process invitation for ${data.email}: ${error.message}`);
      // In production, you might want to implement retry logic or send to dead letter queue
    }
  }

  /**
   * Handles event when an existing user accepts an organization invitation
   * May trigger notifications or other actions
   */
  @EventPattern('user.invitation.accepted.existing')
  async handleInvitationAcceptedExistingUser(
    @Payload() data: InvitationAcceptedExistingUserEventPayload
  ): Promise<void> {
    this.logger.log(`[EVENT] Received user.invitation.accepted.existing for: ${data.email}`);
    
    try {
      // Validate required fields
      if (!data.email || !data.userUuid || !data.organizationUuid || !data.organizationName) {
        throw new Error('Missing required fields in event payload');
      }

      // You can add logic here for existing users if needed
      // For example: send welcome back email, update any auth-related flags, etc.
      
      this.logger.log(`[EVENT] Existing user ${data.email} added to organization ${data.organizationName}`);
      
      // Optionally emit a follow-up event
      // this.notificationBus.emit('user.added.to.organization.notification', { ...data });
      
    } catch (error) {
      this.logger.error(`[EVENT] Failed to process existing user invitation for ${data.email}: ${error.message}`);
    }
  }

  /**
   * Handles event when password setup is required (after invitation acceptance)
   * This is emitted by the auth service itself to trigger email sending
   */
  @EventPattern('user.password.setup.required')
  async handlePasswordSetupRequired(
    @Payload() data: PasswordSetupRequiredEventPayload
  ): Promise<void> {
    this.logger.log(`[EVENT] Password setup required for: ${data.email}`);
    
    try {
      // Validate required fields
      if (!data.email || !data.userUuid || !data.setupToken) {
        throw new Error('Missing required fields in password setup event');
      }

      // This event is typically emitted by the auth service to trigger notification service
      // The notification service will pick it up and send an email
      this.logger.log(`[EVENT] Password setup token created for ${data.email}, expires: ${data.expiresAt}`);
      
      // You could add additional logic here, like tracking in database
      
    } catch (error) {
      this.logger.error(`[EVENT] Failed to process password setup required for ${data.email}: ${error.message}`);
    }
  }

  /**
   * Handles event when password setup is completed
   */
  @EventPattern('user.password.setup.completed')
  async handlePasswordSetupCompleted(
    @Payload() data: PasswordSetupCompletedEventPayload
  ): Promise<void> {
    this.logger.log(`[EVENT] Password setup completed for user: ${data.userUuid}`);
    
    try {
      // Validate required fields
      if (!data.userUuid || !data.email) {
        throw new Error('Missing required fields in password setup completed event');
      }

      this.logger.log(`[EVENT] User ${data.email} has successfully set up their password`);
      
      // You could add logic here, such as:
      // - Update user status in profile service via gRPC
      // - Send welcome email
      // - Trigger analytics event
      
    } catch (error) {
      this.logger.error(`[EVENT] Failed to process password setup completed for ${data.email}: ${error.message}`);
    }
  }

  /**
   * Handles invitation errors with dead letter queue
   * Now properly typed instead of using any
   */
  @EventPattern('user.invitation.error')
  async handleInvitationError(
    @Payload() data: InvitationErrorEventPayload
  ): Promise<void> {
    this.logger.error(`[EVENT] Invitation error for event ${data.originalEvent}: ${data.error}`);
    this.logger.debug(`Error payload: ${JSON.stringify(data.payload)}`);
    
    // Here you could:
    // - Store in database for manual review
    // - Send alert to admin
    // - Attempt retry with backoff
    
    // Example: Store in database
    try {
      // await this.prisma.errorLog.create({
      //   data: {
      //     eventType: data.originalEvent,
      //     error: data.error,
      //     payload: data.payload,
      //     timestamp: data.timestamp || new Date().toISOString(),
      //   }
      // });
      
      this.logger.log(`[EVENT] Invitation error logged for ${data.originalEvent}`);
    } catch (dbError) {
      this.logger.error(`[EVENT] Failed to log invitation error: ${dbError.message}`);
    }
  }

  /**
   * Optional: Catch-all for unknown events (if needed)
   * Still typed properly with Record<string, unknown>
   */
  @EventPattern('user.invitation.unknown')
  async handleUnknownEvent(
    @Payload() data: { pattern: string; data: Record<string, unknown> }
  ): Promise<void> {
    this.logger.warn(`[EVENT] Received unknown invitation event pattern: ${data.pattern}`);
    this.logger.debug(`Unknown event data: ${JSON.stringify(data.data)}`);
  }
}