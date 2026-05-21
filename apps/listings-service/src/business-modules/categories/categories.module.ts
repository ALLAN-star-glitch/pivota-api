// listings-service/src/modules/categories/categories.module.ts
import { Module, Logger } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LISTINGS_CATEGORIES_PROTO_PATH } from '@pivota-api/protos';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { CategoriesWorker } from '../../workers/categories.worker';

@Module({
  imports: [
    PrismaModule,
    SharedRedisModule.forRoot(),
    ClientsModule.register([
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'categories',
          protoPath: LISTINGS_CATEGORIES_PROTO_PATH,
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50056',
        },
      },
      {
        name: 'NOTIFICATION_KAFKA',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'notification-service',
            brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
          },
        },
      },
      {
        name: 'CATEGORIES_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'categories-service',
            brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  providers: [CategoriesService, CategoriesWorker],
  controllers: [CategoriesController],
})
export class CategoriesModule {
  private readonly logger = new Logger(CategoriesModule.name);

  constructor(private categoriesWorker: CategoriesWorker) {
    this.logger.log('🚀 CategoriesModule: Initialized');
    this.logger.log(`📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50056'}`);
    this.logger.log(`📨 KAFKA_BROKERS: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
    
    // ✅ Initialize workers immediately in constructor
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 CategoriesModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Initialize categories worker
      await this.categoriesWorker.initialize();
      this.logger.log(`✅ CategoriesWorker initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ CategoriesWorker failed to initialize: ${error.message}`);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialized in ${elapsed}ms`);
  }
}