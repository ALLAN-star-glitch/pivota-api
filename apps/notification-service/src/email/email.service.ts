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

  // PivotaConnect Brand Colors (Material Design 3)
  // Following the 60-30-10 rule:
  // Primary: 60% - African Sapphire
  // Secondary: 30% - Warm Terracotta  
  // Tertiary: 10% - Baobab Gold
  private readonly colors = {
    // Core Colors (Material Roles)
    primary: '#1B4B6C',      // African Sapphire - 60% of UI
    secondary: '#C95D3A',    // Warm Terracotta - 30% of UI
    tertiary: '#E6B422',     // Baobab Gold - 10% of UI
    
    // Supporting Colors
    error: '#BA2D2D',        // Sunset Red
    success: '#2E7D32',      // Forest Green
    warning: '#ED6C02',      // Harvest Amber
    info: '#0288D1',         // Ocean Blue
    neutral: '#5D6A75',      // Warm Gray
    neutralVariant: '#D9CFC1', // Soft Sand
    
    // Surface Colors
    surface: '#FFFFFF',
    background: '#F5F5F5',
    surfaceVariant: '#F9F7F3',
    
    // On Colors (Text on colored backgrounds)
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#1B4B6C',
    onError: '#FFFFFF',
    onSuccess: '#FFFFFF',
    onWarning: '#1B1B1B',
    onInfo: '#FFFFFF',
    onSurface: '#1B1B1B',
    onBackground: '#1B1B1B',
    
    // Text Colors
    textPrimary: '#1B1B1B',
    textSecondary: '#5D6A75',
    textHint: '#9CA3AF',
    
    // Border Colors
    borderLight: '#E5E7EB',
    borderMedium: '#D1D5DB',
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
            font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
            background-color: ${this.colors.background};
            -webkit-font-smoothing: antialiased;
          }
          
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${this.colors.surface};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          
          .email-header {
            background: linear-gradient(135deg, ${this.colors.primary}20 0%, ${this.colors.primary}08 50%, ${this.colors.primary}15 100%);
            padding: 32px 24px;
            text-align: center;
            border-bottom: 1px solid ${this.colors.borderLight};
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
            padding: 48px 32px;
            background: ${this.colors.surface};
          }
          
          h1 {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: ${this.colors.primary};
            margin: 0 0 16px 0;
            letter-spacing: -0.5px;
          }
          
          h2 {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 20px;
            font-weight: 600;
            color: ${this.colors.primary};
            margin: 24px 0 16px 0;
          }
          
          h3 {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 16px;
            font-weight: 500;
            color: ${this.colors.textSecondary};
            margin: 0 0 12px 0;
          }
          
          p {
            font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.6;
            color: ${this.colors.textPrimary};
            margin: 0 0 16px 0;
          }
          
          .role-badge {
            display: inline-block;
            background: ${this.colors.secondary}10;
            color: ${this.colors.secondary};
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 13px;
            font-weight: 500;
            font-family: 'Montserrat', sans-serif;
            margin: 8px 0;
            border: 1px solid ${this.colors.secondary}20;
          }
          
          .message-box {
            background: ${this.colors.neutralVariant}40;
            border-left: 4px solid ${this.colors.tertiary};
            padding: 16px 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .message-box p {
            margin: 0;
            font-style: italic;
          }
          
          .button {
            display: inline-block;
            background: ${this.colors.secondary};
            color: ${this.colors.onSecondary} !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            font-family: 'Montserrat', sans-serif;
            margin: 14px 0;
            transition: all 0.2s ease;
            border: none;
          }

          .button:hover {
            background: ${this.colors.secondary}E6;
            transform: translateY(-1px);
          }
          
          .button-secondary {
            background: ${this.colors.primary};
            color: ${this.colors.onPrimary} !important;
          }
          
          .button-tertiary {
            background: ${this.colors.tertiary};
            color: ${this.colors.onTertiary} !important;
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
            color: ${this.colors.onSecondary} !important;
            text-decoration: none;
          }
          
          .info-box {
            background: ${this.colors.neutralVariant}20;
            border: 1px solid ${this.colors.borderLight};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .info-box h3 {
            color: ${this.colors.primary};
            font-size: 16px;
            margin: 0 0 12px 0;
            font-weight: 600;
          }
          
          .info-box ul {
            margin: 0;
            padding-left: 20px;
            color: ${this.colors.textPrimary};
          }
          
          .info-box li {
            margin-bottom: 8px;
            font-family: 'Merriweather', serif;
            font-size: 14px;
          }
          
          .success-box {
            background: ${this.colors.success}10;
            border-left: 4px solid ${this.colors.success};
            padding: 16px 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .success-box p {
            color: ${this.colors.success};
            margin: 0;
          }
          
          .warning-box {
            background: ${this.colors.warning}10;
            border-left: 4px solid ${this.colors.warning};
            padding: 16px 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .warning-box p {
            color: ${this.colors.warning};
            margin: 0;
          }
          
          .info-badge {
            display: inline-block;
            background: ${this.colors.info}10;
            color: ${this.colors.info};
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 500;
            font-family: 'Montserrat', sans-serif;
            margin: 6px 0;
          }
          
          .viewing-card {
            background: ${this.colors.surfaceVariant};
            border: 1px solid ${this.colors.borderLight};
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          }
          
          .viewing-details {
            background: ${this.colors.surface};
            padding: 16px;
            border-radius: 8px;
            margin: 14px 0;
            border-left: 4px solid ${this.colors.primary};
          }
          
          .viewing-details p {
            margin: 6px 0;
          }
          
          .property-highlight {
            font-family: 'Montserrat', sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: ${this.colors.primary};
            margin: 0 0 8px 0;
          }
          
          .admin-badge {
            display: inline-block;
            background: ${this.colors.tertiary}20;
            color: ${this.colors.primary};
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 600;
            font-family: 'Montserrat', sans-serif;
            margin: 6px 0;
          }
          
          .security-alert {
            background: ${this.colors.error}10;
            border-left: 4px solid ${this.colors.error};
            padding: 16px 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .security-alert p {
            color: ${this.colors.error};
            margin: 0;
          }
          
          .device-details {
            background: ${this.colors.neutralVariant}20;
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 13px;
          }
          
          .device-details p {
            margin: 0 0 6px 0;
            color: ${this.colors.textSecondary};
          }
          
          .expiry-box {
            background: ${this.colors.warning}10;
            border: 1px solid ${this.colors.warning}30;
            padding: 14px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            color: ${this.colors.textSecondary};
            font-size: 13px;
          }
          
          .link-box {
            background: ${this.colors.neutralVariant}20;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 13px;
            word-break: break-all;
            border: 1px solid ${this.colors.borderLight};
            margin: 14px 0;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, ${this.colors.borderMedium}, transparent);
            margin: 32px 0;
          }
          
          .stats-grid {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin: 20px 0;
          }
          
          .stat-card {
            flex: 1;
            background: ${this.colors.surfaceVariant};
            padding: 16px;
            border-radius: 8px;
            text-align: center;
          }
          
          .stat-value {
            font-family: 'Montserrat', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: ${this.colors.primary};
          }
          
          .stat-label {
            font-family: 'Merriweather', serif;
            font-size: 12px;
            color: ${this.colors.textSecondary};
            margin-top: 4px;
          }
          
          .email-footer {
            padding: 32px 24px;
            background: ${this.colors.neutralVariant}20;
            text-align: center;
            border-top: 1px solid ${this.colors.borderLight};
          }
          
          .social-links {
            margin: 0 0 20px 0;
          }
          
          .social-link {
            display: inline-block;
            padding: 6px 12px;
            margin: 0 6px;
            color: ${this.colors.primary};
            text-decoration: none;
            font-size: 12px;
            font-family: 'Montserrat', sans-serif;
            border: 1px solid ${this.colors.borderLight};
            border-radius: 6px;
            transition: all 0.2s ease;
          }
          
          .social-link:hover {
            background: ${this.colors.primary}10;
            border-color: ${this.colors.primary};
          }
          
          .footer-links {
            margin: 16px 0;
          }
          
          .footer-links a {
            color: ${this.colors.textSecondary};
            text-decoration: none;
            margin: 0 10px;
            font-size: 12px;
            font-family: 'Montserrat', sans-serif;
          }
          
          .footer-links a:hover {
            color: ${this.colors.primary};
          }
          
          .copyright {
            font-size: 11px;
            color: ${this.colors.textHint};
            font-family: 'Merriweather', serif;
          }
          
          @media screen and (max-width: 600px) {
            .email-header { padding: 24px 20px; }
            .email-content { padding: 32px 20px; }
            .email-footer { padding: 24px 20px; }
            h1 { font-size: 24px; }
            .button { display: block; text-align: center; }
            .stats-grid { flex-direction: column; }
            .logo-image { max-width: 160px; }
          }
        </style>
      </head>
      <body style="background-color: ${this.colors.background}; padding: 16px;"> 
        <div class="email-wrapper">
          <div class="email-header">
            <div class="logo-container" style="text-align: center; width: 100%;">
              <img 
                src="https://pivotaconnect.com/logofinale.png" 
                alt="PivotaConnect" 
                style="max-width: 200px; height: auto; display: block; margin: 0 auto;"
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${dto.firstName},</p>
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
      
      <p style="font-size: 14px; color: ${this.colors.textSecondary};">
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Your organization <strong>${businessName}</strong> is now registered.</p>
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
      
      <p style="font-size: 14px; color: ${this.colors.textSecondary};">
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
        <p style="font-size: 18px; color: ${this.colors.primary};"><strong>${businessName}</strong> is now on PivotaConnect.</p>
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
    
    if (dto.device) {
      let deviceString = dto.device;
      if (dto.deviceType) {
        deviceString += ` (${dto.deviceType})`;
      }
      deviceInfo.push(`<p><strong>Device:</strong> ${deviceString}</p>`);
    }
    
    if (dto.os) {
      let osString = dto.os;
      if (dto.osVersion) {
        osString += ` ${dto.osVersion}`;
      }
      deviceInfo.push(`<p><strong>Operating System:</strong> ${osString}</p>`);
    }
    
    if (dto.browser) {
      let browserString = dto.browser;
      if (dto.browserVersion) {
        browserString += ` ${dto.browserVersion}`;
      }
      deviceInfo.push(`<p><strong>Browser:</strong> ${browserString}</p>`);
    }
    
    if (dto.ipAddress) {
      deviceInfo.push(`<p><strong>IP Address:</strong> ${dto.ipAddress}</p>`);
    }

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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${dto.firstName},</p>
      <p>A new login was detected on your ${isOrgLogin ? `organization <strong>${dto.organizationName}</strong>` : 'PivotaConnect'} account.</p>
      
      <div class="security-alert">
        <p>If this wasn't you, <strong>secure your account immediately</strong> by changing your password and reviewing active sessions.</p>
      </div>
      
      <div class="device-details">
        <h3 style="color: ${this.colors.primary}; margin-top: 0; margin-bottom: 15px;">Login Details</h3>
        ${deviceInfo.join('')}
        <p><strong>Time:</strong> ${loginTime}</p>
      </div>
      
      ${securityAdvice.length > 0 ? `
      <div class="warning-box">
        <h3 style="color: ${this.colors.warning}; margin-top: 0;">Security Recommendations</h3>
        ${securityAdvice.join('')}
      </div>
      ` : ''} 
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.social.website}/account/security" class="button">Review Security Settings</a>
      </div>
      
      <div style="margin-top: 20px; font-size: 12px; color: ${this.colors.textSecondary}; text-align: center;">
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

    if (isOrgLogin && dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.to.toLowerCase()) {
      const orgContent = `
        <h1>Organization Admin Login Alert</h1>
        <p style="font-size: 18px; color: ${this.colors.primary};">${dto.organizationName}</p>
        <p>An administrator (${dto.firstName} ${dto.lastName || ''}) has logged into your organization account.</p>
        
        <div class="device-details"> 
          <h3 style="color: ${this.colors.primary}; margin-top: 0; margin-bottom: 15px;">Login Details</h3>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Use this code to ${purposeText}</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <div style="font-size: 48px; font-weight: 600; color: ${this.colors.secondary}; letter-spacing: 4px; background: ${this.colors.secondary}10; padding: 24px; border-radius: 8px; display: inline-block; border: 1px solid ${this.colors.secondary}20;">
          ${dto.code}
        </div>
      </div>
      
      <p><strong>Valid for:</strong> 10 minutes</p>
      
      <div class="expiry-box">
        This code will expire in 10 minutes. Never share it with anyone.
      </div>
      
      <p style="font-size: 14px; color: ${this.colors.textSecondary};">If you didn't request this code, please ignore this email.</p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">A new user has joined PivotaConnect</p>
      
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
      <p style="font-size: 18px; color: ${this.colors.primary};">A new organization has joined PivotaConnect</p>
      
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
       VIEWING SCHEDULED EMAIL (Viewer - Self Booking)
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.firstName},</p>
      <p>Your property viewing has been scheduled successfully.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>Your notes:</strong> ${data.notes}</p>` : ''}
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
       VIEWING SCHEDULED EMAIL (Viewer - Admin Booking)
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
      
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.firstName},</p>
      <p>A property viewing has been scheduled on your behalf by our support team.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
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
       VIEWING REQUEST EMAIL (Property Owner - Self Booking)
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.ownerName},</p>
      <p>A viewing has been scheduled for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>Viewer notes:</strong> ${data.notes}</p>` : ''}
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
       VIEWING REQUEST EMAIL (Property Owner - Admin Booking)
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
      
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.ownerName},</p>
      <p>Our support team has scheduled a viewing for your property.</p>
      
      <div class="viewing-card">
        ${imageHtml}
        <div class="property-highlight">${data.houseTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Date & Time:</strong> ${data.viewingDate}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Viewer:</strong> ${viewerInfo}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Join <strong>${data.organizationName}</strong> on PivotaConnect</p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">You've been added to <strong>${data.organizationName}</strong></p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Welcome to ${data.organizationName}, ${data.firstName}</p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Your password has been successfully set.</p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.adminName},</p>
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
        Subject: `${data.newMemberName} joined ${data.organizationName}`,
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello,</p>
      <p>Your PivotaConnect account has been successfully linked with <strong>${data.provider}</strong>.</p>
      
      <div class="info-box">
        <h3>What this means</h3>
        <ul>
          <li>You can now log in using your ${data.provider} account</li>
          <li>Your account security has been enhanced with social authentication</li>
          <li>You can still use your email and password to log in</li>
        </ul>
      </div>
      
      <div class="info-box" style="border-left-color: ${this.colors.primary};">
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.firstName},</p>
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
      <h1>Payment Confirmed!</h1>
      <p style="font-size: 18px; color: ${this.colors.primary};">Congratulations ${data.firstName},</p>
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
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.firstName},</p>
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
      
      <p style="font-size: 14px; color: ${this.colors.textSecondary};">
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
     LISTING MILESTONE EMAIL (for internal teams)
  ====================================================== */
  async sendListingMilestoneEmail(
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
    const milestoneTime = format(new Date(data.timestamp), 'MMMM do, yyyy \'at\' h:mm a');

    const content = `
      <h1>Listing Milestone: ${data.milestone} Listings</h1>
      <p style="font-size: 18px; color: ${this.colors.primary};">${data.message}</p>
      
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
          <li><strong>Price:</strong> KES ${data.listingPrice.toLocaleString()}</li>
          <li><strong>Location:</strong> ${data.locationCity}</li>
        </ul>
      </div>
      
      <div class="info-box">
        <h3>Account Metrics</h3>
        <ul>
          <li><strong>Total Listings:</strong> ${data.milestone}</li>
          <li><strong>Total Value:</strong> KES ${data.totalValue.toLocaleString()}</li>
          <li><strong>Average Price:</strong> KES ${data.averagePrice.toLocaleString()}</li>
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

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.recipientEmail }],
        Subject: subject,
        HTMLPart: this.getBaseHtmlTemplate(content),
        TextPart: this.stripHtml(content),
      }],
    };

    await this.sendEmail(body, data.recipientEmail);
  }

  /* ======================================================
     LISTING CREATED EMAIL (to property owner/lister)
  ====================================================== */
  async sendListingCreatedEmail(data: {
    email: string;
    firstName: string;
    listingTitle: string;
    listingId: string;
    listingUrl: string;
    listingPrice: number;
    locationCity: string;
    listingType: string;
    status: string;
    imageUrl?: string;
  }): Promise<void> {
    const listingDate = format(new Date(), 'MMMM do, yyyy');
    
    const imageHtml = data.imageUrl ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${data.imageUrl}" alt="${data.listingTitle}" 
             style="max-width: 100%; height: auto; border-radius: 8px; max-height: 300px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      </div>
    ` : '';

    const content = `
      <h1>Listing Posted Successfully</h1>
      <p style="font-size: 18px; color: ${this.colors.primary};">Hello ${data.firstName},</p>
      <p>Your property listing has been successfully posted on PivotaConnect and is now live.</p>
      
      ${imageHtml}
      
      <div class="viewing-card">
        <div class="property-highlight">${data.listingTitle}</div>
        
        <div class="viewing-details">
          <p><strong>Location:</strong> ${data.locationCity}</p>
          <p><strong>Price:</strong> KES ${data.listingPrice.toLocaleString()}</p>
          <p><strong>Type:</strong> ${data.listingType}</p>
          <p><strong>Posted:</strong> ${listingDate}</p>
          <p><strong>Status:</strong> ${data.status}</p>
        </div>
      </div>
      
      <div class="info-box">
        <h3>What's Next</h3>
        <ul>
          <li><strong>Share your listing</strong> - Share the link on social media and with your network</li>
          <li><strong>Respond to inquiries</strong> - You will be notified when someone contacts you</li>
          <li><strong>Schedule viewings</strong> - Manage viewing requests from potential buyers and renters</li>
          <li><strong>Update your listing</strong> - You can edit details or add more photos at any time</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.listingUrl}" class="button" style="margin-right: 10px;">View Your Listing</a>
        <a href="${this.social.website}/my-listings" class="button">Manage Listings</a>
      </div>
      
      <div class="divider"></div>
      
      <div style="text-align: center;">
        <p style="font-size: 14px; color: ${this.colors.textSecondary};">
          <strong>Pro Tip:</strong> Listings with high-quality photos get three times more views. 
          <a href="${this.social.website}/help/listing-tips" style="color: ${this.colors.primary};">View our listing tips →</a>
        </p>
      </div>
      
      <div class="expiry-box">
        <p style="margin: 0; font-size: 12px;">Listing ID: ${data.listingId}</p>
      </div>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: data.email, Name: data.firstName }],
        Subject: `Your listing "${data.listingTitle}" is now live on PivotaConnect`,
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