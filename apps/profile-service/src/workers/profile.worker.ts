/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/profile-service/src/workers/profile.worker.ts
console.log('🔥 PROFILE WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientKafka } from '@nestjs/microservices';
import { StringUtils } from '@pivota-api/utils';
import { createBusinessProfile, BusinessProfileType } from '../business-modules/utils/business-profiles-creator.utils';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '@pivota-api/shared-storage';
import { downloadAndStoreGoogleProfilePicture } from '../business-modules/utils/google-profile-picture.utils';

@Injectable()
export class ProfileWorker {
  private readonly logger = new Logger(ProfileWorker.name);
  private initialized = false;
  private kafkaConnected = false;

  constructor(
    private queue: QueueService,
    private prisma: PrismaService,
    @Inject('KAFKA_ANALYTICS_CLIENT') private analyticsKafkaClient: ClientKafka,
    private storageService: StorageService, // Add this
  ) {
    console.log('🔥 ProfileWorker CONSTRUCTOR called');
    
    // Connect to Kafka immediately (Promise style)
    this.analyticsKafkaClient.connect()
      .then(() => {
        console.log('✅✅✅ ProfileWorker connected to Kafka ✅✅✅');
        this.logger.log('Kafka connection established successfully');
        this.kafkaConnected = true;
      })
      .catch((err) => {
        console.error('❌❌❌ ProfileWorker Kafka connection FAILED ❌❌❌');
        console.error('Error:', err.message);
        this.logger.error(`Kafka connection failed: ${err.message}`);
        this.kafkaConnected = false;
      });
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 ProfileWorker already initialized, skipping');
      return;
    }
    this.initialized = true;
    
    console.log('🔥 ProfileWorker.initialize() STARTED');
    this.logger.log('🚀 Initializing profile worker...');
    
    try {
      // Wait for Kafka connection (max 10 seconds)
      let attempts = 0;
      while (!this.kafkaConnected && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!this.kafkaConnected) {
        console.warn('⚠️ Kafka not connected after 10 seconds, continuing anyway');
        this.logger.warn('Kafka not connected after 10 seconds, continuing anyway');
      } else {
        console.log('✅ Kafka is ready for profile worker');
      }

      // Create worker to process profile jobs
      this.queue.createWorker('profile-queue', async (job) => {
        const { name, data } = job;
        
        console.log(`📋 Processing profile job: ${name}`);
        console.log(`📋 Job data: ${JSON.stringify(data, null, 2)}`);
        this.logger.log(`📋 Processing profile job: ${name}`);
        
        try {
          switch (name) {
            case 'create-business-profile':
              await this.createBusinessProfile(data);
              break;
              
            case 'download-profile-picture':
              await this.downloadProfilePicture(data);
              break;
              
            case 'housing-preferences-updated':
              console.log(`📤 Emitting housing preferences event for user ${data.userUuid}`);
              this.analyticsKafkaClient.emit('housing.preferences.updated', data);
              this.logger.log(`✅ Housing preferences event emitted for user ${data.userUuid}`);
              break;

              case 'emit-account-created-event':
                await this.emitAccountCreatedEvent(data);
              break;
              
            default:
              this.logger.warn(`Unknown profile job type: ${name}`);
              console.log(`⚠️ Unknown profile job type: ${name}`);
          }
          
          console.log(`✅ Profile job ${name} completed`);
          this.logger.log(`✅ Profile job ${name} completed`);
          
        } catch (error) {
          console.error(`❌ Profile job ${name} failed: ${error.message}`);
          console.error(error.stack);
          this.logger.error(`❌ Profile job ${name} failed: ${error.message}`);
          this.logger.error(error.stack);
          throw error;
        }
      });
      
      this.logger.log('✅ Profile worker initialized and ready');
      console.log('🔥 ProfileWorker.initialize() COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('🔥 ProfileWorker.initialize() FAILED:', error);
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
    console.log(`🏗️ Creating business profile: ${data.profileType} for account ${data.accountUuid}`);
    console.log(`📊 Profile data: ${JSON.stringify(data.profileData, null, 2)}`);
    this.logger.log(`🏗️ Creating business profile: ${data.profileType} for account ${data.accountUuid}`);
    
    try {
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
          console.log(`✅ Added ${data.profileType} to activeProfiles for account ${data.accountUuid}`);
          this.logger.log(`✅ Added ${data.profileType} to activeProfiles for account ${data.accountUuid}`);
        }
      });
      
      console.log(`✅ Business profile ${data.profileType} created for account ${data.accountUuid}`);
      this.logger.log(`✅ Business profile ${data.profileType} created for account ${data.accountUuid}`);
      
    } catch (error) {
      console.error(`❌ Failed to create business profile: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`❌ Failed to create business profile: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

private async downloadProfilePicture(data: {
  accountUuid: string;  // Change to accountUuid
  pictureUrl: string;
  oldImageUrl?: string | null;
}): Promise<void> {
  console.log(`📸 Downloading profile picture for account: ${data.accountUuid}`);
  this.logger.log(`📸 Downloading profile picture for account: ${data.accountUuid}`);
  
  try {
    // Get current profile image URL if not provided
    let currentImageUrl = data.oldImageUrl;
    
    if (!currentImageUrl) {
      const individualProfile = await this.prisma.individualProfile.findUnique({
        where: { accountUuid: data.accountUuid },
        select: { profileImage: true }
      });
      currentImageUrl = individualProfile?.profileImage;
    }
    
    const result = await downloadAndStoreGoogleProfilePicture(
      data.pictureUrl,
      data.accountUuid,  // Pass accountUuid
      this.storageService,
      this.logger,
      currentImageUrl
    );
    
    if (result.success && result.url) {
      // Update individual profile (since profile picture lives there)
      await this.prisma.individualProfile.update({
        where: { accountUuid: data.accountUuid },
        data: { profileImage: result.url }
      });
      
      // Also update any users associated with this account
      await this.prisma.user.updateMany({
        where: { accountUuid: data.accountUuid },
        data: { profileImage: result.url }
      });
      
      console.log(`✅ Profile picture updated for account: ${data.accountUuid}`);
      this.logger.log(`✅ Profile picture updated for account: ${data.accountUuid}`);
    } else {
      console.warn(`⚠️ Failed to download profile picture for account: ${data.accountUuid} - ${result.error}`);
      this.logger.warn(`⚠️ Failed to download profile picture for account: ${data.accountUuid} - ${result.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Failed to download profile picture: ${error.message}`);
    this.logger.error(`❌ Failed to download profile picture: ${error.message}`);
    // Don't throw - this is a non-critical operation
  }
}


  private async emitAccountCreatedEvent(data: {
  userUuid: string;
  accountUuid: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  accountStatus: string;
  accountType: string;
  roleName: string;
  timestamp: string;
}): Promise<void> {
  console.log(`📤 Emitting account.created event for user: ${data.userUuid}`);
  this.logger.log(`📤 Emitting account.created event for user: ${data.userUuid}`);
  
  try {
    // Emit to Kafka for Auth Service to consume
    this.analyticsKafkaClient.emit('account.created', {
      event: 'account.created',
      timestamp: data.timestamp,
      data: {
        userUuid: data.userUuid,
        accountUuid: data.accountUuid,
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        accountStatus: data.accountStatus,
        accountType: data.accountType,
        roleName: data.roleName,
      }
    });
    
    console.log(`✅ account.created event emitted for user: ${data.userUuid}`);
    this.logger.log(`✅ account.created event emitted for user: ${data.userUuid}`);
    
  } catch (error) {
    console.error(`❌ Failed to emit account.created event: ${error.message}`);
    this.logger.error(`❌ Failed to emit account.created event: ${error.message}`);
    throw error;
  }
}
}