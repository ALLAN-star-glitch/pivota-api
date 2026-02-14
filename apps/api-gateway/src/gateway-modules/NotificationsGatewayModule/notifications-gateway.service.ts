import { Injectable, Logger } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

/**
 * -------------------- Single SMS --------------------
 * Example request body:
 * {
 *   "to": "+254700000000",
 *   "message": "Your OTP code is 1234",
 *   "senderId": "PIVOTA",
 *   "category": "transactional",
 *   "priority": "high",
 *   "scheduledAt": "2026-02-14T12:00:00Z",
 *   "language": "en",
 *   "requestDeliveryReport": true,
 *   "metadata": { "transactionId": "abc123" }
 * }
 */
export class SendNotificationSmsDto {
  @IsString()
  @IsNotEmpty({ message: 'Recipient phone number is required' })
  @Matches(/^\+\d{10,15}$/, { message: 'Phone number must be in E.164 format, e.g., +254700000000' })
  to: string;

  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(160, { message: 'Message cannot exceed 160 characters' })
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'SenderId cannot exceed 11 characters' })
  senderId?: string;

  @IsOptional()
  @IsString()
  receiverId?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'], { message: 'Category must be one of system, transactional, or marketing' })
  category?: 'system' | 'transactional' | 'marketing' = 'transactional';

  @IsOptional()
  @IsIn(['low', 'normal', 'high'], { message: 'Priority must be one of low, normal, or high' })
  priority?: 'low' | 'normal' | 'high' = 'normal';

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid ISO date' })
  scheduledAt?: Date;

  @IsOptional()
  @IsString({ message: 'Language must be a string, e.g., "en"' })
  language?: string = 'en';

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? Boolean(value) : true)
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport?: boolean = true;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * -------------------- Bulk SMS --------------------
 * Example request body:
 * {
 *   "recipients": ["+254700000000", "+254711111111"],
 *   "message": "Hello everyone!",
 *   "senderId": "PIVOTA",
 *   "category": "marketing",
 *   "priority": "normal",
 *   "scheduledAt": "2026-02-14T15:00:00Z",
 *   "language": "en",
 *   "requestDeliveryReport": true,
 *   "stopOnError": false,
 *   "metadata": { "campaignId": "camp123" }
 * }
 */
export class SendNotificationBulkSmsDto {
  @IsArray({ message: 'Recipients must be an array of phone numbers' })
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsString({ each: true, message: 'Each recipient must be a string in E.164 format' })
  @Matches(/^\+\d{10,15}$/, { each: true, message: 'Each recipient must be in E.164 format, e.g., +254700000000' })
  recipients: string[];

  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(160, { message: 'Message cannot exceed 160 characters' })
  message: string;

  @IsOptional()
  @IsBoolean({ message: 'stopOnError must be a boolean' })
  stopOnError?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(11, { message: 'SenderId cannot exceed 11 characters' })
  senderId?: string;

  @IsOptional()
  @IsIn(['system', 'transactional', 'marketing'], { message: 'Category must be one of system, transactional, or marketing' })
  category?: 'system' | 'transactional' | 'marketing' = 'marketing';

  @IsOptional()
  @IsIn(['low', 'normal', 'high'], { message: 'Priority must be one of low, normal, or high' })
  priority?: 'low' | 'normal' | 'high' = 'normal';

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'scheduledAt must be a valid ISO date' })
  scheduledAt?: Date;

  @IsOptional()
  @IsString({ message: 'Language must be a string, e.g., "en"' })
  language?: string = 'en';

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? Boolean(value) : true)
  @IsBoolean({ message: 'requestDeliveryReport must be a boolean' })
  requestDeliveryReport?: boolean = true;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * -------------------- Notification Activity Query --------------------
 */
export class NotificationActivityQueryDto {
  @IsOptional()
  @IsIn(['sms', 'email'], { message: 'Channel must be either sms or email' })
  channel?: 'sms' | 'email';

  @IsOptional()
  @IsIn(['success', 'error'], { message: 'Status must be either success or error' })
  status?: 'success' | 'error';

  @IsOptional()
  @IsString({ message: 'Recipient must be a string' })
  recipient?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid ISO date' })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (isNaN(Number(value)) ? 50 : Number(value)))
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(200, { message: 'Limit cannot exceed 200' })
  limit?: number = 50;
}

/**
 * -------------------- SMS Activity Query --------------------
 */
export class SmsActivityQueryDto {
  @IsOptional()
  @IsIn(['success', 'error'], { message: 'Status must be either success or error' })
  status?: 'success' | 'error';

  @IsOptional()
  @IsString({ message: 'Recipient phone number must be a string' })
  to?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid ISO date' })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (isNaN(Number(value)) ? 50 : Number(value)))
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(200, { message: 'Limit cannot exceed 200' })
  limit?: number = 50;
}


/**
 * Base response type
 */
export interface BaseResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Notifications Gateway Service
 * Handles sending SMS (single & bulk), querying activities, health checks, and stats.
 */
