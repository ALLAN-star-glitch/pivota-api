import { Module } from '@nestjs/common';
import { ProvidersGatewayService } from './providers-gateway.service';
import { ProvidersGatewayController } from './providers-gateway.controller';
import { PROVIDERS_PRICING_PROTO_PATH, PROVIDERS_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProvidersPricingGatewayService } from './providers-pricing-gateway.service';
import { ProvidersPricingGatewayController } from './providers-pricing-gateway.controller';

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
        },
      },
      {
        name: 'PROVIDERS_PRICING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50059',
          package: 'providers_pricing',
          protoPath: PROVIDERS_PRICING_PROTO_PATH,
        },
      },  
    ]),
  ],
  providers: [ProvidersGatewayService, ProvidersPricingGatewayService],
  controllers: [ProvidersGatewayController, ProvidersPricingGatewayController],
})
export class ProvidersGatewayModule {}
