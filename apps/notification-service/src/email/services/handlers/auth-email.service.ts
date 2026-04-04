// apps/notification-service/src/email/services/auth-email.service.ts

/**
 * Auth Email Service
 * 
 * Handles all authentication-related email communications for the PivotaConnect platform.
 * 
 * Dependencies:
 * - EmailClientService: Core email transport layer
 * - EmailTemplateService: Template rendering and formatting utilities
 * 
 * @example
 * // Send welcome email to a new job seeker
 * await authEmailService.sendUserWelcome({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   accountId: 'ACC-12345',
 *   plan: 'Free Forever',
 *   profileType: 'JOB_SEEKER',
 *   profileData: {
 *     skills: ['JavaScript', 'React'],
 *     jobTypes: ['FULL_TIME'],
 *     expectedSalary: 150000
 *   }
 * });
 */

import { Injectable } from '@nestjs/common';
import { SendEmailV3_1 } from 'node-mailjet';
import { 
  UserOnboardedEventDto, 
  UserLoginEmailDto,
  SendOtpEventDto 
} from '@pivota-api/dtos';
import { EmailClientService } from '../core/email-client.service';
import { EmailTemplateService } from '../templates/email-template.service';

@Injectable()
export class AuthEmailService {
  constructor(
    private readonly emailClient: EmailClientService,
    private readonly template: EmailTemplateService,
  ) {}

