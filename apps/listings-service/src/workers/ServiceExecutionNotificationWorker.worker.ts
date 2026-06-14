/* eslint-disable @typescript-eslint/no-explicit-any */
console.log('SERVICE EXECUTION NOTIFICATION WORKER FILE IS BEING LOADED');
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { QueueService } from '@pivota-api/shared-redis';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceStartedData, ServiceCompletedData, CustomerConfirmedData, CustomerDissatisfiedData, PaymentAutoReleasedData, EvidenceUploadedData } from '@pivota-api/interfaces';

@Injectable()
export class ServiceExecutionNotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(ServiceExecutionNotificationWorker.name);
  private initialized = false;
  private rabbitMQConnected = false;

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
    @Inject('SERVICE_EXECUTION_NOTIFICATION_EVENT_BUS') private notificationBus: ClientProxy,
  ) {
    console.log('ServiceExecutionNotificationWorker CONSTRUCTOR called');
    this.logger.log('ServiceExecutionNotificationWorker constructor called');
  }

  async onModuleInit() {
    console.log('ServiceExecutionNotificationWorker.onModuleInit() STARTED');
    this.logger.log('ServiceExecutionNotificationWorker.onModuleInit() STARTED');
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) {
      console.log('ServiceExecutionNotificationWorker already initialized, skipping');
      this.logger.log('ServiceExecutionNotificationWorker already initialized, skipping');
      return;
    }
    
    console.log('ServiceExecutionNotificationWorker.initialize() STARTED');
    this.logger.log('ServiceExecutionNotificationWorker.initialize() STARTED');
    const startTime = Date.now();
    
    try {
      await this.connectToRabbitMQ();
      
      // Create worker to process jobs from service-execution-queue
      this.queue.createWorker('service-execution-queue', async (job) => {
        await this.processNotificationJob(job);
      });
      
      this.initialized = true;
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`Service Execution notification worker initialized in ${elapsed}ms`);
      console.log(`ServiceExecutionNotificationWorker.initialize() COMPLETED SUCCESSFULLY in ${elapsed}ms`);
      
    } catch (error) {
      console.error('ServiceExecutionNotificationWorker.initialize() FAILED:', error);
      this.logger.error(`Failed to initialize service execution notification worker: ${error.message}`);
      throw error;
    }
  }

  private async connectToRabbitMQ(): Promise<void> {
    if (this.rabbitMQConnected) {
      return;
    }

    try {
      console.log('Connecting ServiceExecutionNotificationWorker to RabbitMQ...');
      await this.notificationBus.connect();
      this.rabbitMQConnected = true;
      console.log('ServiceExecutionNotificationWorker connected to RabbitMQ');
      this.logger.log('RabbitMQ connection established successfully for service execution worker');
    } catch (err) {
      console.error('ServiceExecutionNotificationWorker RabbitMQ connection FAILED');
      console.error('Error:', err.message);
      this.logger.error(`RabbitMQ connection failed for service execution worker: ${err.message}`);
      throw err;
    }
  }

  private async processNotificationJob(job: any): Promise<void> {
    const { name, data, id } = job;
    
    this.logger.log(`Processing service execution notification job ${id}: ${name}`);
    console.log(`Processing service execution notification job ${id}: ${name}`);
    const startTime = Date.now();
    
    try {
      if (!this.rabbitMQConnected) {
        await this.connectToRabbitMQ();
      }
      
      switch (name) {
        case 'service.started':
          await this.handleServiceStarted(data as ServiceStartedData);
          break;
          
        case 'service.completed':
          await this.handleServiceCompleted(data as ServiceCompletedData);
          break;
          
        case 'customer.confirmed':
          await this.handleCustomerConfirmed(data as CustomerConfirmedData);
          break;
          
        case 'customer.dissatisfied':
          await this.handleCustomerDissatisfied(data as CustomerDissatisfiedData);
          break;
          
        case 'payment.auto-released':
          await this.handlePaymentAutoReleased(data as PaymentAutoReleasedData);
          break;
          
        default:
          this.logger.warn(`Unknown service execution notification job type: ${name}`);
          console.log(`Unknown service execution notification job type: ${name}`);
      }
      
      const elapsed = Date.now() - startTime;
      this.logger.log(`Service execution notification job ${name} completed in ${elapsed}ms`);
      console.log(`Service execution notification job ${name} completed in ${elapsed}ms`);
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`Service execution notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      console.error(error.stack);
      this.logger.error(`Service execution notification job ${name} failed after ${elapsed}ms: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  // ==================== HANDLE SERVICE EXECUTION NOTIFICATIONS ====================

  private async handleServiceStarted(data: ServiceStartedData): Promise<void> {
    this.logger.log(`Handling service.started notification for booking ${data.bookingExternalId}`);
    console.log(`Handling service.started notification for booking ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const startedAtFormatted = new Date(data.startedAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Notify customer that work has started
    this.notificationBus.emit('service-started-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      contractorPhone: data.contractorPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      startedAt: startedAtFormatted,
      bookingExternalId: data.bookingExternalId,
    });
    
    // Notify contractor confirmation (for their records)
    this.notificationBus.emit('service-started-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      startedAt: startedAtFormatted,
      bookingExternalId: data.bookingExternalId,
    });
    
    this.logger.log(`Service started events emitted for booking ${data.bookingExternalId}`);
    console.log(`Service started events emitted for booking ${data.bookingExternalId}`);
  }

  private async handleServiceCompleted(data: ServiceCompletedData): Promise<void> {
    this.logger.log(`Handling service.completed notification for booking ${data.bookingExternalId}`);
    console.log(`Handling service.completed notification for booking ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const completedAtFormatted = new Date(data.completedAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const autoReleaseAtFormatted = new Date(data.autoReleaseAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Notify customer that work is completed and needs confirmation
    this.notificationBus.emit('service-completed-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      contractorPhone: data.contractorPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      completedAt: completedAtFormatted,
      autoReleaseAt: autoReleaseAtFormatted,
      autoReleaseHours: data.autoReleaseHours,
      servicePrice: `${data.servicePrice.toLocaleString()} ${data.currency}`,
      totalAmount: `${data.totalAmount.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
      evidenceCount: data.evidenceUrls?.length || 0,
    });
    
    // Notify contractor that work completion has been recorded
    this.notificationBus.emit('service-completed-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      completedAt: completedAtFormatted,
      autoReleaseAt: autoReleaseAtFormatted,
      autoReleaseHours: data.autoReleaseHours,
      servicePrice: `${data.servicePrice.toLocaleString()} ${data.currency}`,
      totalAmount: `${data.totalAmount.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
      evidenceCount: data.evidenceUrls?.length || 0,
    });
    
    this.logger.log(`Service completed events emitted for booking ${data.bookingExternalId}`);
    console.log(`Service completed events emitted for booking ${data.bookingExternalId}`);
  }

  private async handleCustomerConfirmed(data: CustomerConfirmedData): Promise<void> {
    this.logger.log(`Handling customer.confirmed notification for booking ${data.bookingExternalId}`);
    console.log(`Handling customer.confirmed notification for booking ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const confirmedAtFormatted = new Date(data.confirmedAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Notify contractor that payment has been released
    this.notificationBus.emit('payment-released-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      confirmedAt: confirmedAtFormatted,
      paymentReleasedAt: new Date(data.paymentReleasedAt).toLocaleString('en-KE', {
        dateStyle: 'full',
        timeStyle: 'short',
      }),
      amountReceived: `${data.totalAmount.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
    });
    
    // Notify customer confirmation receipt
    this.notificationBus.emit('customer-confirmed-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      confirmedAt: confirmedAtFormatted,
      amountPaid: `${data.totalAmount.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
    });
    
    this.logger.log(`Customer confirmation events emitted for booking ${data.bookingExternalId}`);
    console.log(`Customer confirmation events emitted for booking ${data.bookingExternalId}`);
  }

  private async handleCustomerDissatisfied(data: CustomerDissatisfiedData): Promise<void> {
    this.logger.log(`Handling customer.dissatisfied notification for booking ${data.bookingExternalId}`);
    console.log(`Handling customer.dissatisfied notification for booking ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const dissatisfiedAtFormatted = new Date(data.dissatisfiedAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Notify admin about dispute
    this.notificationBus.emit('dispute-raised-admin', {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      contractorName: data.contractorName,
      contractorEmail: data.contractorEmail,
      contractorPhone: data.contractorPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      dissatisfiedAt: dissatisfiedAtFormatted,
      bookingExternalId: data.bookingExternalId,
      disputeId: data.disputeId,
    });
    
    // Notify contractor that customer is dissatisfied
    this.notificationBus.emit('customer-dissatisfied-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      dissatisfiedAt: dissatisfiedAtFormatted,
      bookingExternalId: data.bookingExternalId,
      disputeId: data.disputeId,
    });
    
    // Notify customer that dispute has been created
    this.notificationBus.emit('dispute-created-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      disputeId: data.disputeId,
      bookingExternalId: data.bookingExternalId,
    });
    
    this.logger.log(`Customer dissatisfaction events emitted for booking ${data.bookingExternalId}`);
    console.log(`Customer dissatisfaction events emitted for booking ${data.bookingExternalId}`);
  }

  private async handlePaymentAutoReleased(data: PaymentAutoReleasedData): Promise<void> {
    this.logger.log(`Handling payment.auto-released notification for booking ${data.bookingExternalId}`);
    console.log(`Handling payment.auto-released notification for booking ${data.bookingExternalId}`);
    
    const scheduledDateFormatted = new Date(data.scheduledDate).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    const autoReleasedAtFormatted = new Date(data.autoReleasedAt).toLocaleString('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    
    // Notify contractor that payment has been auto-released
    this.notificationBus.emit('payment-auto-released-contractor', {
      to: data.contractorEmail,
      contractorName: data.contractorName,
      customerName: data.customerName,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      autoReleasedAt: autoReleasedAtFormatted,
      amountReceived: `${data.amountReleased.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
    });
    
    // Notify customer that payment has been auto-released (they didn't respond)
    this.notificationBus.emit('payment-auto-released-customer', {
      to: data.customerEmail,
      customerName: data.customerName,
      contractorName: data.contractorName,
      serviceTitle: data.serviceTitle,
      scheduledDate: scheduledDateFormatted,
      location: data.location,
      autoReleasedAt: autoReleasedAtFormatted,
      amountReleased: `${data.amountReleased.toLocaleString()} ${data.currency}`,
      bookingExternalId: data.bookingExternalId,
    });
    
    this.logger.log(`Payment auto-release events emitted for booking ${data.bookingExternalId}`);
    console.log(`Payment auto-release events emitted for booking ${data.bookingExternalId}`);
  }
}