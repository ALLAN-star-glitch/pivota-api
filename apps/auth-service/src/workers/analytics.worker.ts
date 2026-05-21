// apps/auth-service/src/workers/analytics.worker.ts
console.log('🔥 ANALYTICS WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AnalyticsWorker implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    @Inject('KAFKA_SERVICE') private kafkaClient: ClientProxy,
  ) {
    console.log('🔥 AnalyticsWorker CONSTRUCTOR called');
  }

  async onModuleInit() {
    console.log('🔥 AnalyticsWorker.onModuleInit() called');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 AnalyticsWorker already initialized, skipping');
      return;
    }
    
    console.log('🔥 AnalyticsWorker.initialize() STARTED');
    const startTime = Date.now();
    this.logger.log('🚀 Initializing analytics worker...');
    
    try {
      this.queue.createWorker('analytics-queue', async (job) => {
        const { name, data } = job;
        
        this.logger.log(`📊 Processing analytics job: ${name}`);
        
        try {
          switch (name) {
            case 'user-registered':
              this.logger.log(`📤 Emitting user.registered to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.registered', data);
              this.logger.log(`✅ user.registered event emitted`);
              break;
            
            case 'user-login':
              this.logger.log(`📤 Emitting user.login to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.login', {
                userUuid: data.userUuid,
                email: data.email,
                isNewUser: data.isNewUser,
                loginMethod: data.loginMethod,
                clientInfo: data.clientInfo,
                timestamp: data.timestamp,
              });
              this.logger.log(`✅ user.login event emitted for ${data.email}`);
              break;
            
            case 'user-login-error':
              this.logger.log(`📤 Emitting user.login.error to Kafka: ${data.email || data.error}`);
              this.kafkaClient.emit('user.login.error', {
                error: data.error,
                method: data.method,
                clientInfo: data.clientInfo,
                timestamp: data.timestamp,
              });
              this.logger.log(`✅ user.login.error event emitted`);
              break;
            
            case 'signup-failed':
              this.logger.log(`📤 Emitting signup-failed to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.signup.failed', data);
              break;
            
            case 'signup-error':
              this.logger.log(`📤 Emitting signup-error to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.signup.error', data);
              break;
            
            case 'user-signup-premium':
              this.logger.log(`📤 Emitting user-signup-premium to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.signup.premium', data);
              break;
            
            case 'payment-failed':
              this.logger.log(`📤 Emitting payment-failed to Kafka: ${data.email}`);
              this.kafkaClient.emit('user.payment.failed', data);
              break;
            
            default:
              this.logger.warn(`⚠️ Unknown analytics job type: ${name}`);
          }
          
          this.logger.log(`✅ Analytics job ${name} completed`);
          
        } catch (error) {
          this.logger.error(`❌ Analytics job ${name} failed: ${error.message}`);
          throw error;
        }
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`✅ Analytics worker initialized in ${elapsed}ms`);
      console.log(`🔥 AnalyticsWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('🔥 AnalyticsWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize analytics worker: ${error.message}`);
      throw error;
    }
  }
}