@Injectable()
export class NotificationsGatewayService {
  private readonly logger = new Logger(NotificationsGatewayService.name);

  // ------------------- SINGLE SMS -------------------
  async sendSms(
    dto: SendNotificationSmsDto,
    clientInfo?: Record<string, unknown>,
  ): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Sending SMS to ${dto.to}`);
    this.logger.debug(`Client Info: ${JSON.stringify(clientInfo)}`);
    // TODO: Integrate real SMS provider here
    return {
      success: true,
      message: 'SMS sent successfully',
      data: { to: dto.to, message: dto.message, scheduledAt: dto.scheduledAt },
    };
  }

  // ------------------- BULK SMS -------------------
  async sendBulkSms(
    dto: SendNotificationBulkSmsDto,
    clientInfo?: Record<string, unknown>,
  ): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Sending bulk SMS to ${dto.recipients.length} recipients`);
    this.logger.debug(`Client Info: ${JSON.stringify(clientInfo)}`);
    // TODO: Integrate real bulk SMS provider here
    return {
      success: true,
      message: 'Bulk SMS sent successfully',
      data: {
        recipients: dto.recipients,
        message: dto.message,
        scheduledAt: dto.scheduledAt,
      },
    };
  }

  // ------------------- NOTIFICATION ACTIVITIES -------------------
  async getActivities(
    query: NotificationActivityQueryDto,
  ): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Fetching notification activities for channel: ${query.channel}`);
    // TODO: Fetch activity logs from DB or provider API
    return {
      success: true,
      message: 'Notification activities fetched successfully',
      data: {
        channel: query.channel || 'all',
        status: query.status || 'all',
        limit: query.limit,
        activities: [], // placeholder
      },
    };
  }

  async getSmsActivities(query: SmsActivityQueryDto): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Fetching SMS activities for recipient: ${query.to}`);
    // TODO: Fetch SMS activity logs from DB or provider API
    return {
      success: true,
      message: 'SMS activities fetched successfully',
      data: {
        recipient: query.to || 'all',
        status: query.status || 'all',
        limit: query.limit,
        activities: [], // placeholder
      },
    };
  }

  // ------------------- REALTIME / STATS -------------------
  async getSmsRealtime(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Fetching SMS realtime stats');
    return {
      success: true,
      message: 'Realtime SMS stats fetched successfully',
      data: {
        activeConnections: 5,
        pendingMessages: 12,
      },
    };
  }

  async getSmsHealth(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Fetching SMS provider health status');
    return {
      success: true,
      message: 'SMS provider is healthy',
      data: {
        provider: 'PIVOTA SMS',
        status: 'healthy',
      },
    };
  }

  async getStats(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Fetching overall notification stats');
    return {
      success: true,
      message: 'Notification stats fetched successfully',
      data: {
        totalSent: 1200,
        totalFailed: 5,
        channels: {
          sms: { sent: 1000, failed: 5 },
          email: { sent: 200, failed: 0 },
        },
      },
    };
  }

  async getStatus(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Fetching combined notification service status');
    return {
      success: true,
      message: 'Notification service status fetched successfully',
      data: {
        service: 'online',
        smsProvider: 'healthy',
        emailProvider: 'healthy',
      },
    };
  }

  async getWsInfo(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Fetching WebSocket usage info');
    return {
      success: true,
      message: 'WebSocket info fetched successfully',
      data: {
        totalClients: 10,
        channelsSubscribed: ['sms', 'email'],
      },
    };
  }

  // ------------------- EXTENDED FUNCTIONALITY -------------------

  /** Retry failed SMS messages */
  async retryFailedSms(): Promise<BaseResponse<unknown>> {
    this.logger.debug('Retrying failed SMS messages');
    // TODO: Implement retry logic
    return {
      success: true,
      message: 'Retry triggered for failed SMS messages',
      data: {},
    };
  }

  /** Get daily summary of SMS */
  async getDailySmsSummary(date?: Date): Promise<BaseResponse<unknown>> {
    const summaryDate = date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    this.logger.debug(`Fetching daily SMS summary for ${summaryDate}`);
    // TODO: Fetch summary from DB or provider
    return {
      success: true,
      message: `Daily SMS summary for ${summaryDate}`,
      data: {
        date: summaryDate,
        totalSent: 120,
        totalFailed: 2,
      },
    };
  }

  /** Cancel scheduled SMS by referenceId */
  async cancelScheduledSms(referenceId: string): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Cancelling scheduled SMS with referenceId: ${referenceId}`);
    // TODO: Implement cancel logic
    return {
      success: true,
      message: `Scheduled SMS with referenceId ${referenceId} cancelled successfully`,
      data: { referenceId },
    };
  }

  /** Send test notification (SMS or Email) */
  async sendTestNotification(channel: 'sms' | 'email', to: string): Promise<BaseResponse<unknown>> {
    this.logger.debug(`Sending test notification via ${channel} to ${to}`);
    // TODO: Implement real send logic
    return {
      success: true,
      message: `Test ${channel.toUpperCase()} sent successfully`,
      data: { channel, to },
    };
  }
}