import { Injectable, Logger } from '@nestjs/common';
import { Client, SendEmailV3_1, LibraryResponse } from 'node-mailjet';
import {  
  UserLoginEmailDto,
  UserOnboardedEventDto,
  OrganizationOnboardedEventDto, 
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
          Email: process.env.MJ_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MJ_SENDER_NAME || 'Pivota Connect',
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
  const ORG_TEMPLATE_ID = 7640124;  

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
        Email: process.env.MJ_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MJ_SENDER_NAME || 'Pivota Connect',
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
        Email: process.env.MJ_SENDER_EMAIL || 'info@acop.co.ke',
        Name: process.env.MJ_SENDER_NAME || 'Pivota Connect',
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

    const body: SendEmailV3_1.Body = {
      Messages: [
        {
          From: {
            Email: process.env.MJ_SENDER_EMAIL || 'info@acop.co.ke',
            Name: process.env.MJ_SENDER_NAME || 'Pivota Connect',
          },
          To: [{ Email: dto.to, Name: dto.firstName }],
          Subject: dto.subject || 'New Login to Your Account',
          HTMLPart: `
            <h3>Hi ${dto.firstName},</h3>
            <p>We noticed a login to your account for device ${dto.device}.</p>
            <p>Time: ${timestamp}</p>
          `,
        },
      ],
    };

    await this.sendEmail(body, dto.to);
  }

  /** ------------------ Internal Mailjet sender ------------------ */
  private async sendEmail(body: SendEmailV3_1.Body, recipient: string): Promise<void> {
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
}