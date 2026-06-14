import { Module, Logger } from '@nestjs/common';
import { ContractorsService } from './services/contractors.service';
import { ContractorsController } from './controllers/contractors.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PROFILE_PROTO_PATH } from '@pivota-api/protos';
import { ContractorsPricingService } from './services/contractors-pricing.service';
import { ContractorsPricingController } from './controllers/contractors-pricing.controller';
import { SharedRedisModule } from '@pivota-api/shared-redis';
import { SharedStorageModule } from '@pivota-api/shared-storage';  // Add this import
import { ContractorsPricingWorker } from '../../workers/contractors-pricing.worker';
import { NotificationWorker } from '../../workers/notification.worker';
import { BookingService } from './services/booking.service';
import { BookingController } from './controllers/booking.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderWorker } from '../../workers/reminder.worker';
import { ServiceExecutionController } from './controllers/service-execution.controller';
import { CustomerConfirmationController } from './controllers/customer-confirmation.controller';
import { CustomerConfirmationService } from './services/customer-confirmation.service';
import { ServiceExecutionService } from './services/service-execution.service';
import { ServiceExecutionNotificationWorker } from '../../workers/ServiceExecutionNotificationWorker.worker';
import { ServiceExecutionMediaService } from './services/service-execution-media.service';
import { ServiceExecutionMediaController } from './controllers/service-execution-media.controller';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    SharedRedisModule.forRoot(),
    SharedStorageModule,  // Add this - provides StorageService
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
      {
        name: 'SERVICE_EXECUTION_NOTIFICATION_EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: 'service_execution_notification_queue',
        },
      }
    ]),
  ],
  providers: [
    ContractorsService,
    ContractorsPricingService,
    ContractorsPricingWorker,
    NotificationWorker,
    BookingService,
    ReminderWorker,
    CustomerConfirmationService,
    ServiceExecutionService,
    ServiceExecutionNotificationWorker,
    ServiceExecutionMediaService,
  ],
  controllers: [
    ContractorsController,
    ContractorsPricingController,
    BookingController,
    ServiceExecutionController,
    CustomerConfirmationController,
    ServiceExecutionMediaController,
  ],
})
export class ContractorsModule {
  private readonly logger = new Logger(ContractorsModule.name);

  constructor(
    private contractorsPricingWorker: ContractorsPricingWorker,
    private notificationWorker: NotificationWorker,
    private reminderWorker: ReminderWorker,
    private serviceExecutionNotificationWorker: ServiceExecutionNotificationWorker,
  ) {
    this.logger.log('🚀 ContractorsModule: Initialized');
    this.logger.log(
      `📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50052'}`,
    );

    // Initialize workers in constructor (same pattern as CategoriesModule)
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    this.logger.log(
      '🔥 ContractorsModule.initializeWorkers() - Starting workers initialization...',
    );
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Initialize ContractorsPricingWorker
    try {
      await this.contractorsPricingWorker.initialize();
      this.logger.log(`✅ ContractorsPricingWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ ContractorsPricingWorker failed to initialize: ${error.message}`,
      );
    }

    // Initialize NotificationWorker
    try {
      await this.notificationWorker.initialize();
      this.logger.log(`✅ NotificationWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ NotificationWorker failed to initialize: ${error.message}`,
      );
    }

    // ReminderWorker - initialize if it has the method
    try {
      if (
        this.reminderWorker &&
        typeof this.reminderWorker.initialize === 'function'
      ) {
        await this.reminderWorker.initialize();
        this.logger.log(`✅ ReminderWorker initialized successfully`);
      } else {
        this.logger.log(
          `ℹ️ ReminderWorker cron jobs will run without explicit initialization`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ ReminderWorker failed to initialize: ${error.message}`,
      );
    }

    // Initialize ServiceExecutionNotificationWorker
    try {
      await this.serviceExecutionNotificationWorker.initialize();
      this.logger.log(`✅ ServiceExecutionNotificationWorker initialized successfully`);
    } catch (error) {
      this.logger.error(
        `❌ ServiceExecutionNotificationWorker failed to initialize: ${error.message}`,
      );
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ All workers initialization completed in ${elapsed}ms`);
  }
}