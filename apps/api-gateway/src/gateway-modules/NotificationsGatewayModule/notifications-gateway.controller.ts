import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
  Version,
  Param,
} from '@nestjs/common';
import { BaseResponseDto, SessionDto } from '@pivota-api/dtos';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientInfo } from '../../decorators/client-info.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { NotificationActivityQueryDto } from './dto/notification-activity-query.dto';
import { SmsActivityQueryDto } from './dto/sms-activity-query.dto';
import { SendNotificationBulkSmsDto } from './dto/send-notification-bulk-sms.dto';
import { SendNotificationSmsDto } from './dto/send-notification-sms.dto';
import { NotificationsGatewayService } from './notifications-gateway.service';

/** Pick only necessary client info for logging/tracking */
type NotificationClientInfo = Pick<
  SessionDto,
  'device' | 'ipAddress' | 'userAgent' | 'os'
>;

@ApiTags('Notifications Module - Notification Service API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications-gateway')
export class NotificationsGatewayController {
  private readonly logger = new Logger(NotificationsGatewayController.name);

  constructor(
    private readonly notificationsGatewayService: NotificationsGatewayService,
  ) {}

  // ------------------- HELPER -------------------
  /**
   * Safely convert any service response into a BaseResponseDto
   */
  private toBaseResponseDto<T>(serviceResponse: {
    success: boolean;
    message: string;
    data?: T;
  }): BaseResponseDto<T> {
    return {
      status: serviceResponse.success ? 'success' : 'error',
      code: serviceResponse.success ? '200' : '500',
      message: serviceResponse.message,
      data: serviceResponse.data,
    } as unknown as BaseResponseDto<T>;
  }

  // ------------------- SINGLE SMS -------------------
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('sms/send')
  @ApiOperation({ summary: 'Send a single SMS via notification service' })
  async sendSms(
    @Body() dto: SendNotificationSmsDto,
    @ClientInfo() clientInfo?: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(`Sending SMS to recipient: ${dto.to}`);
    const response = await this.notificationsGatewayService.sendSms(dto, clientInfo);
    return this.toBaseResponseDto(response);
  }

  // ------------------- BULK SMS -------------------
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('sms/send/bulk')
  @ApiOperation({ summary: 'Send bulk SMS via notification service' })
  async sendBulkSms(
    @Body() dto: SendNotificationBulkSmsDto,
    @ClientInfo() clientInfo?: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(`Sending bulk SMS to ${dto.recipients.length} recipients`);
    const response = await this.notificationsGatewayService.sendBulkSms(dto, clientInfo);
    return this.toBaseResponseDto(response);
  }

  // ------------------- NOTIFICATION ACTIVITIES -------------------
  @Version('1')
  @Get('activities')
  @ApiOperation({ summary: 'Fetch notification activities across all channels' })
  async getActivities(
    @Query() query: NotificationActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    // Map status to string if needed to satisfy service type
    const safeQuery = { ...query, status: String(query.status) } as unknown;
    const response = await this.notificationsGatewayService.getActivities(safeQuery);
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('sms/activities')
  @ApiOperation({ summary: 'Fetch SMS activity history' })
  async getSmsActivities(
    @Query() query: SmsActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    const safeQuery = { ...query, status: String(query.status) } as unknown;
    const response = await this.notificationsGatewayService.getSmsActivities(safeQuery);
    return this.toBaseResponseDto(response);
  }

  // ------------------- REALTIME / HEALTH / STATS -------------------
  @Version('1')
  @Get('sms/realtime')
  @ApiOperation({ summary: 'Fetch realtime SMS/WebSocket stats' })
  async getSmsRealtime(): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.getSmsRealtime();
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('sms/health')
  @ApiOperation({ summary: 'Fetch SMS provider health status' })
  async getSmsHealth(): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.getSmsHealth();
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('stats')
  @ApiOperation({ summary: 'Fetch notification realtime stats across channels' })
  async getStats(): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.getStats();
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('status')
  @ApiOperation({ summary: 'Fetch combined notification service health and status' })
  async getStatus(): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.getStatus();
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('ws-info')
  @ApiOperation({ summary: 'Get WebSocket usage info for notifications stream' })
  async getWsInfo(): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.getWsInfo();
    return this.toBaseResponseDto(response);
  }

  // ------------------- EXTENDED FUNCTIONALITY -------------------
  @Version('1')
  @Post('sms/retry-failed')
  @ApiOperation({ summary: 'Retry sending failed SMS messages' })
  async retryFailedSms(): Promise<BaseResponseDto<unknown>> {
    this.logger.debug('Retrying failed SMS messages');
    const response = await this.notificationsGatewayService.retryFailedSms();
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Get('sms/daily-summary')
  @ApiOperation({ summary: 'Get daily SMS summary' })
  async getDailySmsSummary(@Query('date') date?: string): Promise<BaseResponseDto<unknown>> {
    const summaryDate = date ? new Date(date) : undefined;
    const response = await this.notificationsGatewayService.getDailySmsSummary(summaryDate);
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Post('sms/cancel/:referenceId')
  @ApiOperation({ summary: 'Cancel a scheduled SMS by referenceId' })
  async cancelScheduledSms(@Param('referenceId') referenceId: string): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.cancelScheduledSms(referenceId);
    return this.toBaseResponseDto(response);
  }

  @Version('1')
  @Post('notification/test')
  @ApiOperation({ summary: 'Send a test notification (SMS or Email)' })
  async sendTestNotification(
    @Body('channel') channel: 'sms' | 'email',
    @Body('to') to: string,
  ): Promise<BaseResponseDto<unknown>> {
    const response = await this.notificationsGatewayService.sendTestNotification(channel, to);
    return this.toBaseResponseDto(response);
  }
}
