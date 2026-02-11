import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Type for the Africastalking SMS client
export interface AfricastalkingSMS {
  send(options: { to: string; message: string }): Promise<unknown>;
}

// Strongly typed response
export interface SmsResponse {
  status: string;
  to: string;
  message: string;
  data: unknown;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly username: string;
  private readonly apiKey: string;

  constructor(
    @Inject('AFRICASTALKING_SMS') private readonly sms: AfricastalkingSMS, // strongly typed
    private readonly configService: ConfigService,
  ) {
    // Load credentials from env or fallback
    this.username =
      this.configService.get<string>('AT_USERNAME') || process.env.AT_USERNAME || '';
    this.apiKey =
      this.configService.get<string>('AT_API_KEY') || process.env.AT_API_KEY || '';

    if (!this.username || !this.apiKey) {
      this.logger.error(
        '⚠️ Africa’s Talking credentials are missing! ' +
        'Please set AT_USERNAME and AT_API_KEY in your .env file or system environment.',
      );
      throw new Error('Africa’s Talking credentials are required');
    } else {
      this.logger.log(`Africa’s Talking credentials loaded for user: ${this.username}`);
    }
  }

  /**
   * Send SMS using Africa's Talking
   * @param to E.164 phone number, e.g., +254700000000
   * @param message SMS content (max 160 chars)
   */
  async sendSms(to: string, message: string): Promise<SmsResponse> {
    // Validate phone number
    if (!/^\+\d{10,15}$/.test(to)) {
      throw new BadRequestException(
        `Phone number "${to}" must be in E.164 format, e.g., +254700000000`,
      );
    }

    // Validate message
    if (!message || message.length > 160) {
      throw new BadRequestException(
        `Message is required and must be <= 160 characters. Current length: ${message?.length || 0}`,
      );
    }

    try {
      const response = await this.sms.send({ to, message });
      this.logger.log(`✅ SMS sent to ${to}: ${JSON.stringify(response)}`);
      return {
        status: 'success',
        to,
        message,
        data: response,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown SMS error');
      this.logger.error(`❌ Failed to send SMS to ${to}: ${err.message}`);
      throw new Error(`SMS sending failed: ${err.message}`);
    }
  }
}