  /**
   * Send welcome email to new user after signup with profile-specific content
   */
  async sendUserWelcome(dto: UserOnboardedEventDto): Promise<void> {
    const joinDate = this.template.formatDate(new Date());

    // Generate profile-specific content
    let profileSpecificContent = '';
    let nextStepsContent = '';

    switch (dto.profileType) {
      case 'JOB_SEEKER':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered as a Job Seeker!</strong></p>
            <p>We'll notify you when new jobs match your skills and preferences.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Job Preferences</h3>
              <ul>
                <li><strong>Skills:</strong> ${dto.profileData.skills?.join(', ') || 'Not specified'}</li>
                <li><strong>Job Types:</strong> ${dto.profileData.jobTypes?.join(', ') || 'Not specified'}</li>
                <li><strong>Expected Salary:</strong> ${dto.profileData.expectedSalary ? this.template.formatCurrency(dto.profileData.expectedSalary) : 'Not specified'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Complete your profile with your CV and portfolio</li>
            <li>Set up job alerts for your preferred roles</li>
            <li>Browse and apply to jobs that match your skills</li>
            <li>Connect with employers looking for talent like you</li>
          </ul>
        `;
        break;

      case 'SKILLED_PROFESSIONAL':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered as a Skilled Professional!</strong></p>
            <p>Your services are now visible to clients looking for your expertise.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Service Details</h3>
              <ul>
                <li><strong>Profession:</strong> ${dto.profileData.profession || 'Not specified'}</li>
                <li><strong>Specialties:</strong> ${dto.profileData.specialties?.join(', ') || 'Not specified'}</li>
                <li><strong>Service Areas:</strong> ${dto.profileData.serviceAreas?.join(', ') || 'Not specified'}</li>
                <li><strong>Years Experience:</strong> ${dto.profileData.yearsExperience || 'Not specified'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Add photos of your previous work to your portfolio</li>
            <li>Set your availability and rates</li>
            <li>Respond to service requests promptly</li>
            <li>Build your reputation with client reviews</li>
          </ul>
        `;
        break;

      case 'INTERMEDIARY_AGENT':
        profileSpecificContent = `
          <div class="success-box">
            <p>🤝 <strong>You're registered as an Agent!</strong></p>
            <p>Start connecting clients with opportunities and earning commissions.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Agency Details</h3>
              <ul>
                <li><strong>Agent Type:</strong> ${dto.profileData.agentType || 'Not specified'}</li>
                <li><strong>Specializations:</strong> ${dto.profileData.specializations?.join(', ') || 'Not specified'}</li>
                <li><strong>Service Areas:</strong> ${dto.profileData.serviceAreas?.join(', ') || 'Not specified'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Complete your agency profile with contact details</li>
            <li>List your services and commission structure</li>
            <li>Start connecting clients with properties or opportunities</li>
            <li>Build your network of property owners and seekers</li>
          </ul>
        `;
        break;

      case 'HOUSING_SEEKER':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered as a Housing Seeker!</strong></p>
            <p>We'll help you find your perfect home or rental property.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Housing Preferences</h3>
              <ul>
                <li><strong>Property Types:</strong> ${dto.profileData.preferredTypes?.join(', ') || 'Not specified'}</li>
                <li><strong>Preferred Cities:</strong> ${dto.profileData.preferredCities?.join(', ') || 'Not specified'}</li>
                <li><strong>Budget Range:</strong> ${dto.profileData.minBudget && dto.profileData.maxBudget ? `${this.template.formatCurrency(dto.profileData.minBudget)} - ${this.template.formatCurrency(dto.profileData.maxBudget)}` : 'Not specified'}</li>
                <li><strong>Bedrooms:</strong> ${dto.profileData.minBedrooms && dto.profileData.maxBedrooms ? `${dto.profileData.minBedrooms} - ${dto.profileData.maxBedrooms}` : 'Not specified'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Set up property alerts for your preferred areas</li>
            <li>Browse available properties that match your criteria</li>
            <li>Schedule viewings for properties you like</li>
            <li>Connect with landlords and agents</li>
          </ul>
        `;
        break;

      case 'SUPPORT_BENEFICIARY':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered for Support!</strong></p>
            <p>We're here to connect you with organizations that can help.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Support Needs</h3>
              <ul>
                <li><strong>Needs:</strong> ${dto.profileData.needs?.join(', ') || 'Not specified'}</li>
                <li><strong>Urgent Needs:</strong> ${dto.profileData.urgentNeeds?.join(', ') || 'None'}</li>
                <li><strong>Location:</strong> ${dto.profileData.city || 'Not specified'}</li>
                <li><strong>Family Size:</strong> ${dto.profileData.familySize || 'Not specified'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Your information will be shared with relevant support organizations</li>
            <li>You may be contacted by NGOs and social service providers</li>
            <li>Update your needs as they change</li>
            <li>Your privacy is protected - you control what information to share</li>
          </ul>
        `;
        break;

      case 'EMPLOYER':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered as an Employer!</strong></p>
            <p>Start posting jobs and finding the right talent for your business.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Business Details</h3>
              <ul>
                <li><strong>Business:</strong> ${dto.profileData.businessName || 'Not specified'}</li>
                <li><strong>Industry:</strong> ${dto.profileData.industry || 'Not specified'}</li>
                <li><strong>Company Size:</strong> ${dto.profileData.companySize || 'Not specified'}</li>
                <li><strong>Registered Business:</strong> ${dto.profileData.isRegistered ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>Post job openings to attract qualified candidates</li>
            <li>Review applications and schedule interviews</li>
            <li>Connect with recruitment agents for specialized hiring</li>
            <li>Build your employer brand on the platform</li>
          </ul>
        `;
        break;

      case 'PROPERTY_OWNER':
        profileSpecificContent = `
          <div class="success-box">
            <p><strong>You're registered as a Property Owner!</strong></p>
            <p>Start listing your properties and finding tenants or buyers.</p>
          </div>
          ${dto.profileData ? `
            <div class="info-box">
              <h3>Your Property Details</h3>
              <ul>
                <li><strong>Properties Owned:</strong> ${dto.profileData.propertyCount || 'Not specified'}</li>
                <li><strong>Property Types:</strong> ${dto.profileData.propertyTypes?.join(', ') || 'Not specified'}</li>
                <li><strong>Property Purpose:</strong> ${dto.profileData.propertyPurpose || 'Not specified'}</li>
                <li><strong>Professional:</strong> ${dto.profileData.isProfessional ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          ` : ''}
        `;
        nextStepsContent = `
          <ul>
            <li>List your properties with high-quality photos and details</li>
            <li>Respond to inquiries from potential tenants or buyers</li>
            <li>Schedule viewings at your convenience</li>
            <li>Work with agents to reach more potential clients</li>
          </ul>
        `;
        break;

      default:
        // No profile (JUST_EXPLORING)
        profileSpecificContent = `
          <div class="info-box">
            <p><strong>Welcome to PivotaConnect!</strong></p>
            <p>You're all set to explore opportunities across Africa. You can always add a profile later to get personalized recommendations.</p>
          </div>
        `;
        nextStepsContent = `
          <ul>
            <li>Browse jobs, properties, and services</li>
            <li>Save opportunities that interest you</li>
            <li>Complete your profile when you're ready</li>
            <li>Get the most out of PivotaConnect by adding your preferences</li>
          </ul>
        `;
        break;
    }

    const content = `
      <h1>Welcome to PivotaConnect</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${dto.firstName},</p>
      <p>We're delighted to have you join our community. Your journey to discovering new opportunities begins now.</p>
      
      ${profileSpecificContent}
      
      <div class="info-box">
        <h3>Next Steps</h3>
        ${nextStepsContent}
      </div>
      
      <div style="text-align: center;">
        <a href="${this.template.getSocial().website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
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
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, dto.email);
  }

  /**
   * Send login notification email with device info
   */
  async sendLoginAlert(dto: UserLoginEmailDto): Promise<void> {
    const loginTime = this.template.formatDateTime(dto.timestamp || new Date());
    const isOrgLogin = !!dto.organizationName;

    const deviceInfo = [];
    if (dto.device) {
      let deviceString = dto.device;
      if (dto.deviceType) deviceString += ` (${dto.deviceType})`;
      deviceInfo.push(`<p><strong>Device:</strong> ${deviceString}</p>`);
    }
    if (dto.os) {
      let osString = dto.os;
      if (dto.osVersion) osString += ` ${dto.osVersion}`;
      deviceInfo.push(`<p><strong>Operating System:</strong> ${osString}</p>`);
    }
    if (dto.browser) {
      let browserString = dto.browser;
      if (dto.browserVersion) browserString += ` ${dto.browserVersion}`;
      deviceInfo.push(`<p><strong>Browser:</strong> ${browserString}</p>`);
    }
    if (dto.ipAddress) deviceInfo.push(`<p><strong>IP Address:</strong> ${dto.ipAddress}</p>`);

    const content = `
      <h1>${isOrgLogin ? 'Organization Login Alert' : 'New Login Detected'}</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${dto.firstName},</p>
      <p>A new login was detected on your ${isOrgLogin ? `organization <strong>${dto.organizationName}</strong>` : 'PivotaConnect'} account.</p>
      
      <div class="security-alert">
        <p>If this wasn't you, <strong>secure your account immediately</strong> by changing your password and reviewing active sessions.</p>
      </div>
      
      <div class="device-details">
        <h3 style="color: ${this.template.getColors().primary}; margin-top: 0; margin-bottom: 15px;">Login Details</h3>
        ${deviceInfo.join('')}
        <p><strong>Time:</strong> ${loginTime}</p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${this.template.getSocial().website}/account/security" class="button">Review Security Settings</a>
      </div>
      
      <div style="margin-top: 20px; font-size: 12px; color: ${this.template.getColors().textSecondary}; text-align: center;">
        <p>This is an automated security notification from PivotaConnect.</p>
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
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, dto.to);

    // Also send to organization email if applicable
    if (isOrgLogin && dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.to.toLowerCase()) {
      const orgContent = `
        <h1>Organization Admin Login Alert</h1>
        <p style="font-size: 18px; color: ${this.template.getColors().primary};">${dto.organizationName}</p>
        <p>An administrator (${dto.firstName} ${dto.lastName || ''}) has logged into your organization account.</p>
        
        <div class="device-details"> 
          <h3 style="color: ${this.template.getColors().primary}; margin-top: 0; margin-bottom: 15px;">Login Details</h3>
          ${deviceInfo.join('')}
          <p><strong>Time:</strong> ${loginTime}</p>
        </div>
        
        <div class="security-alert">
          <p>If you don't recognize this activity, please contact our support team immediately.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${this.template.getSocial().website}/admin/security" class="button">Review Organization Security</a>
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
          HTMLPart: this.template.render(orgContent),
          TextPart: this.template.stripHtml(orgContent),
        }],
      };

      await this.emailClient.sendEmail(orgBody, dto.orgEmail);
    }
  }

  /**
   * Send OTP verification code email
   */
  async sendOtp(dto: SendOtpEventDto): Promise<void> {
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
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Use this code to ${purposeText}</p>
      
      <div style="text-align: center; margin: 40px 0;">
        <div style="font-size: 48px; font-weight: 600; color: ${this.template.getColors().secondary}; letter-spacing: 4px; background: ${this.template.getColors().secondary}10; padding: 24px; border-radius: 8px; display: inline-block; border: 1px solid ${this.template.getColors().secondary}20;">
          ${dto.code}
        </div>
      </div>
      
      <p><strong>Valid for:</strong> 10 minutes</p>
      
      <div class="expiry-box">
        This code will expire in 10 minutes. Never share it with anyone.
      </div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">If you didn't request this code, please ignore this email.</p>
    `;

    const body: SendEmailV3_1.Body = {
      Messages: [{
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.email }],
        Subject: subject,
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, dto.email);
  }

  /**
   * Send welcome email for Google signup users
   */
  async sendGoogleWelcome(data: { email: string; firstName: string; accountId: string }): Promise<void> {
    const joinDate = this.template.formatDate(new Date());

    const content = `
      <h1>Welcome to PivotaConnect via Google</h1>
      <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
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
        <a href="${this.template.getSocial().website}/dashboard" class="button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
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
        HTMLPart: this.template.render(content),
        TextPart: this.template.stripHtml(content),
      }],
    };

    await this.emailClient.sendEmail(body, data.email);
  }


