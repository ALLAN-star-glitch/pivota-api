import { Controller, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { 
  OrganizationOnboardedEventDto,
  UserLoginEmailDto,
  UserOnboardedEventDto,
  SendOtpEventDto, 
} from '@pivota-api/dtos';

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  /** ------------------ EXISTING: OTP / Verification ------------------ */
  @EventPattern('otp.requested')
  async handleSendOtpEmail(@Payload() data: SendOtpEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Received OTP request for: ${data.email}`);
    await this.processEvent(
      context, 
      () => this.emailService.sendOtpEmail(data), 
      data.email
    );
  }

  /** ------------------ EXISTING: Individual Signup ------------------ */
  @EventPattern('user.onboarded')
  async handleSignupEmail(@Payload() data: UserOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`EVENT RECEIVED!: for ${data.firstName}`);
    await this.processEvent(context, () => this.emailService.sendUserWelcomeEmail(data), data.email);
  }

  /** ------------------ EXISTING: Organisation Signup ------------------ */
  @EventPattern('organization.onboarded')
  async handleOrganizationSignupEmail(@Payload() data: OrganizationOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`EVENT RECEIVED!: for ${data.name}`);
    await this.processEvent(
      context, 
      () => this.emailService.sendOrganizationWelcomeEmail(data), 
      data.adminEmail 
    );
  }

  /** ------------------ EXISTING: Login Notification ------------------ */
  @EventPattern('user.login.email')
  async handleLoginEmail(@Payload() data: UserLoginEmailDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Received event for: ${data.to}`);
    await this.processEvent(context, () => this.emailService.sendLoginEmail(data), data.to);
  }

  /* ======================================================
       NEW: INVITATION EVENT HANDLERS
  ====================================================== */

  /** ------------------ NEW: Invitation sent to new user (needs registration) ------------------ */
  @EventPattern('organization.invitation.sent.new')
  async handleInvitationSentNewUser(
    @Payload() data: {
      email: string;
      organizationName: string;
      inviterName: string;
      inviteToken: string;
      message?: string;
      roleName: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received new user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.emailService.sendInvitationNewUserEmail(data),
      data.email
    );
  }

  /** ------------------ NEW: Invitation sent to existing user (already has account) ------------------ */
  @EventPattern('organization.invitation.sent.existing')
  async handleInvitationSentExistingUser(
    @Payload() data: {
      email: string;
      organizationName: string;
      inviterName: string;
      inviteToken: string;
      message?: string;
      roleName: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received existing user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.emailService.sendInvitationExistingUserEmail(data),
      data.email
    );
  }

  /** ------------------ NEW: Invitation resent (new token generated) ------------------ */
/** ------------------ NEW: Invitation resent (new token generated) ------------------ */
@EventPattern('organization.invitation.resend')
async handleInvitationResend(
  @Payload() data: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteToken: string;
    userType: 'EXISTING' | 'NEW';
    roleName: string; // Add this - it should be included in the event payload
    message?: string; // Add this optional field
  },
  @Ctx() context: RmqContext
) {
  this.logger.debug(`[RMQ] Received invitation resend for: ${data.email} to ${data.organizationName}`);
  
  // Choose the appropriate email method based on user type
  if (data.userType === 'NEW') {
    await this.processEvent(
      context,
      () => this.emailService.sendInvitationNewUserEmail({
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
      () => this.emailService.sendInvitationExistingUserEmail({
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

  /** ------------------ NEW: Password setup required (after invitation acceptance) ------------------ */
  @EventPattern('user.password.setup.required')
  async handlePasswordSetupRequired(
    @Payload() data: {
      email: string;
      firstName: string;
      setupToken: string;
      organizationName: string;
      expiresAt: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received password setup required for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.emailService.sendPasswordSetupEmail(data),
      data.email
    );
  }

  /** ------------------ NEW: Welcome new user who joined via invitation ------------------ */
  @EventPattern('user.invitation.welcome')
  async handleInvitationWelcome(
    @Payload() data: {
      email: string;
      firstName: string;
      organizationName: string;
      accountId: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Received invitation welcome for: ${data.email}`);
    
    // Create a welcome email DTO from the invitation data
    const welcomeData: UserOnboardedEventDto = {
      accountId: data.accountId,
      firstName: data.firstName,
      email: data.email,
      plan: 'Free Forever' // Default plan for invited users
    };
    
    await this.processEvent(
      context,
      () => this.emailService.sendUserWelcomeEmail(welcomeData),
      data.email
    );
  }

  /** ------------------ NEW: Admin notification when user accepts invitation ------------------ */
  @EventPattern('admin.invitation.accepted')
  async handleAdminInvitationAccepted(
    @Payload() data: {
      adminEmail: string;
      adminName: string;
      newMemberEmail: string;
      newMemberName: string;
      organizationName: string;
    },
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Sending admin notification for accepted invitation to: ${data.adminEmail}`);
    
    // Create HTML content for admin notification
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; }
          .footer { margin-top: 20px; font-size: 12px; color: #6c757d; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 New Team Member Joined!</h2>
          </div>
          <div class="content">
            <p>Hello ${data.adminName},</p>
            <p><strong>${data.newMemberName} (${data.newMemberEmail})</strong> has accepted your invitation and joined <strong>${data.organizationName}</strong>.</p>
            <p>They now have access to your organization's workspace and can start collaborating with the team.</p>
            <p>You can manage team members in your organization dashboard.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Pivota. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send using Mailjet directly (or add a method to EmailService)
    const body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.adminEmail, Name: data.adminName }],
        Subject: `🎉 ${data.newMemberName} joined ${data.organizationName}`,
        HTMLPart: htmlContent,
        TextPart: `${data.newMemberName} (${data.newMemberEmail}) has accepted your invitation and joined ${data.organizationName}.`
      }]
    };

    await this.processEvent(
      context,
      () => this.emailService['sendEmail'](body, data.adminEmail),
      data.adminEmail
    );
  }

  /** ------------------ Shared Private Processor ------------------ */
  private async processEvent(context: RmqContext, action: () => Promise<void>, identifier: string) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const pattern = context.getPattern();
    
    this.logger.log(`[RMQ] Received event: ${pattern} for ${identifier}`);
    
    const startTime = Date.now();
    try {
      await action();
      
      // SUCCESS: Tell RabbitMQ to delete the message
      channel.ack(originalMsg);
      
      const duration = Date.now() - startTime;
      this.logger.log(`[RMQ] Successfully processed ${pattern} for ${identifier} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[RMQ] Failed ${pattern} for ${identifier} after ${duration}ms: ${error.message}`);
      
      // ❌ FAILURE: Tell RabbitMQ to put the message back in the queue to try again
      channel.nack(originalMsg, false, true); 
      
      throw error; 
    }
  }
}