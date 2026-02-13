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

export interface BulkSmsItemResult {
  to: string;
  status: 'success' | 'error';
  data?: unknown;
  error?: string;
}

export interface BulkSmsResponse {
  status: 'success' | 'partial_success' | 'error';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  results: BulkSmsItemResult[];
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

  async sendBulkSms(
    recipients: string[],
    message: string,
    stopOnError = false,
  ): Promise<BulkSmsResponse> {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    const results: BulkSmsItemResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const to of recipients) {
      try {
        const response = await this.sendSms(to, message);
        results.push({
          to,
          status: 'success',
          data: response.data,
        });
        sentCount += 1;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown SMS error');
        results.push({
          to,
          status: 'error',
          error: err.message,
        });
        failedCount += 1;

        if (stopOnError) {
          break;
        }
      }
    }

    const status: BulkSmsResponse['status'] =
      failedCount === 0 ? 'success' : sentCount === 0 ? 'error' : 'partial_success';

    return {
      status,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      results,
    };
  }

  getProviderHealth() {
    return {
      provider: 'africastalking',
      configured: Boolean(this.username && this.apiKey),
      username: this.username,
    };
  }
}