/**
 * Send payment pending email for premium users
 */
async sendPaymentPendingEmail(data: {
  to: string;
  firstName: string;
  lastName: string;
  plan: string;
  profileType?: string;
  redirectUrl: string;
  merchantReference: string;
}): Promise<void> {
  const content = `
    <h1>Complete Your Payment</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
    <p>You've successfully created your ${data.plan} account! To activate your premium features, please complete your payment.</p>
    
    <div class="info-box">
      <h3>Your Plan Details</h3>
      <ul>
        <li><strong>Plan:</strong> ${data.plan}</li>
        <li><strong>Account Type:</strong> Premium</li>
        <li><strong>Reference:</strong> ${data.merchantReference}</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.redirectUrl}" class="button">Complete Payment Now</a>
    </div>
    
    <div class="security-alert">
      <p>Your account is created but <strong>premium features are locked</strong> until payment is confirmed. You have 24 hours to complete payment.</p>
    </div>
    
    <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">If you have any issues with payment, please contact our support team.</p>
  `;

  const body: SendEmailV3_1.Body = {
    Messages: [{
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: data.to, Name: data.firstName }],
      Subject: `Complete Your Payment - ${data.plan} Plan`,
      HTMLPart: this.template.render(content),
      TextPart: this.template.stripHtml(content),
    }],
  };

  await this.emailClient.sendEmail(body, data.to);
}

