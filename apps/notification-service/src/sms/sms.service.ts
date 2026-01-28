import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Africastalking from 'africastalking';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private sms: any;

  constructor(private readonly configService: ConfigService) {
    const username = this.configService.get<string>('AT_USERNAME');
    const apiKey = this.configService.get<string>('AT_API_KEY');

    if (!username || !apiKey) {
      this.logger.error('Africa’s Talking credentials are missing in .env');
      throw new Error('Africa’s Talking credentials are required');
    }

    const africastalking = Africastalking({ username, apiKey });
    this.sms = africastalking.SMS;
  }

  /**
   * Send SMS using Africa's Talking
   * @param to E.164 phone number, e.g. +254700000000
   * @param message SMS content (max 160 chars)
   */
  async sendSms(to: string, message: string): Promise<any> {
    // Basic validation
    if (!/^\+\d{10,15}$/.test(to)) {
      throw new BadRequestException('Phone number must be in E.164 format, e.g., +254700000000');
    }
    if (!message || message.length > 160) {
      throw new BadRequestException('Message is required and must be <= 160 characters');
    }

    try {
      const response = await this.sms.send({ to, message });
      this.logger.log(`SMS sent to ${to}: ${JSON.stringify(response)}`);
      return {
        status: 'success',
        to,
        message,
        data: response,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      // Optionally, you can implement retries here
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }
}
