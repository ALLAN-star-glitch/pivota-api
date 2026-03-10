import { Injectable, Logger } from '@nestjs/common';
import { Client, SendEmailV3_1 } from 'node-mailjet';
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
            background: linear-gradient(135deg, rgba(0, 128, 128, 0.08) 0%, rgba(0, 102, 102, 0.12) 50%, rgba(0, 77, 77, 0.08) 100%);
            padding: 24px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(0, 128, 128, 0.1);
          }
          
          .logo-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .logo-image {
            max-width: 200px;
            height: auto;
            display: inline-block;
          }
          
          .email-content {
            padding: 40px 28px;
            background: ${this.colors.white};
          }
          
          h1 {
            font-size: 26px;
            color: ${this.colors.teal};
            margin: 0 0 14px 0;
            font-weight: 600;
          }
          
          p {
            font-size: 16px;
            line-height: 1.5;
            color: ${this.colors.textDark};
            margin: 0 0 16px 0;
          }
          
          .role-badge {
            display: inline-block;
            background: linear-gradient(145deg, ${this.colors.tealLight}, ${this.colors.white});
            color: ${this.colors.tealDark};
            padding: 4px 14px;
            border-radius: 100px;
            font-size: 13px;
            font-weight: 500;
            margin: 6px 0;
            border: 1px solid ${this.colors.teal}20;
          }
          
          .message-box {
            background: linear-gradient(145deg, ${this.colors.goldenYellowLight}, ${this.colors.white});
            border-left: 4px solid ${this.colors.goldenYellow};
            padding: 16px;
            border-radius: 4px;
            margin: 20px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(145deg, ${this.colors.teal}, ${this.colors.tealDark});
            color: ${this.colors.white} !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 15px;
            margin: 14px 0;
            box-shadow: 0 2px 4px ${this.colors.teal}40;
          }

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
          
          .info-box {
            background: linear-gradient(145deg, ${this.colors.tealLight}, ${this.colors.white});
            border: 1px solid ${this.colors.teal}20;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .info-box h3 {
            color: ${this.colors.teal};
            font-size: 17px;
            margin: 0 0 10px 0;
            font-weight: 600;
          }
          
          .info-box ul {
            margin: 0;
            padding-left: 18px;
            color: ${this.colors.textDark};
          }
          
          .info-box li {
            margin-bottom: 6px;
          }
          
          .viewing-card {
            background: linear-gradient(145deg, ${this.colors.tealLight}, ${this.colors.white});
            border: 1px solid ${this.colors.teal}20;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .viewing-details {
            background: ${this.colors.white};
            padding: 14px;
            border-radius: 8px;
            margin: 14px 0;
            border-left: 4px solid ${this.colors.teal};
          }
          
          .viewing-details p {
            margin: 6px 0;
          }
          
          .property-highlight {
            font-size: 18px; 
            font-weight: 600;
            color: ${this.colors.teal};
            margin: 0 0 6px 0;
          }
          
          .admin-badge {
            display: inline-block;
            background: linear-gradient(145deg, ${this.colors.goldenYellow}, ${this.colors.goldenYellowLight});
            color: ${this.colors.tealDark};
            padding: 3px 10px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 600;
            margin: 6px 0;
          }
          
          .security-alert {
            background: linear-gradient(145deg, ${this.colors.redLight}, ${this.colors.white});
            border: 1px solid ${this.colors.red}40;
            padding: 14px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .security-alert p {
            color: ${this.colors.red};
            margin: 0;
          }
          
          .device-details {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            padding: 16px; 
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 13px;
          }
          
          .device-details p {
            margin: 0 0 6px 0;
            color: ${this.colors.textLight};
          }
          
          .expiry-box {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            border: 1px solid ${this.colors.teal}20;
            padding: 14px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            color: ${this.colors.textLight};
            font-size: 13px;
          }
          
          .link-box {
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            padding: 10px 14px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 13px;
            word-break: break-all;
            border: 1px solid ${this.colors.teal}20;
            margin: 14px 0;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, ${this.colors.teal}40, transparent);
            margin: 24px 0;
          }
          
          .email-footer {
            padding: 24px 20px;
            background: linear-gradient(145deg, ${this.colors.grey}, ${this.colors.white});
            text-align: center;
            border-top: 1px solid ${this.colors.teal}20;
          }
          
          .social-links {
            margin: 0 0 16px 0; 
          }
          
          .social-link {
            display: inline-block;
            padding: 4px 10px;
            margin: 0 4px;
            color: ${this.colors.teal};
            text-decoration: none;
            font-size: 12px;
            border: 1px solid ${this.colors.teal}30;
            border-radius: 6px;
          }
          
          .footer-links {
            margin: 12px 0;
          }
          
          .footer-links a {
            color: ${this.colors.teal};
            text-decoration: none;
            margin: 0 8px;
            font-size: 12px;
          }
          
          .copyright {
            font-size: 11px;
            color: ${this.colors.textLight};
          }
          
          @media screen and (max-width: 600px) {
            .email-header { padding: 18px 16px; }
            .email-content { padding: 28px 18px; }
            .email-footer { padding: 20px 16px; }
            h1 { font-size: 22px; }
            .button { display: block; text-align: center; }
            .logo-image { max-width: 160px; }
          }
        </style>
      </head>
      <body style="background-color: ${this.colors.grey}; padding: 16px;"> 
        <div class="email-wrapper">
          <div class="email-header">
            <div class="logo-container">
              <img 
                src="https://pivotaconnect.com/_next/image?url=%2Fpivotaconnectlogo.png&w=256&q=75" 
                alt="PivotaConnect" 
                class="logo-image"
              />
            </div>
          </div>
          <div class="email-content">${content}</div>
          <div class="email-footer">
            <div class="social-links">
              <a href="${this.social.twitter}" class="social-link">Twitter</a>
              <a href="${this.social.linkedin}" class="social-link">LinkedIn</a>
              <a href="${this.social.facebook}" class="social-link">Facebook</a>
              <a href="${this.social.instagram}" class="social-link">Instagram</a>
              <a href="${this.social.website}" class="social-link">Website</a>
            </div>
            <div class="footer-links">
              <a href="${this.social.website}/about">About</a>
              <a href="${this.social.website}/help">Help</a>
              <a href="${this.social.website}/terms">Terms</a>
              <a href="${this.social.website}/privacy">Privacy</a>
            </div>
            <div class="copyright">
              © ${new Date().getFullYear()} PivotaConnect. All rights reserved.
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

    // Build device info
    const deviceInfo = [];
    
    // Primary Device Info
    if (dto.device) {
      let deviceString = dto.device;
      if (dto.deviceType) {
        deviceString += ` (${dto.deviceType})`;
      }
      deviceInfo.push(`<p><strong>Device:</strong> ${deviceString}</p>`);
    }
    
    // Operating System
    if (dto.os) {
      let osString = dto.os;
      if (dto.osVersion) {
        osString += ` ${dto.osVersion}`;
      }
      deviceInfo.push(`<p><strong>Operating System:</strong> ${osString}</p>`);
    }
    
    // Browser
    if (dto.browser) {
      let browserString = dto.browser;
      if (dto.browserVersion) {
        browserString += ` ${dto.browserVersion}`;
      }
      deviceInfo.push(`<p><strong>Browser:</strong> ${browserString}</p>`);
    }
    
    // Network Info
    if (dto.ipAddress) {
      deviceInfo.push(`<p><strong>IP Address:</strong> ${dto.ipAddress}</p>`);
    }

    // Security advice based on login context
    const securityAdvice = [];
    
    if (dto.ipAddress === 'localhost' || dto.ipAddress === '127.0.0.1') {
      securityAdvice.push(`
        <p><strong>Development Environment:</strong> You're logged in from a local development environment. 
        This is normal for testing but ensure you're not exposing your credentials.</p>
      `);
    }
    
    if (dto.isBot) {
      securityAdvice.push(`
        <p><strong>Automated Access Detected:</strong> This login appears to be from an automated tool or API. 
        If this wasn't intentional, please secure your account immediately.</p>
      `);
    }
    
    if (dto.deviceType === 'MOBILE' && !dto.isMobile) {
      securityAdvice.push(`
        <p><strong>Mobile Best Practices:</strong> When using PivotaConnect on mobile, 
        ensure you have a secure lock screen and avoid using public Wi-Fi for sensitive transactions.</p>
      `);
    }
    
    if (dto.isDesktop && dto.browser === 'Chrome' && parseInt(dto.browserVersion) < 120) {
      securityAdvice.push(`
        <p><strong>Browser Update Recommended:</strong> You're using an older version of Chrome. 
        For the best security and experience, please update to the latest version.</p>
      `);
    } 

    const content = `
      <h1>${isOrgLogin ? 'Organization Login Alert' : 'New Login Detected'}</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${dto.firstName},</p>
      <p>A new login was detected on your ${isOrgLogin ? `organization <strong>${dto.organizationName}</strong>` : 'PivotaConnect'} account.</p>
      
      <div class="security-alert">
        <p>If this wasn't you, <strong>secure your account immediately</strong> by changing your password and reviewing active sessions.</p>
      </div>
      
      <div class="device-details">
        <h3 style="color: ${this.colors.teal}; margin-top: 0; margin-bottom: 15px;">📋 Login Details</h3>
        ${deviceInfo.join('')}
        <p><strong>Time:</strong> ${loginTime}</p>
      </div>
      
      ${securityAdvice.length > 0 ? `
      <div class="info-box" style="background: ${this.colors.goldenYellowLight}; border-left: 4px solid ${this.colors.goldenYellow};">
        <h3 style="color: ${this.colors.tealDark}; margin-top: 0;">Security Recommendations</h3>
        ${securityAdvice.join('')}
      </div>
      ` : ''} 
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.social.website}/account/security" class="button">Review Security Settings</a>
      </div>
      
      <div style="margin-top: 20px; font-size: 12px; color: ${this.colors.textLight}; text-align: center;">
        <p>This is an automated security notification from PivotaConnect. If you have questions, please contact our support team.</p>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.to, Name: dto.firstName }],
        Subject: isOrgLogin ? `Security Alert: Admin Login - ${dto.organizationName}` : 'New Login Detected',
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, dto.to);

    // Also send to organization email if applicable
    if (isOrgLogin && dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.to.toLowerCase()) {
      const orgContent = `
        <h1>Organization Admin Login Alert</h1>
        <p style="font-size: 18px; color: ${this.colors.teal};">${dto.organizationName}</p>
        <p>An administrator (${dto.firstName} ${dto.lastName || ''}) has logged into your organization account.</p>
        
        <div class="device-details"> 
          <h3 style="color: ${this.colors.teal}; margin-top: 0; margin-bottom: 15px;">Login Details</h3>
          ${deviceInfo.join('')}
          <p><strong>Time:</strong> ${loginTime}</p>
        </div>
        
        <div class="security-alert">
          <p>If you don't recognize this activity, please contact our support team immediately.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${this.social.website}/admin/security" class="button">Review Organization Security</a>
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
       ADMIN NOTIFICATION - NEW USER REGISTRATION
  ====================================================== */
  async sendAdminNewRegistrationEmail(data: {
    recipientEmail: string;
    userEmail: string;
    userName: string;
    accountType: string;
    registrationMethod?: string;
    registrationDate: string;
    userCount?: number;
    plan: string;
  }): Promise<void> {
    const regDate = format(new Date(data.registrationDate), 'MMMM do, yyyy \'at\' h:mm a');
    const method = data.registrationMethod || 'Email/Password';

    const content = `
      <h1>New User Registration</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">A new user has joined PivotaConnect</p>
      
      <div class="info-box">
        <h3>User Details</h3>
        <ul>
          <li><strong>Name:</strong> ${data.userName}</li>
          <li><strong>Email:</strong> ${data.userEmail}</li>
          <li><strong>Account Type:</strong> ${data.accountType}</li>
          <li><strong>Registration Method:</strong> ${method}</li>
          <li><strong>Plan:</strong> ${data.plan}</li>
          <li><strong>Date:</strong> ${regDate}</li>
          ${data.userCount ? `<li><strong>Total Users:</strong> ${data.userCount}</li>` : ''}
        </ul>
      </div>
      
      <p>Welcome them to the community! 🎉</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.recipientEmail }],
        Subject: `New User Registration: ${data.userName}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.recipientEmail);
  }

  /* ======================================================
       ADMIN NOTIFICATION - NEW ORGANIZATION REGISTRATION
  ====================================================== */
  async sendAdminNewOrganizationEmail(data: {
    recipientEmail: string;
    organizationName: string;
    adminName: string;
    adminEmail: string;
    organizationEmail: string;
    registrationDate: string;
    plan: string;
  }): Promise<void> {
    const regDate = format(new Date(data.registrationDate), 'MMMM do, yyyy \'at\' h:mm a');

    const content = `
      <h1>New Organization Registration</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">A new organization has joined PivotaConnect</p>
      
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
      
      <p>Welcome them to the platform! 🏢</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.recipientEmail }],
        Subject: `New Organization: ${data.organizationName}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.recipientEmail);
  }

  /* ======================================================
       VIEWING SCHEDULED EMAIL (Viewer - Self Booking) WITH IMAGE
  ====================================================== */
  async sendViewingScheduledViewerEmail(data: {
    email: string;
    firstName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    notes?: string;
  }): Promise<void> {
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Viewing Confirmed</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.firstName},</p>
      <p>Your property viewing has been scheduled successfully.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>📅 Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>📍 Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>📝 Your notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>What to expect</h3>
        <ul>
          <li>The property owner/agent has been notified</li>
          <li>They may contact you to confirm or ask questions</li>
          <li>Arrive on time for your appointment</li>
          <li>Bring any questions you have about the property</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/my-viewings" class="button">View My Schedule</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Viewing Confirmed: ${data.houseTitle}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       VIEWING SCHEDULED EMAIL (Viewer - Admin Booking) WITH IMAGE
  ====================================================== */
  async sendViewingScheduledAdminViewerEmail(data: {
    email: string;
    firstName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    notes?: string;
  }): Promise<void> {
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Viewing Scheduled by Support Team</h1>
      <div class="admin-badge">SCHEDULED BY ADMIN</div>
      
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.firstName},</p>
      <p>A property viewing has been scheduled on your behalf by our support team.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>📅 Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>📍 Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>📝 Notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>Next Steps</h3>
        <ul>
          <li>The property owner has been notified</li>
          <li>You'll receive any updates about this viewing</li>
          <li>Questions? Reply to this email or contact support</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/my-viewings" class="button">View Details</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Viewing Scheduled: ${data.houseTitle}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       VIEWING REQUEST EMAIL (Property Owner - Self Booking) WITH IMAGE
  ====================================================== */
  async sendViewingRequestedOwnerEmail(data: {
    email: string;
    ownerName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    viewerName: string;
    viewerEmail?: string;
    notes?: string;
  }): Promise<void> {
    const viewerInfo = data.viewerEmail 
      ? `${data.viewerName} (${data.viewerEmail})`
      : data.viewerName;
      
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';
      
    const content = `
      <h1>New Viewing Request</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.ownerName},</p>
      <p>A viewing has been scheduled for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>📅 Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>📍 Location:</strong> ${data.location}</p>
          <p><strong>👤 Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>📝 Viewer notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>What to do next</h3>
        <ul>
          <li>Prepare the property for viewing</li>
          <li>Be available at the scheduled time</li>
          <li>Consider contacting the viewer to confirm</li>
          <li>Have property documents ready to share</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/my-listings" class="button">Manage My Listings</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.ownerName }],
        Subject: `New Viewing Request: ${data.houseTitle}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       VIEWING REQUEST EMAIL (Property Owner - Admin Booking) WITH IMAGE
  ====================================================== */
  async sendViewingRequestedAdminOwnerEmail(data: {
    email: string;
    ownerName: string;
    houseTitle: string;
    houseImageUrl?: string;
    viewingDate: string;
    location: string;
    viewerName: string;
    viewerEmail?: string;
    notes?: string;
  }): Promise<void> {
    const viewerInfo = data.viewerEmail 
      ? `${data.viewerName} (${data.viewerEmail})`
      : data.viewerName;
      
    const imageHtml = data.houseImageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.houseImageUrl}" alt="${data.houseTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';
      
    const content = `
      <h1>Viewing Scheduled by Admin</h1>
      <div class="admin-badge">ADMIN SCHEDULED</div>
      
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.ownerName},</p>
      <p>Our support team has scheduled a viewing for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>📅 Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>📍 Location:</strong> ${data.location}</p>
          <p><strong>👤 Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>📝 Notes:</strong> ${data.notes}</p>` : ''}
        </div>
      </div>
      
      <div class="info-box">
        <h3>Information</h3>
        <ul>
          <li>This viewing was arranged by our support team</li>
          <li>Please accommodate the viewer at the scheduled time</li>
          <li>Contact support if you have questions</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/my-listings" class="button">View My Listings</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.ownerName }],
        Subject: `Admin Scheduled Viewing: ${data.houseTitle}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
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
       PASSWORD SETUP CONFIRMATION EMAIL
  ====================================================== */
  async sendPasswordSetupConfirmationEmail(data: {
    email: string;
    userUuid: string;
  }): Promise<void> {
    const content = `
      <h1>Password Setup Complete</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Your password has been successfully set.</p>
      <p>You can now log in to your account using your email and new password.</p>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/login" class="button">Log In Now</a>
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email }],
        Subject: 'Password Setup Complete',
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       ADMIN INVITATION ACCEPTED EMAIL
  ====================================================== */
  async sendAdminInvitationAcceptedEmail(data: {
    adminEmail: string;
    adminName: string;
    newMemberEmail: string;
    newMemberName: string;
    organizationName: string;
  }): Promise<void> {
    const content = `
      <h1>New Team Member Joined</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.adminName},</p>
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
        <a href="${this.social.website}/org/members" class="button">Manage Team</a>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.adminEmail, Name: data.adminName }],
        Subject: `🎉 ${data.newMemberName} joined ${data.organizationName}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.adminEmail);
  }

  /* ======================================================
       ACCOUNT LINKED EMAIL (Google to existing account)
  ====================================================== */
  async sendAccountLinkedEmail(data: {
    email: string;
    provider: string;
    timestamp: string;
  }): Promise<void> {
    const linkTime = format(new Date(data.timestamp), 'MMMM do, yyyy \'at\' h:mm a');

    const content = `
      <h1>Account Linked Successfully</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello,</p>
      <p>Your PivotaConnect account has been successfully linked with <strong>${data.provider}</strong>.</p>
      
      <div class="info-box">
        <h3>What this means</h3>
        <ul>
          <li>You can now log in using your ${data.provider} account</li>
          <li>Your account security has been enhanced with social authentication</li>
          <li>You can still use your email and password to log in</li>
        </ul>
      </div>
      
      <div class="security-alert" style="background: ${this.colors.tealLight}; border-color: ${this.colors.teal};">
        <p><strong>Time of linking:</strong> ${linkTime}</p>
        <p><strong>Provider:</strong> ${data.provider}</p>
      </div>
      
      <p>If you didn't authorize this linking, please contact support immediately.</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email }],
        Subject: `Account Linked with ${data.provider}`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       PAYMENT REQUIRED EMAIL
  ====================================================== */
  async sendPaymentRequiredEmail(data: {
    email: string;
    firstName: string;
    plan: string;
    redirectUrl: string;
  }): Promise<void> {
    const content = `
      <h1>Complete Your Subscription</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.firstName},</p>
      <p>Thank you for choosing PivotaConnect. To activate your ${data.plan} plan, please complete the payment process.</p>
      
      <div class="info-box">
        <h3>Plan Details</h3>
        <ul>
          <li><strong>Plan:</strong> ${data.plan}</li>
          <li><strong>Status:</strong> Awaiting Payment</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.redirectUrl}" class="button">Complete Payment</a>
      </div>
      
      <p>Your account has been created but is pending payment activation. Once payment is confirmed, you'll have full access to all features.</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Complete Payment for ${data.plan} Plan`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       PAYMENT CONFIRMATION EMAIL
  ====================================================== */
  async sendPaymentConfirmationEmail(data: {
    email: string;
    firstName: string;
    plan: string;
    accountId: string;
  }): Promise<void> {
    const content = `
      <h1>Payment Confirmed! 🎉</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Congratulations ${data.firstName},</p>
      <p>Your payment has been successfully processed. Your ${data.plan} plan is now active.</p>
      
      <div class="info-box">
        <h3>What's included in ${data.plan}</h3>
        <ul>
          <li>Access to all premium features</li>
          <li>Priority support</li>
          <li>Advanced analytics and insights</li>
          <li>Unlimited opportunities and listings</li>
        </ul>
      </div>
      
      <p><strong>Account ID:</strong> ${data.accountId}</p>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <p>Thank you for upgrading your PivotaConnect experience!</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Payment Confirmed: ${data.plan} Plan Activated`,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.email);
  }

  /* ======================================================
       GOOGLE WELCOME EMAIL
  ====================================================== */
  async sendGoogleWelcomeEmail(data: {
    email: string;
    firstName: string;
    accountId: string;
  }): Promise<void> {
    const joinDate = format(new Date(), 'MMMM do, yyyy');

    const content = `
      <h1>Welcome to PivotaConnect via Google</h1>
      <p style="font-size: 18px; color: ${this.colors.teal};">Hello ${data.firstName},</p>
      <p>You've successfully signed up using your Google account. Welcome to our community!</p>
      
      <div class="info-box">
        <h3>Getting Started</h3>
        <ul>
          <li>Complete your profile to stand out</li>
          <li>Browse opportunities across Africa</li>
          <li>Connect with trusted service providers</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${this.social.website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.colors.textLight};">
        Account ID: ${data.accountId}<br>
        Member since: ${joinDate}
      </p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Welcome to PivotaConnect, ${data.firstName}`,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .request(body) as any;

      if (result && result.body && result.body.Messages && result.body.Messages.length > 0) {
        const status = result.body.Messages[0].Status;
        this.logger.log(`📧 Email sent to ${recipient} with status: ${status}`);
      } else {
        this.logger.log(`📧 Email sent to ${recipient}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`❌ Failed to send email to ${recipient}: ${message}`);
      
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