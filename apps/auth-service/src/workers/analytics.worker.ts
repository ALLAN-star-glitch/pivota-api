// apps/auth-service/src/workers/analytics.worker.ts
console.log('🔥 ANALYTICS WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);
  private initialized = false;

  constructor(
    private queue: QueueService,
    @Inject('KAFKA_SERVICE') private kafkaClient: ClientProxy,
  ) {
    console.log('🔥 AnalyticsWorker CONSTRUCTOR called');
  }

  async initialize() {
    if (this.initialized) {
      console.log('🔥 AnalyticsWorker already initialized, skipping');
      return;
    }
    this.initialized = true;
    
    console.log('🔥 AnalyticsWorker.initialize() STARTED');
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
              this.logger.warn(`Unknown analytics job type: ${name}`);
          }
          
          this.logger.log(`✅ Analytics job ${name} completed`);
          
        } catch (error) {
          this.logger.error(`❌ Analytics job ${name} failed: ${error.message}`);
          throw error;
        }
      });
      
      this.logger.log('✅ Analytics worker initialized and ready');
      console.log('🔥 AnalyticsWorker.initialize() COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('🔥 AnalyticsWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize analytics worker: ${error.message}`);
      throw error;
    }
  }
}