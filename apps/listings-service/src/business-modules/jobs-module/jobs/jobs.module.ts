import { Module, Logger } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { JobsListingsCacheWorker } from '../../../workers/jobs-listings-cache.worker';
import { JobsNotificationWorker } from '../../../workers/jobs-notification.worker';

@Module({
  imports: [
    PrismaModule,
    SharedRedisModule.forRoot(),
    ClientsModule.register([
      {
        name: 'PROFILE_GRPC',
        transport: Transport.GRPC,
        options: {
          package: 'profile',
          protoPath: PROFILE_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50052'
        }
      },
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: 'jobs_notification_queue',
        },
      },
    ])
  ],
  providers: [
    JobsService,
    JobsListingsCacheWorker,
    JobsNotificationWorker,
  ],
  controllers: [JobsController],
})
export class JobsModule {
  private readonly logger = new Logger(JobsModule.name);

  constructor(
    private readonly jobsListingsCacheWorker: JobsListingsCacheWorker,
    private readonly jobsNotificationWorker: JobsNotificationWorker,
  ) {
    this.logger.log('🚀 JobsModule: Initialized');
    this.logger.log(`📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50052'}`);
    this.logger.log(`📡 RABBITMQ_URL: ${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}`);
    
    // Initialize workers
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 JobsModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ===================================================
    // 1. Initialize JobsListingsCacheWorker
    // ===================================================
    try {
      await this.jobsListingsCacheWorker.initialize();
      this.logger.log(`✅ JobsListingsCacheWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ JobsListingsCacheWorker failed to initialize: ${error.message}`,
      );
    }

    // ===================================================
    // 2. Initialize JobsNotificationWorker
    // ===================================================
    try {
      await this.jobsNotificationWorker.initialize();
      this.logger.log(`✅ JobsNotificationWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ JobsNotificationWorker failed to initialize: ${error.message}`,
      );
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialization completed in ${elapsed}ms`);
  }
}