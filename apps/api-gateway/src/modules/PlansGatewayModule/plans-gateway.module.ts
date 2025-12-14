import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PlansGatewayService } from './plans-gateway.service';
import { PlansGatewayController } from './plans-gateway.controller';
import { PLANS_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PLANS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.PLANS_SERVICE_URL || 'localhost:50059',
          package: 'plans',
          protoPath: PLANS_PROTO_PATH,
        },
      },
    ]),
  ],
  providers: [PlansGatewayService],
  controllers: [PlansGatewayController],
})
export class PlansGatewayModule {}
