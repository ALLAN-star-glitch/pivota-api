import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AFRICASTALKING_SMS = 'AFRICASTALKING_SMS';

export interface AfricastalkingSMS {
  send(options: { to: string; message: string }): Promise<unknown>;
}

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

  private readonly defaultUsername: string;
  private readonly defaultApiKey: string;

  constructor(
    @Inject(AFRICASTALKING_SMS)
    private readonly smsClient: AfricastalkingSMS,
    private readonly configService: ConfigService,
  ) {
    this.defaultUsername =
      this.configService.get<string>('AT_USERNAME') ||
      process.env.AT_USERNAME ||
      '';

    this.defaultApiKey =
      this.configService.get<string>('AT_API_KEY') ||
      process.env.AT_API_KEY ||
      '';

    if (!this.defaultUsername || !this.defaultApiKey) {
      this.logger.error(
        'Africa’s Talking credentials missing in env. Provide AT_USERNAME & AT_API_KEY',
      );
    } else {
      this.logger.log(`Africa’s Talking ready for user: ${this.defaultUsername}`);
    }
  }

  /**
   * Resolve credentials
   * Priority:
   * 1️⃣ client token (multi-tenant / per-request auth)
   * 2️⃣ env token fallback
   */
  private resolveCredentials(clientToken?: string) {
    const apiKey = clientToken || this.defaultApiKey;

    if (!apiKey) {
      throw new BadRequestException(
        'SMS provider API key missing. Provide token or configure env.',
      );
    }

    return {
      username: this.defaultUsername,
      apiKey,
    };
  }

  /**
   * Send single SMS
   */
  async sendSms(
    to: string,
    message: string,
    clientToken?: string,
  ): Promise<SmsResponse> {
    // Validate phone
    if (!/^\+\d{10,15}$/.test(to)) {
      throw new BadRequestException(
        `Phone number "${to}" must be in E.164 format, e.g., +254700000000`,
      );
    }

    // Validate message
    if (!message || message.length > 160) {
      throw new BadRequestException(
        `Message must be <= 160 chars. Length: ${message?.length || 0}`,
      );
    }


    try {
      /**
       * NOTE:
       * Africa's Talking SDK uses global config.
       * If you later need per-tenant SDK instances,
       * we can dynamically create SDK clients here.
       */

      const response = await this.smsClient.send({ to, message });

      this.logger.log(
        `SMS sent to ${to} using ${clientToken ? 'client token' : 'env token'}`,
      );

      return {
        status: 'success',
        to,
        message,
        data: response,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown SMS error');

      this.logger.error(`SMS failed for ${to}: ${err.message}`);

      throw new Error(`SMS sending failed: ${err.message}`);
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSms(
    recipients: string[],
    message: string,
    stopOnError = false,
    clientToken?: string,
  ): Promise<BulkSmsResponse> {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    const results: BulkSmsItemResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const to of recipients) {
      try {
        const response = await this.sendSms(to, message, clientToken);

        results.push({
          to,
          status: 'success',
          data: response.data,
        });

        sentCount++;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown SMS error');

        results.push({
          to,
          status: 'error',
          error: err.message,
        });

        failedCount++;

        if (stopOnError) break;
      }
    }

    const status: BulkSmsResponse['status'] =
      failedCount === 0
        ? 'success'
        : sentCount === 0
        ? 'error'
        : 'partial_success';

    return {
      status,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Provider health
   */
  getProviderHealth() {
    return {
      provider: 'africastalking',
      configured: Boolean(this.defaultApiKey),
      username: this.defaultUsername,
      mode: this.defaultApiKey ? 'env-configured' : 'token-required',
    };
  }
}
