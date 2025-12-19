import { Injectable, Logger } from '@nestjs/common';
import { Client, SendEmailV3_1, LibraryResponse } from 'node-mailjet';
import { UserSignupEmailDto, UserLoginEmailDto } from '@pivota-api/dtos';
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

    this.logger.debug(
      `Loaded Mailjet API Key: ${
        process.env.MAILJET_API_KEY ? ' Present' : ' Missing'
      }`,
    );
  }

  /** ------------------ Send combined signup + subscription email ------------------ */
  async sendWelcomeEmail(dto: UserSignupEmailDto) {
  const createdAt = dto.createdAt
    ? format(new Date(dto.createdAt), 'PPpp')
    : format(new Date(), 'PPpp');

  const body: SendEmailV3_1.Body = {
    Messages: [
      {
        From: {
          Email: process.env.MJ_SENDER_EMAIL || 'info@acop.co.ke',
          Name: process.env.MJ_SENDER_NAME || 'Pivota Connect',
        },
        To: [{ Email: dto.to, Name: dto.firstName }],

        Subject: dto.subject || 'Welcome to Pivota!',

        //  Use Mailjet template
        TemplateID: 7587355,
        TemplateLanguage: true,

        Variables: {
          firstName: dto.firstName,
          createdAt,
          planName: dto.planName || 'Free',
          status: dto.status || 'active',
          billingCycle: dto.billingCycle || 'monthly',
          expiresAt: dto.expiresAt || 'N/A',  
        },
      },
    ],
  };

  await this.sendEmail(body, dto.to);
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
          TextPart: `Hi ${dto.firstName}, login detected from ${dto.device} at ${timestamp}`,
          HTMLPart: `
            <h3>Hi ${dto.firstName},</h3>
            <p>We noticed a login to your account:</p>
            <ul>
              <li><b>Device:</b> ${dto.device}</li>
              <li><b>Operating System:</b> ${dto.os}</li>
              <li><b>User Agent:</b> ${dto.userAgent}</li>
              <li><b>IP Address:</b> ${dto.ipAddress}</li>
              <li><b>Time:</b> ${timestamp}</li>
            </ul>
            <p>If this wasn’t you, please reset your password immediately.</p>
          `,
        },
      ],
    };

    await this.sendEmail(body, dto.to);
  }

  /** ------------------ Internal Mailjet sender ------------------ */
  private async sendEmail(
    body: SendEmailV3_1.Body,
    recipient: string,
  ): Promise<void> {
    try {
      const result: LibraryResponse<SendEmailV3_1.Response> =
        await this.mailjet.post('send', { version: 'v3.1' }).request(body);

      const { Status } = result.body.Messages[0];
      this.logger.log(`📧 Email sent to ${recipient} with status: ${Status}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error while sending email';
      this.logger.error(`Failed to send email to ${recipient}: ${message}`);
    }
  }
}
