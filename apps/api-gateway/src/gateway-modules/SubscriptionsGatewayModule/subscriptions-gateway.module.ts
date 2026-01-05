import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SubscriptionsGatewayService } from './subscriptions-gateway.service';
import { SubscriptionsGatewayController } from './subscriptions-gateway.controller';
import { SUBSCRIPTIONS_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SUBSCRIPTIONS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.SUBSCRIPTIONS_SERVICE_URL || 'localhost:50040',
          package: 'subscriptions',
          protoPath: SUBSCRIPTIONS_PROTO_PATH,
        },
      },
    ]),
  ],
  providers: [SubscriptionsGatewayService],
  controllers: [SubscriptionsGatewayController],
})
export class SubscriptionsGatewayModule {}