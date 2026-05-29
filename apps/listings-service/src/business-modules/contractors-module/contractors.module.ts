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
    ]),
  ],
  providers: [ContractorsService, ContractorsPricingService, ContractorsPricingWorker],
  controllers: [ContractorsController, ContractorsPricingController],
})
export class ContractorsModule {
  private readonly logger = new Logger(ContractorsModule.name);

  constructor(private contractorsPricingWorker: ContractorsPricingWorker) {
    this.logger.log('🚀 ContractorsModule: Initialized');
    this.logger.log(`📡 LISTINGS_GRPC_URL: ${process.env.LISTINGS_GRPC_URL || 'localhost:50052'}`);
    
    // Initialize worker in constructor
    this.initializeWorker();
  }

  private async initializeWorker() {
    this.logger.log('🔥 ContractorsModule.initializeWorker() - Starting worker initialization...');
    const startTime = Date.now();

    // Small delay to ensure all dependencies are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await this.contractorsPricingWorker.initialize();
      this.logger.log(`✅ ContractorsPricingWorker initialized successfully`);
    } catch (error) {
      this.logger.error(`❌ ContractorsPricingWorker failed to initialize: ${error.message}`);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`✅ Worker initialization completed in ${elapsed}ms`);
  }
}