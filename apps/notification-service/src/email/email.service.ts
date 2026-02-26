import { Injectable, Logger } from '@nestjs/common';
import { Client, SendEmailV3_1, LibraryResponse } from 'node-mailjet';
import {  
  UserLoginEmailDto,
  UserOnboardedEventDto,
  OrganizationOnboardedEventDto,
  SendOtpEventDto, 
} from '@pivota-api/dtos';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mailjet: Client;

  // PivotaConnect Brand Colors
  private readonly colors = {
    teal: '#008080',
    tealLight: '#E6F3F3',
    tealDark: '#006666',
    goldenYellow: '#FFD700',
    goldenYellowLight: '#FFF9E6',
    grey: '#F5F5F5',
    greyDark: '#666666',
    red: '#DC3545',
    redLight: '#FFE6E8',
    white: '#FFFFFF',
    textDark: '#333333',
    textLight: '#666666',
  };

  // Social Media Handles
  private readonly social = {
    twitter: 'https://twitter.com/pivotaconnect',
    linkedin: 'https://linkedin.com/company/pivotaconnect',
    facebook: 'https://facebook.com/pivotaconnect',
    instagram: 'https://instagram.com/pivotaconnect',
    website: 'https://pivotaconnect.com',
  };

  constructor() {
    this.mailjet = new Client({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    });
  }

  /**
   * Generates the base HTML template with PivotaConnect branding
   */
  private getBaseHtmlTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PivotaConnect</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: ${this.colors.grey};
            -webkit-font-smoothing: antialiased;
          }
          
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${this.colors.white};
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }
          
          .email-header {
            background: linear-gradient(145deg, ${this.colors.teal} 0%, ${this.colors.tealDark} 100%);
            padding: 48px 32px;
            text-align: center;
          }
          
          .logo {
            font-size: 36px;
            font-weight: 600;
            color: ${this.colors.white};
            letter-spacing: -0.5px;
          }

          /* Force all button text to be white */
          .button, 
          .button:link, 
          .button:visited, 
          .button:hover, 
          .button:active,
          a.button,
          a.button:link,
          a.button:visited,
          a.button:hover,
          a.button:active {
            color: ${this.colors.white} !important;
            text-decoration: none;
          }
          
          .logo-accent {
            color: ${this.colors.goldenYellow};
            font-weight: 700;
          }
          
          .email-content {
            padding: 48px 32px;
            background: ${this.colors.white};
          }
          
          h1 {
            font-size: 28px;
            color: ${this.colors.teal};
            margin: 0 0 16px 0;
            font-weight: 600;
          }
          
          p {
            font-size: 16px;
            line-height: 1.6;
            color: ${this.colors.textDark};
            margin: 0 0 20px 0;
          }
          
          .role-badge {
            display: inline-block;
            background: linear-gradient(145deg, ${this.colors.tealLight}, ${this.colors.white});
            color: ${this.colors.tealDark};
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 500;
            margin: 8px 0;
            border: 1px solid ${this.colors.teal}20;
          }
          
          .message-box {
            background: linear-gradient(145deg, ${this.colors.goldenYellowLight}, ${this.colors.white});
            border-left: 4px solid ${this.colors.goldenYellow};
            padding: 20px;
            border-radius: 4px;
            margin: 24px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(145deg, ${this.colors.teal}, ${this.colors.tealDark});
            color: ${this.colors.white};
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 16px;
            margin: 16px 0;
            box-shadow: 0 2px 4px ${this.colors.teal}40;
          }
          
          .info-box {
            background: linear-gradient(145deg, ${this.colors.tealLight}, ${this.colors.white});
            border: 1px solid ${this.colors.teal}20;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
          }
          
          .info-box h3 {
            color: ${this.colors.teal};
            font-size: 18px;
            margin: 0 0 12px 0;
            font-weight: 600;
          }
          
          .info-box ul {
            margin: 0;
            padding-left: 20px;
            color: ${this.colors.textDark};
          }
          
          .info-box li {
            margin-bottom: 8px;
          }
          
          .security-alert {
            background: linear-gradient(145deg, ${this.colors.redLight}, ${this.colors.white});
            border: 1px solid ${this.colors.red}40;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
          }
          
          .security-alert p {
            color: ${this.colors.red};
            margin: 0;
          }
          
          .device-details {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 14px;
          }
          
          .device-details p {
            margin: 0 0 8px 0;
            color: ${this.colors.textLight};
          }
          
          .expiry-box {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            border: 1px solid ${this.colors.teal}20;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
            text-align: center;
            color: ${this.colors.textLight};
            font-size: 14px;
          }
          
          .link-box {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 14px;
            word-break: break-all;
            border: 1px solid ${this.colors.teal}20;
            margin: 16px 0;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, ${this.colors.teal}40, transparent);
            margin: 32px 0;
          }
          
          .email-footer {
            padding: 32px;
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            text-align: center;
            border-top: 1px solid ${this.colors.teal}20;
          }
          
          .social-links {
            margin: 0 0 20px 0;
          }
          
          .social-link {
            display: inline-block;
            padding: 6px 12px;
            margin: 0 6px;
            color: ${this.colors.teal};
            text-decoration: none;
            font-size: 13px;
            border: 1px solid ${this.colors.teal}30;
            border-radius: 6px;
          }
          
          .footer-links {
            margin: 16px 0;
          }
          
          .footer-links a {
            color: ${this.colors.teal};
            text-decoration: none;
            margin: 0 12px;
            font-size: 13px;
          }
          
          .copyright {
            font-size: 12px;
            color: ${this.colors.textLight};
          }
          
          @media screen and (max-width: 600px) {
            .email-header { padding: 32px 20px; }
            .email-content { padding: 32px 20px; }
            .email-footer { padding: 24px 20px; }
            h1 { font-size: 24px; }
            .button { display: block; text-align: center; }
          }
        </style>
      </head>
      <body style="background-color: ${this.colors.grey}; padding: 20px;">
        <div class="email-wrapper">
          <div class="email-header">
            <div class="logo">Pivota<span class="logo-accent">Connect</span></div>
          </div>
          <div class="email-content">${content}</div>
          <div class="email-footer">
            <div class="social-links">
              <a href="${this.social.twitter}" class="social-link">Twitter</a>
              <a href="${this.social.linkedin}" class="social-link">LinkedIn</a>
              <a href="${this.social.facebook}" class="social-link">Facebook</a>
              <a href="${this.social.website}" class="social-link">Website</a>
            </div>
            <div class="footer-links">
              <a href="${this.social.website}/about">About</a>
              <a href="${this.social.website}/help">Help</a>
              <a href="${this.social.website}/terms">Terms</a>
              <a href="${this.social.website}/privacy">Privacy</a>
            </div>
            <div class="copyright">
              © ${new Date().getFullYear()} PivotaConnect
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /* ======================================================
       USER WELCOME EMAIL
  ====================================================== */
  async sendUserWelcomeEmail(dto: UserOnboardedEventDto): Promise<void> {
    const joinDate = format(new Date(), 'MMMM do, yyyy');

    const content = `
      <h1>Welcome to PivotaConnect</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${dto.firstName},</p>
      <p>We're delighted to have you join our community. Your journey to discovering new opportunities begins now.</p>
      
      <div class="info-box">
        <h3>Getting Started</h3>
        <ul>
          <li>Complete your profile to stand out</li>
          <li>Browse opportunities across Africa</li>
          <li>Connect with trusted service providers</li>
          <li>Save interesting opportunities</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.colors.textLight};">
        Account ID: ${dto.accountId}<br>
        Plan: ${dto.plan || 'Free Forever'}<br>
        Member since: ${joinDate}
      </p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.email, Name: dto.firstName }],
        Subject: `Welcome to PivotaConnect, ${dto.firstName}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, dto.email);
  }

  /* ======================================================
       ORGANIZATION WELCOME EMAIL
  ====================================================== */
  async sendOrganizationWelcomeEmail(dto: OrganizationOnboardedEventDto): Promise<void> {
    const joinDate = format(new Date(), 'MMMM do, yyyy');
    const businessName = dto.name || 'Your Organization';

    const adminContent = `
      <h1>Welcome, ${dto.adminFirstName}</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Your organization <strong>${businessName}</strong> is now registered.</p>
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
        <a href="${this.social.website}/org/dashboard" class="button">Open Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.colors.textLight};">
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
        HTMLPart: this.getBaseHtmlTemplate(adminContent),
        TextPart: this.stripHtml(adminContent),
      }],
    };

    await this.sendEmail(adminBody, dto.adminEmail);

    if (dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.adminEmail.toLowerCase()) {
      const orgContent = `
        <h1>Registration Confirmed</h1>
        <p style="font-size: 18px; color: ${this.colors.teal};"><strong>${businessName}</strong> is now on PivotaConnect.</p>
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
          HTMLPart: this.getBaseHtmlTemplate(orgContent),
          TextPart: this.stripHtml(orgContent),
        }],
      };

      await this.sendEmail(orgBody, dto.orgEmail);
    }
  }

  /* ======================================================
       LOGIN NOTIFICATION EMAIL
  ====================================================== */
  async sendLoginEmail(dto: UserLoginEmailDto): Promise<void> {
    const loginTime = dto.timestamp
      ? format(new Date(dto.timestamp), 'MMMM do, yyyy \'at\' h:mm a')
      : format(new Date(), 'MMMM do, yyyy \'at\' h:mm a');

    const isOrgLogin = !!dto.organizationName;

    const content = `
      <h1>${isOrgLogin ? 'Organization Login Alert' : 'New Login Detected'}</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${dto.firstName},</p>
      <p>A new login was detected on your ${isOrgLogin ? `organization <strong>${dto.organizationName}</strong>` : 'PivotaConnect'} account.</p>
      
      <div class="security-alert">
        <p>If this wasn't you, secure your account immediately.</p>
      </div>
      
      <div class="device-details">
        <p><strong>Device:</strong> ${dto.device || 'Unknown'}</p>
        <p><strong>OS:</strong> ${dto.os || 'Unknown'}</p>
        <p><strong>Browser:</strong> ${dto.userAgent || 'Unknown'}</p>
        <p><strong>IP Address:</strong> ${dto.ipAddress || 'Unknown'}</p>
        <p><strong>Time:</strong> ${loginTime}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/account/security" class="button" style="color: ${this.colors.white};">Review Security</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.to, Name: dto.firstName }],
        Subject: isOrgLogin ? `Login Alert - ${dto.organizationName}` : 'New Login Detected',
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, dto.to);

    if (isOrgLogin && dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.to.toLowerCase()) {
      const orgContent = `
        <h1>Admin Login Alert</h1>
        <p style="font-size: 18px; color: ${this.colors.teal};">${dto.organizationName}</p>
        <p>An administrator (${dto.firstName} ${dto.lastName || ''}) has logged into your organization account.</p>
        
        <div class="device-details">
          <p><strong>Device:</strong> ${dto.device || 'Unknown'}</p>
          <p><strong>IP Address:</strong> ${dto.ipAddress || 'Unknown'}</p>
          <p><strong>Time:</strong> ${loginTime}</p>
        </div>
        
        <div class="security-alert">
          <p>If you don't recognize this activity, please contact us.</p>
        </div>
      `;

      const orgBody: SendEmailV3_1.Body = {
        Messages: [{
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
            Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
          },
          To: [{ Email: dto.orgEmail, Name: dto.organizationName }],
          Subject: `Security Alert: Admin Login - ${dto.organizationName}`,
          HTMLPart: this.getBaseHtmlTemplate(orgContent),
          TextPart: this.stripHtml(orgContent),
        }],
      };

      await this.sendEmail(orgBody, dto.orgEmail);
    }
  }

  /* ======================================================
       OTP EMAIL
  ====================================================== */
  async sendOtpEmail(dto: SendOtpEventDto): Promise<void> {
    let subject = 'Your Verification Code';
    let purposeText = 'verify your action';
    
    if (dto.purpose === 'SIGNUP') {
      subject = 'Confirm Your Registration';
      purposeText = 'complete your registration';
    } else if (dto.purpose === 'PASSWORD_RESET') {
      subject = 'Reset Your Password';
      purposeText = 'reset your password';
    } else if (dto.purpose === '2FA') {
      subject = 'Two-Factor Authentication Code';
      purposeText = 'complete your login';
    }

    const content = `
      <h1>Verification Code</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Use this code to ${purposeText}</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <div style="font-size: 48px; font-weight: 600; color: ${this.colors.teal}; letter-spacing: 4px; background: ${this.colors.tealLight}; padding: 24px; border-radius: 8px; display: inline-block;">
          ${dto.code}
        </div>
      </div>
      
      <p><strong>Valid for:</strong> 10 minutes</p>
      
      <div class="expiry-box">
        This code will expire in 10 minutes. Never share it with anyone.
      </div>
      
      <p style="font-size: 14px; color: ${this.colors.textLight};">If you didn't request this code, please ignore this email.</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.email }],
        Subject: subject,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, dto.email);
  }

  /* ======================================================
       INVITATION EMAILS
  ====================================================== */

  async sendInvitationNewUserEmail(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteToken: string;
    message?: string;
    roleName: string;
  }): Promise<void> {
    const joinUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/accept-invite?token=${data.inviteToken}`;
    const expiresAt = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM do, yyyy');

    const content = `
      <h1>You're Invited</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Join <strong>${data.organizationName}</strong> on PivotaConnect</p>
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
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  async sendInvitationExistingUserEmail(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    inviteToken: string;
    message?: string;
    roleName: string;
  }): Promise<void> {
    const acceptUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/accept-invite?token=${data.inviteToken}`;
    const expiresAt = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'MMMM do, yyyy');

    const content = `
      <h1>Added to Organization</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">You've been added to <strong>${data.organizationName}</strong></p>
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
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  async sendPasswordSetupEmail(data: {
    email: string;
    firstName: string;
    setupToken: string;
    organizationName: string;
    expiresAt: string;
  }): Promise<void> {
    const setupUrl = `${process.env.FRONTEND_URL || 'https://pivotaconnect.com'}/setup-password?token=${data.setupToken}`;
    const expiresAtFormatted = format(new Date(data.expiresAt), 'MMMM do, yyyy');

    const content = `
      <h1>Set Up Your Password</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Welcome to ${data.organizationName}, ${data.firstName}</p>
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Set up your password for ${data.organizationName}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       UTILITIES
  ====================================================== */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /* ======================================================
       INTERNAL MAILJET SENDER
  ====================================================== */
  private async sendEmail(body: SendEmailV3_1.Body, recipient: string): Promise<void> {
    try {
      const result = await this.mailjet
        .post('send', { version: 'v3.1' })
        .request(body) as any; // Use type assertion to avoid TypeScript errors

      // Safely access the response
      if (result && result.body && result.body.Messages && result.body.Messages.length > 0) {
        const status = result.body.Messages[0].Status;
        this.logger.log(` Email sent to ${recipient} with status: ${status}`);
      } else {
        this.logger.log(` Email sent to ${recipient}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(` Failed to send email to ${recipient}: ${message}`);
      
      // Log more details for debugging
      if (err && typeof err === 'object') {
        if ('response' in err) {
          const responseErr = err as { response?: { data?: unknown } };
          this.logger.error(`Mailjet error details: ${JSON.stringify(responseErr.response?.data || {})}`);
        } else if ('statusCode' in err) {
          this.logger.error(`Mailjet status code: ${(err as { statusCode: number }).statusCode}`);
        }
      }
    }
  }
}