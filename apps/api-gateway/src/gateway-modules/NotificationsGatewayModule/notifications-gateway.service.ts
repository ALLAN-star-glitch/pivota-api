import { Injectable, Logger } from '@nestjs/common'; // Removed Inject
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { BaseResponseDto, SessionDto } from '@pivota-api/dtos';
import { NotificationActivityQueryDto } from './dto/notification-activity-query.dto';
import { SendNotificationBulkSmsDto } from './dto/send-notification-bulk-sms.dto';
import { SendNotificationSmsDto } from './dto/send-notification-sms.dto';
import { SmsActivityQueryDto } from './dto/sms-activity-query.dto';

type NotificationClientInfo = Pick<
  SessionDto,
  'device' | 'ipAddress' | 'userAgent' | 'os'
>;

@Injectable()
export class NotificationsGatewayService {
  private readonly logger = new Logger(NotificationsGatewayService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Load base URL from env, fallback to localhost with port
    this.baseUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_BASE_URL') ??
      `http://localhost:${
        this.configService.get<string>('NOTIFICATION_SERVICE_PORT') ?? '3015'
      }`;
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');

    // Axios instance with JWT header from env
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.configService.get<string>(
          'NOTIFICATION_SERVICE_JWT_SECRET',
        )}`,
      },
    });
  }

  async sendSms(
    dto: SendNotificationSmsDto,
    clientInfo?: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('post', '/sms/send', { data: dto, clientInfo });
  }

  async sendBulkSms(
    dto: SendNotificationBulkSmsDto,
    clientInfo?: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('post', '/sms/send/bulk', { data: dto, clientInfo });
  }

  async getActivities(
    query: NotificationActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/notifications/activities', { params: query });
  }

  async getSmsActivities(
    query: SmsActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/sms/activities', { params: query });
  }

  async getSmsRealtime(): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/sms/realtime');
  }

  async getSmsHealth(): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/sms/health');
  }

  async getStats(): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/notifications/stats');
  }

  async getStatus(): Promise<BaseResponseDto<unknown>> {
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

  async getWsInfo(): Promise<BaseResponseDto<unknown>> {
    return this.request<unknown>('get', '/notifications/ws-info');
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    options?: {
      data?: unknown;
      params?: object;
      clientInfo?: NotificationClientInfo;
    },
  ): Promise<BaseResponseDto<T>> {
    try {
      const response = await this.httpClient.request({
        method,
        url: path,
        data: options?.data,
        params: options?.params,
        headers: this.buildHeaders(options?.clientInfo),
      });

      return BaseResponseDto.ok(response.data as T, 'Notification service request successful', 'OK');
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const statusText = axiosError.response?.statusText || 'Request failed';
      const errorPayload = axiosError.response?.data ?? axiosError.message;

      this.logger.error(
        `Notification request failed: ${method.toUpperCase()} ${path} -> ${status ?? 'NO_STATUS'} ${statusText}`,
      );

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
      'x-device': clientInfo.device || 'unknown',
      'x-os': clientInfo.os || 'unknown',
      'x-forwarded-for': clientInfo.ipAddress || 'unknown',
      'user-agent': clientInfo.userAgent || 'api-gateway',
    };
  }
}
