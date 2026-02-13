import { Module } from '@nestjs/common';
import { NotificationsGatewayController } from './notifications-gateway.controller';
import { NotificationsGatewayService } from './notifications-gateway.service';

@Module({
  providers: [NotificationsGatewayService],
  controllers: [NotificationsGatewayController],
})
export class NotificationsGatewayModule {}
