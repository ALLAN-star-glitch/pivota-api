import { Module } from '@nestjs/common';
import { NotificationActivityService } from './notification-activity.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRealtimeService } from './notifications-realtime.service';

@Module({
  providers: [NotificationActivityService, NotificationsRealtimeService],
  controllers: [NotificationsController],
  exports: [NotificationActivityService, NotificationsRealtimeService],
})
export class NotificationsModule {}
