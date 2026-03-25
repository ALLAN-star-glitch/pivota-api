// apps/profile-service/src/profile.module.ts
import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { OrganisationService } from './organisation.service';
import { OrganisationController } from '../controllers/organisation.controller';
import { SharedStorageModule } from '@pivota-api/shared-storage';
import { RBAC_PROTO_PATH, SUBSCRIPTIONS_PROTO_PATH, PLANS_PROTO_PATH } from '@pivota-api/protos';


@Module({
  imports: [
    PrismaModule,
    SharedStorageModule,
    
    ClientsModule.register([
      // 1. RMQ: Notification Event Bus (for emails)
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: 'notification_email_queue',
          queueOptions: { durable: true },
        },
      },

      // 2. KAFKA CLIENT - STORAGE EVENTS (Consumer - for file deletion)
      {
        name: 'KAFKA_STORAGE_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'profile-service-storage',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          consumer: {
            groupId: 'profile-service-storage-consumer',
          },
        },
      },

      // 3. KAFKA CLIENT - ANALYTICS EVENTS (Producer - for housing preferences)
      {
        name: 'KAFKA_ANALYTICS_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'profile-service-analytics',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          producerOnlyMode: true, // Only emits events, no consumer
        },
      },

      /* ---------- gRPC CLIENTS ---------- */
      {
        name: 'RBAC_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'rbac',
          protoPath: RBAC_PROTO_PATH,
          url: process.env.RBAC_GRPC_URL || 'localhost:50055',
        },
      },
      {
        name: 'SUBSCRIPTIONS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'subscriptions',
          protoPath: SUBSCRIPTIONS_PROTO_PATH,
          url: process.env.ADMIN_SERVICE_GRPC_URL || 'localhost:50040',
        },
      },
      {
        name: 'PLANS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'plans',
          protoPath: PLANS_PROTO_PATH,
          url: process.env.ADMIN_SERVICE_GRPC_URL || 'localhost:50050',
        },
      }
    ]),
  ],
  controllers: [UserController, OrganisationController],
  providers: [
    UserService,
    OrganisationService
  ],
  exports: [OrganisationService],
})
export class ProfileModule {
  constructor() {
    console.log(
      '🚀 ProfileModule initialized:',
      '\n- RabbitMQ Client (NOTIFICATION_EVENT_BUS) active for email notifications',
      '\n- Kafka Storage Client (KAFKA_STORAGE_CLIENT) active for consuming file deletion events',
      '\n- Kafka Analytics Client (KAFKA_ANALYTICS_CLIENT) active for emitting housing preferences',
      '\n- StorageModule active for Supabase operations',
    );
  }
}