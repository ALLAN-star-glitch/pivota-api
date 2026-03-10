import { Controller, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { 
  OrganizationOnboardedEventDto,
  UserLoginEmailDto,
  UserOnboardedEventDto,
  SendOtpEventDto, 
} from '@pivota-api/dtos';

// Define the NotificationEmailData interface to match what housing service sends
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

// Define invitation related interfaces
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

interface PasswordSetupRequiredDto {
  email: string;
  firstName: string;
  setupToken: string;
  organizationName: string;
  expiresAt: string;
}

interface InvitationWelcomeDto {
  email: string;
  firstName: string;
  organizationName: string;
  accountId: string;
}

interface PasswordSetupCompletedDto {
  email: string;
  userUuid: string;
}

interface AdminInvitationAcceptedDto {
  adminEmail: string;
  adminName: string;
  newMemberEmail: string;
  newMemberName: string;
  organizationName: string;
}

// This matches what the auth service sends
interface AdminNewRegistrationFromAuthDto {
  adminEmail: string;  // Auth service sends adminEmail, NOT recipientEmail
  userEmail: string;
  userName: string;
  accountType: string;
  registrationMethod?: string;
  registrationDate: string;
  userCount?: number;
  plan: string;
}

// This is what the email service expects
interface AdminNewRegistrationForServiceDto {
  recipientEmail: string;
  userEmail: string;
  userName: string;
  accountType: string;
  registrationMethod?: string;
  registrationDate: string;
  userCount?: number;
  plan: string;
}

interface AdminNewOrganizationRegistrationDto {
  recipientEmail: string;
  organizationName: string;
  adminName: string;
  adminEmail: string;
  organizationEmail: string;
  registrationDate: string;
  plan: string;
}

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {
    // Log controller initialization with RabbitMQ connection info
    this.logger.log('📧 EmailController initialized');
    this.logger.log(`🔌 RabbitMQ URL: ${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}`);
    this.logger.log(`📋 Listening for patterns: otp.requested, user.onboarded, organization.onboarded, user.login.email, admin.new.registration, admin.new.organization.registration, notification.email, organization.invitation.sent.new, organization.invitation.sent.existing, organization.invitation.resend, user.password.setup.required, user.password.setup.completed, user.invitation.welcome, admin.invitation.accepted`);
  }

  /** ------------------ OTP / Verification ------------------ */
  @EventPattern('otp.requested')
  async handleSendOtpEmail(@Payload() data: SendOtpEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Received OTP request for: ${data.email} (${data.purpose})`);
    await this.processEvent(
      context, 
      () => this.emailService.sendOtpEmail(data), 
      data.email
    );
  }

  /** ------------------ Individual Signup ------------------ */
  @EventPattern('user.onboarded')
  async handleSignupEmail(@Payload() data: UserOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] User onboarded event for: ${data.email}`);
    await this.processEvent(
      context, 
      () => this.emailService.sendUserWelcomeEmail(data), 
      data.email
    );
  }

  /** ------------------ Organisation Signup ------------------ */
  @EventPattern('organization.onboarded')
  async handleOrganizationSignupEmail(@Payload() data: OrganizationOnboardedEventDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Organization onboarded event for: ${data.name}`);
    await this.processEvent(
      context, 
      () => this.emailService.sendOrganizationWelcomeEmail(data), 
      data.adminEmail 
    );
  }

  /** ------------------ Login Notification with Enhanced Device Info ------------------ */
  @EventPattern('user.login.email')
  async handleLoginEmail(@Payload() data: UserLoginEmailDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] Received login notification for: ${data.to}`);
    
    // Log the rich device info for debugging
    this.logger.debug(`📱 Device: ${data.device} (${data.deviceType || 'UNKNOWN'})`);
    this.logger.debug(`💻 OS: ${data.os} ${data.osVersion || ''}`);
    this.logger.debug(`🌐 Browser: ${data.browser || 'Unknown'} ${data.browserVersion || ''}`);
    this.logger.debug(`📊 Classification: ${[
      data.isMobile ? 'Mobile' : '',
      data.isTablet ? 'Tablet' : '',
      data.isDesktop ? 'Desktop' : '',
      data.isBot ? 'Bot' : ''
    ].filter(Boolean).join(', ') || 'Unknown'}`);
    this.logger.debug(`📍 IP: ${data.ipAddress}`);
    this.logger.debug(`⏰ Time: ${data.timestamp}`);
    
    await this.processEvent(
      context, 
      () => this.emailService.sendLoginEmail(data), 
      data.to
    );
  }

  /** ------------------ Admin Notification - New User Registration ------------------ */
  @EventPattern('admin.new.registration')
  async handleAdminNewRegistration(@Payload() data: AdminNewRegistrationFromAuthDto, @Ctx() context: RmqContext) {
    // Log the raw received data first
    this.logger.log(`📨 [RAW] Received admin.new.registration event`);
    this.logger.debug(`[RAW] Full payload: ${JSON.stringify(data)}`);
    this.logger.debug(`[RAW] Pattern: ${context.getPattern()}`);
    
    // Check message properties
    const originalMsg = context.getMessage();
    this.logger.debug(`[RMQ] Message properties: ${JSON.stringify(originalMsg.properties)}`);
    
    this.logger.debug(`[RMQ] New user registration notification for admin: ${data?.adminEmail}`);
    this.logger.debug(`New user: ${data?.userName} (${data?.userEmail})`);
    
    // Validate that we have an admin email
    if (!data || !data.adminEmail) {
      this.logger.error('❌ admin.new.registration event missing adminEmail field or data is null');
      this.logger.error(`Received data: ${JSON.stringify(data)}`);
      
      // Log the full message for debugging
      this.logger.error(`Full message: ${JSON.stringify(originalMsg)}`);
      
      const channel = context.getChannelRef();
      channel.ack(originalMsg); // Acknowledge to remove from queue
      return;
    }
    
    // Map the fields from what auth service sends to what email service expects
    const serviceData: AdminNewRegistrationForServiceDto = {
      recipientEmail: data.adminEmail,  // Map adminEmail to recipientEmail
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
      () => this.emailService.sendAdminNewRegistrationEmail(serviceData),
      data.adminEmail  // Use adminEmail as the identifier
    );
  }

  /** ------------------ Admin Notification - New Organization Registration ------------------ */
  @EventPattern('admin.new.organization.registration')
  async handleAdminNewOrganizationRegistration(@Payload() data: AdminNewOrganizationRegistrationDto, @Ctx() context: RmqContext) {
    this.logger.debug(`[RMQ] New organization registration notification for admin: ${data?.recipientEmail}`);
    this.logger.debug(`[RAW] Full payload: ${JSON.stringify(data)}`);
    this.logger.debug(`New organization: ${data?.organizationName} by ${data?.adminName}`);
    
    if (!data || !data.recipientEmail) {
      this.logger.error('admin.new.organization.registration event missing recipientEmail field');
      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      channel.ack(originalMsg);
      return;
    }
    
    await this.processEvent(
      context,
      () => this.emailService.sendAdminNewOrganizationEmail(data),
      data.recipientEmail
    );
  }

  /* ======================================================
       NOTIFICATION EMAIL HANDLER (Housing Service)
  ====================================================== */
  @EventPattern('notification.email')
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

    try {
      // Route based on template
      switch(data.template) {
        case 'viewing-scheduled-viewer':
          await this.emailService.sendViewingScheduledViewerEmail({
            email: data.recipientEmail,
            firstName: data.recipientName.split(' ')[0] || 'User',
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            notes: data.data.notes
          });
          break;
          
        case 'viewing-scheduled-admin-viewer':
          await this.emailService.sendViewingScheduledAdminViewerEmail({
            email: data.recipientEmail,
            firstName: data.recipientName.split(' ')[0] || 'User',
            houseTitle: data.data.houseTitle,
            houseImageUrl: data.data.houseImageUrl,
            viewingDate: data.data.viewingDate,
            location: data.data.location,
            notes: data.data.notes
          });
          break;
          
        case 'viewing-scheduled-owner':
          await this.emailService.sendViewingRequestedOwnerEmail({
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
          await this.emailService.sendViewingRequestedAdminOwnerEmail({
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
      channel.nack(originalMsg, false, true);
    }
  }

  /* ======================================================
       INVITATION EVENT HANDLERS
  ====================================================== */

  /** ------------------ Invitation sent to new user ------------------ */
  @EventPattern('organization.invitation.sent.new')
  async handleInvitationSentNewUser(
    @Payload() data: InvitationSentDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] New user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.emailService.sendInvitationNewUserEmail(data),
      data.email
    );
  }

  /** ------------------ Invitation sent to existing user ------------------ */
  @EventPattern('organization.invitation.sent.existing')
  async handleInvitationSentExistingUser(
    @Payload() data: InvitationSentDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Existing user invitation for: ${data.email} to ${data.organizationName}`);
    await this.processEvent(
      context,
      () => this.emailService.sendInvitationExistingUserEmail(data),
      data.email
    );
  }

  /** ------------------ Invitation resent ------------------ */
  @EventPattern('organization.invitation.resend')
  async handleInvitationResend(
    @Payload() data: InvitationResendDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Invitation resend for: ${data.email} to ${data.organizationName}`);
    
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

  /** ------------------ Password setup required ------------------ */
  @EventPattern('user.password.setup.required')
  async handlePasswordSetupRequired(
    @Payload() data: PasswordSetupRequiredDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Password setup required for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.emailService.sendPasswordSetupEmail(data),
      data.email
    );
  }

  /** ------------------ Password setup completed ------------------ */
  @EventPattern('user.password.setup.completed')
  async handlePasswordSetupCompleted(
    @Payload() data: PasswordSetupCompletedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Password setup completed for: ${data.email}`);
    await this.processEvent(
      context,
      () => this.emailService.sendPasswordSetupConfirmationEmail(data),
      data.email
    );
  }

  /** ------------------ Welcome user who joined via invitation ------------------ */
  @EventPattern('user.invitation.welcome')
  async handleInvitationWelcome(
    @Payload() data: InvitationWelcomeDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Invitation welcome for: ${data.email}`);
    
    const welcomeData: UserOnboardedEventDto = {
      accountId: data.accountId,
      firstName: data.firstName,
      email: data.email,
      plan: 'Free Forever'
    };
    
    await this.processEvent(
      context,
      () => this.emailService.sendUserWelcomeEmail(welcomeData),
      data.email
    );
  }

  /** ------------------ Admin notification when user accepts invitation ------------------ */
  @EventPattern('admin.invitation.accepted')
  async handleAdminInvitationAccepted(
    @Payload() data: AdminInvitationAcceptedDto,
    @Ctx() context: RmqContext
  ) {
    this.logger.debug(`[RMQ] Admin notification for accepted invitation to: ${data.adminEmail}`);
    
    // Use the EmailService's sendEmail method via private access (or you could add a dedicated method)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F5F5F5;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #FFFFFF;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          .header { 
            background: linear-gradient(135deg, #008080 0%, #006666 50%, #004d4d 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .header h2 {
            color: #FFFFFF;
            font-size: 28px;
            margin: 0;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .content { 
            background: #FFFFFF;
            padding: 40px 28px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.5;
            color: #333333;
            margin: 0 0 16px 0;
          }
          .info-box {
            background: #E6F3F3;
            border: 1px solid #00808020;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-box p {
            margin: 8px 0;
            color: #006666;
          }
          .footer { 
            padding: 24px 20px;
            background: #F5F5F5;
            text-align: center;
            border-top: 1px solid #00808020;
          }
          .footer p {
            margin: 0;
            font-size: 12px;
            color: #666666;
          }
        </style>
      </head>
      <body style="background-color: #F5F5F5; padding: 20px;">
        <div class="container">
          <div class="header">
            <h2>🎉 New Team Member Joined!</h2>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #008080;">Hello ${data.adminName},</p>
            <p><strong>${data.newMemberName} (${data.newMemberEmail})</strong> has accepted your invitation and joined <strong>${data.organizationName}</strong>.</p>
            
            <div class="info-box">
              <p><strong>Organization:</strong> ${data.organizationName}</p>
              <p><strong>New Member:</strong> ${data.newMemberName}</p>
              <p><strong>Email:</strong> ${data.newMemberEmail}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            
            <p>They now have access to your organization's workspace and can start collaborating with the team.</p>
            <p>You can manage team members in your organization dashboard.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} PivotaConnect. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

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
      
      // Nack and requeue for retry
      channel.nack(originalMsg, false, true); 
    }
  }
}