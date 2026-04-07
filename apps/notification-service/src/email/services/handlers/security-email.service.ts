// apps/notification-service/src/email/services/security-email.service.ts

/**
 * Security Email Service
 * 
 * Handles all security-related email communications for the PivotaConnect platform.
 * 
 * Responsibilities:
 * - Sends password setup emails for new users
 * - Sends password setup confirmation emails
 * - Sends account linking notifications (Google, etc.)
 * - Sends admin notifications for new registrations
 * - Sends listing milestone alerts to internal teams
 * 
 * Dependencies:
 * - MailerService: NestJS Mailer for email sending with timeout support
 * - EmailTemplateService: Template rendering and formatting utilities
 * 
 * @example
 * // Send password setup email
 * await securityEmailService.sendPasswordSetup({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   setupToken: 'token123',
 *   organizationName: 'Company Name',
 *   expiresAt: new Date().toISOString()
 * });
 * 
 * // Send account linked notification
 * await securityEmailService.sendAccountLinked({
 *   email: 'user@example.com',
 *   provider: 'Google',
 *   timestamp: new Date().toISOString()
 * });
 * 
 * // Send admin new user notification
 * await securityEmailService.sendAdminNewUser({
 *   recipientEmail: 'admin@pivota.com',
 *   userEmail: 'user@example.com',
 *   userName: 'John Doe',
 *   accountType: 'INDIVIDUAL',
 *   registrationDate: new Date().toISOString(),
 *   plan: 'Free Forever'
 * });
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class SecurityEmailService {
  private readonly logger = new Logger(SecurityEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send password setup email to new user who joined via invitation
   */
  async sendPasswordSetup(data: {
    email: string;
    firstName: string;
    setupToken: string;
    organizationName: string;
    expiresAt: string;
  }): Promise<void> {
    const startTime = Date.now();
    const setupUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/setup-password?token=${data.setupToken}`;
    const expiresAtFormatted = this.template.formatDate(new Date(data.expiresAt), 'MMMM do, yyyy');

    const content = `
      <h1>Set Up Your Password</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Welcome to ${data.organizationName}, ${data.firstName}</p>
      <p>Your account has been created. To complete your registration, please set up your password.</p>
      
      <div style="text-align: center;">
        <a href="${setupUrl}" class="button">Set Up Password</a>
      </div>
      
      <div class="expiry-box">
        This link expires on ${expiresAtFormatted}
      </div>
      
      <div class="info-box">
        <h3>Next steps</h3>
        <ul>
          <li>Set your password using the secure link</li>
          <li>Log in to your new account</li>
          <li>Complete your profile</li>
          <li>Start collaborating with your team</li>
        </ul>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Set up your password for ${data.organizationName}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Password setup email sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send password setup email to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send confirmation email after password is successfully set
   */
  async sendPasswordSetupConfirmation(data: { email: string }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>Password Setup Complete</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Your password has been successfully set.</p>
      <p>You can now log in to your account using your email and new password.</p>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/login" class="button">Log In Now</a>
      </div>
      
      <div class="info-box">
        <h3>Security Tips</h3>
        <ul>
          <li>Never share your password with anyone</li>
          <li>Use a unique password for each service</li>
          <li>Enable two-factor authentication for extra security</li>
        </ul>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: 'Password Setup Complete',
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Password setup confirmation sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send password setup confirmation to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification when account is linked with external provider (Google, etc.)
   */
  async sendAccountLinked(data: {
    email: string;
    provider: string;
    timestamp: string;
  }): Promise<void> {
    const startTime = Date.now();
    const linkTime = this.template.formatDateTime(data.timestamp);

    const content = `
      <h1>Account Linked Successfully</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello,</p>
      <p>Your PivotaConnect account has been successfully linked with <strong>${data.provider}</strong>.</p>
      
      <div class="info-box">
        <h3>What this means</h3>
        <ul>
          <li>You can now log in using your ${data.provider} account</li>
          <li>Your account security has been enhanced with social authentication</li>
          <li>You can still use your email and password to log in</li>
        </ul>
      </div>
      
      <div class="info-box" style="border-left-color: ${this.template.getColors().primary};">
        <p><strong>Time of linking:</strong> ${linkTime}</p>
        <p><strong>Provider:</strong> ${data.provider}</p>
      </div>
      
      <p>If you didn't authorize this linking, please contact support immediately.</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Account Linked with ${data.provider}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Account linked notification sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send account linked notification to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send admin notification for new user registration
   */
  async sendAdminNewUser(data: {
    recipientEmail: string;
    userEmail: string;
    userName: string;
    accountType: string;
    registrationMethod?: string;
    registrationDate: string;
    plan: string;
    primaryPurpose?: string;
    profileType?: string;
  }): Promise<void> {
    const startTime = Date.now();
    const regDate = this.template.formatDateTime(data.registrationDate);
    const method = data.registrationMethod || 'Email/Password';

    // Map profile type to readable name
    const profileTypeMap: Record<string, string> = {
      'JOB_SEEKER': 'Job Seeker',
      'SKILLED_PROFESSIONAL': 'Skilled Professional',
      'INTERMEDIARY_AGENT': 'Agent',
      'HOUSING_SEEKER': 'Housing Seeker',
      'SUPPORT_BENEFICIARY': 'Support Beneficiary',
      'EMPLOYER': 'Employer',
      'PROPERTY_OWNER': 'Property Owner',
      'SOCIAL_SERVICE_PROVIDER': 'Social Service Provider',
    };
    
    const profileTypeDisplay = data.profileType ? profileTypeMap[data.profileType] || data.profileType : 'Not specified';

    // Map primary purpose to readable name
    const purposeMap: Record<string, string> = {
      'FIND_JOB': 'Find Job',
      'OFFER_SKILLED_SERVICES': 'Offer Skilled Services',
      'WORK_AS_AGENT': 'Work as Agent',
      'FIND_HOUSING': 'Find Housing',
      'GET_SOCIAL_SUPPORT': 'Get Social Support',
      'HIRE_EMPLOYEES': 'Hire Employees',
      'LIST_PROPERTIES': 'List Properties',
      'JUST_EXPLORING': 'Just Exploring',
    };
    
    const purposeDisplay = data.primaryPurpose ? purposeMap[data.primaryPurpose] || data.primaryPurpose : 'Not specified';

    // Build subject with profile type for better filtering
    let subject: string;
    if (data.profileType && profileTypeDisplay !== 'Not specified') {
      subject = `New ${profileTypeDisplay}: ${data.userName} joined PivotaConnect`;
    } else {
      subject = `New User Registration: ${data.userName} joined PivotaConnect`;
    }

    const content = `
      <h1>New User Registration</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">A new user has joined PivotaConnect</p>
      
      <div class="info-box">
        <h3>User Details</h3>
        <ul>
          <li><strong>Name:</strong> ${data.userName}</li>
          <li><strong>Email:</strong> ${data.userEmail}</li>
          <li><strong>Account Type:</strong> ${data.accountType}</li>
          <li><strong>Registration Method:</strong> ${method}</li>
          <li><strong>Plan:</strong> ${data.plan}</li>
          <li><strong>Date:</strong> ${regDate}</li>
          <li><strong>Primary Purpose:</strong> ${purposeDisplay}</li>
          <li><strong>Profile Type:</strong> ${profileTypeDisplay}</li>
        </ul>
      </div>
      
      <p>Welcome them to the community!</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Admin new user notification sent to ${data.recipientEmail} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send admin new user notification to ${data.recipientEmail} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send admin notification for new organization registration
   */
  async sendAdminNewOrganization(data: {
    recipientEmail: string;
    organizationName: string;
    adminName: string;
    adminEmail: string;
    organizationEmail: string;
    registrationDate: string;
    plan: string;
  }): Promise<void> {
    const startTime = Date.now();
    const regDate = this.template.formatDateTime(data.registrationDate);

    const content = `
      <h1>New Organization Registration</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">A new organization has joined PivotaConnect</p>
      
      <div class="info-box">
        <h3>Organization Details</h3>
        <ul>
          <li><strong>Organization:</strong> ${data.organizationName}</li>
          <li><strong>Official Email:</strong> ${data.organizationEmail}</li>
          <li><strong>Plan:</strong> ${data.plan}</li>
        </ul>
      </div>
      
      <div class="info-box" style="margin-top: 10px;">
        <h3>Admin Details</h3>
        <ul>
          <li><strong>Admin Name:</strong> ${data.adminName}</li>
          <li><strong>Admin Email:</strong> ${data.adminEmail}</li>
        </ul>
      </div>
      
      <p><strong>Registration Date:</strong> ${regDate}</p>
      
      <p>Welcome them to the platform!</p>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: `New Organization: ${data.organizationName}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Admin new organization notification sent to ${data.recipientEmail} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send admin new organization notification to ${data.recipientEmail} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send listing milestone email to internal teams
   */
  async sendListingMilestone(
    data: {
      recipientEmail: string;
      accountName: string;
      listingTitle: string;
      listingPrice: number;
      locationCity: string;
      milestone: number;
      milestoneTier: string;
      suggestedTeam: string;
      totalValue: number;
      averagePrice: number;
      message: string;
      priority: string;
      listingUrl: string;
      accountDashboardUrl: string;
      timestamp: string;
    },
    subject: string
  ): Promise<void> {
    const startTime = Date.now();
    const milestoneTime = this.template.formatDateTime(data.timestamp);

    const content = `
      <h1>Listing Milestone: ${data.milestone} Listings</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">${data.message}</p>
      
      <div class="info-box">
        <h3>Account Details</h3>
        <ul>
          <li><strong>Account:</strong> ${data.accountName}</li>
          <li><strong>Milestone:</strong> ${data.milestone} listings</li>
          <li><strong>Tier:</strong> ${data.milestoneTier}</li>
          <li><strong>Suggested Team:</strong> ${data.suggestedTeam}</li>
          <li><strong>Priority:</strong> ${data.priority}</li>
        </ul>
      </div>
      
      <div class="info-box">
        <h3>Latest Listing</h3>
        <ul>
          <li><strong>Title:</strong> ${data.listingTitle}</li>
          <li><strong>Price:</strong> ${this.template.formatCurrency(data.listingPrice)}</li>
          <li><strong>Location:</strong> ${data.locationCity}</li>
        </ul>
      </div>
      
      <div class="info-box">
        <h3>Account Metrics</h3>
        <ul>
          <li><strong>Total Listings:</strong> ${data.milestone}</li>
          <li><strong>Total Value:</strong> ${this.template.formatCurrency(data.totalValue)}</li>
          <li><strong>Average Price:</strong> ${this.template.formatCurrency(data.averagePrice)}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.listingUrl}" class="button" style="margin-right: 10px;">View Listing</a>
        <a href="${data.accountDashboardUrl}" class="button">View Account</a>
      </div>
      
      <div class="expiry-box">
        <p style="margin: 0; font-size: 12px;">Milestone achieved at: ${milestoneTime}</p>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.recipientEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Listing milestone email sent to ${data.recipientEmail} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send listing milestone email to ${data.recipientEmail} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }
}