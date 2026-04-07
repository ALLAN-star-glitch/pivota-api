console.log('🔥 EMAIL WORKER FILE IS BEING LOADED');
import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueService } from '@pivota-api/shared-redis';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EmailWorker {
  private readonly logger = new Logger(EmailWorker.name);
  private initialized = false;

  constructor(
  private queue: QueueService,
  @Inject('NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
) {
  console.log('🔥 EmailWorker CONSTRUCTOR called');
  
  // ✅ Connect to RabbitMQ immediately (Promise style)
  this.notificationBus.connect()
    .then(() => {
      console.log('✅✅✅ EmailWorker connected to RabbitMQ ✅✅✅');
      this.logger.log('RabbitMQ connection established successfully');
    }) 
    .catch((err) => {
      console.error('❌❌❌ EmailWorker RabbitMQ connection FAILED ❌❌❌');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed: ${err.message}`);
    });
}
  async initialize() {
    if (this.initialized) {
      console.log('🔥 EmailWorker already initialized, skipping');
      return;
    }
    this.initialized = true;
    
    console.log('🔥 EmailWorker.initialize() STARTED');
    this.logger.log('🚀 Initializing email worker...');
    
    try {
      // Create worker to process emails
      this.queue.createWorker('email-queue', async (job) => {
        const { name, data } = job;
        
        this.logger.log(`📧 Processing email job: ${name}`);
        
        try {
          switch (name) {
              case 'send-otp':
              console.log('📧 Emitting OTP event to RabbitMQ');
              
              this.notificationBus.emit('otp.requested', {
                email: data.to,
                code: data.code,
                purpose: data.purpose,
              });
              
              this.logger.log(`✅ OTP event emitted for ${data.to}`);
              break;
              
            case 'welcome-email':
              this.notificationBus.emit('user.onboarded', {
                accountId: data.accountId,
                firstName: data.firstName,
                email: data.to,
                plan: data.plan,
                profileType: data.profileType,
                profileData: data.profileData,
              });
              this.logger.log(`✅ Welcome email queued for ${data.to}`);
              break;
              
            case 'admin-notification':
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
                paymentStatus: data.paymentStatus,
                paymentError: data.paymentError,
              });
              this.logger.log(`✅ Admin notification queued for ${data.to}`);
              break;
              
            case 'payment-pending-email':
              this.notificationBus.emit('payment.pending', {
                email: data.to,
                firstName: data.firstName,
                lastName: data.lastName,
                plan: data.plan,
                profileType: data.profileType,
                redirectUrl: data.redirectUrl,
                merchantReference: data.merchantReference,
              });
              this.logger.log(`✅ Payment pending email queued for ${data.to}`);
              break;
              
            case 'payment-failed-email':
              this.notificationBus.emit('payment.failed', {
                email: data.to,
                firstName: data.firstName,
                lastName: data.lastName,
                plan: data.plan,
                profileType: data.profileType,
                errorMessage: data.errorMessage,
              });
              this.logger.log(`✅ Payment failed email queued for ${data.to}`);
              break;
              
            default:
              this.logger.warn(`⚠️ Unknown email job type: ${name}`);
          }
          
        } catch (error) {
          this.logger.error(`❌ Email job ${name} failed: ${error.message}`);
          throw error;
        }
      });
      
      this.logger.log('✅ Email worker initialized and ready');
      console.log('🔥 EmailWorker.initialize() COMPLETED SUCCESSFULLY');
      
    } catch (error) {
      console.error('🔥 EmailWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize email worker: ${error.message}`);
      throw error;
    }
  }
}