/**
 * Send payment failed email when payment service is unavailable
 */
async sendPaymentFailedEmail(data: {
  to: string;
  firstName: string;
  lastName: string;
  plan: string;
  profileType?: string;
  errorMessage: string;
}): Promise<void> {
  const content = `
    <h1>Payment Service Temporarily Unavailable</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
    <p>Your ${data.plan} account has been created, but we're currently experiencing issues with our payment service.</p>
    
    <div class="info-box">
      <h3>What This Means</h3>
      <ul>
        <li>Your account is created and saved</li>
        <li>Premium features are temporarily locked</li>
        <li>You can retry payment later from your dashboard</li>
      </ul>
    </div>
    
    <div class="security-alert">
      <p><strong>Next Steps:</strong> Please log in to your account and click "Complete Payment" when the payment system is back online.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.template.getSocial().website}/dashboard" class="button">Go to Dashboard</a>
    </div>
    
    <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">We apologize for the inconvenience. Our team has been notified and is working to resolve this issue.</p>
  `;

  const body: SendEmailV3_1.Body = {
    Messages: [{
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: data.to, Name: data.firstName }],
      Subject: `Payment Service Update - ${data.plan} Plan`,
      HTMLPart: this.template.render(content),
      TextPart: this.template.stripHtml(content),
    }],
  };

  await this.emailClient.sendEmail(body, data.to);
}

/**
 * Send payment success email after payment is confirmed
 */
async sendPaymentSuccessEmail(data: {
  to: string;
  firstName: string;
  lastName: string;
  plan: string;
  accountId: string;
}): Promise<void> {
  const content = `
    <h1>Payment Confirmed!</h1>
    <p style="font-size: 18px; color: ${this.template.getColors().primary};">Hello ${data.firstName},</p>
    <p>Thank you for your payment! Your ${data.plan} plan is now active.</p>
    
    <div class="success-box">
      <h3>Your Premium Features Are Now Available</h3>
      <ul>
        <li>Full access to all platform features</li>
        <li>Priority support</li>
        <li>Advanced analytics and insights</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.template.getSocial().website}/dashboard" class="button">Go to Dashboard</a>
    </div>
    
    <div class="divider"></div>
    
    <p style="font-size: 14px; color: ${this.template.getColors().textSecondary};">
      Account ID: ${data.accountId}<br>
      Plan: ${data.plan}<br>
      Activation Date: ${this.template.formatDate(new Date())}
    </p>
  `;

  const body: SendEmailV3_1.Body = {
    Messages: [{
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: data.to, Name: data.firstName }],
      Subject: `Payment Confirmed - ${data.plan} Plan Active`,
      HTMLPart: this.template.render(content),
      TextPart: this.template.stripHtml(content),
    }],
  };

  await this.emailClient.sendEmail(body, data.to);
}
}