// apps/auth-service/src/workers/onboarding-email.worker.ts
console.log('🔥 ONBOARDING EMAIL WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class OnboardingEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(OnboardingEmailWorker.name);
  private initialized = false;
  private rabbitMQConnected = false;

  constructor(
    private queue: QueueService,
    @Inject('NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
  ) {
    console.log('🔥 OnboardingEmailWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 OnboardingEmailWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 OnboardingEmailWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 OnboardingEmailWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Connect to RabbitMQ first
      await this.connectToRabbitMQ();
      
      // Create worker to process emails
      this.queue.createWorker('onboarding-email-queue', async (job) => {
        await this.processEmailJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Onboarding email worker initialized in ${elapsed}ms`);
      console.log(`🔥 OnboardingEmailWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 OnboardingEmailWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize onboarding email worker: ${error.message}`);
      throw error;
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    if (this.rabbitMQConnected) {
      return;
    }

    try {
      console.log('📧 Connecting to RabbitMQ...');
      await this.notificationBus.connect();
      this.rabbitMQConnected = true;
      console.log('✅✅✅ OnboardingEmailWorker connected to RabbitMQ ✅✅✅');
      this.logger.log('RabbitMQ connection established successfully');
    } catch (err) {
      console.error('❌❌❌ OnboardingEmailWorker RabbitMQ connection FAILED ❌❌❌');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
      throw err;
    }
  }

  private async processEmailJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📧 Processing onboarding email job ${id}: ${name}`);
    
    try {
      // Ensure RabbitMQ is connected before emitting
      if (!this.rabbitMQConnected) {
        await this.connectToRabbitMQ();
      }
      
      // ✅ Extract email from data (support both 'to' and 'email' fields)
      const email = data.to || data.email;
      
      if (!email) {
        this.logger.error(`❌ No email found in job data: ${JSON.stringify(data)}`);
        throw new Error('No recipients defined');
      }
      
      this.logger.log(`📧 Email job for: ${email}`);
      
      switch (name) {
        case 'welcome-email':
          // ✅ Match original: 'user.onboarded'
          this.notificationBus.emit('user.onboarded', {
            accountId: data.accountId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: email,
            plan: data.plan,
            profileType: data.profileType,
            profileData: data.profileData,
          });
          this.logger.log(`✅ Welcome email queued for ${email}`);
          break;
          
        case 'admin-notification':
          // ✅ Match original: 'admin.new.registration'
          this.notificationBus.emit('admin.new.registration', {
            adminEmail: data.to,
            userEmail: data.userEmail,
            userName: data.userName,
            accountType: data.accountType,
            registrationMethod: data.registrationMethod,
            registrationDate: data.registrationDate,
            plan: data.plan,
            primaryPurpose: data.primaryPurpose,
            profileType: data.profileType,
          });
          this.logger.log(`✅ Admin notification queued for ${data.to}`);
          break;
          
        case 'payment-pending-email':
          // ✅ Match original: 'payment.pending'
          this.notificationBus.emit('payment.pending', {
            email: email,
            firstName: data.firstName,
            lastName: data.lastName,
            plan: data.plan,
            profileType: data.profileType,
            redirectUrl: data.redirectUrl,
            merchantReference: data.merchantReference,
          });
          this.logger.log(`✅ Payment pending email queued for ${email}`);
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown onboarding email job type: ${name}`);
      }
      
      this.logger.log(`✅ Onboarding email job ${name} completed for ${email}`);
      
    } catch (error) {
      this.logger.error(`❌ Onboarding email job ${name} failed: ${error.message}`);
      throw error; // Re-throw for BullMQ retry
    }
  }
}