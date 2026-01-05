import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HousingGatewayService } from './housing-gateway.service';
import { HousingGatewayController } from './housing-gateway.controller';
import { LISTINGS_HOUSING_PROTO_PATH } from '@pivota-api/protos';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HOUSING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50060',
          package: 'housing',
          protoPath: LISTINGS_HOUSING_PROTO_PATH
        },
      },
    ]),
  ],
  providers: [HousingGatewayService],
  controllers: [HousingGatewayController],
})
export class HousingGatewayModule {}
