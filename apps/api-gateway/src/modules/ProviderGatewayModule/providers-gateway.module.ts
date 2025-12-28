import { Module } from '@nestjs/common';
import { ProvidersGatewayService } from './providers-gateway.service';
import { ProvidersGatewayController } from './providers-gateway.controller';
import { PROVIDERS_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
            name: 'PROVIDERS_PACKAGE',
            transport: Transport.GRPC,
            options: {
                url: process.env.LISTINGS_SERVICE_URL || 'localhost:50058',
                package: 'providers',
                protoPath: PROVIDERS_PROTO_PATH,
            }

        }

      ]
    )

  ],
  providers: [ProvidersGatewayService],
  controllers: [ProvidersGatewayController],
})
export class ProvidersGatewayModule {}
