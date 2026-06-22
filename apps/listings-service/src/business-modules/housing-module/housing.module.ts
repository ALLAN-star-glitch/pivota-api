import { Module, Logger } from '@nestjs/common';
import { HousingController } from './controllers/housing.controller';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '../../prisma/prisma.module';
import { HousingService } from './services/housing.service';
import { HousingTrackingService } from './services/housing-tracking.service';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { HousingListingsCacheWorker } from '../../workers/house-listings-cache.worker';


@Module({
  imports: [
    PrismaModule,
    SharedRedisModule.forRoot(), // ✅ Add this for Redis support
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
          queueOptions: { 
            durable: true,
            arguments: {
              'x-message-ttl': 600000, // ✅ Match notification service
            },
          },
        },
      },
    ]),
  ],
  controllers: [HousingController],
  providers: [
    HousingService,
    HousingTrackingService,
    HousingListingsCacheWorker, // ✅ Add the cache worker
  ],
})
export class HousingModule {
  private readonly logger = new Logger(HousingModule.name);

  constructor(
    private readonly housingListingsCacheWorker: HousingListingsCacheWorker,
  ) {
    this.logger.log('🚀 HousingModule: Initialized');
    this.logger.log(`📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50052'}`);
    this.logger.log(`📨 KAFKA_BROKERS: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
    this.logger.log(`📨 RABBITMQ_URL: ${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}`);
    
    // Initialize workers
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 HousingModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize HousingListingsCacheWorker
    try {
      await this.housingListingsCacheWorker.initialize();
      this.logger.log(`✅ HousingListingsCacheWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ HousingListingsCacheWorker failed to initialize: ${error.message}`,
      );
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialization completed in ${elapsed}ms`);
  }
}