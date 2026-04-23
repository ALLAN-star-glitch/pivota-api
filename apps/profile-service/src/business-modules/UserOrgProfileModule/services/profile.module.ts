// apps/profile-service/src/profile.module.ts
import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrganisationController } from '../controllers/organisation.controller';
import { SharedStorageModule } from '@pivota-api/shared-storage';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { RBAC_PROTO_PATH, SUBSCRIPTIONS_PROTO_PATH, PLANS_PROTO_PATH } from '@pivota-api/protos';
import { OrganisationService } from './organisation.service';
import { UserService } from './user.service';
import { ProfileWorker } from '../../../workers/profile.worker';
import { MediaService } from './media.service';
import { MediaController } from '../controllers/media.controller';

@Module({
  imports: [
    SharedRedisModule.forRoot(),
    PrismaModule,
    SharedStorageModule,
    
    ClientsModule.register([
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RMQ_URL || 'amqp://localhost:5672'],
          queue: 'notification_email_queue',
          queueOptions: { durable: true },
        },
      },
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
      {
        name: 'KAFKA_ANALYTICS_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'profile-service-analytics',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          producerOnlyMode: true,
        },
      },
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
          url: process.env.SUBSCRIPTIONS_GRPC_URL || 'localhost:50040',
        },
      },
      {
        name: 'PLANS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'plans',
          protoPath: PLANS_PROTO_PATH,
          url: process.env.PLANS_SERVICE_GRPC_URL || 'localhost:50050',
        },
      }
    ]),
  ],
  controllers: [UserController, OrganisationController, MediaController],
  providers: [
    UserService,
    OrganisationService,
    ProfileWorker,
    MediaService
  ],
  exports: [OrganisationService],
})
export class ProfileModule {
  constructor(private profileWorker: ProfileWorker) {
    console.log('🚀 ProfileModule constructor called');
    
    // Initialize profile worker immediately (same pattern as EmailWorker)
    setImmediate(() => {
      console.log('🔥 ProfileModule - manually initializing ProfileWorker');
      this.profileWorker.initialize().catch(err => {
        console.error('🔥 Failed to initialize profile worker:', err);
      });
    });
  }
}