/* eslint-disable @typescript-eslint/no-explicit-any */
// apps/auth-service/src/workers/authentication-email.worker.ts
console.log('🔥 AUTHENTICATION EMAIL WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AuthenticationEmailWorker implements OnModuleInit {
  private readonly logger = new Logger(AuthenticationEmailWorker.name);
  private initialized = false;
  private rabbitMQConnected = false;

  constructor(
    private queue: QueueService,
    @Inject('NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
  ) {
    console.log('🔥 AuthenticationEmailWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 AuthenticationEmailWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 AuthenticationEmailWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 AuthenticationEmailWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      // Connect to RabbitMQ first
      await this.connectToRabbitMQ();
      
      // Create worker to process emails
      this.queue.createWorker('authentication-email-queue', async (job) => {
        await this.processEmailJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Authentication email worker initialized in ${elapsed}ms`);
      console.log(`🔥 AuthenticationEmailWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 AuthenticationEmailWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize authentication email worker: ${error.message}`);
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
      console.log('✅✅✅ AuthenticationEmailWorker connected to RabbitMQ ✅✅✅');
      this.logger.log('RabbitMQ connection established successfully');
    } catch (err) {
      console.error('❌❌❌ AuthenticationEmailWorker RabbitMQ connection FAILED ❌❌❌');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
      throw err;
    }
  }

  private async processEmailJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`📧 Processing email job ${id}: ${name}`);
    
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
      
      switch (name) {
        case 'send-otp':
          console.log(`📧 Emitting OTP event to RabbitMQ for ${email}`);
          
          this.notificationBus.emit('otp.requested', {
            email: email,
            code: data.code,
            purpose: data.purpose,
            phone: data.phone,
          });
          
          this.logger.log(`✅ OTP event emitted for ${email}`);
          break;
          
        case 'login-notification':
          this.notificationBus.emit('user.login.email', {
            to: email,
            firstName: data.firstName,
            lastName: data.lastName,
            device: data.device,
            deviceType: data.deviceType,
            os: data.os,
            osVersion: data.osVersion,
            browser: data.browser,
            browserVersion: data.browserVersion,
            ipAddress: data.ipAddress,
            timestamp: data.timestamp,
          });
          this.logger.log(`✅ Login notification queued for ${email}`);
          break;
          
        default:
          this.logger.warn(`⚠️ Unknown email job type: ${name}`);
      }
      
    } catch (error) {
      this.logger.error(`❌ Email job ${name} failed: ${error.message}`);
      throw error; // Re-throw for BullMQ retry
    }
  }
}