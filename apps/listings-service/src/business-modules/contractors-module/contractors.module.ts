import { Module, Logger } from '@nestjs/common';
import { ContractorsService } from './services/contractors.service';
import { ContractorsController } from './controllers/contractors.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ContractorsPricingService } from './services/contractors-pricing.service';
import { ContractorsPricingController } from './controllers/contractors-pricing.controller';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { ContractorsPricingWorker } from '../../workers/contractors-pricing.worker';
import { NotificationWorker } from '../../workers/notification.worker';

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
          url: process.env.LISTINGS_GRPC_URL || 'localhost:50052',
        },
      },
      {
        name: 'NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: 'booking_notification_queue',
        },
      },      
    ]),
  ],
  providers: [ContractorsService, ContractorsPricingService, ContractorsPricingWorker, NotificationWorker],
  controllers: [ContractorsController, ContractorsPricingController],
})
export class ContractorsModule {
  private readonly logger = new Logger(ContractorsModule.name);

  constructor(
    private contractorsPricingWorker: ContractorsPricingWorker,
    private notificationWorker: NotificationWorker, // ✅ Add this
  ) {
    this.logger.log('🚀 ContractorsModule: Initialized');
    this.logger.log(`📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50052'}`);
    
    // Initialize workers in constructor
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log('🔥 ContractorsModule.initializeWorkers() - Starting workers initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize ContractorsPricingWorker
    try {
      await this.contractorsPricingWorker.initialize();
      this.logger.log(`✅ ContractorsPricingWorker initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ ContractorsPricingWorker failed to initialize: ${error.message}`);
    }

    // ✅ Initialize NotificationWorker
    try {
      await this.notificationWorker.initialize();
      this.logger.log(`✅ NotificationWorker initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ NotificationWorker failed to initialize: ${error.message}`);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialization completed in ${elapsed}ms`);
  }
}