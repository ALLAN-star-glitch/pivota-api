// housing-gateway.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HousingGatewayService } from './housing-gateway.service';
import { HousingGatewayController } from './housing-gateway.controller';
import {
  LISTINGS_HOUSING_PROTO_PATH,
  HOUSING_TRAINING_DATA_PROTO_PATH,
} from '@pivota-api/protos';
import { SubscriptionsGatewayModule } from '../SubscriptionsGatewayModule/subscriptions-gateway.module';
import { SharedStorageModule } from '@pivota-api/shared-storage';
import { HousingTrainingDataGatewayService } from './housing-training-data-gateway.service';
import { HousingTrainingDataGatewayController } from './housing-training-data-gateway.controller';

@Module({
  imports: [
    SharedStorageModule,
    SubscriptionsGatewayModule,
    ClientsModule.register([
      {
        name: 'HOUSING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.LISTINGS_SERVICE_URL || 'localhost:50060',
          package: 'housing',
          protoPath: LISTINGS_HOUSING_PROTO_PATH,
        },
      },
      // Add the new gRPC client for housing training data
      {
        name: 'HOUSING_TRAINING_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: process.env.ADMIN_SERVICE_URL || 'localhost:50062',
          package: 'housing_training_data',
          protoPath: HOUSING_TRAINING_DATA_PROTO_PATH,
        },
      },
    ]),
  ],
  providers: [HousingGatewayService, HousingTrainingDataGatewayService],
  controllers: [HousingGatewayController, HousingTrainingDataGatewayController],
})
export class HousingGatewayModule {}
