import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { BaseResponseDto, SessionDto } from '@pivota-api/dtos';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClientInfo } from '../../decorators/client-info.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { RolesGuard } from '../../guards/role.guard';
import { JwtAuthGuard } from '../AuthGatewayModule/jwt.guard';
import { NotificationActivityQueryDto } from './dto/notification-activity-query.dto';
import { SendNotificationBulkSmsDto } from './dto/send-notification-bulk-sms.dto';
import { SendNotificationSmsDto } from './dto/send-notification-sms.dto';
import { SmsActivityQueryDto } from './dto/sms-activity-query.dto';
import { NotificationsGatewayService } from './notifications-gateway.service';

type NotificationClientInfo = Pick<
  SessionDto,
  'device' | 'ipAddress' | 'userAgent' | 'os'
>;

@ApiTags('Notifications Module - ((Notification-Service) - API)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications-gateway')
export class NotificationsGatewayController {
  private readonly logger = new Logger(NotificationsGatewayController.name);

  constructor(
    private readonly notificationsGatewayService: NotificationsGatewayService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('sms/send')
  @ApiOperation({ summary: 'Send single SMS via notification service' })
  async sendSms(
    @Body() dto: SendNotificationSmsDto,
    @ClientInfo() clientInfo: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(`Notification SMS send request for ${dto.to}`);
    return this.notificationsGatewayService.sendSms(dto, clientInfo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SuperAdmin', 'SystemsAdmin')
  @Version('1')
  @Post('sms/send/bulk')
  @ApiOperation({ summary: 'Send bulk SMS via notification service' })
  async sendBulkSms(
    @Body() dto: SendNotificationBulkSmsDto,
    @ClientInfo() clientInfo: NotificationClientInfo,
  ): Promise<BaseResponseDto<unknown>> {
    this.logger.debug(
      `Notification bulk SMS send request for ${dto.recipients.length} recipients`,
    );
    return this.notificationsGatewayService.sendBulkSms(dto, clientInfo);
  }

  @Version('1')
  @Get('activities')
  @ApiOperation({ summary: 'Fetch notification activities across channels' })
  async getActivities(
    @Query() query: NotificationActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getActivities(query);
  }

  @Version('1')
  @Get('sms/activities')
  @ApiOperation({ summary: 'Fetch SMS activity history' })
  async getSmsActivities(
    @Query() query: SmsActivityQueryDto,
  ): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getSmsActivities(query);
  }

  @Version('1')
  @Get('sms/realtime')
  @ApiOperation({ summary: 'Fetch realtime SMS/WebSocket stats' })
  async getSmsRealtime(): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getSmsRealtime();
  }

  @Version('1')
  @Get('sms/health')
  @ApiOperation({ summary: 'Fetch SMS provider health' })
  async getSmsHealth(): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getSmsHealth();
  }

  @Version('1')
  @Get('stats')
  @ApiOperation({ summary: 'Fetch notification realtime stats' })
  async getStats(): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getStats();
  }

  @Version('1')
  @Get('status')
  @ApiOperation({ summary: 'Fetch notification service health and realtime status' })
  async getStatus(): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getStatus();
  }

  @Version('1')
  @Get('ws-info')
  @ApiOperation({ summary: 'Get WebSocket usage information for notifications stream' })
  async getWsInfo(): Promise<BaseResponseDto<unknown>> {
    return this.notificationsGatewayService.getWsInfo();
  }
}
