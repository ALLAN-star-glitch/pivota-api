/**
 * Organization Email Service
 * 
 * Handles all organization-related email communications for the PivotaConnect platform.
 * 
 * Dependencies:
 * - MailerService: NestJS Mailer for email sending with timeout support
 * - EmailTemplateService: Template rendering and formatting utilities
 * 
 * @example
 * // Send organization welcome
 * await organizationEmailService.sendOrganizationWelcome({
 *   adminEmail: 'admin@company.com',
 *   adminFirstName: 'John',
 *   name: 'Company Name',
 *   accountId: 'ACC-12345'
 * });
 * 
 * // Send invitation to new user
 * await organizationEmailService.sendInvitationNewUser({
 *   email: 'user@example.com',
 *   organizationName: 'Company Name',
 *   inviterName: 'John Doe',
 *   inviteToken: 'token123',
 *   roleName: 'Member'
 * });
 */

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { 
  OrganizationOnboardedEventDto 
} from '@pivota-api/dtos';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class OrganizationEmailService {
  private readonly logger = new Logger(OrganizationEmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send welcome email to organization admin after registration
   */
  async sendOrganizationWelcome(dto: OrganizationOnboardedEventDto): Promise<void> {
    const startTime = Date.now();
    const joinDate = this.template.formatDate(new Date());
    const businessName = dto.name || 'Your Organization';

    const adminContent = `
      <h1>Welcome, ${dto.adminFirstName}</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Your organization <strong>${businessName}</strong> is now registered.</p>
      <p>Thank you for choosing PivotaConnect. You're now part of a growing network of African businesses.</p>
      
      <div class="info-box">
        <h3>Admin Capabilities</h3>
        <ul>
          <li>Manage team members and roles</li>
          <li>Post opportunities and listings</li>
          <li>Track applications and responses</li>
          <li>Access organization analytics</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/org/dashboard" class="button">Open Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
        Organization: ${businessName}<br>
        Account ID: ${dto.accountId}<br>
        Plan: ${dto.plan || 'Free Business Tier'}<br>
        Registered: ${joinDate}
      </p>
    `;

    const htmlContent = this.template.render(adminContent);
    const textContent = this.template.stripHtml(adminContent);

    try {
      const result = await this.mailerService.sendMail({
        to: dto.adminEmail,
        subject: `Welcome to PivotaConnect, ${businessName}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Organization welcome email sent to ${dto.adminEmail} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send organization welcome email to ${dto.adminEmail} after ${duration}ms: ${error.message}`);
      throw error;
    }

    // Also send to organization email if different from admin email
    if (dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.adminEmail.toLowerCase()) {
      const orgStartTime = Date.now();
      const orgContent = `
        <h1>Registration Confirmed</h1>
        <p style="font-size: 18px; color: ${this.template.getColors().primary};"><strong>${businessName}</strong> is now on PivotaConnect.</p>
        <p>This confirms your organization's registration, completed by ${dto.adminFirstName}.</p>
        
        <div class="info-box">
          <h3>Organization Details</h3>
          <ul>
            <li><strong>Organization:</strong> ${businessName}</li>
            <li><strong>Account ID:</strong> ${dto.accountId}</li>
            <li><strong>Primary Admin:</strong> ${dto.adminFirstName}</li>
            <li><strong>Plan:</strong> ${dto.plan || 'Free Business Tier'}</li>
          </ul>
        </div>
        
        <p>Your organization can now post opportunities and connect with talent across Africa.</p>
      `;

      const orgHtmlContent = this.template.render(orgContent);
      const orgTextContent = this.template.stripHtml(orgContent);

      try {
        const result = await this.mailerService.sendMail({
          to: dto.orgEmail,
          subject: `Official Registration: ${businessName}`,
          html: orgHtmlContent,
          text: orgTextContent,
        });
        
        const duration = Date.now() - orgStartTime;
        this.logger.log(`✅ Organization confirmation email sent to ${dto.orgEmail} in ${duration}ms. MessageId: ${result.messageId}`);
      } catch (error) {
        const duration = Date.now() - orgStartTime;
        this.logger.error(`❌ Failed to send organization confirmation email to ${dto.orgEmail} after ${duration}ms: ${error.message}`);
      }
    }
  }

  /**
   * Send invitation email to new user (needs to create account)
   */
  async sendInvitationNewUser(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteToken: string;
    message?: string;
    roleName: string;
  }): Promise<void> {
    const startTime = Date.now();
    const joinUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/accept-invite?token=${data.inviteToken}`;
    const expiresAt = this.template.formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM do, yyyy');

    const content = `
      <h1>You're Invited</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Join <strong>${data.organizationName}</strong> on PivotaConnect</p>
      <p><strong>${data.inviterName}</strong> has invited you to join their organization.</p>
      
      <div class="role-badge">${data.roleName}</div>
      
      ${data.message ? `
        <div class="message-box">
          <p style="margin:0;">"${data.message}"<br>— ${data.inviterName}</p>
        </div>
      ` : ''}
      
      <p>As a new user, you'll need to create your account to get started.</p>
      
      <div style="text-align: center;">
        <a href="${joinUrl}" class="button">Accept Invitation</a>
      </div>
      
      <div class="expiry-box">
        This invitation expires on ${expiresAt}
      </div>
      
      <div class="info-box">
        <h3>What you'll get</h3>
        <ul>
          <li>Access to ${data.organizationName}'s workspace</li>
          <li>Collaborate with team members</li>
          <li>Participate in organization activities</li>
        </ul>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Join ${data.organizationName} on PivotaConnect`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Invitation (new user) sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send invitation (new user) to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send invitation email to existing user (already has account)
   */
  async sendInvitationExistingUser(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteToken: string;
    message?: string;
    roleName: string;
  }): Promise<void> {
    const startTime = Date.now();
    const acceptUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/accept-invite?token=${data.inviteToken}`;
    const expiresAt = this.template.formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM do, yyyy');

    const content = `
      <h1>Added to Organization</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">You've been added to <strong>${data.organizationName}</strong></p>
      <p><strong>${data.inviterName}</strong> has added you to their organization.</p>
      
      <div class="role-badge">${data.roleName}</div>
      
      ${data.message ? `
        <div class="message-box">
          <p style="margin:0;">"${data.message}"<br>— ${data.inviterName}</p>
        </div>
      ` : ''}
      
      <p>Since you already have an account, simply click below to accept.</p>
      
      <div style="text-align: center;">
        <a href="${acceptUrl}" class="button">Accept Invitation</a>
      </div>
      
      <div class="expiry-box">
        This invitation expires on ${expiresAt}
      </div>
      
      <div class="info-box">
        <h3>What's next</h3>
        <ul>
          <li>Access ${data.organizationName}'s workspace</li>
          <li>Collaborate with team members</li>
          <li>Receive organization updates</li>
        </ul>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.email,
        subject: `Added to ${data.organizationName} on PivotaConnect`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Invitation (existing user) sent to ${data.email} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send invitation (existing user) to ${data.email} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification to admin when a user accepts their invitation
   */
  async sendAdminInvitationAccepted(data: {
    adminEmail: string;
    adminName: string;
    newMemberEmail: string;
    newMemberName: string;
    organizationName: string;
  }): Promise<void> {
    const startTime = Date.now();

    const content = `
      <h1>New Team Member Joined</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.adminName},</p>
      <p><strong>${data.newMemberName}</strong> has accepted your invitation and joined <strong>${data.organizationName}</strong>.</p>
      
      <div class="info-box">
        <h3>Member Details</h3>
        <ul>
          <li><strong>Name:</strong> ${data.newMemberName}</li>
          <li><strong>Email:</strong> ${data.newMemberEmail}</li>
          <li><strong>Status:</strong> Active</li>
        </ul>
      </div>
      
      <p>They now have access to your organization's workspace and can start collaborating with the team.</p>
      <p>You can manage team members in your organization dashboard.</p>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/org/members" class="button">Manage Team</a>
      </div>
    `;

    const htmlContent = this.template.render(content);
    const textContent = this.template.stripHtml(content);

    try {
      const result = await this.mailerService.sendMail({
        to: data.adminEmail,
        subject: `${data.newMemberName} joined ${data.organizationName}`,
        html: htmlContent,
        text: textContent,
      });
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ Admin invitation acceptance notification sent to ${data.adminEmail} in ${duration}ms. MessageId: ${result.messageId}`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`❌ Failed to send admin notification to ${data.adminEmail} after ${duration}ms: ${error.message}`);
      throw error;
    }
  }
}