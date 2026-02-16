import { Module } from '@nestjs/common';
import { SharedListingsGatewayService } from './shared-listings-gateway.service';
import { SharedListingsGatewayController } from './shared-listings-gateway.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_REGISTRY_PROTO_PATH } from '@pivota-api/protos';
import { SubscriptionsGatewayModule } from '../SubscriptionsGatewayModule/subscriptions-gateway.module';

@Module({
  imports: [
    SubscriptionsGatewayModule,
    ClientsModule.register([
      {
        name: 'LISTINGS_SERVICE',
        transport: Transport.GRPC, 
        options: {
          package: 'listings_registry',
          protoPath: LISTINGS_REGISTRY_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50058'
        },
      },
    ]),
  ],
  providers: [SharedListingsGatewayService],
  controllers: [SharedListingsGatewayController],
})
export class SharedListingsGatewayModule {}
