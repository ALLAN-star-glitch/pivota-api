import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationActivityService } from '../notifications/notification-activity.service';
import { NotificationsRealtimeService } from '../notifications/notifications-realtime.service';
import { SendBulkSmsDto } from './send-bulk-sms.dto';
import { SendSmsDto } from './send-sms.dto';
import { SmsService, BulkSmsItemResult } from './sms.service';

@Controller('sms')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly activityService: NotificationActivityService,
    private readonly realtimeService: NotificationsRealtimeService,
  ) {}

  /** Send single SMS */
  @Post('send')
  async sendSms(@Body() sendSmsDto: SendSmsDto, @Req() req: Request) {
    const { to, message, senderId, metadata } = sendSmsDto;
    this.logger.log(`Sending SMS to: ${to}`);

    try {
      const result = await this.smsService.sendSms(to, message, senderId);

      const activity = this.activityService.record({
        channel: 'sms',
        status: 'success',
        source: 'sms.send',
        recipient: to,
        message,
        metadata: { ...this.extractClientMetadata(req), ...metadata },
        providerResponse: result.data,
      });
      this.realtimeService.publishActivity(activity);

      return {
        status: 'success',
        message: `SMS sent to ${to}`,
        activityId: activity.id,
        data: result,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMS failure';
      this.logger.error(`Failed to send SMS to ${to}: ${errorMessage}`);

      const activity = this.activityService.record({
        channel: 'sms',
        status: 'error',
        source: 'sms.send',
        recipient: to,
        message,
        metadata: { ...this.extractClientMetadata(req), ...metadata },
        error: errorMessage,
      });
      this.realtimeService.publishActivity(activity);

      return {
        status: 'error',
        message: `Failed to send SMS: ${errorMessage}`,
        activityId: activity.id,
      };
    }
  }

  /** Send bulk SMS */
  @Post('send/bulk')
  async sendBulkSms(@Body() sendBulkSmsDto: SendBulkSmsDto, @Req() req: Request) {
    const { recipients, message, stopOnError = false, senderId, metadata } = sendBulkSmsDto;
    this.logger.log(`Sending bulk SMS to ${recipients.length} recipients`);

    const result = await this.smsService.sendBulkSms(recipients, message, stopOnError, senderId);

    const activities = result.results.map((item: BulkSmsItemResult) => {
      const activity = this.activityService.record({
        channel: 'sms',
        status: item.status,
        source: 'sms.send.bulk',
        recipient: item.to,
        message,
        metadata: { ...this.extractClientMetadata(req), ...metadata },
        providerResponse: item.data,
        error: item.error,
      });
      this.realtimeService.publishActivity(activity);
      return activity;
    });

    return {
      status: result.status,
      message: `Bulk SMS processed for ${result.totalRecipients} recipients`,
      data: result,
      activityIds: activities.map((a) => a.id),
    };
  }

  /** List SMS activities */
  @Get('activities')
  getActivities(
    @Query('limit') limit?: string,
    @Query('status') status?: 'success' | 'error',
    @Query('to') to?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 50;
    const activities = this.activityService.list({
      channel: 'sms',
      status,
      recipient: to,
      limit: Number.isNaN(parsedLimit) ? 50 : parsedLimit,
    });

    return {
      status: 'success',
      count: activities.length,
      realtime: this.realtimeService.getRealtimeStats(),
      data: activities,
    };
  }

  /** Get real-time SMS statistics */
  @Get('realtime')
  getRealtimeStats() {
    return {
      status: 'success',
      data: this.realtimeService.getRealtimeStats(),
    };
  }

  /** Check SMS provider health */
  @Get('health')
  getSmsProviderHealth() {
    return {
      status: 'success',
      data: this.smsService.getProviderHealth(),
    };
  }

  /** Extract client metadata from request headers */
  private extractClientMetadata(req: Request): Record<string, unknown> {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      forwardedFor: req.headers['x-forwarded-for'] || null,
    };
  }
}
