// apps/profile-service/src/profile.module.ts
import { Module, Logger } from '@nestjs/common';
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
import { CategoryService } from './category.service';
import { CategoryConsumer } from '../controllers/category.consumer';

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
  controllers: [UserController, OrganisationController, MediaController, CategoryConsumer],
  providers: [
    UserService,
    OrganisationService,
    ProfileWorker,
    MediaService,
    CategoryService
  ],
  exports: [OrganisationService, CategoryService],
})
export class ProfileModule {
  private readonly logger = new Logger(ProfileModule.name);

  constructor(
    private profileWorker: ProfileWorker,
  ) {
    this.logger.log('🚀 ProfileModule: gRPC Clients & RMQ Event Buses initialized');
    this.logger.log(`📡 RBAC_GRPC_URL: ${process.env.RBAC_GRPC_URL || 'localhost:50055'}`);
    this.logger.log(`📡 SUBSCRIPTIONS_GRPC_URL: ${process.env.SUBSCRIPTIONS_GRPC_URL || 'localhost:50040'}`);
    this.logger.log(`📡 PLANS_SERVICE_GRPC_URL: ${process.env.PLANS_SERVICE_GRPC_URL || 'localhost:50050'}`);
    this.logger.log(`📨 KAFKA_BROKERS: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
    this.logger.log(`📨 RMQ_URL: ${process.env.RMQ_URL || 'amqp://localhost:5672'}`);
    
    // ✅ Initialize workers immediately in constructor
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 ProfileModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize profile worker
    const results = await Promise.allSettled([
      this.profileWorker.initialize(),
    ]);

    // Log results
    const workerNames = ['ProfileWorker'];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.logger.log(`✅ ${workerNames[index]} initialized successfully`);
      } else {
        this.logger.error(`❌ ${workerNames[index]} failed to initialize: ${result.reason}`);
      }
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialized in ${elapsed}ms`);
  }
}