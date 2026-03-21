
/**
 * Organization Email Service
 * 
 * Handles all organization-related email communications for the PivotaConnect platform.
 * 
 * Dependencies:
 * - EmailClientService: Core email transport layer
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

import { Injectable } from '@nestjs/common';
import { SendEmailV3_1 } from 'node-mailjet';
import { 
  OrganizationOnboardedEventDto 
} from '@pivota-api/dtos';
import { EmailClientService } from '../core/email-client.service';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class OrganizationEmailService {
  constructor(
    private readonly emailClient: EmailClientService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send welcome email to organization admin after registration
   */
  async sendOrganizationWelcome(dto: OrganizationOnboardedEventDto): Promise<void> {
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

    const adminBody: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.adminEmail, Name: dto.adminFirstName }],
        Subject: `Welcome to PivotaConnect, ${businessName}`,
        HTMLPart: this.template.render(adminContent),
        TextPart: this.template.stripHtml(adminContent),
      }],
    };

    await this.emailClient.sendEmail(adminBody, dto.adminEmail);

    // Also send to organization email if different from admin email
    if (dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.adminEmail.toLowerCase()) {
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

      const orgBody: SendEmailV3_1.Body = {
        Messages: [{
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
            Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
          },
          To: [{ Email: dto.orgEmail, Name: businessName }],
          Subject: `Official Registration: ${businessName}`,
          HTMLPart: this.template.render(orgContent),
          TextPart: this.template.stripHtml(orgContent),
        }],
      };

      await this.emailClient.sendEmail(orgBody, dto.orgEmail);
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email }],
        Subject: `Join ${data.organizationName} on PivotaConnect`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email }],
        Subject: `Added to ${data.organizationName} on PivotaConnect`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.adminEmail, Name: data.adminName }],
        Subject: `${data.newMemberName} joined ${data.organizationName}`,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.adminEmail);
  }
}