import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import Africastalking, { AfricastalkingInstance, SMSService } from 'africastalking';
import { BaseResponseDto, SessionDto } from '@pivota-api/dtos';
import { SendNotificationSmsDto } from './dto/send-notification-sms.dto';
import { SendNotificationBulkSmsDto } from './dto/send-notification-bulk-sms.dto';
import { NotificationActivityQueryDto } from './dto/notification-activity-query.dto';
import { SmsActivityQueryDto } from './dto/sms-activity-query.dto';
import * as jwt from 'jsonwebtoken';

type NotificationClientInfo = Pick<SessionDto, 'device' | 'ipAddress' | 'userAgent' | 'os'>;

// ------------------ Typed Interfaces ------------------
export interface Stats {
  total: number;
  sent: number;
  failed: number;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'unhealthy';
  lastChecked: Date;
}

export interface WebSocketInfo {
  connections: number;
  activeUsers: number;
}

// ------------------ Service ------------------
@Injectable()
export class NotificationsGatewayService {
  private readonly logger = new Logger(NotificationsGatewayService.name);
  private readonly httpClient: AxiosInstance;
  private readonly africasTalking: AfricastalkingInstance;
  private readonly smsService: SMSService;
  private readonly baseUrl: string;
  private readonly jwtSecret: string;
  private readonly port: number;

  constructor(private readonly configService: ConfigService) {
    // ------------------ Load Config Safely ------------------
    const baseUrl = this.configService.get<string>('NOTIFICATION_SERVICE_BASE_URL') ?? 'http://localhost:3015';
    const port = Number(this.configService.get<string>('NOTIFICATION_SERVICE_PORT') ?? '3015');
    const jwtSecret = this.configService.get<string>('NOTIFICATION_SERVICE_JWT_SECRET');
    const atApiKey = this.configService.get<string>('AT_API_KEY');
    const atUsername = this.configService.get<string>('AT_USERNAME');

    if (!jwtSecret) throw new Error('JWT_SECRET is required');
    if (!atApiKey || !atUsername) throw new Error("AFRICASTALKING config missing");

    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.port = port;
    this.jwtSecret = jwtSecret;

    // ------------------ Axios HTTP Client ------------------
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.jwtSecret}`,
        'Content-Type': 'application/json',
      },
    });

    // ------------------ Africa's Talking Setup ------------------
    const AT = Africastalking({ apiKey: atApiKey, username: atUsername }) as AfricastalkingInstance;
    this.africasTalking = AT;
    this.smsService = AT.SMS;

    this.logger.log(`NotificationsGatewayService initialized at ${this.baseUrl}`);
  }

  // ------------------ SMS Operations ------------------

  async sendSms(dto: SendNotificationSmsDto, clientInfo?: NotificationClientInfo) {
    this.logger.debug(`Sending SMS to: ${dto.to}`);
    try {
      const response = await this.smsService.send({
        to: dto.to,
        message: dto.message,
        from: dto.senderId,
        enqueue: true,
      });
      return BaseResponseDto.ok(response, 'SMS sent successfully', 'OK');
    } catch (error: unknown) {
      this.logger.error(`Failed to send SMS to ${dto.to}`, error as Error);
      return this.request('post', '/sms/send', { data: dto, clientInfo });
    }
  }

  async sendBulkSms(dto: SendNotificationBulkSmsDto, clientInfo?: NotificationClientInfo) {
    this.logger.debug(`Sending bulk SMS to ${dto.recipients.length} recipients`);
    try {
      const response = await this.smsService.send({
        to: dto.recipients.join(','),
        message: dto.message,
        from: dto.senderId,
        enqueue: true,
      });
      return BaseResponseDto.ok(response, 'Bulk SMS sent successfully', 'OK');
    } catch (error: unknown) {
      this.logger.error('Failed bulk SMS', error as Error);
      return this.request('post', '/sms/send/bulk', { data: dto, clientInfo });
    }
  }

  // ------------------ Activity Queries ------------------
  async getActivities(query: NotificationActivityQueryDto) {
    const params = {
      status: query.status,
      recipient: query.recipient,
      startDate: query.startDate?.toString(),
      endDate: query.endDate?.toString(),
      limit: query.limit ?? 50,
    };
    return this.request<Stats>('get', '/notifications/activities', { params });
  }

  async getSmsActivities(query: SmsActivityQueryDto) {
    const params = {
      status: query.status,
      to: query.to,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
      limit: query.limit ?? 50,
    };
    return this.request<Stats>('get', '/sms/activities', { params });
  }

  // ------------------ Realtime & Health ------------------
  async getSmsRealtime() {
    return this.request<WebSocketInfo>('get', '/sms/realtime');
  }

  async getSmsHealth() {
    return this.request<ProviderHealth>('get', '/sms/health');
  }

  async getStats() {
    return this.request<Stats>('get', '/notifications/stats');
  }

  async getWsInfo() {
    return this.request<WebSocketInfo>('get', '/notifications/ws-info');
  }

  // ------------------ Combined Status ------------------
  async getStatus() {
    const [stats, providerHealth, websocket] = await Promise.all([
      this.getStats(),
      this.getSmsHealth(),
      this.getWsInfo(),
    ]);

    return BaseResponseDto.ok(
      {
        notificationServiceBaseUrl: this.baseUrl,
        stats: stats.data,
        providerHealth: providerHealth.data,
        websocket: websocket.data,
      },
      'Notification status fetched successfully',
      'FETCHED',
    );
  }

  // ------------------ Utilities ------------------
  getServiceUrl(): string {
    return `${this.baseUrl}:${this.port}`;
  }

  generateToken(payload: Record<string, unknown>, expiresIn = '3600s') {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  // ------------------ Private Helpers ------------------
  private async request<T>(
    method: 'get' | 'post',
    path: string,
    options?: { data?: unknown; params?: Record<string, unknown>; clientInfo?: NotificationClientInfo },
  ): Promise<BaseResponseDto<T>> {
    try {
      const response = await this.httpClient.request({
        method,
        url: path,
        data: options?.data,
        params: options?.params,
        headers: { ...this.buildHeaders(options?.clientInfo), Authorization: `Bearer ${this.jwtSecret}` },
      });
      this.logger.debug(`Request ${method.toUpperCase()} ${path} succeeded`);
      return BaseResponseDto.ok(response.data as T, 'Request successful', 'OK');
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText ?? 'Request failed';
      const errorPayload = axiosError.response?.data ?? axiosError.message;
      this.logger.error(`Request failed: ${method.toUpperCase()} ${path} -> ${status ?? 'NO_STATUS'} ${statusText}`);
      return BaseResponseDto.fail(
        `Notification service call failed: ${statusText}`,
        status ? `UPSTREAM_${status}` : 'UPSTREAM_ERROR',
        errorPayload,
      ) as BaseResponseDto<T>;
    }
  }

  private buildHeaders(clientInfo?: NotificationClientInfo): Record<string, string> {
    if (!clientInfo) return {};
    return {
      'x-device': clientInfo.device ?? 'unknown',
      'x-os': clientInfo.os ?? 'unknown',
      'x-forwarded-for': clientInfo.ipAddress ?? 'unknown',
      'user-agent': clientInfo.userAgent ?? 'api-gateway',
    };
  }
}
