import { Module } from '@nestjs/common';
import { ContractorsGatewayService } from './services/contractors-gateway.service';
import { ContractorsGatewayController } from './controllers/contractors-gateway.controller';
import {
  CONTRACTORS_PRICING_PROTO_PATH,
  CONTRACTORS_PROTO_PATH,
  BOOKING_PROTO_PATH,
  SERVICE_EXECUTION_PROTO_PATH,
  SERVICE_EXECUTION_MEDIA_PROTO_PATH,
  CUSTOMER_CONFIRMATION_PROTO_PATH,
} from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ContractorsPricingGatewayService } from './services/contractors-pricing-gateway.service';
import { ContractorsPricingGatewayController } from './controllers/contractors-pricing-gateway.controller';
import { SubscriptionsGatewayModule } from '../SubscriptionsGatewayModule/subscriptions-gateway.module';
import { UserModule } from '../UserProfileGatewayModule/user.module';
import { BookingGatewayController } from './controllers/booking-gateway.controller';
import { BookingGatewayService } from './services/booking-gateway.service';
import { ServiceExecutionGatewayService } from './services/service-execution-gateway.service';
import { ServiceExecutionGatewayController } from './controllers/service-execution-gateway.controller';
import { ServiceExecutionMediaGatewayService } from './services/service-execution-media-gateway.service';
import { ServiceExecutionMediaGatewayController } from './controllers/service-execution-media-gateway.controller';
import { CustomerConfirmationGatewayService } from './services/customer-confirmation-gateway.service';
import { CustomerConfirmationGatewayController } from './controllers/customer-confirmation-gateway.controller';

@Module({
  imports: [
    SubscriptionsGatewayModule,
    UserModule,
    ClientsModule.register([
      {
        name: 'CONTRACTORS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50061',
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
      {
        name: 'BOOKING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50063',
          package: 'contractors_booking',
          protoPath: BOOKING_PROTO_PATH,
        },
      },
      {
        name: 'SERVICE_EXECUTION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50064',
          package: 'contractors_service_execution',
          protoPath: SERVICE_EXECUTION_PROTO_PATH,
        },
      },
      {
        name: 'SERVICE_EXECUTION_MEDIA_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50065',
          package: 'contractors_service_execution_media',
          protoPath: SERVICE_EXECUTION_MEDIA_PROTO_PATH,
        },
      },
      {
        name: 'CUSTOMER_CONFIRMATION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50066',
          package: 'contractors_customer_confirmation',
          protoPath: CUSTOMER_CONFIRMATION_PROTO_PATH,
        },
      },
    ]),
  ],
  providers: [
    ContractorsGatewayService,
    ContractorsPricingGatewayService,
    BookingGatewayService,
    ServiceExecutionGatewayService,
    ServiceExecutionMediaGatewayService,
    CustomerConfirmationGatewayService,
  ],
  controllers: [
    ContractorsGatewayController,
    ContractorsPricingGatewayController,
    BookingGatewayController,
    ServiceExecutionGatewayController,
    ServiceExecutionMediaGatewayController,
    CustomerConfirmationGatewayController,
  ],
})
export class ProvidersGatewayModule {}