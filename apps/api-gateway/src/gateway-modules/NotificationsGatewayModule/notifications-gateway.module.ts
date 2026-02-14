import { Module } from '@nestjs/common';
import { NotificationsGatewayController } from './notifications-gateway.controller';
import { NotificationsGatewayService } from './notifications-gateway.service';

@Module({
  controllers: [NotificationsGatewayController],
  providers: [NotificationsGatewayService],
  exports: [NotificationsGatewayService], // Export in case other modules need it
})
export class NotificationsGatewayModule {}
