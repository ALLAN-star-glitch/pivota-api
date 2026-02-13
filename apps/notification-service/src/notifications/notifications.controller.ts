import { Controller, Get, Query } from '@nestjs/common';
import { NotificationHistoryQueryDto } from './notification-history-query.dto';
import { NotificationActivityService } from './notification-activity.service';
import { NotificationsRealtimeService } from './notifications-realtime.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly activityService: NotificationActivityService,
    private readonly realtimeService: NotificationsRealtimeService,
  ) {}

  @Get('activities')
  getActivities(@Query() query: NotificationHistoryQueryDto) {
    const activities = this.activityService.list({
      channel: query.channel,
      status: query.status,
      recipient: query.recipient,
      limit: query.limit,
    });

    return {
      status: 'success',
      count: activities.length,
      realtime: this.realtimeService.getRealtimeStats(),
      data: activities,
    };
  }

  @Get('stats')
  getRealtimeStats() {
    return {
      status: 'success',
      data: this.realtimeService.getRealtimeStats(),
    };
  }

  @Get('ws-info')
  getWebsocketUsage() {
    return {
      status: 'success',
      data: {
        path: '/ws/notifications',
        events: ['notification.connected', 'notification.activity'],
      },
    };
  }
}
