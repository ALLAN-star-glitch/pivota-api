import { Module } from '@nestjs/common';
import { HousingController } from './controllers/housing.controller';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '../../prisma/prisma.module';
import { HousingService } from './services/housing.service';
import { HousingTrackingService } from './services/housing-tracking.service';

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: 'PROFILE_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50052',
        },
      },
      // Kafka client for analytics events
      {
        name: 'KAFKA_SERVICE', 
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'listings-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          consumer: {
            groupId: 'admin-service-consumer-V2',
          },
        },
      },

      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'housing_notification_queue',
        },
      },
    ]),
  ],
  controllers: [HousingController],
  providers: [HousingService, HousingTrackingService],
})
export class HousingModule {}
