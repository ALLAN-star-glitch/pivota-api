/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/profile-service/src/workers/profile.worker.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientKafka } from '@nestjs/microservices';
import { StringUtils } from '@pivota-api/utils';
import { createBusinessProfile, BusinessProfileType } from '../business-modules/utils/business-profiles-creator.utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileWorker {
  private readonly logger = new Logger(ProfileWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    private prisma: PrismaService,
    @Inject('KAFKA_ANALYTICS_CLIENT') private analyticsKafkaClient: ClientKafka,
  ) {
    console.log('🔥 ProfileWorker CONSTRUCTOR called');
  }

  async initialize() {
    if (this.initialized) {
      this.logger.log('ProfileWorker already initialized, skipping');
      return;
    }
    this.initialized = true;
    
    this.logger.log('🚀 Initializing profile worker...');
    
    try {
      this.queue.createWorker('profile-queue', async (job) => {
        const { name, data } = job;
        
        this.logger.log(`📋 Processing profile job: ${name}`);
        
        try {
          switch (name) {
            case 'create-business-profile':
              await this.createBusinessProfile(data);
              break;
              
            case 'housing-preferences-updated':
              this.analyticsKafkaClient.emit('housing.preferences.updated', data);
              this.logger.log(`✅ Housing preferences event emitted for user ${data.userUuid}`);
              break;
              
            default:
              this.logger.warn(`Unknown profile job type: ${name}`);
          }
          
          this.logger.log(`✅ Profile job ${name} completed`);
          
        } catch (error) {
          this.logger.error(`❌ Profile job ${name} failed: ${error.message}`);
          throw error;
        }
      });
      
      this.logger.log('✅ Profile worker initialized and ready');
      
    } catch (error) {
      this.logger.error(`Failed to initialize profile worker: ${error.message}`);
      throw error;
    }
  }

  private async createBusinessProfile(data: {
    accountUuid: string;
    profileType: string;
    profileData: any;
    userUuid: string;
    isPremium: boolean;
  }): Promise<void> {
    this.logger.log(`Creating business profile: ${data.profileType} for account ${data.accountUuid}`);
    
    await this.prisma.$transaction(async (tx) => {
      // Create the business profile
      await createBusinessProfile(
        tx,
        data.accountUuid,
        data.profileType as BusinessProfileType,
        data.profileData,
        {
          userUuid: data.userUuid,
          queueService: this.queue,
          logger: this.logger,
        },
      );
      
      // Update account's activeProfiles
      const account = await tx.account.findUnique({
        where: { uuid: data.accountUuid },
        select: { activeProfiles: true }
      });
      
      const profiles = account?.activeProfiles as string[] || [];
      if (!profiles.includes(data.profileType)) {
        await tx.account.update({
          where: { uuid: data.accountUuid },
          data: { 
            activeProfiles: StringUtils.stringifyJsonField([...profiles, data.profileType])
          }
        });
      }
    });
    
    this.logger.log(`✅ Business profile ${data.profileType} created for account ${data.accountUuid}`);
  }
}