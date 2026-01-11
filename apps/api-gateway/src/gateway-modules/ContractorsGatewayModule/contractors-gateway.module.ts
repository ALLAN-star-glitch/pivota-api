import { Module } from '@nestjs/common';
import { ContractorsGatewayService } from './services/contractors-gateway.service';
import { ContractorsGatewayController } from './contractors/contractors-gateway.controller';
import { CONTRACTORS_PRICING_PROTO_PATH, CONTRACTORS_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ContractorsPricingGatewayService } from './services/contractors-pricing-gateway.service';
import { ContractorsPricingGatewayController } from './contractors/contractors-pricing-gateway.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CONTRACTORS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50058',
          package: 'contractors',
          protoPath: CONTRACTORS_PROTO_PATH,
        },
      },
      {
        name: 'CONTRACTORS_PRICING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50059',
          package: 'contractors_pricing',
          protoPath: CONTRACTORS_PRICING_PROTO_PATH,
        },
      },  
    ]),
  ],
  providers: [ContractorsGatewayService, ContractorsPricingGatewayService],
  controllers: [ContractorsGatewayController, ContractorsPricingGatewayController],
})
export class ProvidersGatewayModule {}
