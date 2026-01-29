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

  constructor() {
    this.mailjet = new Client({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    });
  }

  /* ======================================================
       EXISTING MAILJET LOGIC
  ====================================================== */

  /** ------------------ Send combined signup + subscription email ------------------ */
  /** ------------------ Send combined signup + subscription email ------------------ */
async sendUserWelcomeEmail(dto: UserOnboardedEventDto) {
  // 1. Extract a friendly first name from the full name
  const firstName = dto.firstName;
  
  // 2. Format the current time as the "Join Date"
  const createdAt = format(new Date(), 'PPpp');

  const body: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.email, Name: dto.firstName }],
        Subject: 'Welcome to Pivota!',
        TemplateID: 7638163,
        TemplateLanguage: true,
        Variables: {
          accountId: dto.accountId,      
          firstName: firstName,
          createdAt: createdAt,
          plan: dto.plan || 'Free Forever',
        },
      },
    ],
  };

  await this.sendEmail(body, dto.email);
}


/* ======================================================
     ORGANIZATION WELCOME EMAIL
====================================================== */
/** ------------------ Send Organization welcome email ------------------ */
async sendOrganizationWelcomeEmail(dto: OrganizationOnboardedEventDto) {
  const businessName = dto.name || 'Your Organization';
  const createdAt = format(new Date(), 'PPpp');
  
  const ADMIN_TEMPLATE_ID = 7587355; 
  const ORG_TEMPLATE_ID = 7641247;  

  // 1. Define common variables used in both templates
  const commonVariables = {
    orgName: businessName,
    orgEmail: dto.orgEmail,
    accountId: dto.accountId,
    adminFirstName: dto.adminFirstName,
    createdAt: createdAt,
    plan: dto.plan || 'Free Business Tier',
  };

  // 2. Build the messages array
  const messages: SendEmailV3_1.Message[] = [
    {
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: dto.adminEmail, Name: dto.adminFirstName }],
      Subject: `Welcome to Pivota, ${dto.adminFirstName}!`,
      TemplateID: ADMIN_TEMPLATE_ID,
      TemplateLanguage: true,
      Variables: commonVariables,
    },
  ];

  // 3. Add the second message only if orgEmail is different from adminEmail
  if (dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.adminEmail.toLowerCase()) {
    messages.push({
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: dto.orgEmail, Name: businessName }],
      Subject: `Official Registration Confirmed: ${businessName}`,
      TemplateID: ORG_TEMPLATE_ID,
      TemplateLanguage: true,
      Variables: commonVariables,
    });
  }

  const body: SendEmailV3_1.Body = { Messages: messages };

  this.logger.log(
    `📧 Dispatching ${messages.length} unique welcome emails for Org: ${businessName}`
  );
  
  await this.sendEmail(body, dto.adminEmail);
}

  /** ------------------ Send login notification email ------------------ */
async sendLoginEmail(dto: UserLoginEmailDto) {
  const timestamp = dto.timestamp
    ? format(new Date(dto.timestamp), 'PPpp')
    : format(new Date(), 'PPpp');

  // Replace these with your actual Mailjet Template IDs
  const INDIVIDUAL_LOGIN_TEMPLATE = 7641211; // Your individual template
  const ORG_ADMIN_LOGIN_TEMPLATE = 7641043;  // Sent to the person logging in
  const ORG_OFFICIAL_LOGIN_TEMPLATE = 7641196; // Sent to official business email

  const isOrgLogin = !!dto.organizationName;
  const messages: SendEmailV3_1.Message[] = [];

  // 1. PRIMARY MESSAGE: Always send to the user who logged in
  messages.push({
    From: {
      Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
      Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
    },
    To: [{ Email: dto.to, Name: dto.firstName }],
    Subject: dto.subject,
    TemplateID: isOrgLogin ? ORG_ADMIN_LOGIN_TEMPLATE : INDIVIDUAL_LOGIN_TEMPLATE,
    TemplateLanguage: true,
    Variables: {
      firstName: dto.firstName,
      organizationName: dto.organizationName || '',
      device: dto.device,
      os: dto.os,
      browser: dto.userAgent,
      ipAddress: dto.ipAddress,
      timestamp: timestamp,
    },
  });

  // 2. SECONDARY MESSAGE: Only for Orgs, send to official org email if it exists and is different
  if (isOrgLogin && dto.orgEmail && dto.orgEmail.toLowerCase() !== dto.to.toLowerCase()) {
    messages.push({
      From: {
        Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
      },
      To: [{ Email: dto.orgEmail, Name: dto.organizationName }],
      Subject: `Security Alert: Login to ${dto.organizationName}`,
      TemplateID: ORG_OFFICIAL_LOGIN_TEMPLATE,
      TemplateLanguage: true,
      Variables: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationName: dto.organizationName,
        device: dto.device,
        os: dto.os,
        browser: dto.userAgent,
        ipAddress: dto.ipAddress,
        timestamp: timestamp,
      },
    });
  }

  const body: SendEmailV3_1.Body = { Messages: messages };

  this.logger.log(
    `📧 Dispatching ${messages.length} login alert(s) for ${
      isOrgLogin ? 'Org: ' + dto.organizationName : 'Individual: ' + dto.to
    }`
  );

  // Send the body (can contain 1 or 2 messages)
  await this.sendEmail(body, dto.to);
}

  /** ------------------ Internal Mailjet sender ------------------ */
  /** ------------------ Internal Mailjet sender ------------------ */
  private async sendEmail(body: SendEmailV3_1.Body, recipient: string): Promise<void> {
    // We add error reporting to every message in the body
    if (body.Messages) {
      body.Messages = body.Messages.map(msg => ({
        ...msg,
        TemplateLanguage: true,
        //  This sends YOU an email if the template fails to render
        TemplateErrorReporting: {
          Email: 'allanmathenge67@gmail.com', // Replace with your dev email
          Name: 'Pivota Debugger',
        },
      }));
    }

    try {
      const result: LibraryResponse<SendEmailV3_1.Response> =
        await this.mailjet.post('send', { version: 'v3.1' }).request(body);

      const { Status } = result.body.Messages[0];
      this.logger.log(`📧 Email sent to ${recipient} with status: ${Status}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${recipient}: ${message}`);
    }
  }

  /* ======================================================
       NEW: OTP EMAIL LOGIC
  ====================================================== */

  /** ------------------ Send OTP Verification Code ------------------ */
  async sendOtpEmail(dto: SendOtpEventDto) {
    const OTP_TEMPLATE_ID = 7697471; // Replace with your actual Mailjet Template ID for OTPs
    
    // Customize subject based on purpose
    let subject = 'Your Verification Code';
    if (dto.purpose === 'SIGNUP') subject = 'Confirm your Pivota Registration';
    if (dto.purpose === 'PASSWORD_RESET') subject = 'Reset your Pivota Password';

    const body: SendEmailV3_1.Body = {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL || 'info@acop.co.ke',
            Name: process.env.MAILJET_SENDER_NAME || 'Pivota Connect',
          },
          To: [{ Email: dto.email }],
          Subject: subject,
          TemplateID: OTP_TEMPLATE_ID,
          TemplateLanguage: true,
          Variables: {
            otpCode: dto.code, // Make sure your Mailjet template uses {{var:otpCode}}
            purpose: dto.purpose.toLowerCase().replace('_', ' '),
            expiresIn: '10 minutes',
          },
        },
      ],
    };

    this.logger.log(`📧 Dispatching OTP code to: ${dto.email} for ${dto.purpose}`);
    await this.sendEmail(body, dto.email);
  }
  
}